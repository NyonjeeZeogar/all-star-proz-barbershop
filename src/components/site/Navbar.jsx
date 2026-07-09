import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { ASSETS, NAV_LINKS } from "@/lib/assets";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  const isActive = (to) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-black/5">
      <nav className="max-w-7xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={ASSETS.logoColor} alt="All Stylez Pro" className="h-9 w-9 object-contain" />
          <span className="font-heading font-extrabold tracking-tight text-ink text-sm hidden sm:block">
            ALL STYLEZ PRO
          </span>
        </Link>

        <ul className="hidden md:flex items-center gap-9">
          {NAV_LINKS.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className={`font-heading text-[13px] font-bold tracking-wide transition-colors hover:text-cta ${
                  isActive(l.to) ? "text-cta" : "text-ink"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <button
          className="md:hidden text-ink p-2 -mr-2"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-black/5 bg-white">
          <ul className="px-5 py-4 space-y-1">
            {NAV_LINKS.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`block py-3 font-heading text-sm font-bold tracking-wide ${
                    isActive(l.to) ? "text-cta" : "text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
