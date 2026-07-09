import React from "react";
import { SHOP } from "@/lib/assets";

export default function OpeningHours({ variant = "table", label = "OPENING HOURS" }) {
  if (variant === "grid") {
    return (
      <div>
        <h3 className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink mb-4">
          {label}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {SHOP.hours.map((h) => (
            <div
              key={h.day}
              className="bg-softblue rounded-lg px-4 py-3 flex flex-col gap-0.5"
            >
              <span className="font-heading text-xs font-bold tracking-wide text-ink">
                {h.day}
              </span>
              <span className="text-[11px] text-ink/60 font-medium">{h.time}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink mb-4">
        {label}
      </h3>
      <div className="overflow-hidden rounded-lg border border-ink/10">
        {SHOP.hours.map((h, i) => (
          <div
            key={h.day}
            className={`grid grid-cols-2 ${i % 2 === 0 ? "bg-softblue/60" : "bg-white"}`}
          >
            <span className="px-4 py-3 font-heading text-sm font-bold text-ink">{h.day}</span>
            <span className="px-4 py-3 text-sm text-ink/70 bg-cyanAccent/30">{h.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
