import React from "react";
import { MapPin, Clock, CalendarX } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function WeeklySchedule({ availability }) {
  const schedule =
    availability?.schedule?.length
      ? availability.schedule
      : DAYS.map((d) => ({ day: d, available: false }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-ink/10 p-5 flex items-center gap-3">
        <MapPin size={18} className="text-cta" />
        <div>
          <div className="text-xs font-heading font-bold tracking-wide text-ink/50">WORKING LOCATION</div>
          <div className="font-heading font-bold text-ink">{availability?.working_location || "Not set"}</div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {schedule.map((s) => (
          <div
            key={s.day}
            className={`rounded-2xl border p-4 ${s.available ? "border-green-200 bg-green-50/50" : "border-ink/10 bg-muted/40"}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-heading font-bold text-ink">{s.day}</span>
              <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${s.available ? "bg-green-100 text-green-700" : "bg-muted text-ink/50"}`}>
                {s.available ? "Available" : "Off"}
              </span>
            </div>
            {s.available && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink/60">
                <Clock size={14} /> {s.start} – {s.end}
              </div>
            )}
          </div>
        ))}
      </div>

      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-heading font-bold tracking-wide text-ink/50 mb-2">
          <CalendarX size={14} /> VACATION / BLOCKED DAYS
        </div>
        {!availability?.vacation_days?.length ? (
          <p className="text-sm text-ink/50">No vacation days blocked.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availability.vacation_days.map((d) => (
              <span key={d} className="inline-flex items-center bg-red-50 text-red-700 rounded-full px-3 py-1.5 text-sm font-bold border border-red-200">
                {d}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
