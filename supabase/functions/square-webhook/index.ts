import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;

type SquareMoney = {
  amount?: number;
  currency?: string;
};

type SquarePayment = {
  id?: string;
  order_id?: string;
  location_id?: string;
  status?: string;
  receipt_url?: string;
  amount_money?: SquareMoney;
  total_money?: SquareMoney;
  updated_at?: string;
};

type SquareRefund = {
  id?: string;
  payment_id?: string;
  location_id?: string;
  status?: string;
  amount_money?: SquareMoney;
  reason?: string;
  created_at?: string;
  updated_at?: string;
};

type SquareWebhookEvent = {
  event_id?: string;
  type?: string;
  merchant_id?: string;
  location_id?: string;
  created_at?: string;
  data?: {
    type?: string;
    id?: string;
    object?: {
      payment?: SquarePayment;
      refund?: SquareRefund;
    };
  };
};

type AppointmentRecord = {
  id: string;
  status: string;
  payment_status: string;
  payment_option: string | null;
  payment_type: string | null;
  service_price: number | string | null;
  amount_paid: number | string | null;
  payment_amount_cents: number | null;
  refunded_amount_cents: number | null;
  square_payment_id: string | null;
  square_order_id: string | null;
  square_merchant_id: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-square-hmacsha256-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: JsonRecord,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getRequiredEnvironmentVariable(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    return null;
  }
}

function timingSafeEqual(
  first: Uint8Array,
  second: Uint8Array,
): boolean {
  if (first.length !== second.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < first.length; index += 1) {
    difference |= first[index] ^ second[index];
  }

  return difference === 0;
}

/**
 * Square signs:
 *
 * notification URL + raw request body
 *
 * using HMAC-SHA256 and the webhook signature key.
 */
async function verifySquareSignature({
  rawBody,
  receivedSignature,
  notificationUrl,
  signatureKey,
}: {
  rawBody: string;
  receivedSignature: string;
  notificationUrl: string;
  signatureKey: string;
}): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    encodeUtf8(signatureKey),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const signedPayload = `${notificationUrl}${rawBody}`;

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encodeUtf8(signedPayload),
  );

  const expectedSignature = bytesToBase64(
    new Uint8Array(signatureBuffer),
  );

  const expectedBytes = base64ToBytes(expectedSignature);
  const receivedBytes = base64ToBytes(receivedSignature);

  if (!expectedBytes || !receivedBytes) {
    return false;
  }

  return timingSafeEqual(expectedBytes, receivedBytes);
}

function asNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getPaymentAmountCents(payment: SquarePayment): number {
  return Math.max(
    0,
    Math.round(
      asNumber(
        payment.amount_money?.amount ??
          payment.total_money?.amount,
      ),
    ),
  );
}

function getPaymentFailureReason(payment: SquarePayment): string {
  const status = payment.status?.toUpperCase() || "UNKNOWN";
  return `Square payment status: ${status}`;
}

function getSuccessfulPaymentStatus(
  appointment: AppointmentRecord,
): "deposit_paid" | "paid" {
  const paymentType =
    appointment.payment_type ??
    appointment.payment_option;

  return paymentType === "deposit"
    ? "deposit_paid"
    : "paid";
}

async function markWebhookEvent({
  supabaseAdmin,
  eventId,
  processingStatus,
  errorMessage = null,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  eventId: string;
  processingStatus:
    | "received"
    | "processing"
    | "processed"
    | "ignored"
    | "failed";
  errorMessage?: string | null;
}): Promise<void> {
  const update: Record<string, unknown> = {
    processing_status: processingStatus,
    error_message: errorMessage,
  };

  if (
    processingStatus === "processed" ||
    processingStatus === "ignored" ||
    processingStatus === "failed"
  ) {
    update.processed_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from("square_webhook_events")
    .update(update)
    .eq("event_id", eventId);

  if (error) {
    console.error(
      "Unable to update webhook event status:",
      eventId,
      error,
    );
  }
}

async function registerWebhookEvent({
  supabaseAdmin,
  event,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  event: SquareWebhookEvent;
}): Promise<
  | { shouldProcess: true }
  | { shouldProcess: false; reason: string }
> {
  const eventId = event.event_id as string;
  const eventType = event.type as string;

  const entityId =
    event.data?.object?.payment?.id ??
    event.data?.object?.refund?.id ??
    event.data?.id ??
    null;

  const locationId =
    event.location_id ??
    event.data?.object?.payment?.location_id ??
    event.data?.object?.refund?.location_id ??
    null;

  const { error: insertError } = await supabaseAdmin
    .from("square_webhook_events")
    .insert({
      event_id: eventId,
      event_type: eventType,
      merchant_id: event.merchant_id ?? null,
      location_id: locationId,
      entity_id: entityId,
      processing_status: "processing",
      payload: event,
      error_message: null,
    });

  if (!insertError) {
    return { shouldProcess: true };
  }

  // PostgreSQL unique-violation code. Square may retry the same event.
  if (insertError.code !== "23505") {
    throw new Error(
      `Unable to register webhook event: ${insertError.message}`,
    );
  }

  const { data: existingEvent, error: existingError } =
    await supabaseAdmin
      .from("square_webhook_events")
      .select("processing_status")
      .eq("event_id", eventId)
      .maybeSingle();

  if (existingError) {
    throw new Error(
      `Unable to inspect duplicate webhook event: ${existingError.message}`,
    );
  }

  if (
    existingEvent?.processing_status === "processed" ||
    existingEvent?.processing_status === "ignored"
  ) {
    return {
      shouldProcess: false,
      reason: "Event has already been processed.",
    };
  }

  // Allow Square to retry events that previously failed.
  const { error: retryError } = await supabaseAdmin
    .from("square_webhook_events")
    .update({
      processing_status: "processing",
      error_message: null,
      payload: event,
      processed_at: null,
    })
    .eq("event_id", eventId);

  if (retryError) {
    throw new Error(
      `Unable to retry webhook event: ${retryError.message}`,
    );
  }

  return { shouldProcess: true };
}

async function findAppointmentForPayment({
  supabaseAdmin,
  payment,
  merchantId,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  payment: SquarePayment;
  merchantId?: string;
}): Promise<AppointmentRecord | null> {
  if (!payment.order_id) {
    return null;
  }

  let query = supabaseAdmin
    .from("appointments")
    .select(`
      id,
      status,
      payment_status,
      payment_option,
      payment_type,
      service_price,
      amount_paid,
      payment_amount_cents,
      refunded_amount_cents,
      square_payment_id,
      square_order_id,
      square_merchant_id
    `)
    .eq("square_order_id", payment.order_id);

  if (merchantId) {
    query = query.or(
      `square_merchant_id.eq.${merchantId},square_merchant_id.is.null`,
    );
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(
      `Unable to find appointment for Square order: ${error.message}`,
    );
  }

  return data as AppointmentRecord | null;
}


async function getCompletedRefundTotalCents({
  supabaseAdmin,
  appointmentId,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  appointmentId: string;
}): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("square_refunds")
    .select("amount_cents")
    .eq("appointment_id", appointmentId)
    .eq("status", "COMPLETED");

  if (error) {
    throw new Error(
      `Unable to calculate completed refunds: ${error.message}`,
    );
  }

  return (data ?? []).reduce(
    (
      total: number,
      row: {
        amount_cents?: number | string | null;
      },
    ) => total + Math.max(0, Math.round(asNumber(row.amount_cents))),
    0,
  );
}

async function processPaymentEvent({
  supabaseAdmin,
  event,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  event: SquareWebhookEvent;
}): Promise<"processed" | "ignored"> {
  const payment = event.data?.object?.payment;

  if (!payment) {
    console.warn(
      "Payment event did not contain a payment object:",
      event.event_id,
    );

    return "ignored";
  }

  if (!payment.order_id) {
    console.warn(
      "Square payment has no order_id:",
      payment.id,
    );

    return "ignored";
  }

  const appointment = await findAppointmentForPayment({
    supabaseAdmin,
    payment,
    merchantId: event.merchant_id,
  });

  if (!appointment) {
    console.warn(
      "No appointment matched Square order:",
      payment.order_id,
    );

    /*
     * Return ignored rather than failed. The event is valid, but it does
     * not belong to an appointment currently known by this application.
     */
    return "ignored";
  }

  if (
    appointment.square_merchant_id &&
    event.merchant_id &&
    appointment.square_merchant_id !== event.merchant_id
  ) {
    throw new Error(
      "Square merchant ID does not match the appointment.",
    );
  }

  const squareStatus = payment.status?.toUpperCase();
  const paymentAmountCents = getPaymentAmountCents(payment);
  const paymentAmount = paymentAmountCents / 100;
  const now = new Date().toISOString();

  if (squareStatus === "COMPLETED") {
    const successfulPaymentStatus =
      getSuccessfulPaymentStatus(appointment);

    const servicePrice = asNumber(appointment.service_price);
    const completedRefundCents =
      await getCompletedRefundTotalCents({
        supabaseAdmin,
        appointmentId: appointment.id,
      });

    const netPaidCents = Math.max(
      paymentAmountCents - completedRefundCents,
      0,
    );

    const amountPaid = netPaidCents / 100;
    const remainingBalance = Math.max(
      servicePrice - amountPaid,
      0,
    );

    let paymentStatus:
      | "deposit_paid"
      | "paid"
      | "partially_refunded"
      | "refunded" = successfulPaymentStatus;

    if (
      completedRefundCents > 0 &&
      netPaidCents === 0
    ) {
      paymentStatus = "refunded";
    } else if (completedRefundCents > 0) {
      paymentStatus = "partially_refunded";
    }

    const { error } = await supabaseAdmin
      .from("appointments")
      .update({
        status: "confirmed",
        payment_status: paymentStatus,
        square_payment_id: payment.id ?? null,
        square_order_id: payment.order_id,
        square_receipt_url: payment.receipt_url ?? null,
        square_location_id:
          payment.location_id ??
          event.location_id ??
          null,
        square_merchant_id:
          appointment.square_merchant_id ??
          event.merchant_id ??
          null,
        payment_amount_cents: paymentAmountCents,
        payment_currency:
          payment.amount_money?.currency ??
          payment.total_money?.currency ??
          "USD",
        amount_paid: amountPaid,
        remaining_balance: remainingBalance,
        refunded_amount_cents: completedRefundCents,
        paid_at: now,
        payment_verified_at: now,
        payment_failed_at: null,
        payment_failure_reason: null,
        updated_at: now,
      })
      .eq("id", appointment.id);

    if (error) {
      throw new Error(
        `Unable to confirm appointment payment: ${error.message}`,
      );
    }

    return "processed";
  }

  if (
    squareStatus === "FAILED" ||
    squareStatus === "CANCELED"
  ) {
    const { error } = await supabaseAdmin
      .from("appointments")
      .update({
        payment_status: "failed",
        square_payment_id: payment.id ?? null,
        square_order_id: payment.order_id,
        square_location_id:
          payment.location_id ??
          event.location_id ??
          null,
        payment_failed_at: now,
        payment_failure_reason:
          getPaymentFailureReason(payment),
        updated_at: now,
      })
      .eq("id", appointment.id);

    if (error) {
      throw new Error(
        `Unable to mark appointment payment as failed: ${error.message}`,
      );
    }

    return "processed";
  }

  /*
   * APPROVED and PENDING remain pending. This also records the Square
   * payment ID as soon as it becomes available.
   */
  if (
    squareStatus === "APPROVED" ||
    squareStatus === "PENDING"
  ) {
    const { error } = await supabaseAdmin
      .from("appointments")
      .update({
        payment_status: "pending",
        square_payment_id:
          payment.id ??
          appointment.square_payment_id,
        square_order_id: payment.order_id,
        square_location_id:
          payment.location_id ??
          event.location_id ??
          null,
        updated_at: now,
      })
      .eq("id", appointment.id);

    if (error) {
      throw new Error(
        `Unable to update pending appointment payment: ${error.message}`,
      );
    }

    return "processed";
  }

  console.log(
    "Ignoring unsupported Square payment status:",
    squareStatus,
  );

  return "ignored";
}

async function findAppointmentForRefund({
  supabaseAdmin,
  refund,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  refund: SquareRefund;
}): Promise<AppointmentRecord | null> {
  if (!refund.payment_id) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select(`
      id,
      status,
      payment_status,
      payment_option,
      payment_type,
      service_price,
      amount_paid,
      payment_amount_cents,
      refunded_amount_cents,
      square_payment_id,
      square_order_id,
      square_merchant_id
    `)
    .eq("square_payment_id", refund.payment_id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to find appointment for refund: ${error.message}`,
    );
  }

  return data as AppointmentRecord | null;
}

async function upsertSquareRefund({
  supabaseAdmin,
  appointment,
  refund,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  appointment: AppointmentRecord;
  refund: SquareRefund;
}): Promise<void> {
  if (!refund.id || !refund.payment_id) {
    throw new Error(
      "Square refund payload is missing id or payment_id.",
    );
  }

  const amountCents = Math.max(
    0,
    Math.round(asNumber(refund.amount_money?.amount)),
  );

  const status = refund.status?.toUpperCase() || "PENDING";
  const now = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("square_refunds")
    .upsert(
      {
        square_refund_id: refund.id,
        square_payment_id: refund.payment_id,
        appointment_id: appointment.id,
        amount_cents: amountCents,
        currency: refund.amount_money?.currency ?? "USD",
        status,
        reason: refund.reason ?? null,
        updated_at: refund.updated_at ?? now,
      },
      {
        onConflict: "square_refund_id",
      },
    );

  if (error) {
    throw new Error(
      `Unable to save Square refund: ${error.message}`,
    );
  }
}

async function applyCompletedRefundTotals({
  supabaseAdmin,
  appointment,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  appointment: AppointmentRecord;
}): Promise<void> {
  const totalRefundedCents =
    await getCompletedRefundTotalCents({
      supabaseAdmin,
      appointmentId: appointment.id,
    });

  const originalPaymentCents = Math.max(
    0,
    appointment.payment_amount_cents ??
      Math.round(
        (
          asNumber(appointment.amount_paid) +
          asNumber(appointment.refunded_amount_cents) / 100
        ) * 100,
      ),
  );

  const netPaidCents = Math.max(
    originalPaymentCents - totalRefundedCents,
    0,
  );

  const amountPaid = netPaidCents / 100;
  const servicePrice = asNumber(appointment.service_price);
  const remainingBalance = Math.max(
    servicePrice - amountPaid,
    0,
  );

  const paymentStatus =
    totalRefundedCents >= originalPaymentCents &&
      originalPaymentCents > 0
      ? "refunded"
      : totalRefundedCents > 0
        ? "partially_refunded"
        : getSuccessfulPaymentStatus(appointment);

  const now = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("appointments")
    .update({
      payment_status: paymentStatus,
      refunded_amount_cents: totalRefundedCents,
      refunded_at:
        totalRefundedCents > 0
          ? now
          : null,
      amount_paid: amountPaid,
      remaining_balance: remainingBalance,
      updated_at: now,
    })
    .eq("id", appointment.id);

  if (error) {
    throw new Error(
      `Unable to update appointment refund totals: ${error.message}`,
    );
  }
}

async function processRefundEvent({
  supabaseAdmin,
  event,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  event: SquareWebhookEvent;
}): Promise<"processed" | "ignored"> {
  const refund = event.data?.object?.refund;

  if (!refund) {
    console.warn(
      "Refund event did not contain a refund object:",
      event.event_id,
    );

    return "ignored";
  }

  if (!refund.id || !refund.payment_id) {
    console.warn(
      "Refund event is missing refund ID or payment ID:",
      event.event_id,
    );

    return "ignored";
  }

  const appointment = await findAppointmentForRefund({
    supabaseAdmin,
    refund,
  });

  if (!appointment) {
    console.warn(
      "No appointment matched Square payment:",
      refund.payment_id,
    );

    return "ignored";
  }

  if (
    appointment.square_merchant_id &&
    event.merchant_id &&
    appointment.square_merchant_id !== event.merchant_id
  ) {
    throw new Error(
      "Square merchant ID does not match the refunded appointment.",
    );
  }

  await upsertSquareRefund({
    supabaseAdmin,
    appointment,
    refund,
  });

  const refundStatus =
    refund.status?.toUpperCase() || "PENDING";

  /*
   * Every refund event is persisted, but only completed
   * refunds change appointment financial totals.
   */
  if (refundStatus === "COMPLETED") {
    await applyCompletedRefundTotals({
      supabaseAdmin,
      appointment,
    });
  }

  /*
   * The appointment status is deliberately not changed.
   * Refund and appointment cancellation remain separate actions.
   */
  return "processed";
}

async function processSquareEvent({
  supabaseAdmin,
  event,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  event: SquareWebhookEvent;
}): Promise<"processed" | "ignored"> {
  switch (event.type) {
    case "payment.created":
    case "payment.updated":
      return await processPaymentEvent({
        supabaseAdmin,
        event,
      });

    case "refund.created":
    case "refund.updated":
      return await processRefundEvent({
        supabaseAdmin,
        event,
      });

    default:
      console.log(
        "Ignoring unsupported Square event type:",
        event.type,
      );

      return "ignored";
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed." },
      405,
    );
  }

  let eventId: string | null = null;

  try {
    const supabaseUrl =
      getRequiredEnvironmentVariable("SUPABASE_URL");

    const serviceRoleKey =
      getRequiredEnvironmentVariable(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    const signatureKey =
      getRequiredEnvironmentVariable(
        "SQUARE_WEBHOOK_SIGNATURE_KEY",
      );

    const notificationUrl =
      getRequiredEnvironmentVariable(
        "SQUARE_WEBHOOK_NOTIFICATION_URL",
      );

    const receivedSignature = request.headers.get(
      "x-square-hmacsha256-signature",
    );

    if (!receivedSignature) {
      console.warn("Square signature header is missing.");

      return jsonResponse(
        { error: "Missing webhook signature." },
        401,
      );
    }

    /*
     * The raw body must be read before JSON parsing because Square's
     * signature is calculated from the exact request text.
     */
    const rawBody = await request.text();

    const signatureIsValid = await verifySquareSignature({
      rawBody,
      receivedSignature,
      notificationUrl,
      signatureKey,
    });

    if (!signatureIsValid) {
      console.warn("Square webhook signature verification failed.");

      return jsonResponse(
        { error: "Invalid webhook signature." },
        401,
      );
    }

    let event: SquareWebhookEvent;

    try {
      event = JSON.parse(rawBody) as SquareWebhookEvent;
    } catch {
      return jsonResponse(
        { error: "Invalid JSON payload." },
        400,
      );
    }

    if (!event.event_id || !event.type) {
      return jsonResponse(
        {
          error:
            "Square webhook payload is missing event_id or type.",
        },
        400,
      );
    }

    eventId = event.event_id;

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const registration = await registerWebhookEvent({
      supabaseAdmin,
      event,
    });

    if (!registration.shouldProcess) {
      return jsonResponse({
        received: true,
        duplicate: true,
        message: registration.reason,
      });
    }

    try {
      const result = await processSquareEvent({
        supabaseAdmin,
        event,
      });

      await markWebhookEvent({
        supabaseAdmin,
        eventId: event.event_id,
        processingStatus: result,
      });

      return jsonResponse({
        received: true,
        event_id: event.event_id,
        result,
      });
    } catch (processingError) {
      const message =
        processingError instanceof Error
          ? processingError.message
          : "Unknown webhook processing error.";

      console.error(
        "Square webhook processing failed:",
        event.event_id,
        processingError,
      );

      await markWebhookEvent({
        supabaseAdmin,
        eventId: event.event_id,
        processingStatus: "failed",
        errorMessage: message,
      });

      /*
       * Return a non-2xx response so Square retries the event.
       */
      return jsonResponse(
        {
          error: "Webhook processing failed.",
          event_id: event.event_id,
        },
        500,
      );
    }
  } catch (error) {
    console.error(
      "Square webhook request failed:",
      eventId,
      error,
    );

    return jsonResponse(
      {
        error: "Webhook request failed.",
      },
      500,
    );
  }
});
