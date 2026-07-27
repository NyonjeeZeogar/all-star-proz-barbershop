import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function text(body: string, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

function mapStatus(providerStatus: string) {
  switch (providerStatus) {
    case "delivered":
    case "read": return "delivered";
    case "failed":
    case "undelivered":
    case "canceled": return "failed";
    case "sent": return "sent";
    default: return "pending";
  }
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function isValidTwilioSignature(requestUrl: string, params: URLSearchParams, receivedSignature: string, authToken: string) {
  const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const data = requestUrl + sorted.map(([key, value]) => `${key}${value}`).join("");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(authToken), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
  return bytesToBase64(signature) === receivedSignature;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return text("Method not allowed.", 405);

  try {
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")?.trim();
    const callbackUrl = Deno.env.get("TWILIO_STATUS_CALLBACK_URL")?.trim();
    const signature = request.headers.get("X-Twilio-Signature") || "";
    if (!authToken || !callbackUrl) throw new Error("Twilio webhook environment variables are missing.");

    const params = new URLSearchParams(await request.text());
    if (!(await isValidTwilioSignature(callbackUrl, params, signature, authToken))) return text("Invalid Twilio signature.", 403);

    const messageSid = params.get("MessageSid");
    const providerStatus = (params.get("MessageStatus") || "unknown").toLowerCase();
    const errorCode = params.get("ErrorCode");
    const errorMessage = params.get("ErrorMessage");
    const status = mapStatus(providerStatus);
    const now = new Date().toISOString();
    if (!messageSid) return text("MessageSid is required.", 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service credentials are missing.");

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const updates: Record<string, unknown> = {
      provider: "twilio",
      provider_status: providerStatus,
      status,
      updated_at: now,
      metadata: { twilio_error_code: errorCode || null, twilio_error_message: errorMessage || null },
    };
    if (status === "delivered") updates.delivered_at = now;
    if (status === "failed") updates.failed_at = now;

    const { error } = await admin.from("notification_logs").update(updates).eq("provider_message_id", messageSid);
    if (error) {
      console.error("Unable to update notification log:", error);
      return text("Database update failed.", 500);
    }

    return text("ok");
  } catch (error) {
    console.error("twilio-status failed:", error);
    return text("Webhook failed.", 500);
  }
});
