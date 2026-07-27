import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSMS } from "../_shared/sendSMS.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authorization is required." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) throw new Error("Supabase runtime credentials are missing.");

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Invalid or expired session." }, 401);

    const payload = await request.json();
    const to = typeof payload?.to === "string" ? payload.to : "";
    const body = typeof payload?.body === "string" ? payload.body : "";
    const statusCallbackUrl = Deno.env.get("TWILIO_STATUS_CALLBACK_URL")?.trim() || undefined;
    const result = await sendSMS({ to, body, statusCallbackUrl });

    return json({ success: true, message: result });
  } catch (error) {
    console.error("sendSMS failed:", error);
    return json({ error: error instanceof Error ? error.message : "Unable to send SMS." }, 400);
  }
});
