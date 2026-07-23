import { useCallback, useEffect, useState } from "react";
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

import { useAuth } from "@/lib/AuthContext";
import { ASSETS } from "@/lib/assets";
import {
  cancelAppointment,
  getMyAppointments,
} from "@/services/appointments";
import { formatTime } from "@/lib/dateTime";

const STATUS = {
  pending_payment: {
    label: "Awaiting payment",
    className: "bg-orange-100 text-orange-700",
    Icon: Hourglass,
  },
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700",
    Icon: Hourglass,
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-green-100 text-green-700",
    Icon: CheckCircle2,
  },
  completed: {
    label: "Completed",
    className: "bg-blue-100 text-blue-700",
    Icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700",
    Icon: X,
  },
  no_show: {
    label: "No show",
    className: "bg-red-100 text-red-700",
    Icon: X,
  },
  payment_expired: {
    label: "Payment expired",
    className: "bg-slate-100 text-slate-600",
    Icon: X,
  },
};

export default function MyBookings() {
  const { user } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadBookings = useCallback(async () => {
    if (!user?.id) {
      setBookings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getMyAppointments();

      setBookings(data ?? []);
    } catch (error) {
      console.error("Unable to load appointments:", error);

      setBookings([]);

      setErrorMessage(
        error?.message ||
          "Unable to load your appointments."
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  async function handleCancelBooking(appointmentId) {
    const shouldCancel = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!shouldCancel) {
      return;
    }

    try {
      setCancellingId(appointmentId);
      setErrorMessage("");

      const updatedAppointment =
        await cancelAppointment(appointmentId);

      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking.id === appointmentId
            ? {
                ...booking,
                ...updatedAppointment,
                status: "cancelled",
              }
            : booking
        )
      );
    } catch (error) {
      console.error(
        "Unable to cancel appointment:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to cancel this appointment."
      );
    } finally {
      setCancellingId(null);
    }
  }

  const customerName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "";

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
            {customerName ? `, ${customerName}` : ""}.
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Manage your upcoming appointments at All Stylez
            Pro.
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
              <Plus size={15} />
              Book new appointment
            </Link>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2
                className="animate-spin text-ink/40"
                size={28}
              />
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink/15 bg-muted/40 p-12 text-center">
              <CalendarDays
                className="mx-auto text-ink/30"
                size={32}
              />

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
                <Plus size={16} />
                Book new appointment
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => {
                const normalizedStatus =
                  booking.status?.toLowerCase() ||
                  "pending";

                const status =
                  STATUS[normalizedStatus] ||
                  STATUS.pending;

                const StatusIcon = status.Icon;

                const serviceName =
                  booking.service_details?.name ||
                  booking.service_name ||
                  (typeof booking.service === "string"
                    ? booking.service
                    : null) ||
                  "Appointment";

                const servicePrice =
                  booking.service_price ??
                  booking.service_details?.price;

                const appointmentDate =
                  booking.appointment_date ||
                  booking.date;

                const appointmentTime =
                  booking.start_time ||
                  booking.appointment_time ||
                  booking.time;

                const bookingCustomerName =
                  booking.customer_name ||
                  booking.name;

                const barberName =
                  booking.barber?.full_name ||
                  booking.barber_name ||
                  (typeof booking.barber === "string"
                    ? booking.barber
                    : null);

                const depositAmount =
                  booking.deposit_amount;

                const amountPaid =
                  booking.amount_paid;

                const remainingBalance =
                  booking.remaining_balance;

                const paymentStatus =
                  booking.payment_status;

                const canCancel = ![
                  "cancelled",
                  "completed",
                  "no_show",
                  "payment_expired",
                ].includes(normalizedStatus);

                return (
                  <article
                    key={booking.id}
                    className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:flex-row sm:items-center"
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-cyanAccent/40">
                      <Scissors
                        className="text-ink"
                        size={18}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-heading font-extrabold text-ink">
                          {serviceName}
                        </h3>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}
                        >
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink/60">
                        {appointmentDate && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays size={14} />
                            {formatAppointmentDate(
                              appointmentDate
                            )}
                          </span>
                        )}

                        {appointmentTime && (
                          <span className="inline-flex items-center gap-1">
                            <Clock size={14} />
                            {formatTime(appointmentTime)}
                          </span>
                        )}

                        {bookingCustomerName && (
                          <span>{bookingCustomerName}</span>
                        )}

                        {barberName && (
                          <span>
                            Barber: {barberName}
                          </span>
                        )}
                      </div>

                      {(servicePrice != null ||
                        depositAmount != null ||
                        amountPaid != null ||
                        remainingBalance != null ||
                        paymentStatus) && (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          {servicePrice != null && (
                            <span className="rounded-full bg-muted px-3 py-1 font-medium text-ink/70">
                              Service:{" "}
                              {formatCurrency(
                                servicePrice,
                                booking.currency
                              )}
                            </span>
                          )}

                          {depositAmount != null && (
                            <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                              Deposit:{" "}
                              {formatCurrency(
                                depositAmount,
                                booking.currency
                              )}
                            </span>
                          )}

                          {amountPaid != null &&
                            Number(amountPaid) > 0 && (
                              <span className="rounded-full bg-green-50 px-3 py-1 font-medium text-green-700">
                                Paid:{" "}
                                {formatCurrency(
                                  amountPaid,
                                  booking.currency
                                )}
                              </span>
                            )}

                          {remainingBalance != null &&
                            Number(remainingBalance) > 0 && (
                              <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                                Balance:{" "}
                                {formatCurrency(
                                  remainingBalance,
                                  booking.currency
                                )}
                              </span>
                            )}

                          {paymentStatus && (
                            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium capitalize text-slate-600">
                              Payment:{" "}
                              {formatPaymentStatus(
                                paymentStatus
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {canCancel && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCancelBooking(
                            booking.id
                          )
                        }
                        disabled={
                          cancellingId === booking.id
                        }
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-ink/15 px-4 py-2 font-heading text-xs font-bold text-ink/70 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {cancellingId ===
                        booking.id ? (
                          <Loader2
                            className="animate-spin"
                            size={14}
                          />
                        ) : (
                          <X size={14} />
                        )}

                        {cancellingId ===
                        booking.id
                          ? "Cancelling..."
                          : "Cancel"}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function formatAppointmentDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const rawDate = String(dateValue);

  const date = new Date(
    rawDate.includes("T")
      ? rawDate
      : `${rawDate}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return rawDate;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatCurrency(
  value,
  currency = "USD"
) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

function formatPaymentStatus(status) {
  return String(status)
    .replaceAll("_", " ")
    .trim();
}
