import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json({ error: "UNAUTHORIZED" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) return json({ error: "UNAUTHORIZED" }, 401);

    const body = await request.json();
    const bookingId = body.booking_id || body.bookingId;
    if (!bookingId) return json({ error: "BOOKING_ID_REQUIRED" }, 400);

    const { data, error } = await client
      .from("appointments")
      .select(`
        id,
        customer_id,
        barber_id,
        appointment_date,
        start_time,
        status,
        payment_status,
        service,
        service_subtotal_cents,
        taxable_subtotal_cents,
        tax_rate,
        tax_cents,
        booking_fee_cents,
        tip_cents,
        deposit_cents,
        charged_today_cents,
        remaining_balance_cents,
        amount_paid,
        paid_at,
        square_order_id,
        square_payment_id,
        square_receipt_url,
        appointment_services (
          id,
          service_id,
          service_name,
          unit_price_cents,
          quantity,
          line_total_cents
        ),
        barber:profiles!appointments_barber_id_fkey (
          id,
          full_name
        )
      `)
      .eq("id", bookingId)
      .eq("customer_id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return json({ error: "BOOKING_NOT_FOUND" }, 404);

    return json({
      bookingId: data.id,
      paymentStatus: data.payment_status,
      bookingStatus: data.status,
      appointmentDate: data.appointment_date,
      appointmentTime: data.start_time,
      barberName: data.barber?.full_name ?? null,
      services: data.appointment_services ?? [],
      pricing: {
        service_subtotal_cents: data.service_subtotal_cents,
        taxable_subtotal_cents: data.taxable_subtotal_cents,
        tax_rate: data.tax_rate,
        tax_cents: data.tax_cents,
        booking_fee_cents: data.booking_fee_cents,
        tip_cents: data.tip_cents,
        deposit_cents: data.deposit_cents,
        charged_today_cents: data.charged_today_cents,
        remaining_balance_cents: data.remaining_balance_cents,
      },
      amountPaid: data.amount_paid,
      paidAt: data.paid_at,
      receiptUrl: data.square_receipt_url,
    });
  } catch (error) {
    console.error("booking-payment-status error", error);
    return json({
      error: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unexpected error",
    }, 500);
  }
});
