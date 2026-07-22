import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
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

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        error: "METHOD_NOT_ALLOWED",
        message: "Only POST requests are supported.",
      },
      405,
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase environment variables.");

      return jsonResponse(
        {
          error: "SERVER_CONFIGURATION_ERROR",
          message: "The disconnect function is not configured correctly.",
        },
        500,
      );
    }

    const authorization = request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse(
        {
          error: "UNAUTHORIZED",
          message: "Missing authorization token.",
        },
        401,
      );
    }

    const accessToken = authorization.slice("Bearer ".length).trim();

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Validate the caller's Supabase access token.
    const {
      data: userData,
      error: userError,
    } = await adminClient.auth.getUser(accessToken);

    if (userError || !userData.user) {
      console.error("Unable to validate user:", userError);

      return jsonResponse(
        {
          error: "UNAUTHORIZED",
          message: "Invalid or expired login session.",
        },
        401,
      );
    }

    // The application role is stored in public.profiles,
    // not in user.app_metadata.
    const {
      data: profile,
      error: profileError,
    } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Unable to read profile:", profileError);

      return jsonResponse(
        {
          error: "PROFILE_LOOKUP_FAILED",
          message: "Unable to verify administrator permissions.",
        },
        500,
      );
    }

    if (!profile || profile.role !== "admin") {
      return jsonResponse(
        {
          error: "FORBIDDEN",
          message: "Administrator access is required.",
        },
        403,
      );
    }

    const body = await request.json().catch(() => null);

    const barberSlug =
      typeof body?.barberSlug === "string"
        ? body.barberSlug.trim()
        : typeof body?.barber_slug === "string"
          ? body.barber_slug.trim()
          : "";

    const barberId =
      typeof body?.barberId === "string"
        ? body.barberId.trim()
        : typeof body?.barber_id === "string"
          ? body.barber_id.trim()
          : "";

    if (!barberSlug && !barberId) {
      return jsonResponse(
        {
          error: "INVALID_REQUEST",
          message: "barberSlug or barberId is required.",
        },
        400,
      );
    }

    let connectionQuery = adminClient
      .from("square_connections")
      .select(
        `
          id,
          barber_id,
          barber_slug,
          status
        `,
      );

    if (barberId) {
      connectionQuery = connectionQuery.eq("barber_id", barberId);
    } else {
      connectionQuery = connectionQuery.eq("barber_slug", barberSlug);
    }

    const {
      data: connection,
      error: connectionError,
    } = await connectionQuery.maybeSingle();

    if (connectionError) {
      console.error(
        "Unable to find Square connection:",
        connectionError,
      );

      return jsonResponse(
        {
          error: "DATABASE_ERROR",
          message: "Unable to load the Square connection.",
        },
        500,
      );
    }

    if (!connection) {
      return jsonResponse(
        {
          error: "CONNECTION_NOT_FOUND",
          message: "No Square connection exists for this barber.",
        },
        404,
      );
    }

    /*
     * We intentionally clear the local credentials without calling
     * Square's revoke endpoint.
     *
     * The previous tokens were encrypted with an obsolete encryption
     * key, so this function cannot decrypt them to revoke them remotely.
     * A fresh OAuth connection will replace them with newly encrypted
     * credentials.
     */
    const {
      error: updateError,
    } = await adminClient
      .from("square_connections")
      .update({
        status: "disconnected",
        merchant_id: null,
        location_id: null,
        access_token_encrypted: null,
        refresh_token_encrypted: null,
        token_expires_at: null,
        disconnected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    if (updateError) {
      console.error(
        "Unable to disconnect Square account:",
        updateError,
      );

      return jsonResponse(
        {
          error: "DISCONNECT_FAILED",
          message: "Unable to disconnect the Square account.",
          details: updateError.message,
        },
        500,
      );
    }

    return jsonResponse({
      success: true,
      message: "Square account disconnected successfully.",
      barberSlug: connection.barber_slug,
    });
  } catch (error) {
    console.error("Unexpected disconnect error:", error);

    return jsonResponse(
      {
        error: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      },
      500,
    );
  }
});
