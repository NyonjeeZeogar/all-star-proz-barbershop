import React, { useState } from "react";
import { ChevronDown, CalendarDays, Clock, User } from "lucide-react";
import SectionHeading from "@/components/site/SectionHeading";

const SERVICES = [
  {
    name: "Bleach Beard",
    desc: "Welcome to All Stylez Pro Barbershop! We're excited to provide you with top-notch grooming services and ensure your experience is seamless from start to finish. To..",
  },
  {
    name: "Haircut",
    desc: "Precision cuts tailored to your style — from skin fades to classic tapers, finished with a clean line-up.",
  },
  {
    name: "Beard Trim",
    desc: "Shape, line, and condition your beard for a sharp, defined look that lasts.",
  },
  {
    name: "Hair Dye",
    desc: "Custom color and treatments to refresh your look or cover grays with a natural finish.",
  },
];

const TIMES = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"];

export default function Services() {
  const [selected, setSelected] = useState(SERVICES[0].name);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <SectionHeading label="OUR SERVICES" title="Schedule your Appointment" align="center" className="mb-10" />

        <div className="relative bg-white rounded-3xl border border-ink/10 shadow-sm p-6 sm:p-8">
          <div className="absolute top-4 right-4 text-[10px] font-bold text-ink/40 border border-ink/10 rounded-full px-3 py-1">
            Powered by Calendly
          </div>

          <label className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50">
            SELECT A SERVICE
          </label>
          <div className="mt-3 space-y-2">
            {SERVICES.map((s) => (
              <button
                key={s.name}
                onClick={() => setSelected(s.name)}
                className={`w-full flex items-center gap-4 rounded-2xl px-4 py-4 text-left transition-colors ${
                  selected === s.name ? "bg-cyanAccent/50 ring-2 ring-cta/30" : "bg-muted/60 hover:bg-muted"
                }`}
              >
                <span className="w-10 h-10 rounded-full bg-ink text-white grid place-items-center text-sm font-heading font-bold shrink-0">
                  {s.name[0]}
                </span>
                <span className="flex-1">
                  <span className="block font-heading text-sm font-bold text-ink">{s.name}</span>
                  <span className="block text-xs text-ink/60 mt-0.5 line-clamp-2">{s.desc}</span>
                </span>
                <ChevronDown size={16} className="text-ink/40 shrink-0" />
              </button>
            ))}
          </div>

          {submitted ? (
            <div className="mt-8 rounded-2xl bg-cyanAccent/40 p-8 text-center">
              <h3 className="font-heading text-xl font-extrabold text-ink">You're all set!</h3>
              <p className="text-ink/70 mt-2 text-sm">
                We received your request for <b>{selected}</b>
                {date ? ` on ${date}` : ""}
                {time ? ` at ${time}` : ""}. We'll confirm by email shortly.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-5 text-sm font-heading font-bold text-cta underline"
              >
                Book another appointment
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50">DATE</label>
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/15 px-4 py-3">
                    <CalendarDays size={16} className="text-cta" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full bg-transparent text-sm text-ink focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50">TIME</label>
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/15 px-4 py-3">
                    <Clock size={16} className="text-cta" />
                    <select
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                      className="w-full bg-transparent text-sm text-ink focus:outline-none"
                    >
                      <option value="">Select a time</option>
                      {TIMES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50">NAME</label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/15 px-4 py-3">
                  <User size={16} className="text-cta" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your name"
                    className="w-full bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50">EMAIL</label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/15 px-4 py-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@email.com"
                    className="w-full bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none"
                  />
                </div>
              </div>
              <button className="sm:col-span-2 bg-cta text-white rounded-xl py-4 font-heading text-sm font-bold tracking-wide hover:bg-cta/90 transition-colors">
                BOOK YOUR SEAT NOW
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
