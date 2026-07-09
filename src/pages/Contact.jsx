import React from "react";
import { Link } from "react-router-dom";
import { MapPin, ArrowRight } from "lucide-react";
import { SHOP } from "@/lib/assets";
import SectionHeading from "@/components/site/SectionHeading";
import OpeningHours from "@/components/site/OpeningHours";
import ContactInfo from "@/components/site/ContactInfo";

export default function Contact() {
  return (
    <div>
      <section className="py-16 sm:py-24 border-b border-ink/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <SectionHeading label="CONTACT" title="Get in touch." />
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-8">
          <div className="rounded-3xl overflow-hidden border border-ink/10 shadow-sm bg-white">
            <div className="bg-ink px-7 py-5">
              <h3 className="font-heading text-lg font-extrabold text-white">{SHOP.name}</h3>
            </div>
            <div className="bg-softblue p-7 space-y-8">
              <ContactInfo />
              <OpeningHours variant="grid" />
              <div>
                <Link
                  to="/services"
                  className="inline-flex items-center justify-center gap-2 bg-cta text-white rounded-full px-6 py-3.5 font-heading text-sm font-bold tracking-wide hover:bg-cta/90 transition-colors"
                >
                  BOOK YOUR SEAT NOW <ArrowRight size={15} />
                </Link>
                <p className="mt-3 text-xs text-ink/50">Integrate a booking system →</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden border border-ink/10 min-h-[420px] bg-muted">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2818.0042059115194!2d-93.38235792287762!3d45.06542575995601!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x52b3371c5c11d54f%3A0xa72a2e3e7b049373!2s7801%2062nd%20Ave%20N%2C%20Minneapolis%2C%20MN%2055428!5e0!3m2!1sen!2sus!4v1783485171126!5m2!1sen!2sus"
              width="100%"
              height="450"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              title="All Stylez Pro location map"
              className="w-full h-full min-h-[420px]"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
