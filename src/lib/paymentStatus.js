const PAYMENT_STATUS_CONFIG = {
  unpaid: {
    label: "Unpaid",
    tone: "neutral",
    isSuccessful: false,
    isPending: false,
    isFailed: false,
  },
  pending: {
    label: "Payment Pending",
    tone: "warning",
    isSuccessful: false,
    isPending: true,
    isFailed: false,
  },
  deposit_paid: {
    label: "Deposit Paid",
    tone: "success",
    isSuccessful: true,
    isPending: false,
    isFailed: false,
  },
  paid: {
    label: "Paid",
    tone: "success",
    isSuccessful: true,
    isPending: false,
    isFailed: false,
  },
  failed: {
    label: "Payment Failed",
    tone: "danger",
    isSuccessful: false,
    isPending: false,
    isFailed: true,
  },
  refunded: {
    label: "Refunded",
    tone: "neutral",
    isSuccessful: false,
    isPending: false,
    isFailed: false,
  },
  partially_refunded: {
    label: "Partially Refunded",
    tone: "warning",
    isSuccessful: true,
    isPending: false,
    isFailed: false,
  },
};

const DEFAULT_PAYMENT_STATUS = {
  label: "Unknown",
  tone: "neutral",
  isSuccessful: false,
  isPending: false,
  isFailed: false,
};

export function getPaymentStatusConfig(status) {
  if (typeof status !== "string") {
    return DEFAULT_PAYMENT_STATUS;
  }

  return PAYMENT_STATUS_CONFIG[status] ?? DEFAULT_PAYMENT_STATUS;
}

export function getPaymentStatusLabel(status) {
  return getPaymentStatusConfig(status).label;
}

export function isPaymentSuccessful(status) {
  return getPaymentStatusConfig(status).isSuccessful;
}

export function isPaymentPending(status) {
  return getPaymentStatusConfig(status).isPending;
}

export function isPaymentFailed(status) {
  return getPaymentStatusConfig(status).isFailed;
}


export function normalizePaymentStatus(status) {
  const normalized = String(status || "unpaid").trim().toLowerCase();
  if (normalized === "payment_not_connected") return "unpaid";
  if (normalized === "pending_payment") return "pending";
  return normalized;
}

export function getPaymentAmounts(appointment = {}) {
  const toCents = (value) =>
    Math.max(0, Math.round((Number(value) || 0) * 100));

  return {
    serviceSubtotalCents:
      appointment.service_subtotal_cents ?? toCents(appointment.service_price),
    taxCents: appointment.tax_cents ?? 0,
    bookingFeeCents: appointment.booking_fee_cents ?? 0,
    tipCents: appointment.tip_cents ?? 0,
    depositCents:
      appointment.deposit_cents ?? toCents(appointment.deposit_amount),
    chargedTodayCents:
      appointment.charged_today_cents ?? toCents(appointment.amount_due_now),
    remainingBalanceCents:
      appointment.remaining_balance_cents ??
      toCents(appointment.remaining_balance),
  };
}
