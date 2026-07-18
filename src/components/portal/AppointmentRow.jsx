import React, { useState } from "react";
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
  cancelled: {
    label: "Cancelled",
    cls: "bg-red-100 text-red-700",
  },
};

export default function AppointmentRow({
  appt,
  onConfirm,
  onCancel,
  onSaveNote,
}) {
  const st = STATUS[appt?.status] || STATUS.pending;

  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(
    appt?.barber_notes || ""
  );
  const [saving, setSaving] = useState(false);

  /*
   * Supabase relationship fields can be returned as objects.
   *
   * Example:
   *
   * appt.service = {
   *   id,
   *   name,
   *   price,
   *   description,
   *   duration_minutes
   * }
   *
   * appt.barber = {
   *   id,
   *   full_name,
   *   email,
   *   phone,
   *   role
   * }
   *
   * React cannot render those objects directly, so we
   * extract the string values that should be displayed.
   */

  const serviceName =
    typeof appt?.service === "object"
      ? appt.service?.name
      : appt?.service;

  const barberName =
    typeof appt?.barber === "object"
      ? appt.barber?.full_name ||
        appt.barber?.email
      : appt?.barber;

  /*
   * Support both the normalized portal field names
   * and the raw Supabase appointment column names.
   */

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
    <div className="bg-white rounded-2xl border border-ink/10 shadow-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-cyanAccent/40 grid place-items-center shrink-0">
          <Scissors
            className="text-ink"
            size={18}
          />
        </div>

        <div className="flex-1">
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
                {appointmentTime}
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
        </div>

        {appt?.status === "pending" && (
          <div className="flex gap-2 shrink-0">
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

            <button
              type="button"
              onClick={() =>
                onCancel?.(appt.id)
              }
              className="inline-flex items-center gap-1.5 border border-ink/15 text-ink/70 rounded-full px-3.5 py-2 text-xs font-heading font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        )}
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
              onChange={(e) =>
                setNote(e.target.value)
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
  );
}
