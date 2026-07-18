import React from "react";
import { CalendarDays } from "lucide-react";
import AppointmentRow from "./AppointmentRow";

export default function AppointmentHistory({ items, onConfirm, onCancel, onSaveNote }) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-ink/15 bg-muted/40 p-12 text-center">
        <CalendarDays className="mx-auto text-ink/30" size={32} />
        <h3 className="mt-4 font-heading font-bold text-ink">No appointment history</h3>
      </div>
    );
  }
  const sorted = [...items].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return (
    <div className="space-y-3">
      {sorted.map((a) => (
        <AppointmentRow
          key={a.id}
          appt={a}
          onConfirm={onConfirm}
          onCancel={onCancel}
          onSaveNote={onSaveNote}
        />
      ))}
    </div>
  );
}
