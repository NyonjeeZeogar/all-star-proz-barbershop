import React, { useState } from "react";
import { MapPin, ChevronDown, Scissors, ArrowRight } from "lucide-react";
import { ASSETS, SHOP } from "@/lib/assets";
import SectionHeading from "@/components/site/SectionHeading";
import CtaButton from "@/components/site/CtaButton";
import ContactInfo from "@/components/site/ContactInfo";

export default function Locations() {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <section className="py-16 sm:py-24 border-b border-ink/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <SectionHeading label="OUR LOCATIONS" title="Where you'll find us." />
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="max-w-2xl mx-auto px-5 sm:px-8">
          <div className="rounded-3xl overflow-hidden border border-ink/10 shadow-sm bg-white">
            <div className="flex items-stretch">
              <div className="bg-cyanAccent p-6 grid place-items-center">
                <img src={ASSETS.logoColor} alt="" className="h-12 w-12 object-contain" />
              </div>
              <div className="bg-ink flex-1 px-6 py-5 flex items-center">
                <h3 className="font-heading text-xl font-extrabold text-white">{SHOP.name}</h3>
              </div>
            </div>
            <div className="aspect-[16/9] bg-muted">
              <img src={ASSETS.shopPhoto} alt="New Hope Shop" className="w-full h-full object-cover" />
            </div>
            <div className="p-7 space-y-6">
              <div>
                <button
                  onClick={() => setOpen((v) => !v)}
                  className="w-full flex items-center justify-between font-heading text-xs font-extrabold tracking-[0.2em] text-ink"
                >
                  OPENING HOURS
                  <ChevronDown size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {SHOP.hours.map((h) => (
                      <div key={h.day} className="bg-softblue rounded-lg px-3 py-2.5">
                        <div className="font-heading text-xs font-bold text-ink">{h.day}</div>
                        <div className="text-[11px] text-ink/60">{h.time}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-ink/70">
                <Scissors size={16} className="text-cta" /> Haircut, Beard and Dye
              </div>
              <ContactInfo />
              <CtaButton to="/locations/new-hope" className="w-full">
                SHOP DETAILS <ArrowRight size={15} />
              </CtaButton>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-softblue/40">
        <div className="max-w-xl mx-auto px-5 sm:px-8 text-center">
          <div className="w-14 h-14 rounded-full bg-cyanAccent grid place-items-center mx-auto mb-6">
            <MapPin className="text-ink" />
          </div>
          <h2 className="font-heading text-2xl sm:text-4xl font-extrabold text-ink mb-3">
            More locations coming soon.
          </h2>
          <p className="text-ink/60 mb-8">
            Enter your email below and we'll let you know when we open our next shop.
          </p>
          <form className="space-y-3 text-left" onSubmit={(e) => e.preventDefault()}>
            <input
              placeholder="Name"
              className="w-full bg-cyanAccent/40 rounded-xl px-4 py-3.5 text-sm text-ink placeholder:text-ink/50 focus:outline-none focus:ring-2 focus:ring-cta/40"
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full bg-cyanAccent/40 rounded-xl px-4 py-3.5 text-sm text-ink placeholder:text-ink/50 focus:outline-none focus:ring-2 focus:ring-cta/40"
            />
            <button className="w-full bg-ink text-white rounded-xl py-3.5 font-heading text-sm font-bold tracking-wide hover:bg-ink/90 transition-colors">
              SIGN ME UP
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
