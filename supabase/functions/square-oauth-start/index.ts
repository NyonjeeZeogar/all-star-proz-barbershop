import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function encodeJsonBase64Url(
  value: Record<string, unknown>
) {
  const encoded = new TextEncoder().encode(
    JSON.stringify(value)
  );

  return toBase64Url(encoded);
}

async function createStateSignature(
  encodedPayload: string,
  encryptionKey: string
) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(encryptionKey),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(encodedPayload)
  );

  return toBase64Url(
    new Uint8Array(signature)
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed.",
      },
      405
    );
  }

  try {
    const authorization =
      request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse(
        {
          error:
            "Missing Supabase authorization token.",
        },
        401
      );
    }

    const accessToken =
      authorization.replace("Bearer ", "").trim();

    if (!accessToken) {
      return jsonResponse(
        {
          error:
            "Missing Supabase authorization token.",
        },
        401
      );
    }

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const supabaseAnonKey =
      Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(
        "Missing Supabase function environment variables."
      );

      return jsonResponse(
        {
          error:
            "The function is missing its Supabase configuration.",
        },
        500
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      console.error(
        "Unable to authenticate function caller:",
        userError
      );

      return jsonResponse(
        {
          error:
            "Your login session is invalid or expired. Sign out and sign in again.",
        },
        401
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error(
        "Unable to load admin profile:",
        profileError
      );

      return jsonResponse(
        {
          error:
            "Unable to verify the administrator profile.",
        },
        500
      );
    }

    if (profile?.role !== "admin") {
      return jsonResponse(
        {
          error:
            "Administrator access is required.",
        },
        403
      );
    }

    let requestBody: {
      barberSlug?: string;
    };

    try {
      requestBody = await request.json();
    } catch {
      return jsonResponse(
        {
          error:
            "The request body must contain valid JSON.",
        },
        400
      );
    }

    const barberSlug =
      requestBody?.barberSlug?.trim();

    if (!barberSlug) {
      return jsonResponse(
        {
          error: "barberSlug is required.",
        },
        400
      );
    }

    const applicationId =
      Deno.env.get("SQUARE_APPLICATION_ID");

    const redirectUri =
      Deno.env.get("SQUARE_REDIRECT_URI");

    const environment =
      Deno.env.get("SQUARE_ENVIRONMENT") ||
      "sandbox";

    const encryptionKey =
      Deno.env.get("TOKEN_ENCRYPTION_KEY");

    if (
      !applicationId ||
      !redirectUri ||
      !encryptionKey
    ) {
      console.error(
        "Missing required Square OAuth secrets."
      );

      return jsonResponse(
        {
          error:
            "Square OAuth is not fully configured.",
        },
        500
      );
    }

    const issuedAt = Math.floor(
      Date.now() / 1000
    );

    const statePayload = {
      userId: user.id,
      barberSlug,
      issuedAt,
      expiresAt: issuedAt + 10 * 60,
      nonce: crypto.randomUUID(),
    };

    const encodedPayload =
      encodeJsonBase64Url(statePayload);

    const signature =
      await createStateSignature(
        encodedPayload,
        encryptionKey
      );

    const state = `${encodedPayload}.${signature}`;

    const squareAuthorizeBaseUrl =
      environment === "production"
        ? "https://connect.squareup.com/oauth2/authorize"
        : "https://connect.squareupsandbox.com/oauth2/authorize";

    const permissions = [
      "MERCHANT_PROFILE_READ",
      "PAYMENTS_READ",
      "PAYMENTS_WRITE",
      "ORDERS_READ",
      "ORDERS_WRITE",
      "ITEMS_READ",
    ].join(" ");

    const authorizationUrl =
      new URL(squareAuthorizeBaseUrl);

    authorizationUrl.searchParams.set(
      "client_id",
      applicationId
    );

    authorizationUrl.searchParams.set(
      "scope",
      permissions
    );

    authorizationUrl.searchParams.set(
      "state",
      state
    );

    authorizationUrl.searchParams.set(
      "redirect_uri",
      redirectUri
    );

    return jsonResponse({
      authorizationUrl:
        authorizationUrl.toString(),
    });
  } catch (error) {
    console.error(
      "Unexpected square-oauth-start error:",
      error
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      500
    );
  }
});
