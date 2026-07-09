import React from "react";
import { Phone, Mail, MapPin } from "lucide-react";
import { SHOP } from "@/lib/assets";

export default function ContactInfo({ label = "CONTACT" }) {
  return (
    <div>
      <h3 className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink mb-4">
        {label}
      </h3>
      <ul className="space-y-3.5 text-sm text-ink/70">
        <li className="flex items-start gap-3">
          <Phone size={16} className="mt-0.5 text-cta shrink-0" />
          <a href={`tel:${SHOP.phone}`} className="hover:text-cta transition-colors">
            {SHOP.phone}
          </a>
        </li>
        <li className="flex items-start gap-3">
          <Mail size={16} className="mt-0.5 text-cta shrink-0" />
          <a href={`mailto:${SHOP.email}`} className="hover:text-cta transition-colors break-all">
            {SHOP.email}
          </a>
        </li>
        <li className="flex items-start gap-3">
          <MapPin size={16} className="mt-0.5 text-cta shrink-0" />
          <span>{SHOP.address}</span>
        </li>
      </ul>
    </div>
  );
}
