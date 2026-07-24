import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Hourglass,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Scissors,
  UserRound,
  X,
} from "lucide-react";

import {
  cancelAppointment,
  getAppointmentById,
} from "@/services/appointments";
import {
  cancelPortalAppointment,
  getPortalAppointmentById,
} from "@/services/barberPortal";
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

function formatAppointmentDate(value) {
  if (!value) return "Not available";

  const raw = String(value);
  const date = new Date(
    raw.includes("T") ? raw : `${raw}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) return raw;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value, currency = "USD") {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

function formatPaymentStatus(value) {
  if (!value) return "Not available";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3 border-b border-ink/10 py-4 last:border-b-0">
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted">
        <Icon size={16} className="text-ink/70" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
          {label}
        </p>

        <div className="mt-1 break-words text-sm font-semibold text-ink">
          {value || "Not available"}
        </div>
      </div>
    </div>
  );
}

export default function AppointmentDetails() {
  const { id } = useParams();
  const location = useLocation();
  const isBarberView = location.pathname.startsWith(
    "/barber/appointments/"
  );
  const backPath = isBarberView
    ? "/portal?tab=bookings"
    : "/bookings";
  const backLabel = isBarberView
    ? "Back to barber portal"
    : "Back to bookings";

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadAppointment = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      setAppointment(
        await (isBarberView
          ? getPortalAppointmentById(id)
          : getAppointmentById(id))
      );
    } catch (error) {
      console.error("Unable to load appointment:", error);
      setAppointment(null);
      setErrorMessage(
        error?.message || "Unable to load this appointment."
      );
    } finally {
      setLoading(false);
    }
  }, [id, isBarberView]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  const normalizedStatus =
    appointment?.status?.toLowerCase() || "pending";

  const status = STATUS[normalizedStatus] || STATUS.pending;
  const StatusIcon = status.Icon;

  const serviceName =
    appointment?.service_details?.name ||
    appointment?.service?.name ||
    appointment?.service_name ||
    (typeof appointment?.service === "string"
      ? appointment.service
      : null) ||
    "Appointment";

  const barberName =
    appointment?.barber?.full_name ||
    appointment?.barber_name ||
    (typeof appointment?.barber === "string"
      ? appointment.barber
      : null) ||
    "Not assigned";

  const appointmentDate =
    appointment?.appointment_date || appointment?.date;

  const appointmentTime =
    appointment?.start_time ||
    appointment?.appointment_time ||
    appointment?.time;

  const canCancel = useMemo(
    () =>
      appointment &&
      ![
        "cancelled",
        "completed",
        "no_show",
        "payment_expired",
      ].includes(normalizedStatus),
    [appointment, normalizedStatus]
  );

  async function handleCancel() {
    const shouldCancel = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!shouldCancel) return;

    try {
      setCancelling(true);
      setErrorMessage("");

      const updated = await (isBarberView
        ? cancelPortalAppointment(id)
        : cancelAppointment(id));

      setAppointment((current) => ({
        ...current,
        ...updated,
        status: "cancelled",
      }));
    } catch (error) {
      console.error("Unable to cancel appointment:", error);
      setErrorMessage(
        error?.message || "Unable to cancel this appointment."
      );
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-[60vh] place-items-center px-5 py-16">
        <div className="text-center">
          <Loader2
            size={30}
            className="mx-auto animate-spin text-ink/40"
          />

          <p className="mt-3 text-sm text-ink/60">
            Loading appointment...
          </p>
        </div>
      </main>
    );
  }

  if (!appointment) {
    return (
      <main className="mx-auto min-h-[60vh] max-w-2xl px-5 py-20 text-center sm:px-8">
        <div className="rounded-3xl border border-ink/10 bg-white p-10 shadow-sm">
          <X size={36} className="mx-auto text-red-500" />

          <h1 className="mt-4 font-heading text-2xl font-extrabold text-ink">
            Appointment not available
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm text-ink/60">
            {errorMessage}
          </p>

          <Link
            to={backPath}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-cta px-6 py-3 font-heading text-sm font-bold text-white"
          >
            <ArrowLeft size={16} />
            {backLabel}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-muted/30 py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <Link
          to={backPath}
          className="inline-flex items-center gap-2 text-sm font-bold text-ink/60 transition-colors hover:text-ink"
        >
          <ArrowLeft size={16} />
          {backLabel}
        </Link>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-heading text-xs font-bold uppercase tracking-[0.25em] text-cta">
              Appointment details
            </p>

            <h1 className="mt-2 font-heading text-3xl font-extrabold text-ink sm:text-4xl">
              {serviceName}
            </h1>

            <p className="mt-2 text-sm text-ink/55">
              Appointment ID: {appointment.id}
            </p>
          </div>

          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${status.className}`}
          >
            <StatusIcon size={16} />
            {status.label}
          </span>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-cyanAccent/40">
                <Scissors size={18} />
              </div>

              <div>
                <h2 className="font-heading text-xl font-extrabold text-ink">
                  Appointment
                </h2>
                <p className="text-sm text-ink/55">
                  {isBarberView
                    ? "Customer and service information"
                    : "Your scheduled service information"}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <DetailRow
                icon={Scissors}
                label="Service"
                value={serviceName}
              />

              <DetailRow
                icon={UserRound}
                label="Barber"
                value={barberName}
              />

              <DetailRow
                icon={CalendarDays}
                label="Date"
                value={formatAppointmentDate(appointmentDate)}
              />

              <DetailRow
                icon={Clock}
                label="Time"
                value={
                  appointmentTime
                    ? formatTime(appointmentTime)
                    : "Not available"
                }
              />

              <DetailRow
                icon={MapPin}
                label="Location"
                value={
                  appointment.location_name || "All Stylez Pro"
                }
              />
            </div>
          </section>

          <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <CreditCard size={20} className="text-ink/70" />

              <h2 className="font-heading text-lg font-extrabold text-ink">
                Payment summary
              </h2>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink/55">Service price</dt>
                <dd className="font-bold text-ink">
                  {formatCurrency(
                    appointment.service_price ??
                      appointment.service_details?.price,
                    appointment.currency
                  )}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-ink/55">Amount paid</dt>
                <dd className="font-bold text-green-700">
                  {formatCurrency(
                    appointment.amount_paid,
                    appointment.currency
                  )}
                </dd>
              </div>

              <div className="flex justify-between gap-4 border-t border-ink/10 pt-3">
                <dt className="font-bold text-ink">
                  Remaining balance
                </dt>
                <dd className="font-extrabold text-ink">
                  {formatCurrency(
                    appointment.remaining_balance,
                    appointment.currency
                  )}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-ink/55">Payment status</dt>
                <dd className="text-right font-bold text-ink">
                  {formatPaymentStatus(
                    appointment.payment_status
                  )}
                </dd>
              </div>
            </dl>

            {appointment.square_receipt_url && (
              <a
                href={appointment.square_receipt_url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink/15 px-5 py-3 font-heading text-sm font-bold text-ink transition-colors hover:bg-muted"
              >
                <Receipt size={16} />
                View payment receipt
                <ExternalLink size={14} />
              </a>
            )}
          </section>

          <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="font-heading text-xl font-extrabold text-ink">
              Customer information
            </h2>

            <div className="mt-4">
              <DetailRow
                icon={UserRound}
                label="Name"
                value={
                  appointment.customer?.full_name ||
                  appointment.customer_name ||
                  appointment.name
                }
              />

              <DetailRow
                icon={Mail}
                label="Email"
                value={
                  appointment.customer?.email ||
                  appointment.customer_email ||
                  appointment.email
                }
              />

              <DetailRow
                icon={Phone}
                label="Phone"
                value={appointment.customer?.phone || appointment.phone}
              />
            </div>

            {appointment.customer_notes && (
              <div className="mt-5 rounded-2xl bg-muted/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
                  Notes
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/70">
                  {appointment.customer_notes}
                </p>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
            <h2 className="font-heading text-lg font-extrabold text-ink">
              Manage appointment
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink/55">
              {isBarberView
                ? "Manage this appointment from the barber portal."
                : "Contact the shop for help changing your appointment, or cancel it below."}
            </p>

            <div className="mt-5 space-y-3">
              <Link
                to={isBarberView ? "/portal?tab=bookings" : "/contact"}
                className="inline-flex w-full items-center justify-center rounded-full bg-cta px-5 py-3 font-heading text-sm font-bold text-white transition-colors hover:bg-cta/90"
              >
                {isBarberView ? "Open barber portal" : "Contact the shop"}
              </Link>

              {canCancel && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-200 px-5 py-3 font-heading text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cancelling ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <X size={16} />
                  )}

                  {cancelling
                    ? "Cancelling..."
                    : "Cancel appointment"}
                </button>
              )}

              {!canCancel && (
                <p className="rounded-xl bg-muted px-4 py-3 text-center text-sm text-ink/55">
                  This appointment can no longer be cancelled.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
