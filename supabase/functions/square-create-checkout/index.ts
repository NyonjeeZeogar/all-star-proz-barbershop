import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SQUARE_API_VERSION = "2025-04-16";
const SQUARE_CONNECTIONS_TABLE = "square_connections";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PaymentType = "deposit" | "full";

type CheckoutRequest = {
  booking_id?: string;
  barber_id?: string;
  barber_slug?: string;
  service_id?: string;
  service_name?: string;
  amount?: number; // Deprecated. Stored appointment totals are authoritative.
  currency?: string;
  payment_type?: PaymentType;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  redirect_url?: string;
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
  customer_id: string | null;
  user_id: string | null;
  barber_id: string;
  service_id: string | null;
  payment_status: string | null;
  payment_option: PaymentType | null;
  service_subtotal_cents: number | null;
  deposit_cents: number | null;
  booking_fee_cents: number | null;
  tip_cents: number | null;
  tax_cents: number | null;
  charged_today_cents: number | null;
  currency: string | null;
  square_order_id: string | null;
};

type AppointmentServiceRecord = {
  id: string;
  service_id: string | null;
  service_name: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
};

type SquareLineItem = {
  name: string;
  quantity: string;
  base_price_money: {
    amount: number;
    currency: string;
  };
  note?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function positiveInteger(value: unknown, field: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${field} must be a positive number in cents`);
  }

  return Math.round(amount);
}

function nonNegativeInteger(value: unknown, fallback = 0) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0
    ? Math.round(amount)
    : fallback;
}

function normalizeCurrency(value: unknown) {
  const currency =
    typeof value === "string" && value.trim()
      ? value.trim().toUpperCase()
      : "USD";

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("currency must be a valid three-letter code");
  }

  return currency;
}

/**
 * Converts an optional US phone number to E.164.
 * Invalid values return null so an optional phone never blocks checkout.
 */
function normalizeOptionalUsPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;

  let digits = value.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  return digits.length === 10 ? `+1${digits}` : null;
}

function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function importTokenEncryptionKey(): Promise<CryptoKey> {
  const encodedKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");

  if (!encodedKey) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not configured.");
  }

  let rawKey: Uint8Array;

  try {
    rawKey = base64ToBytes(encodedKey.trim());
  } catch {
    throw new Error("TOKEN_ENCRYPTION_KEY must be valid Base64.");
  }

  if (rawKey.byteLength !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.",
    );
  }

  return await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
}

async function decryptSquareToken(
  encryptedValue: string,
): Promise<string> {
  let payload: EncryptedTokenPayload;

  try {
    payload = JSON.parse(encryptedValue) as EncryptedTokenPayload;
  } catch {
    throw new Error(
      "The encrypted Square access token is not valid JSON.",
    );
  }

  if (
    payload.version !== 1 ||
    typeof payload.iv !== "string" ||
    !payload.iv ||
    typeof payload.ciphertext !== "string" ||
    !payload.ciphertext
  ) {
    throw new Error(
      "The encrypted Square access token has an unsupported format.",
    );
  }

  try {
    const key = await importTokenEncryptionKey();
    const iv = base64ToBytes(payload.iv);
    const ciphertext = base64ToBytes(payload.ciphertext);

    if (iv.byteLength !== 12) {
      throw new Error(
        "The encrypted Square access token has an invalid IV.",
      );
    }

    const decryptedBytes = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );

    const token = new TextDecoder().decode(decryptedBytes).trim();

    if (!token) {
      throw new Error("The decrypted Square access token is empty.");
    }

    return token;
  } catch (error) {
    console.error("Unable to decrypt Square access token", error);

    throw new Error(
      "Unable to decrypt the Square access token. Restore the original TOKEN_ENCRYPTION_KEY or reconnect Square.",
    );
  }
}

async function findSquareConnection(
  supabaseAdmin: SupabaseClient,
  barberId: string,
  barberSlug?: string,
): Promise<{
  connection: SquareConnection | null;
  error: Error | null;
}> {
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

  const {
    data: connectionById,
    error: connectionByIdError,
  } = await supabaseAdmin
    .from(SQUARE_CONNECTIONS_TABLE)
    .select(selectedColumns)
    .eq("barber_id", barberId)
    .eq("status", "connected")
    .maybeSingle();

  if (connectionByIdError) {
    return {
      connection: null,
      error: new Error(connectionByIdError.message),
    };
  }

  if (connectionById) {
    return {
      connection: connectionById as SquareConnection,
      error: null,
    };
  }

  if (!barberSlug) {
    return { connection: null, error: null };
  }

  const {
    data: connectionBySlug,
    error: connectionBySlugError,
  } = await supabaseAdmin
    .from(SQUARE_CONNECTIONS_TABLE)
    .select(selectedColumns)
    .eq("barber_slug", barberSlug)
    .eq("status", "connected")
    .maybeSingle();

  if (connectionBySlugError) {
    return {
      connection: null,
      error: new Error(connectionBySlugError.message),
    };
  }

  return {
    connection:
      (connectionBySlug as SquareConnection | null) ?? null,
    error: null,
  };
}

/**
 * Allocates an exact total across service rows in proportion to their stored
 * line totals. The final row receives any rounding remainder.
 */
function allocateAcrossServices(
  services: AppointmentServiceRecord[],
  totalToAllocate: number,
): number[] {
  if (services.length === 0) return [];

  const sourceTotal = services.reduce(
    (sum, item) => sum + nonNegativeInteger(item.line_total_cents),
    0,
  );

  if (sourceTotal <= 0) {
    const allocations = services.map(() => 0);
    allocations[allocations.length - 1] = totalToAllocate;
    return allocations;
  }

  let allocated = 0;

  return services.map((item, index) => {
    if (index === services.length - 1) {
      return totalToAllocate - allocated;
    }

    const value = Math.floor(
      (nonNegativeInteger(item.line_total_cents) / sourceTotal) *
        totalToAllocate,
    );

    allocated += value;
    return value;
  });
}

function buildSquareLineItems({
  services,
  paymentType,
  serviceSubtotalCents,
  depositCents,
  bookingFeeCents,
  tipCents,
  taxCents,
  chargedTodayCents,
  currency,
}: {
  services: AppointmentServiceRecord[];
  paymentType: PaymentType;
  serviceSubtotalCents: number;
  depositCents: number;
  bookingFeeCents: number;
  tipCents: number;
  taxCents: number;
  chargedTodayCents: number;
  currency: string;
}): SquareLineItem[] {
  const lineItems: SquareLineItem[] = [];

  if (paymentType === "full") {
    for (const service of services) {
      const lineTotal = nonNegativeInteger(service.line_total_cents);

      if (lineTotal <= 0) continue;

      lineItems.push({
        name: service.service_name,
        quantity: "1",
        base_price_money: {
          amount: lineTotal,
          currency,
        },
        note:
          service.quantity > 1
            ? `${service.quantity} × ${service.unit_price_cents} cents`
            : undefined,
      });
    }
  } else {
    const allocations = allocateAcrossServices(services, depositCents);

    services.forEach((service, index) => {
      const amount = allocations[index] ?? 0;

      if (amount <= 0) return;

      lineItems.push({
        name: `${service.service_name} deposit`,
        quantity: "1",
        base_price_money: {
          amount,
          currency,
        },
        note:
          service.quantity > 1
            ? `50% deposit for quantity ${service.quantity}`
            : "50% service deposit",
      });
    });
  }

  if (bookingFeeCents > 0) {
    lineItems.push({
      name: "Booking fee",
      quantity: "1",
      base_price_money: {
        amount: bookingFeeCents,
        currency,
      },
    });
  }

  if (tipCents > 0) {
    lineItems.push({
      name: "Tip",
      quantity: "1",
      base_price_money: {
        amount: tipCents,
        currency,
      },
    });
  }

  if (taxCents > 0) {
    lineItems.push({
      name: "Tax",
      quantity: "1",
      base_price_money: {
        amount: taxCents,
        currency,
      },
    });
  }

  const currentTotal = lineItems.reduce(
    (sum, item) => sum + item.base_price_money.amount,
    0,
  );

  const difference = chargedTodayCents - currentTotal;

  if (difference !== 0) {
    lineItems.push({
      name: difference > 0 ? "Pricing adjustment" : "Pricing discount",
      quantity: "1",
      base_price_money: {
        amount: Math.abs(difference),
        currency,
      },
      note:
        difference > 0
          ? "Reconciles checkout to the authoritative appointment total."
          : "A negative reconciliation cannot be represented as a positive Square item.",
    });
  }

  const finalTotal = lineItems.reduce(
    (sum, item) => sum + item.base_price_money.amount,
    0,
  );

  if (difference < 0 || finalTotal !== chargedTodayCents) {
    // Fall back to one exact item rather than risking a mismatched Square order.
    return [
      {
        name:
          paymentType === "deposit"
            ? "Appointment deposit and fees"
            : "Appointment services and fees",
        quantity: "1",
        base_price_money: {
          amount: chargedTodayCents,
          currency,
        },
        note: `${services.length} selected service line(s); service subtotal ${serviceSubtotalCents} cents.`,
      },
    ];
  }

  return lineItems;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json(
      {
        error: "METHOD_NOT_ALLOWED",
        message: "Method not allowed.",
      },
      405,
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!supabaseUrl || !serviceRoleKey) {
      return json(
        {
          error: "SERVER_CONFIGURATION_ERROR",
          message:
            "The checkout service is not configured correctly.",
        },
        500,
      );
    }

    const authorization = req.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return json(
        {
          error: "AUTH_REQUIRED",
          message:
            "You must be signed in to start checkout.",
        },
        401,
      );
    }

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

    const jwt = authorization.slice("Bearer ".length);

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      console.error("Unable to verify checkout user", userError);

      return json(
        {
          error: "INVALID_SESSION",
          message:
            "Your session is invalid or expired. Please sign in again.",
        },
        401,
      );
    }

    let body: CheckoutRequest;

    try {
      body = (await req.json()) as CheckoutRequest;
    } catch {
      return json(
        {
          error: "INVALID_JSON",
          message: "The request body must be valid JSON.",
        },
        400,
      );
    }

    if (!body.booking_id) {
      return json(
        {
          error: "BOOKING_ID_REQUIRED",
          message: "booking_id is required.",
        },
        400,
      );
    }

    if (!body.barber_id) {
      return json(
        {
          error: "BARBER_ID_REQUIRED",
          message: "barber_id is required.",
        },
        400,
      );
    }

    if (
      !["deposit", "full"].includes(
        body.payment_type || "",
      )
    ) {
      return json(
        {
          error: "INVALID_PAYMENT_TYPE",
          message:
            "payment_type must be deposit or full.",
        },
        400,
      );
    }

    /*
     * Load the appointment before reading any amount fields.
     * customer_id OR user_id is accepted for older appointment rows.
     */
    const {
      data: appointmentData,
      error: appointmentError,
    } = await supabaseAdmin
      .from("appointments")
      .select(
        [
          "id",
          "customer_id",
          "user_id",
          "barber_id",
          "service_id",
          "payment_status",
          "payment_option",
          "service_subtotal_cents",
          "deposit_cents",
          "booking_fee_cents",
          "tip_cents",
          "tax_cents",
          "charged_today_cents",
          "currency",
          "square_order_id",
        ].join(", "),
      )
      .eq("id", body.booking_id)
      .maybeSingle();

    if (appointmentError) {
      console.error("Appointment lookup failed", appointmentError);

      return json(
        {
          error: "APPOINTMENT_LOOKUP_FAILED",
          message: appointmentError.message,
        },
        500,
      );
    }

    const appointment =
      appointmentData as AppointmentRecord | null;

    if (
      !appointment ||
      (
        appointment.customer_id !== user.id &&
        appointment.user_id !== user.id
      )
    ) {
      return json(
        {
          error: "APPOINTMENT_NOT_FOUND",
          message:
            "The appointment was not found or does not belong to you.",
        },
        404,
      );
    }

    if (appointment.barber_id !== body.barber_id) {
      return json(
        {
          error: "BARBER_MISMATCH",
          message:
            "The selected barber does not match the appointment.",
        },
        400,
      );
    }

    if (appointment.payment_status === "paid") {
      return json(
        {
          error: "APPOINTMENT_ALREADY_PAID",
          message: "This appointment has already been paid.",
        },
        409,
      );
    }

    const paymentType = body.payment_type as PaymentType;

    if (
      appointment.payment_option &&
      appointment.payment_option !== paymentType
    ) {
      return json(
        {
          error: "PAYMENT_TYPE_MISMATCH",
          message:
            "The payment type does not match the stored appointment.",
        },
        409,
      );
    }

    const chargedTodayCents = positiveInteger(
      appointment.charged_today_cents,
      "appointment.charged_today_cents",
    );

    const currency = normalizeCurrency(
      appointment.currency || body.currency || "USD",
    );

    const {
      data: serviceRows,
      error: servicesError,
    } = await supabaseAdmin
      .from("appointment_services")
      .select(
        [
          "id",
          "service_id",
          "service_name",
          "unit_price_cents",
          "quantity",
          "line_total_cents",
        ].join(", "),
      )
      .eq("appointment_id", appointment.id)
      .order("created_at", { ascending: true });

    if (servicesError) {
      console.error(
        "Appointment service lookup failed",
        servicesError,
      );

      return json(
        {
          error: "APPOINTMENT_SERVICES_LOOKUP_FAILED",
          message: servicesError.message,
        },
        500,
      );
    }

    const appointmentServices =
      (serviceRows ?? []) as AppointmentServiceRecord[];

    if (appointmentServices.length === 0) {
      return json(
        {
          error: "APPOINTMENT_SERVICES_MISSING",
          message:
            "No service snapshots were found for this appointment.",
        },
        409,
      );
    }

    const storedSubtotal = nonNegativeInteger(
      appointment.service_subtotal_cents,
    );

    const snapshotSubtotal = appointmentServices.reduce(
      (sum, item) =>
        sum + nonNegativeInteger(item.line_total_cents),
      0,
    );

    if (
      storedSubtotal > 0 &&
      snapshotSubtotal !== storedSubtotal
    ) {
      console.error("Appointment subtotal mismatch", {
        appointmentId: appointment.id,
        storedSubtotal,
        snapshotSubtotal,
      });

      return json(
        {
          error: "APPOINTMENT_PRICING_MISMATCH",
          message:
            "The stored service lines do not match the appointment subtotal.",
        },
        409,
      );
    }

    const {
      connection,
      error: connectionError,
    } = await findSquareConnection(
      supabaseAdmin,
      body.barber_id,
      body.barber_slug,
    );

    if (connectionError) {
      console.error(
        "Square connection lookup failed",
        connectionError,
      );

      return json(
        {
          error: "SQUARE_CONNECTION_LOOKUP_FAILED",
          message: connectionError.message,
        },
        500,
      );
    }

    if (!connection) {
      return json(
        {
          error: "SQUARE_NOT_CONNECTED",
          message:
            "This barber has not connected a Square account yet.",
        },
        409,
      );
    }

    if (!connection.access_token_encrypted) {
      return json(
        {
          error: "SQUARE_ACCESS_TOKEN_MISSING",
          message:
            "The connected Square account does not have an access token.",
        },
        500,
      );
    }

    if (!connection.location_id) {
      return json(
        {
          error: "SQUARE_LOCATION_MISSING",
          message:
            "The connected Square account does not have a location ID.",
        },
        500,
      );
    }

    if (
      connection.token_expires_at &&
      new Date(connection.token_expires_at).getTime() <=
        Date.now()
    ) {
      return json(
        {
          error: "SQUARE_TOKEN_EXPIRED",
          message:
            "The connected Square authorization has expired. Reconnect Square.",
        },
        401,
      );
    }

    const accessToken = await decryptSquareToken(
      connection.access_token_encrypted,
    );

    const siteUrl =
      Deno.env.get("PUBLIC_SITE_URL") ||
      Deno.env.get("APP_URL");

    const fallbackRedirectUrl = siteUrl
      ? new URL(
        `${siteUrl.replace(/\/$/, "")}/booking-confirmation`,
      )
      : null;

    if (fallbackRedirectUrl) {
      fallbackRedirectUrl.searchParams.set(
        "booking_id",
        body.booking_id,
      );
    }

    let verifiedRedirectUrl =
      body.redirect_url ||
      fallbackRedirectUrl?.toString();

    if (verifiedRedirectUrl) {
      try {
        const parsedRedirectUrl = new URL(verifiedRedirectUrl);

        if (
          !parsedRedirectUrl.searchParams.has("booking_id")
        ) {
          parsedRedirectUrl.searchParams.set(
            "booking_id",
            body.booking_id,
          );
        }

        verifiedRedirectUrl = parsedRedirectUrl.toString();
      } catch {
        return json(
          {
            error: "INVALID_REDIRECT_URL",
            message:
              "redirect_url must be a valid absolute URL.",
          },
          400,
        );
      }
    }

    const production =
      Deno.env.get("SQUARE_ENVIRONMENT") === "production";

    const squareBaseUrl = production
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";

    const lineItems = buildSquareLineItems({
      services: appointmentServices,
      paymentType,
      serviceSubtotalCents: storedSubtotal || snapshotSubtotal,
      depositCents: nonNegativeInteger(
        appointment.deposit_cents,
      ),
      bookingFeeCents: nonNegativeInteger(
        appointment.booking_fee_cents,
      ),
      tipCents: nonNegativeInteger(
        appointment.tip_cents,
      ),
      taxCents: nonNegativeInteger(
        appointment.tax_cents,
      ),
      chargedTodayCents,
      currency,
    });

    const lineItemTotal = lineItems.reduce(
      (sum, item) =>
        sum + item.base_price_money.amount *
          Number.parseInt(item.quantity, 10),
      0,
    );

    if (lineItemTotal !== chargedTodayCents) {
      console.error("Square line item total mismatch", {
        appointmentId: appointment.id,
        lineItemTotal,
        chargedTodayCents,
      });

      return json(
        {
          error: "CHECKOUT_TOTAL_MISMATCH",
          message:
            "Unable to reconcile Square line items with the amount due today.",
        },
        500,
      );
    }

    const idempotencyKey =
      `appointment-${body.booking_id}-${paymentType}-${chargedTodayCents}`;

    const squarePayload: Record<string, unknown> = {
      idempotency_key: idempotencyKey,
      order: {
        location_id: connection.location_id,
        reference_id: appointment.id,
        line_items: lineItems,
      },
    };

    const prePopulatedData: Record<string, string> = {};

    const customerEmail =
      body.customer_email?.trim();

    if (customerEmail) {
      prePopulatedData.buyer_email = customerEmail;
    }

    const normalizedCustomerPhone =
      normalizeOptionalUsPhone(body.customer_phone);

    if (normalizedCustomerPhone) {
      prePopulatedData.buyer_phone_number =
        normalizedCustomerPhone;
    }

    if (Object.keys(prePopulatedData).length > 0) {
      squarePayload.pre_populated_data = prePopulatedData;
    }

    if (verifiedRedirectUrl) {
      squarePayload.checkout_options = {
        redirect_url: verifiedRedirectUrl,
        ask_for_shipping_address: false,
      };
    }

    const squareResponse = await fetch(
      `${squareBaseUrl}/v2/online-checkout/payment-links`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Square-Version": SQUARE_API_VERSION,
        },
        body: JSON.stringify(squarePayload),
      },
    );

    const rawSquareBody = await squareResponse.text();
    let squareResult: Record<string, any>;

    try {
      squareResult = rawSquareBody
        ? JSON.parse(rawSquareBody)
        : {};
    } catch {
      squareResult = {
        raw_response: rawSquareBody,
      };
    }

    if (!squareResponse.ok) {
      console.error("Square CreatePaymentLink failed", {
        status: squareResponse.status,
        result: squareResult,
        environment: production ? "production" : "sandbox",
        locationId: connection.location_id,
        appointmentId: appointment.id,
        chargedTodayCents,
      });

      return json(
        {
          error: "SQUARE_CHECKOUT_FAILED",
          message:
            squareResult?.errors?.[0]?.detail ||
            "Square could not create the checkout link.",
          details:
            squareResult?.errors ?? squareResult,
        },
        squareResponse.status >= 400 &&
            squareResponse.status < 600
          ? squareResponse.status
          : 502,
      );
    }

    const paymentLink = squareResult?.payment_link;

    const squareOrderId =
      paymentLink?.order_id ||
      squareResult?.related_resources?.orders?.[0]?.id ||
      null;

    if (!paymentLink?.url) {
      console.error(
        "Square response did not include payment_link.url",
        squareResult,
      );

      return json(
        {
          error: "SQUARE_CHECKOUT_URL_MISSING",
          message:
            "Square did not return a checkout URL.",
        },
        502,
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("appointments")
      .update({
        payment_status: "pending",
        square_order_id: squareOrderId,
        square_location_id: connection.location_id,
      })
      .eq("id", appointment.id);

    if (updateError) {
      console.error(
        "Checkout created but appointment update failed",
        updateError,
      );

      return json(
        {
          error: "APPOINTMENT_UPDATE_FAILED",
          message:
            "Square checkout was created, but the appointment could not be linked to it.",
          details: updateError.message,
          checkout_url: paymentLink.url,
        },
        500,
      );
    }

    return json({
      checkout_url: paymentLink.url,
      url: paymentLink.url,
      payment_link_id: paymentLink.id ?? null,
      square_order_id: squareOrderId,
      merchant_id: connection.merchant_id,
      location_id: connection.location_id,
      amount_cents: chargedTodayCents,
      currency,
      payment_type: paymentType,
      service_lines: appointmentServices.length,
      environment: production ? "production" : "sandbox",
    });
  } catch (error) {
    console.error(
      "square-create-checkout unexpected error",
      error,
    );

    return json(
      {
        error: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Unexpected checkout error",
      },
      500,
    );
  }
});
