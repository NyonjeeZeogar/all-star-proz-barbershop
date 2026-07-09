import React from "react";
import { Instagram } from "lucide-react";
import { FEED } from "@/lib/assets";

export default function FollowUs() {
  return (
    <section className="bg-white">
      <div className="bg-cyanAccent py-8">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between">
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
            FOLLOW US
          </h2>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 font-heading text-xs font-bold tracking-wide text-ink/70 hover:text-ink transition-colors"
          >
            <Instagram size={16} /> Instagram feed →
          </a>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
        {FEED.map((src, i) => (
          <div key={i} className="aspect-square overflow-hidden bg-muted">
            <img
              src={src}
              alt={`All Stylez Pro feed ${i + 1}`}
              loading="lazy"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
