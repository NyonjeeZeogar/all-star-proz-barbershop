import React from "react";
import { ArrowRight, MapPin, Scissors } from "lucide-react";
import { SHOP, TEAM } from "@/lib/assets";
import SectionHeading from "@/components/site/SectionHeading";
import ContactInfo from "@/components/site/ContactInfo";
import OpeningHours from "@/components/site/OpeningHours";
import TeamCard from "@/components/site/TeamCard";

export default function LocationDetail() {
  return (
    <div>
      <section className="py-16 sm:py-24 border-b border-ink/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <SectionHeading label="LOCATION" title="New Hope Shop" />
            <p className="mt-6 text-ink/60 text-lg max-w-md">
              The best of our Barber shops. It's also our Flagship shop. It's trendy, modern, and
              most importantly, welcoming.
            </p>
          </div>
          <div className="rounded-3xl overflow-hidden aspect-[4/3] bg-muted">
            <img
              src="https://images.unsplash.com/photo-1599351431202-1e758d2c1e76?auto=format&fit=crop&w=900&q=80"
              alt="Barber at work"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <ContactInfo />
            <div>
              <h3 className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink mb-4">MAP</h3>
              <div className="rounded-2xl overflow-hidden border border-ink/10 h-64 bg-softblue grid place-items-center">
                <MapPin className="text-cta" size={28} />
              </div>
            </div>
          </div>
          <OpeningHours />
        </div>
      </section>

      <section className="py-10 border-y border-ink/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink">SERVICES</h3>
          <div className="flex items-center gap-2 text-sm text-ink/70">
            <Scissors size={16} className="text-cta" /> Haircut, Beard and Dye <ArrowRight size={14} />
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-muted/40">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <SectionHeading label="TEAM" title="Who you'll meet" className="mb-10" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEAM.map((m) => (
              <TeamCard key={m.slug} member={m} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
