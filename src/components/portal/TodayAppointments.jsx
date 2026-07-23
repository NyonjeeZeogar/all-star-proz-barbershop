import React from "react";
import {
  CalendarDays,
} from "lucide-react";

import AppointmentRow from "./AppointmentRow";

export default function TodayAppointments({
  items = [],
  onConfirm,
  onCancel,
  onSaveNote,
  onRefund,
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-ink/15 bg-muted/40 p-12 text-center">
        <CalendarDays
          className="mx-auto text-ink/30"
          size={32}
        />

        <h3 className="mt-4 font-heading font-bold text-ink">
          No active bookings
        </h3>

        <p className="mt-1 text-sm text-ink/60">
          New customer bookings will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((appointment) => (
        <AppointmentRow
          key={appointment.id}
          appt={appointment}
          onConfirm={onConfirm}
          onCancel={onCancel}
          onSaveNote={onSaveNote}
          onRefund={onRefund}
        />
      ))}
    </div>
  );
}
