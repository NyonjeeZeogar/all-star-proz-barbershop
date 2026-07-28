export type PricingQuote = {
  service_subtotal_cents: number;
  taxable_subtotal_cents: number;
  tax_rate: number | string;
  tax_cents: number;
  deposit_percentage: number | string;
  deposit_cents: number;
  booking_fee_cents: number;
  tip_cents: number;
  charged_today_cents: number;
  remaining_balance_cents: number;
  grand_total_cents: number;
};

export function requireNonnegativeInteger(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${field} must be a nonnegative whole number of cents.`);
  }
  return parsed;
}

export function normalizePricingQuote(row: Record<string, unknown>): PricingQuote {
  return {
    service_subtotal_cents: requireNonnegativeInteger(row.service_subtotal_cents, "service_subtotal_cents"),
    taxable_subtotal_cents: requireNonnegativeInteger(row.taxable_subtotal_cents, "taxable_subtotal_cents"),
    tax_rate: Number(row.tax_rate ?? 0),
    tax_cents: requireNonnegativeInteger(row.tax_cents, "tax_cents"),
    deposit_percentage: Number(row.deposit_percentage ?? 50),
    deposit_cents: requireNonnegativeInteger(row.deposit_cents, "deposit_cents"),
    booking_fee_cents: requireNonnegativeInteger(row.booking_fee_cents, "booking_fee_cents"),
    tip_cents: requireNonnegativeInteger(row.tip_cents, "tip_cents"),
    charged_today_cents: requireNonnegativeInteger(row.charged_today_cents, "charged_today_cents"),
    remaining_balance_cents: requireNonnegativeInteger(row.remaining_balance_cents, "remaining_balance_cents"),
    grand_total_cents: requireNonnegativeInteger(row.grand_total_cents, "grand_total_cents"),
  };
}
