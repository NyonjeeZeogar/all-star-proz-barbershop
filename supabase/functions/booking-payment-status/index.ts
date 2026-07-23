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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables.");
    return jsonResponse({ error: "Server configuration error." }, 500);
  }

  const authorization = request.headers.get("Authorization");

  if (!authorization) {
    return jsonResponse({ error: "Authorization is required." }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "Invalid or expired session." }, 401);
  }

  let body: { booking_id?: string };

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  if (!body.booking_id) {
    return jsonResponse({ error: "booking_id is required." }, 400);
  }

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select(`
      id,
      user_id,
      customer_id,
      status,
      payment_status,
      payment_option,
      payment_type,
      amount_due_now,
      amount_paid,
      remaining_balance,
      currency,
      payment_currency,
      payment_expires_at,
      paid_at,
      payment_verified_at,
      payment_failed_at,
      payment_failure_reason,
      refunded_at,
      refunded_amount_cents,
      square_receipt_url
    `)
    .eq("id", body.booking_id)
    .maybeSingle();

  if (appointmentError) {
    console.error("Unable to load appointment:", appointmentError);
    return jsonResponse({ error: "Unable to load booking status." }, 500);
  }

  if (!appointment) {
    return jsonResponse({ error: "Booking not found." }, 404);
  }

  const belongsToUser =
    appointment.user_id === user.id ||
    appointment.customer_id === user.id;

  if (!belongsToUser) {
    return jsonResponse({ error: "Booking not found." }, 404);
  }

  return jsonResponse({
    booking_id: appointment.id,
    booking_status: appointment.status,
    payment_status: appointment.payment_status,
    payment_option: appointment.payment_option,
    payment_type: appointment.payment_type,
    amount_due_now: appointment.amount_due_now,
    amount_paid: appointment.amount_paid,
    remaining_balance: appointment.remaining_balance,
    currency:
      appointment.payment_currency ??
      appointment.currency ??
      "USD",
    payment_expires_at: appointment.payment_expires_at,
    paid_at: appointment.paid_at,
    payment_verified_at: appointment.payment_verified_at,
    payment_failed_at: appointment.payment_failed_at,
    payment_failure_reason: appointment.payment_failure_reason,
    refunded_at: appointment.refunded_at,
    refunded_amount_cents: appointment.refunded_amount_cents,
    receipt_url: appointment.square_receipt_url,
  });
});
