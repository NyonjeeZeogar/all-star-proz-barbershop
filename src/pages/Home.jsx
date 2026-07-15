import React from "react";
import { ArrowRight, Scissors } from "lucide-react";
import { ASSETS, SHOP, TEAM } from "@/lib/assets";
import SectionHeading from "@/components/site/SectionHeading";
import CtaButton from "@/components/site/CtaButton";
import ContactInfo from "@/components/site/ContactInfo";
import OpeningHours from "@/components/site/OpeningHours";
import TeamCard from "@/components/site/TeamCard";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[88vh] flex items-center">
        <div className="absolute inset-0">
          <img
            src={ASSETS.heroImage}
            alt="All Stylez Pro hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-ink/55" />
        </div>
        <div className="relative w-full max-w-5xl mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center flex flex-col items-center">
          <span className="font-heading text-xs font-bold tracking-[0.3em] text-cyanAccent block mb-5">
            ALL STYLEZ PRO
          </span>
          <h1 className="font-heading text-4xl sm:text-6xl font-extrabold tracking-tight text-white text-balance leading-[1.05]">
            We welcome every community to experience All Stylez Pro.
          </h1>
          <div className="mt-9">
            <CtaButton to="/services" className="px-9 py-4 text-base">
              BOOK HERE <ArrowRight size={16} />
            </CtaButton>
          </div>
        </div>
      </section>

      {/* Locations */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <SectionHeading label="OUR LOCATIONS" title="New Hope Shop" className="mb-10" />
          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
            <div className="bg-softblue rounded-3xl p-8 sm:p-12 flex flex-col justify-center gap-7">
              <img src={ASSETS.logoColor} alt="All Stylez Pro" className="h-16 w-16 object-contain" />
              <h3 className="font-heading text-2xl font-extrabold text-ink">{SHOP.name}</h3>
              <ContactInfo />
              <div>
                <CtaButton to="/contact">
                  Contact Us <ArrowRight size={16} />
                </CtaButton>
              </div>
            </div>
            <div className="rounded-3xl overflow-hidden min-h-[320px] bg-muted">
              <img
                src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=80"
                alt="Barber at work"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="mt-8 grid lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl border border-ink/10 p-8">
              <OpeningHours />
            </div>
            <div className="bg-white rounded-3xl border border-ink/10 p-8">
              <h3 className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink mb-4">SERVICES</h3>
              <div className="flex flex-wrap gap-2.5">
                {SHOP.services.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-2 bg-cyanAccent/40 text-ink rounded-full px-4 py-2 text-sm font-heading font-bold"
                  >
                    <Scissors size={14} /> {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Experience */}
      <section className="py-20 sm:py-28 bg-ink text-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="mb-10">
            <span className="font-heading text-xs font-bold tracking-[0.25em] text-cyanAccent block mb-2">
              IN THE CHAIR
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              Experience the craft
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {[ASSETS.video1, ASSETS.video2].map((src, i) => (
              <div key={i} className="rounded-3xl overflow-hidden aspect-[4/3] bg-black/40">
                <video
                  src={src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 sm:py-28 bg-muted/40">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <SectionHeading label="OUR TEAM" title="Meet the barbers" align="center" className="mb-12" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEAM.map((m) => (
              <TeamCard key={m.slug} member={m} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}