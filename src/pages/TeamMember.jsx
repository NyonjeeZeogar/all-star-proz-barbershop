import React from "react";
import { useParams, Link } from "react-router-dom";
import { Facebook, Instagram, MapPin } from "lucide-react";
import { TEAM } from "@/lib/assets";

export default function TeamMember() {
  const { slug } = useParams();
  const m = TEAM.find((t) => t.slug === slug) || TEAM[2];

  return (
    <div className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="font-heading text-xs font-bold tracking-[0.25em] text-ink/50 mb-3 block">
            {m.role.toUpperCase()}
          </span>
          <h1 className="font-heading text-4xl sm:text-6xl font-extrabold tracking-tight text-ink">
            {m.name}
          </h1>
          <p className="text-ink/60 mt-2">{m.role}</p>
          <div className="h-px bg-cta my-8 w-24" />
          <div className="space-y-8">
            <div>
              <h3 className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink mb-3">ABOUT ME</h3>
              <p className="text-ink/70 leading-relaxed max-w-md">{m.about}</p>
            </div>
            <div>
              <h3 className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink mb-3">
                WHERE CAN YOU FIND ME
              </h3>
              <Link
                to="/locations/new-hope"
                className="inline-flex items-center gap-2 bg-ink text-white rounded-full px-5 py-3 font-heading text-xs font-bold tracking-wide hover:bg-ink/90 transition-colors"
              >
                <MapPin size={14} /> New Hope Shop
              </Link>
            </div>
          </div>
        </div>
        <div className="relative rounded-3xl overflow-hidden aspect-[4/5] bg-muted">
          <img src={m.photo} alt={m.name} className="w-full h-full object-cover" />
          <div className="absolute top-4 right-4 flex gap-2">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 grid place-items-center bg-white/90 rounded-full text-ink hover:bg-cta hover:text-white transition-colors"
            >
              <Facebook size={15} />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 grid place-items-center bg-white/90 rounded-full text-ink hover:bg-cta hover:text-white transition-colors"
            >
              <Instagram size={15} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
