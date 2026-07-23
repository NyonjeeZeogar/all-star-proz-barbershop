import React, { useMemo, useState } from "react";
import { formatTime } from "@/lib/dateTime";
import { getPaymentStatusLabel } from "@/lib/paymentStatus";

import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  Scissors,
  Check,
  X,
  Loader2,
  StickyNote,
  RotateCcw,
  ExternalLink,
} from "lucide-react";

const STATUS = {
  pending: {
    label: "Pending",
    cls: "bg-amber-100 text-amber-700",
  },
  confirmed: {
    label: "Confirmed",
    cls: "bg-green-100 text-green-700",
  },
  completed: {
    label: "Completed",
    cls: "bg-blue-100 text-blue-700",
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-red-100 text-red-700",
  },
  no_show: {
    label: "No Show",
    cls: "bg-slate-100 text-slate-700",
  },
};

const PAYMENT_STATUS_CLASSES = {
  unpaid: "bg-slate-100 text-slate-700",
  pending: "bg-amber-100 text-amber-700",
  deposit_paid: "bg-green-100 text-green-700",
  paid: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-slate-100 text-slate-700",
  partially_refunded: "bg-orange-100 text-orange-700",
};

function toAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(toAmount(value));
}

export default function AppointmentRow({
  appt,
  onConfirm,
  onCancel,
  onSaveNote,
  onRefund,
}) {
  const st = STATUS[appt?.status] || STATUS.pending;

  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(
    appt?.barber_notes || ""
  );
  const [saving, setSaving] = useState(false);

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState(
    "Customer requested refund"
  );
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState("");

  const serviceName =
    typeof appt?.service === "object"
      ? appt.service?.name
      : appt?.service;

  const barberName =
    typeof appt?.barber === "object"
      ? appt.barber?.full_name ||
        appt.barber?.email
      : appt?.barber;

  const appointmentDate =
    appt?.date ||
    appt?.appointment_date ||
    "";

  const appointmentTime =
    appt?.time ||
    appt?.start_time ||
    appt?.appointment_time ||
    "";

  const customerName =
    typeof appt?.customer === "object"
      ? appt.customer?.full_name ||
        appt.customer?.email
      : appt?.customer ||
        appt?.name ||
        "";

  const customerPhone =
    typeof appt?.customer === "object"
      ? appt.customer?.phone ||
        appt?.phone ||
        ""
      : appt?.phone || "";

  const customerEmail =
    typeof appt?.customer === "object"
      ? appt.customer?.email ||
        appt?.email ||
        ""
      : appt?.email || "";

  const currency =
    appt?.payment_currency ||
    appt?.currency ||
    "USD";

  const servicePrice = toAmount(
    appt?.service_price ??
      (typeof appt?.service === "object"
        ? appt.service?.price
        : 0)
  );

  const depositAmount = toAmount(
    appt?.deposit_amount
  );

  const amountPaid = toAmount(
    appt?.amount_paid
  );

  const remainingBalance = toAmount(
    appt?.remaining_balance ??
      Math.max(servicePrice - amountPaid, 0)
  );

  const refundedAmount =
    toAmount(appt?.refunded_amount_cents) / 100;

  const paymentStatus =
    appt?.payment_status || "unpaid";

  const paymentStatusClass =
    PAYMENT_STATUS_CLASSES[paymentStatus] ||
    PAYMENT_STATUS_CLASSES.unpaid;

  const canRefund = useMemo(
    () =>
      amountPaid > 0 &&
      Boolean(appt?.square_payment_id) &&
      !["unpaid", "failed", "refunded"].includes(
        paymentStatus
      ),
    [
      amountPaid,
      appt?.square_payment_id,
      paymentStatus,
    ]
  );

  const openRefund = () => {
    setRefundAmount(amountPaid.toFixed(2));
    setRefundReason("Customer requested refund");
    setRefundError("");
    setRefundOpen(true);
  };

  const submitRefund = async (event) => {
    event.preventDefault();

    const dollars = Number(refundAmount);
    const amountCents = Math.round(dollars * 100);
    const maximumCents = Math.round(amountPaid * 100);

    if (
      !Number.isFinite(dollars) ||
      amountCents <= 0
    ) {
      setRefundError(
        "Enter a refund amount greater than $0."
      );
      return;
    }

    if (amountCents > maximumCents) {
      setRefundError(
        `The refund cannot exceed ${formatMoney(
          amountPaid,
          currency
        )}.`
      );
      return;
    }

    setRefunding(true);
    setRefundError("");

    try {
      await onRefund?.(appt.id, {
        amount_cents: amountCents,
        reason:
          refundReason.trim() ||
          "Customer requested refund",
      });

      setRefundOpen(false);
    } catch (error) {
      setRefundError(
        error?.message ||
          "Unable to submit the refund."
      );
    } finally {
      setRefunding(false);
    }
  };

  const saveNote = async () => {
    setSaving(true);

    try {
      if (onSaveNote) {
        await onSaveNote(appt.id, note);
      }

      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-ink/10 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-cyanAccent/40 grid place-items-center shrink-0">
            <Scissors
              className="text-ink"
              size={18}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-heading font-extrabold text-ink">
                {serviceName ||
                  "Service unavailable"}
              </h3>

              <span
                className={`inline-flex items-center gap-1 text-xs font-bold rounded-full px-2.5 py-1 ${st.cls}`}
              >
                {st.label}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-4 text-sm text-ink/60 flex-wrap">
              {appointmentDate && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={14} />
                  {appointmentDate}
                </span>
              )}

              {appointmentTime && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={14} />
                  {formatTime(appointmentTime)}
                </span>
              )}

              {barberName && (
                <span className="inline-flex items-center gap-1">
                  <Scissors size={14} />
                  {barberName}
                </span>
              )}

              {appt?.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} />
                  {appt.location}
                </span>
              )}

              {customerName && (
                <span className="inline-flex items-center gap-1">
                  <User size={14} />
                  {customerName}
                </span>
              )}
            </div>

            {(customerPhone ||
              customerEmail) && (
              <div className="mt-1 text-xs text-ink/50">
                {customerPhone}

                {customerPhone &&
                customerEmail
                  ? " · "
                  : ""}

                {customerEmail}
              </div>
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-muted/60 px-3 py-2">
                <div className="text-[11px] font-heading font-bold uppercase tracking-wide text-ink/45">
                  Service
                </div>
                <div className="mt-0.5 font-heading font-bold text-ink">
                  {formatMoney(
                    servicePrice,
                    currency
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 px-3 py-2">
                <div className="text-[11px] font-heading font-bold uppercase tracking-wide text-amber-700/70">
                  Deposit
                </div>
                <div className="mt-0.5 font-heading font-bold text-amber-700">
                  {formatMoney(
                    depositAmount,
                    currency
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-green-50 px-3 py-2">
                <div className="text-[11px] font-heading font-bold uppercase tracking-wide text-green-700/70">
                  Net paid
                </div>
                <div className="mt-0.5 font-heading font-bold text-green-700">
                  {formatMoney(
                    amountPaid,
                    currency
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-blue-50 px-3 py-2">
                <div className="text-[11px] font-heading font-bold uppercase tracking-wide text-blue-700/70">
                  Balance
                </div>
                <div className="mt-0.5 font-heading font-bold text-blue-700">
                  {formatMoney(
                    remainingBalance,
                    currency
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${paymentStatusClass}`}
              >
                Payment:{" "}
                {getPaymentStatusLabel(
                  paymentStatus
                )}
              </span>

              {refundedAmount > 0 && (
                <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700">
                  Refunded:{" "}
                  {formatMoney(
                    refundedAmount,
                    currency
                  )}
                </span>
              )}

              {appt?.square_receipt_url && (
                <a
                  href={appt.square_receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-cta hover:underline"
                >
                  Receipt
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0 sm:max-w-[220px] sm:justify-end">
            {appt?.status === "pending" && (
              <button
                type="button"
                onClick={() =>
                  onConfirm?.(appt.id)
                }
                className="inline-flex items-center gap-1.5 bg-green-600 text-white rounded-full px-3.5 py-2 text-xs font-heading font-bold hover:bg-green-700 transition-colors"
              >
                <Check size={14} />
                Confirm
              </button>
            )}

            {canRefund && (
              <button
                type="button"
                onClick={openRefund}
                className="inline-flex items-center gap-1.5 border border-orange-200 bg-orange-50 text-orange-700 rounded-full px-3.5 py-2 text-xs font-heading font-bold hover:bg-orange-100 transition-colors"
              >
                <RotateCcw size={14} />
                Refund
              </button>
            )}

            {!["cancelled", "completed"].includes(
              appt?.status
            ) && (
              <button
                type="button"
                onClick={() =>
                  onCancel?.(appt.id)
                }
                className="inline-flex items-center gap-1.5 border border-ink/15 text-ink/70 rounded-full px-3.5 py-2 text-xs font-heading font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              >
                <X size={14} />
                Cancel appointment
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 border-t border-ink/5 pt-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-heading font-bold tracking-wide text-ink/50">
              <StickyNote size={14} />
              CUSTOMER NOTES
            </span>

            {!editing && (
              <button
                type="button"
                onClick={() => {
                  setNote(
                    appt?.barber_notes || ""
                  );
                  setEditing(true);
                }}
                className="text-xs font-bold text-cta hover:underline"
              >
                {appt?.barber_notes
                  ? "Edit"
                  : "Add note"}
              </button>
            )}
          </div>

          {editing ? (
            <div className="mt-2">
              <textarea
                value={note}
                onChange={(event) =>
                  setNote(event.target.value)
                }
                rows={3}
                placeholder="Notes about this customer..."
                className="w-full rounded-xl border border-ink/15 px-3 py-2 text-sm text-ink focus:outline-none resize-none"
              />

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={saveNote}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 bg-cta text-white rounded-full px-4 py-1.5 text-xs font-heading font-bold disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2
                      className="animate-spin"
                      size={13}
                    />
                  ) : (
                    <Check size={13} />
                  )}

                  Save
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setEditing(false)
                  }
                  className="text-xs font-bold text-ink/60 px-3 py-1.5"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : appt?.barber_notes ? (
            <p className="mt-1.5 text-sm text-ink/70 whitespace-pre-wrap">
              {appt.barber_notes}
            </p>
          ) : null}
        </div>
      </div>

      {refundOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/55 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`refund-title-${appt.id}`}
        >
          <form
            onSubmit={submitRefund}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id={`refund-title-${appt.id}`}
                  className="font-heading text-xl font-extrabold text-ink"
                >
                  Refund payment
                </h2>
                <p className="mt-1 text-sm text-ink/60">
                  Refunds do not cancel the
                  appointment.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRefundOpen(false)
                }
                disabled={refunding}
                className="rounded-full p-1.5 text-ink/50 hover:bg-muted"
                aria-label="Close refund dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-muted/60 p-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-ink/60">
                  Available to refund
                </span>
                <strong className="text-ink">
                  {formatMoney(
                    amountPaid,
                    currency
                  )}
                </strong>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-bold text-ink">
                Refund amount
              </span>

              <div className="mt-1 flex rounded-xl border border-ink/15 focus-within:border-cta">
                <span className="grid place-items-center border-r border-ink/10 px-3 text-ink/50">
                  $
                </span>

                <input
                  type="number"
                  min="0.01"
                  max={amountPaid.toFixed(2)}
                  step="0.01"
                  value={refundAmount}
                  onChange={(event) =>
                    setRefundAmount(
                      event.target.value
                    )
                  }
                  className="min-w-0 flex-1 rounded-r-xl px-3 py-2.5 text-sm outline-none"
                  required
                />
              </div>
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-bold text-ink">
                Reason
              </span>

              <textarea
                rows={3}
                maxLength={192}
                value={refundReason}
                onChange={(event) =>
                  setRefundReason(
                    event.target.value
                  )
                }
                className="mt-1 w-full resize-none rounded-xl border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-cta"
                placeholder="Reason for refund"
              />
            </label>

            {refundError && (
              <div
                role="alert"
                className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {refundError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setRefundOpen(false)
                }
                disabled={refunding}
                className="rounded-full px-4 py-2 text-sm font-bold text-ink/60 hover:bg-muted disabled:opacity-60"
              >
                Keep payment
              </button>

              <button
                type="submit"
                disabled={refunding}
                className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-4 py-2 text-sm font-heading font-bold text-white hover:bg-orange-700 disabled:opacity-60"
              >
                {refunding ? (
                  <Loader2
                    className="animate-spin"
                    size={15}
                  />
                ) : (
                  <RotateCcw size={15} />
                )}

                Submit refund
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
