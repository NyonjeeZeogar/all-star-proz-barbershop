import React from "react";
import { dollarsToCents, formatCents } from "@/lib/pricing";

function Row({ label, value, strong = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${
        strong ? "font-bold text-ink" : "text-ink/70"
      }`}
    >
      <span>{label}</span>
      <span>{formatCents(value)}</span>
    </div>
  );
}

export default function PricingSummary({
  quote,
  loading = false,
  selectedServices = [],
  totalDurationMinutes = 0,
}) {
  if (loading) {
    return (
      <p className="text-sm text-ink/60">
        Calculating your deposit and booking fee…
      </p>
    );
  }

  if (!quote) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-ink/10 bg-white p-5 text-sm">
      {selectedServices.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-heading text-sm font-bold text-ink">
              Selected services
            </h3>
            <span className="text-xs font-semibold text-ink/55">
              {totalDurationMinutes} minutes
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-ink/65">
            {selectedServices.map((service) => {
              const id = service.service_id || service.id;
              const quantity = Math.max(
                1,
                Number.parseInt(service.quantity, 10) || 1
              );
              const lineTotal = dollarsToCents(service.price) * quantity;

              return (
                <div key={id} className="flex items-center justify-between gap-4">
                  <span className="truncate">
                    {service.name} × {quantity}
                  </span>
                  <span>{formatCents(lineTotal)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-ink/10 pt-4 space-y-2">
        <Row label="Service subtotal" value={quote.service_subtotal_cents} />
        <Row label="50% service deposit" value={quote.deposit_cents} />
        <Row label="Booking fee" value={quote.booking_fee_cents} />

        {Number(quote.tip_cents) > 0 && (
          <Row label="Tip" value={quote.tip_cents} />
        )}

        <div className="my-2 border-t border-ink/10" />

        <Row label="Charged today" value={quote.charged_today_cents} strong />
        <Row
          label="Remaining service balance"
          value={quote.remaining_balance_cents}
        />
        <Row label="Total" value={quote.grand_total_cents} />
      </div>
    </section>
  );
}
