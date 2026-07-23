import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SQUARE_API_VERSION = "2025-04-16";
const SQUARE_CONNECTIONS_TABLE = "square_connections";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CheckoutRequest = {
  booking_id?: string;
  barber_id?: string;
  barber_slug?: string;
  service_id?: string;
  service_name?: string;
  amount?: number;
  currency?: string;
  payment_type?: "deposit" | "full";
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


/**
 * Converts an optional US phone number to E.164.
 *
 * Invalid or incomplete values return null so an optional phone number never
 * prevents checkout from continuing.
 */
function normalizeOptionalUsPhone(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  let digits = value.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  if (digits.length !== 10) {
    return null;
  }

  return `+1${digits}`;
}

function base64ToBytes(value: string): Uint8Array {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

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

/**
 * Decrypts the token format written by square-oauth-callback:
 *
 * - TOKEN_ENCRYPTION_KEY is Base64 text
 * - decoding it must produce exactly 32 bytes
 * - AES-GCM is used with the stored 12-byte IV
 * - ciphertext includes the AES-GCM authentication tag
 */
async function importTokenEncryptionKey(): Promise<CryptoKey> {
  const encodedKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");

  if (!encodedKey) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not configured.",
    );
  }

  let rawKey: Uint8Array;

  try {
    rawKey = base64ToBytes(encodedKey.trim());
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
      {
        name: "AES-GCM",
        iv,
      },
      key,
      ciphertext,
    );

    const token = new TextDecoder().decode(decryptedBytes).trim();

    if (!token) {
      throw new Error(
        "The decrypted Square access token is empty.",
      );
    }

    return token;
  } catch (error) {
    console.error("Unable to decrypt Square access token", error);

    throw new Error(
      "Unable to decrypt the Square access token. Restore the original TOKEN_ENCRYPTION_KEY or reconnect Square after setting a new valid key.",
    );
  }
}

async function findSquareConnection(
  supabaseAdmin: ReturnType<typeof createClient>,
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

  /*
   * First try the stable barber UUID.
   */
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

  /*
   * Your existing Samuel connection currently has barber_id = null,
   * so fall back to barber_slug.
   */
  if (!barberSlug) {
    return {
      connection: null,
      error: null,
    };
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
      console.error(
        "Missing Supabase server environment variables",
      );

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
      console.error(
        "Unable to verify checkout user",
        userError,
      );

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

    if (!body.service_name) {
      return json(
        {
          error: "SERVICE_NAME_REQUIRED",
          message: "service_name is required.",
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

    const amount = positiveInteger(body.amount, "amount");
    const currency = (
      body.currency || "USD"
    ).toUpperCase();

    /*
     * Verify that the appointment belongs to the signed-in user.
     */
    const {
      data: appointment,
      error: appointmentError,
    } = await supabaseAdmin
      .from("appointments")
      .select(
        [
          "id",
          "customer_id",
          "barber_id",
          "service_id",
          "payment_status",
          "amount_due_now",
        ].join(", "),
      )
      .eq("id", body.booking_id)
      .eq("customer_id", user.id)
      .maybeSingle();

    if (appointmentError) {
      console.error(
        "Appointment lookup failed",
        appointmentError,
      );

      return json(
        {
          error: "APPOINTMENT_LOOKUP_FAILED",
          message: appointmentError.message,
        },
        500,
      );
    }

    if (!appointment) {
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
          message:
            "This appointment has already been paid.",
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
            "The connected Square authorization has expired. The barber must reconnect Square.",
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
        `${
          siteUrl.replace(/\/$/, "")
        }/booking-confirmation`,
      )
      : null;

    if (fallbackRedirectUrl) {
      fallbackRedirectUrl.searchParams.set(
        "booking_id",
        body.booking_id,
      );
    }

    const redirectUrl =
      body.redirect_url ||
      fallbackRedirectUrl?.toString();

    let verifiedRedirectUrl = redirectUrl;

    if (verifiedRedirectUrl) {
      try {
        const parsedRedirectUrl = new URL(
          verifiedRedirectUrl,
        );

        if (
          !parsedRedirectUrl.searchParams.has(
            "booking_id",
          )
        ) {
          parsedRedirectUrl.searchParams.set(
            "booking_id",
            body.booking_id,
          );
        }

        verifiedRedirectUrl =
          parsedRedirectUrl.toString();
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
      Deno.env.get("SQUARE_ENVIRONMENT") ===
        "production";

    const squareBaseUrl = production
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";

    const idempotencyKey =
      `appointment-${body.booking_id}-${body.payment_type}`;

    const squarePayload: Record<string, unknown> = {
      idempotency_key: idempotencyKey,
      quick_pay: {
        name: `${body.service_name} (${
          body.payment_type === "deposit"
            ? "Deposit"
            : "Full payment"
        })`,
        price_money: {
          amount,
          currency,
        },
        location_id: connection.location_id,
      },
    };

    const prePopulatedData: Record<string, string> = {};

    if (body.customer_email) {
      prePopulatedData.buyer_email =
        body.customer_email;
    }

    const normalizedCustomerPhone =
      normalizeOptionalUsPhone(body.customer_phone);

    if (normalizedCustomerPhone) {
      prePopulatedData.buyer_phone_number =
        normalizedCustomerPhone;
    }

    if (Object.keys(prePopulatedData).length > 0) {
      squarePayload.pre_populated_data =
        prePopulatedData;
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

    let squareResult: Record<string, any>;

    try {
      squareResult = await squareResponse.json();
    } catch {
      squareResult = {
        error:
          "Square returned a non-JSON response.",
      };
    }

    if (!squareResponse.ok) {
      console.error(
        "Square CreatePaymentLink failed",
        {
          status: squareResponse.status,
          result: squareResult,
          environment: production
            ? "production"
            : "sandbox",
          locationId: connection.location_id,
        },
      );

      return json(
        {
          error: "SQUARE_CHECKOUT_FAILED",
          message:
            "Square could not create the checkout link.",
          details:
            squareResult?.errors ?? squareResult,
        },
        squareResponse.status,
      );
    }

    const paymentLink =
      squareResult?.payment_link;

    const squareOrderId =
      paymentLink?.order_id ||
      squareResult?.related_resources
        ?.orders?.[0]?.id ||
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

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("appointments")
      .update({
        payment_status: "pending",
        square_order_id: squareOrderId,
        square_location_id:
          connection.location_id,
      })
      .eq("id", body.booking_id)
      .eq("customer_id", user.id);

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
        },
        500,
      );
    }

    return json({
      checkout_url: paymentLink.url,
      url: paymentLink.url,
      payment_link_id:
        paymentLink.id ?? null,
      square_order_id: squareOrderId,
      merchant_id: connection.merchant_id,
      location_id: connection.location_id,
      environment: production
        ? "production"
        : "sandbox",
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
