import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function redirectResponse(location: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      ...corsHeaders,
    },
  });
}

function errorRedirect(
  appUrl: string,
  message: string
) {
  const target = new URL("/admin", appUrl);

  target.searchParams.set(
    "square",
    "error"
  );

  target.searchParams.set(
    "message",
    message
  );

  return redirectResponse(target.toString());
}

function successRedirect(appUrl: string) {
  const target = new URL("/admin", appUrl);

  target.searchParams.set(
    "square",
    "connected"
  );

  return redirectResponse(target.toString());
}

function base64UrlToBytes(value: string) {
  const normalized = value
    .replaceAll("-", "+")
    .replaceAll("_", "/");

  const padded =
    normalized +
    "=".repeat(
      (4 - (normalized.length % 4)) % 4
    );

  const binary = atob(padded);

  return Uint8Array.from(
    binary,
    (character) => character.charCodeAt(0)
  );
}

function bytesToBase64(
  bytes: Uint8Array
) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

async function verifyStateSignature(
  encodedPayload: string,
  encodedSignature: string,
  encryptionKey: string
) {
  const cryptoKey =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(
        encryptionKey
      ),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["verify"]
    );

  return crypto.subtle.verify(
    "HMAC",
    cryptoKey,
    base64UrlToBytes(
      encodedSignature
    ),
    new TextEncoder().encode(
      encodedPayload
    )
  );
}

async function parseAndVerifyState(
  state: string,
  encryptionKey: string
) {
  const parts = state.split(".");

  if (parts.length !== 2) {
    throw new Error(
      "Invalid OAuth state."
    );
  }

  const [
    encodedPayload,
    encodedSignature,
  ] = parts;

  const valid =
    await verifyStateSignature(
      encodedPayload,
      encodedSignature,
      encryptionKey
    );

  if (!valid) {
    throw new Error(
      "OAuth state verification failed."
    );
  }

  const payloadJson =
    new TextDecoder().decode(
      base64UrlToBytes(
        encodedPayload
      )
    );

  const payload = JSON.parse(
    payloadJson
  ) as {
    userId?: string;
    barberSlug?: string;
    issuedAt?: number;
    expiresAt?: number;
    nonce?: string;
  };

  if (
    !payload.userId ||
    !payload.barberSlug ||
    !payload.expiresAt
  ) {
    throw new Error(
      "OAuth state is incomplete."
    );
  }

  const now = Math.floor(
    Date.now() / 1000
  );

  if (payload.expiresAt < now) {
    throw new Error(
      "OAuth state has expired."
    );
  }

  return payload;
}

async function createEncryptionKey(
  base64Key: string
) {
  const rawKey = Uint8Array.from(
    atob(base64Key),
    (character) =>
      character.charCodeAt(0)
  );

  if (rawKey.length !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must decode to 32 bytes."
    );
  }

  return crypto.subtle.importKey(
    "raw",
    rawKey,
    {
      name: "AES-GCM",
    },
    false,
    ["encrypt"]
  );
}

async function encryptSecret(
  plaintext: string,
  base64Key: string
) {
  const key =
    await createEncryptionKey(
      base64Key
    );

  const iv =
    crypto.getRandomValues(
      new Uint8Array(12)
    );

  const encrypted =
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      new TextEncoder().encode(
        plaintext
      )
    );

  return JSON.stringify({
    version: 1,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(
      new Uint8Array(encrypted)
    ),
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  const appUrl =
    Deno.env.get("APP_URL") ||
    "http://localhost:5173";

  if (request.method !== "GET") {
    return errorRedirect(
      appUrl,
      "Invalid callback request."
    );
  }

  try {
    const requestUrl =
      new URL(request.url);

    const authorizationCode =
      requestUrl.searchParams.get(
        "code"
      );

    const state =
      requestUrl.searchParams.get(
        "state"
      );

    const squareError =
      requestUrl.searchParams.get(
        "error"
      );

    const squareErrorDescription =
      requestUrl.searchParams.get(
        "error_description"
      );

    if (squareError) {
      return errorRedirect(
        appUrl,
        squareErrorDescription ||
          squareError
      );
    }

    if (
      !authorizationCode ||
      !state
    ) {
      return errorRedirect(
        appUrl,
        "Square did not return the required authorization code and state."
      );
    }

    const applicationId =
      Deno.env.get(
        "SQUARE_APPLICATION_ID"
      );

    const applicationSecret =
      Deno.env.get(
        "SQUARE_APPLICATION_SECRET"
      );

    const redirectUri =
      Deno.env.get(
        "SQUARE_REDIRECT_URI"
      );

    const environment =
      Deno.env.get(
        "SQUARE_ENVIRONMENT"
      ) || "sandbox";

    const encryptionKey =
      Deno.env.get(
        "TOKEN_ENCRYPTION_KEY"
      );

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL"
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (
      !applicationId ||
      !applicationSecret ||
      !redirectUri ||
      !encryptionKey ||
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      console.error(
        "Missing required callback environment variables."
      );

      return errorRedirect(
        appUrl,
        "Square OAuth callback is not fully configured."
      );
    }

    const verifiedState =
      await parseAndVerifyState(
        state,
        encryptionKey
      );

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq(
        "id",
        verifiedState.userId
      )
      .single();

    if (
      profileError ||
      profile?.role !== "admin"
    ) {
      console.error(
        "Admin profile verification failed:",
        profileError
      );

      return errorRedirect(
        appUrl,
        "The administrator account could not be verified."
      );
    }

    const tokenEndpoint =
      environment === "production"
        ? "https://connect.squareup.com/oauth2/token"
        : "https://connect.squareupsandbox.com/oauth2/token";

    const tokenResponse =
      await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          "Square-Version":
            "2025-01-23",
        },
        body: JSON.stringify({
          client_id:
            applicationId,
          client_secret:
            applicationSecret,
          code:
            authorizationCode,
          grant_type:
            "authorization_code",
          redirect_uri:
            redirectUri,
        }),
      });

    const tokenPayload =
      await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error(
        "Square token exchange failed:",
        tokenPayload
      );

      return errorRedirect(
        appUrl,
        tokenPayload?.message ||
          tokenPayload?.errors?.[0]?.detail ||
          "Square token exchange failed."
      );
    }

    const accessToken =
      tokenPayload?.access_token;

    const refreshToken =
      tokenPayload?.refresh_token;

    const merchantId =
      tokenPayload?.merchant_id;

    const expiresAt =
      tokenPayload?.expires_at;

    if (
      !accessToken ||
      !merchantId
    ) {
      console.error(
        "Square token response was incomplete:",
        tokenPayload
      );

      return errorRedirect(
        appUrl,
        "Square returned an incomplete token response."
      );
    }

    const encryptedAccessToken =
      await encryptSecret(
        accessToken,
        encryptionKey
      );

    const encryptedRefreshToken =
      refreshToken
        ? await encryptSecret(
            refreshToken,
            encryptionKey
          )
        : null;

    const locationsResponse =
      await fetch(
        environment === "production"
          ? "https://connect.squareup.com/v2/locations"
          : "https://connect.squareupsandbox.com/v2/locations",
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            "Content-Type":
              "application/json",
            "Square-Version":
              "2025-01-23",
          },
        }
      );

    const locationsPayload =
      await locationsResponse.json();

    let locationId: string | null =
      null;

    if (locationsResponse.ok) {
      const activeLocation =
        locationsPayload?.locations?.find(
          (location: {
            status?: string;
          }) =>
            location.status ===
            "ACTIVE"
        ) ||
        locationsPayload?.locations?.[0];

      locationId =
        activeLocation?.id || null;
    } else {
      console.error(
        "Unable to load Square locations:",
        locationsPayload
      );
    }

    const now =
      new Date().toISOString();

    const connectionRecord = {
      barber_slug:
        verifiedState.barberSlug,
      barber_name:
        verifiedState.barberSlug,
      status:
        "connected",
      merchant_id:
        merchantId,
      location_id:
        locationId,
      access_token_encrypted:
        encryptedAccessToken,
      refresh_token_encrypted:
        encryptedRefreshToken,
      token_expires_at:
        expiresAt || null,
      connected_at:
        now,
      disconnected_at:
        null,
      last_error:
        null,
      updated_at:
        now,
    };

    const {
      error: upsertError,
    } = await supabaseAdmin
      .from("square_connections")
      .upsert(
        connectionRecord,
        {
          onConflict:
            "barber_slug",
        }
      );

    if (upsertError) {
      console.error(
        "Unable to store Square connection:",
        upsertError
      );

      return errorRedirect(
        appUrl,
        "Square connected, but the credentials could not be saved."
      );
    }

    return successRedirect(
      appUrl
    );
  } catch (error) {
    console.error(
      "Unexpected square-oauth-callback error:",
      error
    );

    return errorRedirect(
      appUrl,
      error instanceof Error
        ? error.message
        : "Unexpected Square OAuth callback error."
    );
  }
});
