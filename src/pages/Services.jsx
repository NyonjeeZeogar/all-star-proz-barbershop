import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  LogIn,
  Mail,
  MapPin,
  Phone,
  Scissors,
  User,
  UserPlus,
} from "lucide-react";

import {
  createAppointment,
  getActiveServices,
  getBarbers,
} from "@/services/appointments";

import { useAuth } from "@/lib/AuthContext";
import { LOCATIONS } from "@/lib/assets";
import SectionHeading from "@/components/site/SectionHeading";

const TIMES = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
];

export default function Services() {
  const { user } = useAuth();

  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedBarberId, setSelectedBarberId] = useState("");

  const [location, setLocation] = useState(
    LOCATIONS.find((item) => item.available)?.name || ""
  );

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [loadingBookingData, setLoadingBookingData] =
    useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(null);

  /**
   * Load services and barber profiles from Supabase.
   */
  useEffect(() => {
    let active = true;

    async function loadBookingData() {
      setLoadingBookingData(true);
      setError("");

      try {
        const [serviceRows, barberRows] = await Promise.all([
          getActiveServices(),
          getBarbers(),
        ]);

        if (!active) {
          return;
        }

        const loadedServices = serviceRows ?? [];
        const loadedBarbers = barberRows ?? [];

        setServices(loadedServices);
        setBarbers(loadedBarbers);

        if (loadedServices.length > 0) {
          setSelectedServiceId((currentId) => {
            const currentStillExists = loadedServices.some(
              (service) => service.id === currentId
            );

            return currentStillExists
              ? currentId
              : loadedServices[0].id;
          });
        } else {
          setSelectedServiceId("");
        }

        if (loadedBarbers.length > 0) {
          setSelectedBarberId((currentId) => {
            const currentStillExists = loadedBarbers.some(
              (barber) => barber.id === currentId
            );

            return currentStillExists
              ? currentId
              : loadedBarbers[0].id;
          });
        } else {
          setSelectedBarberId("");
        }
      } catch (err) {
        console.error("Unable to load booking data:", err);

        if (active) {
          setError(
            err?.message ||
              "Unable to load services and barbers."
          );
        }
      } finally {
        if (active) {
          setLoadingBookingData(false);
        }
      }
    }

    loadBookingData();

    return () => {
      active = false;
    };
  }, []);

  /**
   * Prefill the authenticated customer's information.
   */
  useEffect(() => {
    if (!user) {
      return;
    }

    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      "";

    setName((currentName) => currentName || fullName);
    setEmail(
      (currentEmail) => currentEmail || user.email || ""
    );
  }, [user]);

  const selectedService =
    services.find(
      (service) => service.id === selectedServiceId
    ) || null;

  const selectedBarber =
    barbers.find(
      (barber) => barber.id === selectedBarberId
    ) || null;

  const submit = async (event) => {
    event.preventDefault();

    if (!user) {
      setError(
        "Please sign in before booking an appointment."
      );
      return;
    }

    if (!selectedService) {
      setError("Please select a valid service.");
      return;
    }

    if (!selectedBarberId || !selectedBarber) {
      setError("Please select a barber before booking.");
      return;
    }

    if (!location) {
      setError("Please select a location.");
      return;
    }

    if (!date) {
      setError("Please select an appointment date.");
      return;
    }

    if (!time) {
      setError("Please select an appointment time.");
      return;
    }

    if (
      !name.trim() ||
      !email.trim() ||
      !phone.trim()
    ) {
      setError(
        "Please complete your name, email, and phone number."
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const appointmentPayload = {
        barber_id: selectedBarber.id,
        service_id: selectedService.id,
        service: selectedService.name,
        duration_minutes:
          selectedService.duration_minutes,
        appointment_date: date,
        start_time: convertTimeToDatabaseFormat(time),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };

      console.log(
        "Submitting appointment:",
        appointmentPayload
      );

      const appointment = await createAppointment(
        appointmentPayload
      );

      setSubmitted({
        ...appointment,
        serviceName: selectedService.name,
        barberName:
          selectedBarber.full_name || "Selected barber",
        location,
        date,
        displayTime: time,
      });
    } catch (err) {
      console.error(
        "Unable to create appointment:",
        err
      );

      setError(
        err?.message ||
          "Could not book your appointment. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(null);
    setDate("");
    setTime("");
    setPhone("");
    setError("");
  };

  return (
    <div className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <SectionHeading
          label="OUR SERVICES"
          title="Schedule your Appointment"
          align="center"
          className="mb-10"
        />

        <div className="relative rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="absolute right-4 top-4 rounded-full border border-ink/10 px-3 py-1 text-[10px] font-bold text-ink/40">
            All Stylez Pro
          </div>

          <label className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50">
            SELECT A SERVICE
          </label>

          {loadingBookingData ? (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-muted/60 px-4 py-8 text-sm text-ink/60">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Loading services and barbers...
            </div>
          ) : services.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-muted/60 p-5 text-sm text-ink/60">
              No active services are currently available.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    setSelectedServiceId(service.id);
                    setError("");
                  }}
                  className={`flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left transition-colors ${
                    selectedServiceId === service.id
                      ? "bg-cyanAccent/50 ring-2 ring-cta/30"
                      : "bg-muted/60 hover:bg-muted"
                  }`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink font-heading text-sm font-bold text-white">
                    {service.name?.[0]?.toUpperCase() || "S"}
                  </span>

                  <span className="flex-1">
                    <span className="block font-heading text-sm font-bold text-ink">
                      {service.name}
                    </span>

                    {service.description && (
                      <span className="mt-0.5 block line-clamp-2 text-xs text-ink/60">
                        {service.description}
                      </span>
                    )}

                    <span className="mt-1 block text-xs text-ink/50">
                      {service.duration_minutes
                        ? `${service.duration_minutes} minutes`
                        : ""}
                      {service.price !== null &&
                      service.price !== undefined
                        ? `${
                            service.duration_minutes
                              ? " • "
                              : ""
                          }$${Number(service.price).toFixed(
                            2
                          )}`
                        : ""}
                    </span>
                  </span>

                  <ChevronDown
                    size={16}
                    className="shrink-0 text-ink/40"
                  />
                </button>
              ))}
            </div>
          )}

          {!user ? (
            <div className="mt-8 rounded-2xl bg-ink p-8 text-center text-white">
              <LogIn
                className="mx-auto text-cyanAccent"
                size={26}
              />

              <h3 className="mt-4 font-heading text-xl font-extrabold">
                Sign in to book your appointment
              </h3>

              <p className="mt-2 text-sm text-white/70">
                Create an account or sign in to manage your
                bookings at All Stylez Pro.
              </p>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-cta px-6 py-3 font-heading text-sm font-bold text-white transition-colors hover:bg-cta/90"
                >
                  <LogIn size={16} />
                  Sign in
                </Link>

                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3 font-heading text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  <UserPlus size={16} />
                  Create account
                </Link>
              </div>
            </div>
          ) : submitted ? (
            <div className="mt-8 rounded-2xl bg-cyanAccent/40 p-8 text-center">
              <CheckCircle2
                className="mx-auto text-cta"
                size={30}
              />

              <h3 className="mt-3 font-heading text-xl font-extrabold text-ink">
                You're all set!
              </h3>

              <p className="mt-2 text-sm text-ink/70">
                We received your request for{" "}
                <strong>{submitted.serviceName}</strong>
                {submitted.barberName
                  ? ` with ${submitted.barberName}`
                  : ""}
                {submitted.date
                  ? ` on ${submitted.date}`
                  : ""}
                {submitted.displayTime
                  ? ` at ${submitted.displayTime}`
                  : ""}
                {submitted.location
                  ? ` (${submitted.location})`
                  : ""}
                . We'll confirm by email shortly.
              </p>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  to="/bookings"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-cta px-6 py-3 font-heading text-sm font-bold text-white transition-colors hover:bg-cta/90"
                >
                  View my bookings
                </Link>

                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 px-6 py-3 font-heading text-sm font-bold text-ink transition-colors hover:bg-muted"
                >
                  Book another
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="mt-8 grid gap-4 sm:grid-cols-2"
            >
              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="booking-location"
                    className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50"
                  >
                    LOCATION
                  </label>

                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/15 px-4 py-3">
                    <MapPin
                      size={16}
                      className="shrink-0 text-cta"
                    />

                    <select
                      id="booking-location"
                      value={location}
                      onChange={(event) =>
                        setLocation(event.target.value)
                      }
                      required
                      className="w-full bg-transparent text-sm text-ink focus:outline-none"
                    >
                      {LOCATIONS.map((item) => (
                        <option
                          key={item.name}
                          value={
                            item.available ? item.name : ""
                          }
                          disabled={!item.available}
                        >
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="booking-barber"
                    className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50"
                  >
                    BARBER
                  </label>

                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/15 px-4 py-3">
                    <Scissors
                      size={16}
                      className="shrink-0 text-cta"
                    />

                    <select
                      id="booking-barber"
                      value={selectedBarberId}
                      onChange={(event) => {
                        setSelectedBarberId(
                          event.target.value
                        );
                        setError("");
                      }}
                      required
                      disabled={
                        loadingBookingData ||
                        barbers.length === 0
                      }
                      className="w-full bg-transparent text-sm text-ink focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">
                        {loadingBookingData
                          ? "Loading barbers..."
                          : barbers.length === 0
                            ? "No barbers available"
                            : "Select a barber"}
                      </option>

                      {barbers.map((barber) => (
                        <option
                          key={barber.id}
                          value={barber.id}
                        >
                          {barber.full_name ||
                            barber.email ||
                            "Barber"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="booking-date"
                    className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50"
                  >
                    DATE
                  </label>

                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/15 px-4 py-3">
                    <CalendarDays
                      size={16}
                      className="text-cta"
                    />

                    <input
                      id="booking-date"
                      type="date"
                      value={date}
                      min={getTodayDate()}
                      onChange={(event) =>
                        setDate(event.target.value)
                      }
                      required
                      className="w-full bg-transparent text-sm text-ink focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="booking-time"
                    className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50"
                  >
                    TIME
                  </label>

                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/15 px-4 py-3">
                    <Clock
                      size={16}
                      className="text-cta"
                    />

                    <select
                      id="booking-time"
                      value={time}
                      onChange={(event) =>
                        setTime(event.target.value)
                      }
                      required
                      className="w-full bg-transparent text-sm text-ink focus:outline-none"
                    >
                      <option value="">
                        Select a time
                      </option>

                      {TIMES.map((availableTime) => (
                        <option
                          key={availableTime}
                          value={availableTime}
                        >
                          {availableTime}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="booking-name"
                  className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50"
                >
                  NAME
                </label>

                <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/15 px-4 py-3">
                  <User
                    size={16}
                    className="text-cta"
                  />

                  <input
                    id="booking-name"
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    required
                    autoComplete="name"
                    placeholder="Your name"
                    className="w-full bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="booking-email"
                  className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50"
                >
                  EMAIL
                </label>

                <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/15 px-4 py-3">
                  <Mail
                    size={16}
                    className="text-cta"
                  />

                  <input
                    id="booking-email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    required
                    autoComplete="email"
                    placeholder="you@email.com"
                    className="w-full bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="booking-phone"
                  className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50"
                >
                  PHONE
                </label>

                <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/15 px-4 py-3">
                  <Phone
                    size={16}
                    className="text-cta"
                  />

                  <input
                    id="booking-phone"
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                    required
                    autoComplete="tel"
                    placeholder="Your phone number"
                    className="w-full bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none"
                  />
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="text-sm font-medium text-red-600 sm:col-span-2"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  loadingBookingData ||
                  !selectedServiceId ||
                  !selectedBarberId
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cta py-4 font-heading text-sm font-bold tracking-wide text-white transition-colors hover:bg-cta/90 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
              >
                {submitting ? (
                  <>
                    <Loader2
                      className="animate-spin"
                      size={16}
                    />
                    Booking...
                  </>
                ) : (
                  "BOOK YOUR SEAT NOW"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function convertTimeToDatabaseFormat(timeValue) {
  if (!timeValue || typeof timeValue !== "string") {
    return "";
  }

  const trimmedValue = timeValue.trim();

  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  if (/^\d{2}:\d{2}$/.test(trimmedValue)) {
    return `${trimmedValue}:00`;
  }

  const match = trimmedValue.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  );

  if (!match) {
    return trimmedValue;
  }

  let hours = Number(match[1]);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  if (period === "PM" && hours !== 12) {
    hours += 12;
  }

  return `${String(hours).padStart(
    2,
    "0"
  )}:${minutes}:00`;
}

function getTodayDate() {
  const today = new Date();
  const timezoneOffset =
    today.getTimezoneOffset() * 60 * 1000;

  const localToday = new Date(
    today.getTime() - timezoneOffset
  );

  return localToday.toISOString().split("T")[0];
}
