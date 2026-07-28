export function dollarsToCents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
}

export function centsToDollars(value) {
  const cents = Number(value);
  return Number.isFinite(cents) ? Number((cents / 100).toFixed(2)) : 0;
}

export function formatCents(value, currency = "USD") {
  const cents = Number(value);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number.isFinite(cents) ? cents / 100 : 0);
}

/**
 * Booking-fee tiers based on the complete service subtotal:
 * - below $50.00: $1.50
 * - $50.00 through $100.00: $2.00
 * - above $100.00: $3.00
 */
export function getBookingFeeCents(serviceSubtotalCents) {
  const subtotal = Math.max(0, Number.parseInt(serviceSubtotalCents, 10) || 0);

  if (subtotal < 5000) return 150;
  if (subtotal <= 10000) return 200;
  return 300;
}

/** Deposit is exactly 50% of the service subtotal. */
export function getServiceDepositCents(serviceSubtotalCents) {
  const subtotal = Math.max(0, Number.parseInt(serviceSubtotalCents, 10) || 0);
  return Math.ceil(subtotal * 0.5);
}

/** Amount due today before tip = 50% service deposit + full booking fee. */
export function getDepositPreviewCents(serviceSubtotalCents) {
  return (
    getServiceDepositCents(serviceSubtotalCents) +
    getBookingFeeCents(serviceSubtotalCents)
  );
}

export function normalizeSelectedServices(items = []) {
  return items
    .filter((item) => item?.id || item?.service_id)
    .map((item) => ({
      service_id: item.service_id || item.id,
      quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1),
      name: item.name || "Service",
      price: Number(item.price || 0),
      taxable: item.taxable !== false,
    }));
}

export function buildPricingDisplay(appointment = {}) {
  const pricing =
    appointment.pricing_snapshot && typeof appointment.pricing_snapshot === "object"
      ? appointment.pricing_snapshot
      : {};

  return {
    serviceSubtotalCents:
      appointment.service_subtotal_cents ?? pricing.service_subtotal_cents ??
      dollarsToCents(appointment.service_price),
    bookingFeeCents:
      appointment.booking_fee_cents ?? pricing.booking_fee_cents ?? 0,
    tipCents: appointment.tip_cents ?? pricing.tip_cents ?? 0,
    depositCents:
      appointment.deposit_cents ?? pricing.deposit_cents ??
      dollarsToCents(appointment.deposit_amount),
    chargedTodayCents:
      appointment.charged_today_cents ?? pricing.charged_today_cents ??
      dollarsToCents(appointment.amount_due_now),
    remainingBalanceCents:
      appointment.remaining_balance_cents ?? pricing.remaining_balance_cents ??
      dollarsToCents(appointment.remaining_balance),
    grandTotalCents:
      appointment.grand_total_cents ?? pricing.grand_total_cents ?? 0,
  };
}

/** Returns the combined duration for all selected services and quantities. */
export function getSelectedServicesDurationMinutes(items = []) {
  return items.reduce((total, item) => {
    const duration = Math.max(
      0,
      Number.parseInt(item?.duration_minutes, 10) || 0
    );
    const quantity = Math.max(
      1,
      Number.parseInt(item?.quantity, 10) || 1
    );

    return total + duration * quantity;
  }, 0);
}
