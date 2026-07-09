import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Instagram, MapPin } from "lucide-react";
import { TEAM } from "@/lib/assets";

export default function TeamCard({ member, showShopButton = true }) {
  const m = typeof member === "string" ? TEAM.find((t) => t.slug === member) : member;
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-ink/10 shadow-sm flex flex-col group">
      <Link to={`/teams/${m.slug}`} className="relative aspect-[4/5] overflow-hidden bg-muted block">
        <img
          src={m.photo}
          alt={m.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3 flex gap-2">
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noreferrer"
            className="w-8 h-8 grid place-items-center bg-white/90 rounded-full text-ink hover:bg-cta hover:text-white transition-colors"
          >
            <Facebook size={14} />
          </a>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
            className="w-8 h-8 grid place-items-center bg-white/90 rounded-full text-ink hover:bg-cta hover:text-white transition-colors"
          >
            <Instagram size={14} />
          </a>
        </div>
      </Link>
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div>
          <Link to={`/teams/${m.slug}`}>
            <h3 className="font-heading text-lg font-extrabold tracking-tight text-ink hover:text-cta transition-colors">
              {m.name}
            </h3>
          </Link>
          <p className="text-sm text-ink/60">{m.role}</p>
        </div>
        {showShopButton && (
          <Link
            to="/locations/new-hope"
            className="mt-auto inline-flex items-center justify-center gap-2 bg-cyanAccent text-ink rounded-full px-4 py-2.5 font-heading text-xs font-bold tracking-wide hover:bg-cyanAccent/80 transition-colors"
          >
            <MapPin size={13} /> {m.shop}
          </Link>
        )}
      </div>
    </div>
  );
}
