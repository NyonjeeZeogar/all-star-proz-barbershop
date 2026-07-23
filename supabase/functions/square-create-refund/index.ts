import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

const SQUARE_API_VERSION = "2025-04-16";
const SQUARE_CONNECTIONS_TABLE = "square_connections";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonRecord = Record<string, unknown>;

type RefundRequest = {
  booking_id?: string;

  /**
   * Refund amount in cents.
   *
   * Omit this field to refund the entire currently paid amount.
   */
  amount_cents?: number;

  reason?: string;

  /**
   * An optional client-generated idempotency key.
   *
   * Normally the function generates one automatically.
   */
  idempotency_key?: string;
};

type EncryptedTokenPayload = {
  version: number;
  iv: string;
  ciphertext: string;
};

type SquareConnection = {
  id: string;
  barber_id: string | null;
  barber_slug: string | null;
  merchant_id: string | null;
  location_id: string | null;
  connected_at: string | null;
  token_expires_at: string | null;
  status: string | null;
  access_token_encrypted: string | null;
};

type AppointmentRecord = {
  id: string;
  barber_id: string;
  customer_id: string;
  status: string;
  payment_status: string;
  amount_paid: number | string | null;
  currency: string | null;
  payment_currency: string | null;
  square_payment_id: string | null;
  square_order_id: string | null;
  square_location_id: string | null;
  square_merchant_id: string | null;
  square_connection_id: string | null;
};

type SquareMoney = {
  amount?: number;
  currency?: string;
};

type SquareRefund = {
  id?: string;
  status?: string;
  payment_id?: string;
  order_id?: string;
  location_id?: string;
  amount_money?: SquareMoney;
  reason?: string;
  created_at?: string;
  updated_at?: string;
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

function getRequiredEnvironmentVariable(
  name: string,
): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`,
    );
  }

  return value;
}

function asNumber(
  value: number | string | null | undefined,
): number {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  return 0;
}

function normalizeCurrency(
  value: string | null | undefined,
): string {
  const currency = String(value || "USD")
    .trim()
    .toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error(
      "The appointment has an invalid currency.",
    );
  }

  return currency;
}

function normalizeReason(
  value: unknown,
): string {
  if (typeof value !== "string") {
    return "Refund requested by barber";
  }

  const reason = value.trim();

  if (!reason) {
    return "Refund requested by barber";
  }

  // Keep the reason reasonably short for Square.
  return reason.slice(0, 192);
}

function normalizeIdempotencyKey(
  value: unknown,
): string {
  if (typeof value === "string") {
    const normalized = value.trim();

    if (
      normalized.length >= 1 &&
      normalized.length <= 192
    ) {
      return normalized;
    }
  }

  return crypto.randomUUID();
}

function parseRequestedAmountCents(
  value: unknown,
  maximumAmountCents: number,
): number {
  /*
   * Omitting amount_cents means:
   * refund the entire currently refundable amount.
   */
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return maximumAmountCents;
  }

  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "amount_cents must be a positive whole number.",
    );
  }

  if (amount > maximumAmountCents) {
    throw new Error(
      `The refund cannot exceed ${maximumAmountCents} cents.`,
    );
  }

  return amount;
}

function base64ToBytes(
  value: string,
): Uint8Array {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded = normalized.padEnd(
    normalized.length +
      ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  const binary = atob(padded);
  const bytes = new Uint8Array(
    binary.length,
  );

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(index);
  }

  return bytes;
}

/**
 * Uses the same encrypted-token format as
 * square-create-checkout and square-oauth-callback.
 */
async function importTokenEncryptionKey(): Promise<CryptoKey> {
  const encodedKey = Deno.env.get(
    "TOKEN_ENCRYPTION_KEY",
  );

  if (!encodedKey) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not configured.",
    );
  }

  let rawKey: Uint8Array;

  try {
    rawKey = base64ToBytes(
      encodedKey.trim(),
    );
  } catch {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be valid Base64.",
    );
  }

  if (rawKey.byteLength !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.",
    );
  }

  return await crypto.subtle.importKey(
    "raw",
    rawKey,
    {
      name: "AES-GCM",
    },
    false,
    ["decrypt"],
  );
}

async function decryptSquareToken(
  encryptedValue: string,
): Promise<string> {
  let payload: EncryptedTokenPayload;

  try {
    payload = JSON.parse(
      encryptedValue,
    ) as EncryptedTokenPayload;
  } catch {
    throw new Error(
      "The encrypted Square access token is not valid JSON.",
    );
  }

  if (
    payload.version !== 1 ||
    typeof payload.iv !== "string" ||
    !payload.iv ||
    typeof payload.ciphertext !==
      "string" ||
    !payload.ciphertext
  ) {
    throw new Error(
      "The encrypted Square access token has an unsupported format.",
    );
  }

  try {
    const key =
      await importTokenEncryptionKey();

    const iv = base64ToBytes(
      payload.iv,
    );

    const ciphertext = base64ToBytes(
      payload.ciphertext,
    );

    if (iv.byteLength !== 12) {
      throw new Error(
        "The encrypted Square access token has an invalid IV.",
      );
    }

    const decryptedBytes =
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv,
        },
        key,
        ciphertext,
      );

    const token = new TextDecoder()
      .decode(decryptedBytes)
      .trim();

    if (!token) {
      throw new Error(
        "The decrypted Square access token is empty.",
      );
    }

    return token;
  } catch (error) {
    console.error(
      "Unable to decrypt Square access token",
      error,
    );

    throw new Error(
      "Unable to decrypt the Square access token. Restore the original TOKEN_ENCRYPTION_KEY or reconnect Square.",
    );
  }
}

async function findSquareConnection({
  supabaseAdmin,
  appointment,
}: {
  supabaseAdmin: SupabaseClient;
  appointment: AppointmentRecord;
}): Promise<SquareConnection | null> {
  const selectedColumns = [
    "id",
    "barber_id",
    "barber_slug",
    "merchant_id",
    "location_id",
    "connected_at",
    "token_expires_at",
    "status",
    "access_token_encrypted",
  ].join(", ");

  /*
   * Prefer the exact connection used when checkout was
   * created.
   */
  if (appointment.square_connection_id) {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        SQUARE_CONNECTIONS_TABLE,
      )
      .select(selectedColumns)
      .eq(
        "id",
        appointment.square_connection_id,
      )
      .eq("status", "connected")
      .maybeSingle();

    if (error) {
      throw new Error(
        `Unable to load the appointment's Square connection: ${error.message}`,
      );
    }

    if (data) {
      return data as SquareConnection;
    }
  }

  /*
   * Fall back to the currently connected Square account
   * for the barber.
   */
  const {
    data,
    error,
  } = await supabaseAdmin
    .from(SQUARE_CONNECTIONS_TABLE)
    .select(selectedColumns)
    .eq(
      "barber_id",
      appointment.barber_id,
    )
    .eq("status", "connected")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load the barber's Square connection: ${error.message}`,
    );
  }

  return (
    data as SquareConnection | null
  );
}

async function getPendingRefundAmountCents({
  supabaseAdmin,
  appointmentId,
}: {
  supabaseAdmin: SupabaseClient;
  appointmentId: string;
}): Promise<number> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("square_refunds")
    .select("amount_cents, status")
    .eq(
      "appointment_id",
      appointmentId,
    )
    .in("status", [
      "PENDING",
      "APPROVED",
    ]);

  if (error) {
    throw new Error(
      `Unable to inspect pending refunds: ${error.message}`,
    );
  }

  return (data || []).reduce(
    (
      total: number,
      refund: {
        amount_cents?: number;
      },
    ) =>
      total +
      Math.max(
        0,
        Math.round(
          asNumber(
            refund.amount_cents,
          ),
        ),
      ),
    0,
  );
}

async function saveSquareRefund({
  supabaseAdmin,
  appointment,
  refund,
  amountCents,
  currency,
  reason,
}: {
  supabaseAdmin: SupabaseClient;
  appointment: AppointmentRecord;
  refund: SquareRefund;
  amountCents: number;
  currency: string;
  reason: string;
}): Promise<void> {
  if (!refund.id) {
    throw new Error(
      "Square returned a refund without an ID.",
    );
  }

  const now = new Date().toISOString();

  const {
    error,
  } = await supabaseAdmin
    .from("square_refunds")
    .upsert(
      {
        square_refund_id: refund.id,
        square_payment_id:
          refund.payment_id ??
          appointment.square_payment_id,
        appointment_id:
          appointment.id,
        amount_cents:
          refund.amount_money?.amount ??
          amountCents,
        currency:
          refund.amount_money?.currency ??
          currency,
        status:
          refund.status ??
          "PENDING",
        reason:
          refund.reason ??
          reason,
        updated_at:
          refund.updated_at ??
          now,
      },
      {
        onConflict:
          "square_refund_id",
      },
    );

  if (error) {
    throw new Error(
      `Square accepted the refund, but the refund record could not be saved: ${error.message}`,
    );
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        error:
          "METHOD_NOT_ALLOWED",
        message:
          "Method not allowed.",
      },
      405,
    );
  }

  try {
    const supabaseUrl =
      getRequiredEnvironmentVariable(
        "SUPABASE_URL",
      );

    const serviceRoleKey =
      getRequiredEnvironmentVariable(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    const authorization =
      request.headers.get(
        "Authorization",
      );

    if (
      !authorization?.startsWith(
        "Bearer ",
      )
    ) {
      return jsonResponse(
        {
          error: "AUTH_REQUIRED",
          message:
            "You must be signed in to issue a refund.",
        },
        401,
      );
    }

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );

    const jwt = authorization.slice(
      "Bearer ".length,
    );

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        jwt,
      );

    if (userError || !user) {
      console.error(
        "Unable to verify refund user",
        userError,
      );

      return jsonResponse(
        {
          error:
            "INVALID_SESSION",
          message:
            "Your session is invalid or expired. Please sign in again.",
        },
        401,
      );
    }

    let body: RefundRequest;

    try {
      body =
        await request.json() as RefundRequest;
    } catch {
      return jsonResponse(
        {
          error: "INVALID_JSON",
          message:
            "The request body must be valid JSON.",
        },
        400,
      );
    }

    if (!body.booking_id) {
      return jsonResponse(
        {
          error:
            "BOOKING_ID_REQUIRED",
          message:
            "booking_id is required.",
        },
        400,
      );
    }

    /*
     * The appointment must belong to the signed-in
     * barber.
     *
     * This prevents customers and other barbers from
     * refunding the payment.
     */
    const {
      data: appointment,
      error:
        appointmentError,
    } = await supabaseAdmin
      .from("appointments")
      .select(
        [
          "id",
          "barber_id",
          "customer_id",
          "status",
          "payment_status",
          "amount_paid",
          "currency",
          "payment_currency",
          "square_payment_id",
          "square_order_id",
          "square_location_id",
          "square_merchant_id",
          "square_connection_id",
        ].join(", "),
      )
      .eq("id", body.booking_id)
      .eq("barber_id", user.id)
      .maybeSingle();

    if (appointmentError) {
      console.error(
        "Refund appointment lookup failed",
        appointmentError,
      );

      return jsonResponse(
        {
          error:
            "APPOINTMENT_LOOKUP_FAILED",
          message:
            appointmentError.message,
        },
        500,
      );
    }

    if (!appointment) {
      return jsonResponse(
        {
          error:
            "APPOINTMENT_NOT_FOUND",
          message:
            "The appointment was not found or does not belong to this barber.",
        },
        404,
      );
    }

    const typedAppointment =
      appointment as AppointmentRecord;

    if (
      !typedAppointment
        .square_payment_id
    ) {
      return jsonResponse(
        {
          error:
            "SQUARE_PAYMENT_MISSING",
          message:
            "This appointment does not have a Square payment to refund.",
        },
        409,
      );
    }

    const netPaidCents = Math.max(
      0,
      Math.round(
        asNumber(
          typedAppointment.amount_paid,
        ) * 100,
      ),
    );

    if (netPaidCents <= 0) {
      return jsonResponse(
        {
          error:
            "NOTHING_TO_REFUND",
          message:
            "There is no remaining paid amount to refund.",
        },
        409,
      );
    }

    /*
     * Do not allow multiple refund requests to reserve
     * more than the appointment's current net paid
     * amount.
     */
    const pendingRefundCents =
      await getPendingRefundAmountCents(
        {
          supabaseAdmin,
          appointmentId:
            typedAppointment.id,
        },
      );

    const refundableAmountCents =
      Math.max(
        netPaidCents -
          pendingRefundCents,
        0,
      );

    if (
      refundableAmountCents <= 0
    ) {
      return jsonResponse(
        {
          error:
            "REFUND_ALREADY_PENDING",
          message:
            "The remaining paid amount already has a pending refund.",
        },
        409,
      );
    }

    let amountCents: number;

    try {
      amountCents =
        parseRequestedAmountCents(
          body.amount_cents,
          refundableAmountCents,
        );
    } catch (error) {
      return jsonResponse(
        {
          error:
            "INVALID_REFUND_AMOUNT",
          message:
            error instanceof Error
              ? error.message
              : "The refund amount is invalid.",
        },
        400,
      );
    }

    const currency =
      normalizeCurrency(
        typedAppointment
          .payment_currency ??
          typedAppointment.currency,
      );

    const reason =
      normalizeReason(
        body.reason,
      );

    const idempotencyKey =
      normalizeIdempotencyKey(
        body.idempotency_key,
      );

    const connection =
      await findSquareConnection({
        supabaseAdmin,
        appointment:
          typedAppointment,
      });

    if (!connection) {
      return jsonResponse(
        {
          error:
            "SQUARE_NOT_CONNECTED",
          message:
            "The barber does not have an active Square connection.",
        },
        409,
      );
    }

    if (
      !connection
        .access_token_encrypted
    ) {
      return jsonResponse(
        {
          error:
            "SQUARE_ACCESS_TOKEN_MISSING",
          message:
            "The connected Square account does not have an access token.",
        },
        500,
      );
    }

    if (
      connection.token_expires_at &&
      new Date(
        connection.token_expires_at,
      ).getTime() <= Date.now()
    ) {
      return jsonResponse(
        {
          error:
            "SQUARE_TOKEN_EXPIRED",
          message:
            "The connected Square authorization has expired. Reconnect Square before issuing a refund.",
        },
        401,
      );
    }

    if (
      typedAppointment
        .square_connection_id &&
      connection.id !==
        typedAppointment
          .square_connection_id
    ) {
      return jsonResponse(
        {
          error:
            "SQUARE_CONNECTION_MISMATCH",
          message:
            "The Square connection does not match the connection used for this payment.",
        },
        409,
      );
    }

    if (
      typedAppointment
        .square_merchant_id &&
      connection.merchant_id &&
      typedAppointment
        .square_merchant_id !==
        connection.merchant_id
    ) {
      return jsonResponse(
        {
          error:
            "SQUARE_MERCHANT_MISMATCH",
          message:
            "The payment belongs to a different Square merchant.",
        },
        409,
      );
    }

    const accessToken =
      await decryptSquareToken(
        connection
          .access_token_encrypted,
      );

    const production =
      Deno.env.get(
        "SQUARE_ENVIRONMENT",
      ) === "production";

    const squareBaseUrl = production
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";

    const squarePayload = {
      idempotency_key:
        idempotencyKey,

      payment_id:
        typedAppointment
          .square_payment_id,

      amount_money: {
        amount: amountCents,
        currency,
      },

      reason,
    };

    const squareResponse =
      await fetch(
        `${squareBaseUrl}/v2/refunds`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            "Content-Type":
              "application/json",
            "Square-Version":
              SQUARE_API_VERSION,
          },
          body: JSON.stringify(
            squarePayload,
          ),
        },
      );

    let squareResult:
      Record<string, any>;

    try {
      squareResult =
        await squareResponse.json();
    } catch {
      squareResult = {
        error:
          "Square returned a non-JSON response.",
      };
    }

    if (!squareResponse.ok) {
      console.error(
        "Square RefundPayment failed",
        {
          status:
            squareResponse.status,
          result:
            squareResult,
          appointmentId:
            typedAppointment.id,
          paymentId:
            typedAppointment
              .square_payment_id,
          amountCents,
          environment:
            production
              ? "production"
              : "sandbox",
        },
      );

      return jsonResponse(
        {
          error:
            "SQUARE_REFUND_FAILED",
          message:
            "Square could not create the refund.",
          details:
            squareResult?.errors ??
            squareResult,
        },
        squareResponse.status,
      );
    }

    const refund =
      squareResult?.refund as
        | SquareRefund
        | undefined;

    if (!refund?.id) {
      console.error(
        "Square refund response did not contain refund.id",
        squareResult,
      );

      return jsonResponse(
        {
          error:
            "SQUARE_REFUND_ID_MISSING",
          message:
            "Square accepted the request but did not return a refund ID.",
        },
        502,
      );
    }

    await saveSquareRefund({
      supabaseAdmin,
      appointment:
        typedAppointment,
      refund,
      amountCents,
      currency,
      reason,
    });

    /*
     * Do not change appointments.status here.
     *
     * Refund and cancellation are deliberately separate.
     *
     * Do not directly adjust amount_paid here either.
     * The signed Square webhook is the authoritative
     * source for completed refund state.
     */
    return jsonResponse({
      success: true,

      booking_id:
        typedAppointment.id,

      refund_id:
        refund.id,

      payment_id:
        refund.payment_id ??
        typedAppointment
          .square_payment_id,

      refund_status:
        refund.status ??
        "PENDING",

      amount_cents:
        refund.amount_money
          ?.amount ??
        amountCents,

      currency:
        refund.amount_money
          ?.currency ??
        currency,

      reason:
        refund.reason ??
        reason,

      appointment_status:
        typedAppointment.status,

      message:
        "The refund request was submitted. The appointment remains unchanged.",
    });
  } catch (error) {
    console.error(
      "square-create-refund unexpected error",
      error,
    );

    return jsonResponse(
      {
        error:
          "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Unexpected refund error.",
      },
      500,
    );
  }
});
