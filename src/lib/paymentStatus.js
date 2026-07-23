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
