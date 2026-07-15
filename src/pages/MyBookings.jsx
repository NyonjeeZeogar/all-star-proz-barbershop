import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  Scissors,
  X,
  Plus,
  Loader2,
  CheckCircle2,
  Hourglass,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ASSETS } from "@/lib/assets";

const STATUS = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700", Icon: Hourglass },
  confirmed: { label: "Confirmed", cls: "bg-green-100 text-green-700", Icon: CheckCircle2 },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-700", Icon: X },
};

export default function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  const load = async () => {
    try {
      const list = await base44.entities.Appointment.filter(
        { created_by_id: user.id },
        "-created_date"
      );
      setBookings(list);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = async (id) => {
    setCancelling(id);
    try {
      await base44.entities.Appointment.update(id, { status: "cancelled" });
      setBookings((b) =>
        b.map((x) => (x.id === id ? { ...x, status: "cancelled" } : x))
      );
    } catch (e) {
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div>
      <section className="relative overflow-hidden min-h-[44vh] flex items-center">
        <div className="absolute inset-0">
          <img src={ASSETS.heroImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-ink/65" />
        </div>
        <div className="relative w-full max-w-5xl mx-auto px-5 sm:px-8 py-20 text-center">
          <span className="font-heading text-xs font-bold tracking-[0.3em] text-cyanAccent block mb-4">
            MY APPOINTMENTS
          </span>
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            Welcome back{user?.full_name ? `, ${user.full_name}` : ""}.
          </h1>
          <p className="mt-4 text-white/70 max-w-xl mx-auto">
            Manage your upcoming appointments at All Stylez Pro.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between mb-8 gap-3">
            <h2 className="font-heading text-xl font-extrabold text-ink">Your bookings</h2>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 bg-cta text-white rounded-full px-5 py-2.5 font-heading text-xs font-bold tracking-wide hover:bg-cta/90 transition-colors shrink-0"
            >
              <Plus size={15} /> Book new appointment
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-ink/40" size={28} />
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink/15 bg-muted/40 p-12 text-center">
              <CalendarDays className="mx-auto text-ink/30" size={32} />
              <h3 className="mt-4 font-heading font-bold text-ink">No appointments yet</h3>
              <p className="text-sm text-ink/60 mt-1">
                Book your first appointment to get started.
              </p>
              <Link
                to="/services"
                className="mt-5 inline-flex items-center gap-2 bg-cta text-white rounded-full px-6 py-3 font-heading text-sm font-bold hover:bg-cta/90 transition-colors"
              >
                <Plus size={16} /> Book new appointment
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => {
                const st = STATUS[b.status] || STATUS.pending;
                return (
                  <div
                    key={b.id}
                    className="bg-white rounded-2xl border border-ink/10 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-cyanAccent/40 grid place-items-center shrink-0">
                      <Scissors className="text-ink" size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-heading font-extrabold text-ink">{b.service}</h3>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold rounded-full px-2.5 py-1 ${st.cls}`}
                        >
                          <st.Icon size={12} /> {st.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-ink/60 flex-wrap">
                        {b.date && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays size={14} /> {b.date}
                          </span>
                        )}
                        {b.time && (
                          <span className="inline-flex items-center gap-1">
                            <Clock size={14} /> {b.time}
                          </span>
                        )}
                        {b.name && <span>{b.name}</span>}
                      </div>
                    </div>
                    {b.status !== "cancelled" && (
                      <button
                        onClick={() => cancel(b.id)}
                        disabled={cancelling === b.id}
                        className="inline-flex items-center justify-center gap-2 border border-ink/15 text-ink/70 rounded-full px-4 py-2 text-xs font-heading font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50 shrink-0"
                      >
                        {cancelling === b.id ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <X size={14} />
                        )}{" "}
                        Cancel
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
