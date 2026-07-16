import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Hourglass,
  Loader2,
  Plus,
  Scissors,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { ASSETS } from "@/lib/assets";

const STATUS = {
  pending: {
    label: "Pending",
    cls: "bg-amber-100 text-amber-700",
    Icon: Hourglass,
  },
  confirmed: {
    label: "Confirmed",
    cls: "bg-green-100 text-green-700",
    Icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-red-100 text-red-700",
    Icon: X,
  },
};

export default function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [error, setError] = useState("");

  const loadBookings = useCallback(async () => {
    if (!user?.id) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("Unable to load appointments:", queryError);
      setError(queryError.message || "Unable to load your appointments.");
      setBookings([]);
    } else {
      setBookings(data ?? []);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const cancelBooking = async (id) => {
    if (!user?.id) return;

    setCancelling(id);
    setError("");

    const { error: updateError } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Unable to cancel appointment:", updateError);
      setError(updateError.message || "Unable to cancel this appointment.");
    } else {
      setBookings((current) =>
        current.map((booking) =>
          booking.id === id
            ? { ...booking, status: "cancelled" }
            : booking
        )
      );
    }

    setCancelling(null);
  };

  return (
    <div>
      <section className="relative flex min-h-[44vh] items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={ASSETS.heroImage}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-ink/65" />
        </div>

        <div className="relative mx-auto w-full max-w-5xl px-5 py-20 text-center sm:px-8">
          <span className="mb-4 block font-heading text-xs font-bold tracking-[0.3em] text-cyanAccent">
            MY APPOINTMENTS
          </span>
          <h1 className="font-heading text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Welcome back
            {user?.user_metadata?.full_name
              ? `, ${user.user_metadata.full_name}`
              : user?.full_name
                ? `, ${user.full_name}`
                : ""}
            .
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Manage your upcoming appointments at All Stylez Pro.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="mb-8 flex items-center justify-between gap-3">
            <h2 className="font-heading text-xl font-extrabold text-ink">
              Your bookings
            </h2>
            <Link
              to="/services"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-cta px-5 py-2.5 font-heading text-xs font-bold tracking-wide text-white transition-colors hover:bg-cta/90"
            >
              <Plus size={15} /> Book new appointment
            </Link>
          </div>

          {error && (
            <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-ink/40" size={28} />
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink/15 bg-muted/40 p-12 text-center">
              <CalendarDays className="mx-auto text-ink/30" size={32} />
              <h3 className="mt-4 font-heading font-bold text-ink">
                No appointments yet
              </h3>
              <p className="mt-1 text-sm text-ink/60">
                Book your first appointment to get started.
              </p>
              <Link
                to="/services"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-cta px-6 py-3 font-heading text-sm font-bold text-white transition-colors hover:bg-cta/90"
              >
                <Plus size={16} /> Book new appointment
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => {
                const status = STATUS[booking.status] ?? STATUS.pending;
                const StatusIcon = status.Icon;

                return (
                  <div
                    key={booking.id}
                    className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:flex-row sm:items-center"
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-cyanAccent/40">
                      <Scissors className="text-ink" size={18} />
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-heading font-extrabold text-ink">
                          {booking.service_name ?? booking.service ?? "Appointment"}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${status.cls}`}
                        >
                          <StatusIcon size={12} /> {status.label}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-ink/60">
                        {(booking.appointment_date ?? booking.date) && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays size={14} />
                            {booking.appointment_date ?? booking.date}
                          </span>
                        )}
                        {(booking.appointment_time ?? booking.time) && (
                          <span className="inline-flex items-center gap-1">
                            <Clock size={14} />
                            {booking.appointment_time ?? booking.time}
                          </span>
                        )}
                        {(booking.customer_name ?? booking.name) && (
                          <span>{booking.customer_name ?? booking.name}</span>
                        )}
                      </div>
                    </div>

                    {booking.status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={() => cancelBooking(booking.id)}
                        disabled={cancelling === booking.id}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-ink/15 px-4 py-2 font-heading text-xs font-bold text-ink/70 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        {cancelling === booking.id ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <X size={14} />
                        )}
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
