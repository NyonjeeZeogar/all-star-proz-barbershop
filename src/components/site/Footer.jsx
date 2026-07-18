import React from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Instagram, Facebook } from "lucide-react";
import { ASSETS, SHOP } from "@/lib/assets";

export default function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <h3 className="font-heading text-sm font-extrabold tracking-widest text-white/60 mb-5">
            NAVIGATE
          </h3>
          <ul className="space-y-3">
            {[
              { label: "Home", to: "/" },
              { label: "Locations", to: "/locations" },
              { label: "Services", to: "/services" },
              { label: "Contact", to: "/contact" },
              { label: "Terms of Use", to: "/terms" },
              { label: "Privacy Policy", to: "/privacy" },
            ].map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="text-sm text-white/80 hover:text-cyanAccent transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-heading text-sm font-extrabold tracking-widest text-white/60 mb-5">
            NEW HOPE
          </h3>
          <ul className="space-y-4 text-sm text-white/80">
            <li className="flex items-start gap-3">
              <Phone size={16} className="mt-0.5 text-cyanAccent shrink-0" />
              <a href={`tel:${SHOP.phone}`} className="hover:text-cyanAccent transition-colors">
                {SHOP.phone}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Mail size={16} className="mt-0.5 text-cyanAccent shrink-0" />
              <a href={`mailto:${SHOP.email}`} className="hover:text-cyanAccent transition-colors break-all">
                {SHOP.email}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin size={16} className="mt-0.5 text-cyanAccent shrink-0" />
              <span>{SHOP.address}</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-heading text-sm font-extrabold tracking-widest text-white/60 mb-5">
            SOCIAL
          </h3>
          <ul className="space-y-4 text-sm text-white/80">
            <li>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 hover:text-cyanAccent transition-colors"
              >
                <Instagram size={16} className="text-cyanAccent" /> Instagram
              </a>
            </li>
            <li>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 hover:text-cyanAccent transition-colors"
              >
                <Facebook size={16} className="text-cyanAccent" /> Facebook
              </a>
            </li>
          </ul>
          <div className="mt-8">
            <img src={ASSETS.logoWhite} alt="All Stylez Pro" className="h-12 w-12 object-contain opacity-90" />
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/50 tracking-wide">© 2026, ALL STYLEZ PRO.</p>
          <span className="text-xs text-white/40 font-heading font-bold tracking-wide border border-white/15 rounded-full px-3 py-1">
            Made by NDMA
          </span>
        </div>
      </div>
    </footer>
  );
}
