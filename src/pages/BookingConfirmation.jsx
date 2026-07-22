import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 24;

/**
 * Expected backend response:
 * {
 *   "bookingId": "...",
 *   "paymentStatus": "paid",       // or: pending, failed, refunded
 *   "bookingStatus": "confirmed",  // must be confirmed before success is shown
 *   "serviceName": "Haircut",
 *   "appointmentStart": "2026-07-22T18:00:00.000Z",
 *   "barberName": "..."
 * }
 *
 * IMPORTANT: The backend endpoint must verify the authenticated customer owns
 * the booking. It must determine payment state from your database/webhook data,
 * never from query-string values supplied by the browser.
 */
export default function BookingConfirmation() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  const [state, setState] = useState({
    status: "checking",
    booking: null,
    message: "Verifying your payment and booking...",
  });

  const statusUrl = useMemo(() => {
    if (!bookingId) return null;

    // Change this path only if your backend uses a different route.
    return `/api/bookings/${encodeURIComponent(bookingId)}/payment-status`;
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId || !statusUrl) {
      setState({
        status: "error",
        booking: null,
        message: "This confirmation link is missing a booking reference.",
      });
      return undefined;
    }

    let cancelled = false;
    let timerId;
    let attempts = 0;

    async function checkBooking() {
      attempts += 1;

      try {
        const response = await fetch(statusUrl, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        if (response.status === 401 || response.status === 403) {
          throw new Error("Please sign in with the account used to make this booking.");
        }

        if (response.status === 404) {
          throw new Error("We could not find this booking.");
        }

        if (!response.ok) {
          throw new Error("We could not verify the booking right now.");
        }

        const booking = await response.json();
        if (cancelled) return;

        const paymentConfirmed = booking.paymentStatus === "paid";
        const bookingConfirmed = booking.bookingStatus === "confirmed";

        if (paymentConfirmed && bookingConfirmed) {
          setState({
            status: "confirmed",
            booking,
            message: "Your payment was received and your appointment is confirmed.",
          });
          return;
        }

        if (["failed", "canceled", "cancelled", "refunded"].includes(booking.paymentStatus)) {
          setState({
            status: "error",
            booking,
            message: "The payment was not completed, so this appointment is not confirmed.",
          });
          return;
        }

        if (attempts >= MAX_POLL_ATTEMPTS) {
          setState({
            status: "pending",
            booking,
            message:
              "Your payment is still being processed. Check My Bookings in a moment for the latest status.",
          });
          return;
        }

        setState({
          status: "checking",
          booking,
          message: "Payment received by Square. Waiting for the booking to be confirmed...",
        });

        timerId = window.setTimeout(checkBooking, POLL_INTERVAL_MS);
      } catch (error) {
        if (cancelled) return;

        setState({
          status: "error",
          booking: null,
          message: error instanceof Error ? error.message : "Unable to verify this booking.",
        });
      }
    }

    checkBooking();

    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [bookingId, statusUrl]);

  const appointmentDate = state.booking?.appointmentStart
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "full",
        timeStyle: "short",
      }).format(new Date(state.booking.appointmentStart))
    : null;

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-2xl items-center px-4 py-16">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {state.status === "checking" && (
          <div
            className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"
            aria-label="Verifying booking"
          />
        )}

        {state.status === "confirmed" && (
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
            ✓
          </div>
        )}

        <h1 className="text-3xl font-bold text-slate-900">
          {state.status === "confirmed"
            ? "Booking confirmed"
            : state.status === "checking"
              ? "Confirming your booking"
              : state.status === "pending"
                ? "Confirmation pending"
                : "Booking not confirmed"}
        </h1>

        <p className="mt-4 text-slate-600">{state.message}</p>

        {state.status === "confirmed" && state.booking && (
          <dl className="mt-8 space-y-3 rounded-xl bg-slate-50 p-5 text-left">
            {state.booking.serviceName && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Service</dt>
                <dd className="font-medium text-slate-900">{state.booking.serviceName}</dd>
              </div>
            )}

            {state.booking.barberName && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Barber</dt>
                <dd className="font-medium text-slate-900">{state.booking.barberName}</dd>
              </div>
            )}

            {appointmentDate && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Appointment</dt>
                <dd className="text-right font-medium text-slate-900">{appointmentDate}</dd>
              </div>
            )}

            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Booking reference</dt>
              <dd className="break-all text-right font-medium text-slate-900">{bookingId}</dd>
            </div>
          </dl>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/bookings"
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            View My Bookings
          </Link>
          <Link
            to="/services"
            className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Services
          </Link>
        </div>
      </section>
    </main>
  );
}
