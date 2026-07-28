import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function hmacSha256Base64(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-square-hmacsha256-signature") || "";
    const signatureKey = Deno.env.get("SQUARE_WEBHOOK_SIGNATURE_KEY") || "";
    const notificationUrl = Deno.env.get("SQUARE_WEBHOOK_NOTIFICATION_URL") || "";

    if (!signatureKey || !notificationUrl) {
      throw new Error("Square webhook verification secrets are missing.");
    }

    const expected = await hmacSha256Base64(signatureKey, notificationUrl + rawBody);
    if (!constantTimeEqual(signature, expected)) {
      return json({ error: "INVALID_SIGNATURE" }, 401);
    }

    const event = JSON.parse(rawBody);
    const payment = event?.data?.object?.payment;
    if (!payment?.order_id) return json({ received: true });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: appointment, error: lookupError } = await supabase
      .from("appointments")
      .select("id,charged_today_cents,payment_status")
      .eq("square_order_id", payment.order_id)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!appointment) return json({ received: true });

    const paidCents = Number(payment?.amount_money?.amount ?? 0);
    const expectedCents = Number(appointment.charged_today_cents ?? 0);
    const status = String(payment.status || "").toUpperCase();

    if (status === "COMPLETED" && paidCents !== expectedCents) {
      console.error("Square amount mismatch", {
        appointmentId: appointment.id,
        expectedCents,
        paidCents,
      });
      return json({ error: "PAYMENT_AMOUNT_MISMATCH" }, 409);
    }

    const updates: Record<string, unknown> = {
      square_payment_id: payment.id ?? null,
      square_receipt_url: payment.receipt_url ?? null,
    };

    if (status === "COMPLETED") {
      updates.payment_status = "deposit_paid";
      updates.amount_paid = paidCents / 100;
      updates.paid_at = payment.updated_at || new Date().toISOString();
      updates.status = "confirmed";
    } else if (status === "FAILED" || status === "CANCELED") {
      updates.payment_status = "failed";
      updates.payment_failed_at = new Date().toISOString();
      updates.payment_failure_reason = payment.delay_action || payment.status;
    }

    const { error: updateError } = await supabase
      .from("appointments")
      .update(updates)
      .eq("id", appointment.id);

    if (updateError) throw updateError;
    return json({ received: true });
  } catch (error) {
    console.error("square-webhook error", error);
    return json({
      error: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unexpected error",
    }, 500);
  }
});
