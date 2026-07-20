import React from "react";
import { Link } from "react-router-dom";
import {
  Facebook,
  Instagram,
  MapPin,
} from "lucide-react";

import { TEAM } from "@/lib/assets";

export default function TeamCard({
  member,
  showShopButton = true,
}) {
  const teamMember =
    typeof member === "string"
      ? TEAM.find((item) => item.slug === member)
      : member;

  if (!teamMember) {
    return null;
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <Link
          to={`/teams/${teamMember.slug}`}
          className="block h-full w-full"
          aria-label={`View ${teamMember.name}'s profile`}
        >
          <img
            src={teamMember.photo}
            alt={teamMember.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        <div className="absolute right-3 top-3 flex gap-2">
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noreferrer"
            aria-label={`${teamMember.name} on Facebook`}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink transition-colors hover:bg-cta hover:text-white"
          >
            <Facebook size={14} />
          </a>

          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
            aria-label={`${teamMember.name} on Instagram`}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink transition-colors hover:bg-cta hover:text-white"
          >
            <Instagram size={14} />
          </a>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <Link to={`/teams/${teamMember.slug}`}>
            <h3 className="font-heading text-lg font-extrabold tracking-tight text-ink transition-colors hover:text-cta">
              {teamMember.name}
            </h3>
          </Link>

          <p className="text-sm text-ink/60">
            {teamMember.role}
          </p>
        </div>

        {showShopButton && (
          <Link
            to="/locations/new-hope"
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-cyanAccent px-4 py-2.5 font-heading text-xs font-bold tracking-wide text-ink transition-colors hover:bg-cyanAccent/80"
          >
            <MapPin size={13} />
            {teamMember.shop}
          </Link>
        )}
      </div>
    </article>
  );
}
