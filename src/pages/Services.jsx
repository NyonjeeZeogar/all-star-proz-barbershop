import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Info,
  Loader2,
  LogIn,
  Mail,
  MapPin,
  Phone,
  Scissors,
  ShieldCheck,
  User,
  UserPlus,
  Wallet,
} from "lucide-react";

import {
  createAppointment,
  getBarbers,
  getBarberServices,
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

const PAYMENT_OPTIONS = {
  deposit: "deposit",
  full: "full",
};

const SQUARE_PAYMENTS_ENABLED =
  import.meta.env.VITE_SQUARE_PAYMENTS_ENABLED === "true";

export default function Services() {
  const { user } = useAuth();

  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");

  const [location, setLocation] = useState(
    LOCATIONS.find((item) => item.available)?.name || ""
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentOption, setPaymentOption] = useState(
    PAYMENT_OPTIONS.deposit
  );

  const [loadingBarbers, setLoadingBarbers] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadBarbers() {
      setLoadingBarbers(true);
      setError("");

      try {
        const rows = await getBarbers();

        if (!active) return;

        const loadedBarbers = rows ?? [];
        setBarbers(loadedBarbers);
        setSelectedBarberId((currentId) =>
          loadedBarbers.some((barber) => barber.id === currentId)
            ? currentId
            : loadedBarbers[0]?.id || ""
        );
      } catch (loadError) {
        console.error("Unable to load barbers:", loadError);
        if (active) {
          setError(loadError?.message || "Unable to load barbers.");
        }
      } finally {
        if (active) setLoadingBarbers(false);
      }
    }

    loadBarbers();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadServicesForBarber() {
      if (!selectedBarberId) {
        setServices([]);
        setSelectedServiceId("");
        return;
      }

      setLoadingServices(true);
      setError("");

      try {
        const rows = await getBarberServices(selectedBarberId);

        if (!active) return;

        const loadedServices = rows ?? [];
        setServices(loadedServices);
        setSelectedServiceId((currentId) =>
          loadedServices.some((service) => service.id === currentId)
            ? currentId
            : loadedServices[0]?.id || ""
        );
      } catch (loadError) {
        console.error("Unable to load barber services:", loadError);
        if (active) {
          setServices([]);
          setSelectedServiceId("");
          setError(
            loadError?.message || "Unable to load this barber's services."
          );
        }
      } finally {
        if (active) setLoadingServices(false);
      }
    }

    loadServicesForBarber();

    return () => {
      active = false;
    };
  }, [selectedBarberId]);

  useEffect(() => {
    if (!user) return;

    const fullName =
      user.user_metadata?.full_name || user.user_metadata?.name || "";

    setName((current) => current || fullName);
    setEmail((current) => current || user.email || "");
  }, [user]);

  const selectedBarber = useMemo(
    () => barbers.find((barber) => barber.id === selectedBarberId) || null,
    [barbers, selectedBarberId]
  );

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) || null,
    [services, selectedServiceId]
  );

  const servicePrice = parseMoney(selectedService?.price);
  const requiredDeposit = parseMoney(selectedService?.deposit);

  useEffect(() => {
    if (!selectedService) return;

    if (parseMoney(selectedService.deposit) <= 0) {
      setPaymentOption(PAYMENT_OPTIONS.full);
    }
  }, [selectedService]);

  const selectedPaymentAmount =
    paymentOption === PAYMENT_OPTIONS.full
      ? servicePrice
      : requiredDeposit;

  const amountDueNow = SQUARE_PAYMENTS_ENABLED
    ? selectedPaymentAmount
    : 0;

  const remainingBalance = Math.max(servicePrice - amountDueNow, 0);

  async function submit(event) {
    event.preventDefault();

    if (!user) {
      setError("Please sign in before booking an appointment.");
      return;
    }

    if (!selectedBarber || !selectedService) {
      setError("Please select a barber and service.");
      return;
    }

    if (!location || !date || !time) {
      setError("Please select a location, date, and time.");
      return;
    }

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Please complete your name, email, and phone number.");
      return;
    }

    if (servicePrice <= 0) {
      setError("This service does not have a valid price.");
      return;
    }

    if (
      SQUARE_PAYMENTS_ENABLED &&
      paymentOption === PAYMENT_OPTIONS.deposit &&
      requiredDeposit <= 0
    ) {
      setError(
        "A deposit is not configured for this service. Please select full payment."
      );
      return;
    }

    const databaseTime = convertTimeToDatabaseFormat(time);
    const appointmentDateTime = createLocalAppointmentDate(date, databaseTime);

    if (appointmentDateTime && appointmentDateTime.getTime() <= Date.now()) {
      setError("Please select a future appointment time.");
      return;
    }

    const requiresOnlinePayment =
      SQUARE_PAYMENTS_ENABLED && selectedPaymentAmount > 0;

    setSubmitting(true);
    setError("");

    try {
      const appointment = await createAppointment({
        barber_id: selectedBarber.id,
        service_id: selectedService.id,
        service: selectedService.name,
        duration_minutes: selectedService.duration_minutes,
        appointment_date: date,
        start_time: databaseTime,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        booking_source: "online",
        status: requiresOnlinePayment ? "pending_payment" : "pending",
        payment_option: paymentOption,
        payment_status: "unpaid",
        service_price: servicePrice,
        deposit_amount: requiredDeposit,
        amount_due_now: requiresOnlinePayment ? selectedPaymentAmount : 0,
        amount_paid: 0,
        remaining_balance: servicePrice,
        currency: "USD",
        payment_expires_at: requiresOnlinePayment
          ? createPaymentExpiration()
          : null,
      });

      setSubmitted({
        ...appointment,
        serviceName: selectedService.name,
        barberName:
          selectedBarber.full_name || selectedBarber.email || "Selected barber",
        location,
        date,
        displayTime: time,
        paymentOption,
        servicePrice,
        requiredDeposit,
        selectedPaymentAmount,
        remainingBalance,
        requiresOnlinePayment,
      });
    } catch (submitError) {
      console.error("Unable to create appointment:", submitError);
      setError(
        submitError?.message ||
          "Could not save your appointment request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSubmitted(null);
    setDate("");
    setTime("");
    setPhone("");
    setPaymentOption(
      requiredDeposit > 0 ? PAYMENT_OPTIONS.deposit : PAYMENT_OPTIONS.full
    );
    setError("");
  }

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

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel label="LOCATION">
              <div className="flex items-center gap-2 rounded-xl border border-ink/15 px-4 py-3">
                <MapPin size={16} className="shrink-0 text-cta" />
                <select
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="w-full bg-transparent text-sm text-ink focus:outline-none"
                >
                  {LOCATIONS.map((item) => (
                    <option
                      key={item.name}
                      value={item.available ? item.name : ""}
                      disabled={!item.available}
                    >
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </FieldLabel>

            <FieldLabel label="BARBER">
              <div className="flex items-center gap-2 rounded-xl border border-ink/15 px-4 py-3">
                <Scissors size={16} className="shrink-0 text-cta" />
                <select
                  value={selectedBarberId}
                  onChange={(event) => setSelectedBarberId(event.target.value)}
                  disabled={loadingBarbers || barbers.length === 0}
                  className="w-full bg-transparent text-sm text-ink focus:outline-none disabled:opacity-50"
                >
                  <option value="">
                    {loadingBarbers
                      ? "Loading barbers..."
                      : barbers.length === 0
                        ? "No barbers available"
                        : "Select a barber"}
                  </option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.full_name || barber.email || "Barber"}
                    </option>
                  ))}
                </select>
              </div>
            </FieldLabel>
          </div>

          <div className="mt-8">
            <p className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50">
              SELECT A SERVICE
            </p>

            {loadingServices ? (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-muted/60 px-4 py-8 text-sm text-ink/60">
                <Loader2 size={18} className="animate-spin" />
                Loading services...
              </div>
            ) : services.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-muted/60 p-5 text-sm text-ink/60">
                This barber has not enabled any services yet.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {services.map((service) => {
                  const selected = selectedServiceId === service.id;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => {
                        setSelectedServiceId(service.id);
                        setPaymentOption(
                          parseMoney(service.deposit) > 0
                            ? PAYMENT_OPTIONS.deposit
                            : PAYMENT_OPTIONS.full
                        );
                        setError("");
                      }}
                      className={`flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left transition-colors ${
                        selected
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
                          <span className="mt-0.5 block text-xs text-ink/60">
                            {service.description}
                          </span>
                        )}
                        <span className="mt-1 flex flex-wrap gap-x-2 text-xs text-ink/50">
                          <span>{service.duration_minutes} minutes</span>
                          <span>{formatCurrency(service.price)}</span>
                          {parseMoney(service.deposit) > 0 && (
                            <span className="font-semibold text-amber-700">
                              Deposit {formatCurrency(service.deposit)}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {!user ? (
            <div className="mt-8 rounded-2xl bg-ink p-8 text-center text-white">
              <LogIn className="mx-auto text-cyanAccent" size={26} />
              <h3 className="mt-4 font-heading text-xl font-extrabold">
                Sign in to book your appointment
              </h3>
              <p className="mt-2 text-sm text-white/70">
                Create an account or sign in to manage your bookings.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/login" className="rounded-full bg-cta px-6 py-3 text-sm font-bold text-white">
                  Sign in
                </Link>
                <Link to="/register" className="rounded-full border border-white/25 px-6 py-3 text-sm font-bold text-white">
                  <UserPlus size={16} className="mr-2 inline" />
                  Create account
                </Link>
              </div>
            </div>
          ) : submitted ? (
            <div className="mt-8 rounded-2xl bg-cyanAccent/40 p-8 text-center">
              <CheckCircle2 className="mx-auto text-cta" size={30} />
              <h3 className="mt-3 font-heading text-xl font-extrabold text-ink">
                Appointment request saved
              </h3>
              <p className="mt-2 text-sm text-ink/70">
                Your request for <strong>{submitted.serviceName}</strong> with {" "}
                <strong>{submitted.barberName}</strong> on {formatDisplayDate(submitted.date)} at {submitted.displayTime} has been saved.
              </p>

              <div className="mx-auto mt-5 max-w-md rounded-2xl border border-ink/10 bg-white/70 p-4 text-left">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-cta" />
                  <div>
                    <p className="text-sm font-bold text-ink">
                      {submitted.requiresOnlinePayment
                        ? "Payment required to confirm"
                        : "Pending barber confirmation"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-ink/70">
                      {submitted.requiresOnlinePayment
                        ? `Complete the ${formatCurrency(submitted.selectedPaymentAmount)} payment through Square to confirm your appointment.`
                        : "Online payment is not connected yet. The barber will review your request and confirm the appointment."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/bookings" className="rounded-full bg-cta px-6 py-3 text-sm font-bold text-white">
                  View my bookings
                </Link>
                <button type="button" onClick={resetForm} className="rounded-full border border-ink/15 px-6 py-3 text-sm font-bold text-ink">
                  Book another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 grid gap-4 sm:grid-cols-2">
              <FieldLabel label="DATE">
                <InputShell icon={<CalendarDays size={16} />}>
                  <input
                    type="date"
                    value={date}
                    min={getTodayDate()}
                    onChange={(event) => setDate(event.target.value)}
                    required
                    className="w-full bg-transparent text-sm text-ink focus:outline-none"
                  />
                </InputShell>
              </FieldLabel>

              <FieldLabel label="TIME">
                <InputShell icon={<Clock size={16} />}>
                  <select
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    required
                    className="w-full bg-transparent text-sm text-ink focus:outline-none"
                  >
                    <option value="">Select a time</option>
                    {TIMES.map((availableTime) => (
                      <option key={availableTime} value={availableTime}>
                        {availableTime}
                      </option>
                    ))}
                  </select>
                </InputShell>
              </FieldLabel>

              <FieldLabel label="NAME">
                <InputShell icon={<User size={16} />}>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Your name"
                    className="w-full bg-transparent text-sm text-ink focus:outline-none"
                  />
                </InputShell>
              </FieldLabel>

              <FieldLabel label="EMAIL">
                <InputShell icon={<Mail size={16} />}>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    className="w-full bg-transparent text-sm text-ink focus:outline-none"
                  />
                </InputShell>
              </FieldLabel>

              <div className="sm:col-span-2">
                <FieldLabel label="PHONE">
                  <InputShell icon={<Phone size={16} />}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      required
                      autoComplete="tel"
                      placeholder="Your phone number"
                      className="w-full bg-transparent text-sm text-ink focus:outline-none"
                    />
                  </InputShell>
                </FieldLabel>
              </div>

              <div className="sm:col-span-2">
                <p className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50">
                  PAYMENT PREFERENCE
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <PaymentButton
                    active={paymentOption === PAYMENT_OPTIONS.deposit}
                    disabled={requiredDeposit <= 0}
                    icon={<Wallet size={18} />}
                    title={
                      requiredDeposit > 0
                        ? `Pay deposit (${formatCurrency(requiredDeposit)})`
                        : "Deposit not configured"
                    }
                    description="Reserve the appointment and pay the balance later."
                    onClick={() => setPaymentOption(PAYMENT_OPTIONS.deposit)}
                  />
                  <PaymentButton
                    active={paymentOption === PAYMENT_OPTIONS.full}
                    icon={<CreditCard size={18} />}
                    title={`Pay full amount (${formatCurrency(servicePrice)})`}
                    description="Pay the complete service price when payments are enabled."
                    onClick={() => setPaymentOption(PAYMENT_OPTIONS.full)}
                  />
                </div>

                <div className="mt-4 rounded-2xl bg-muted/60 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-ink/50">
                        {SQUARE_PAYMENTS_ENABLED ? "Due now" : "Due after confirmation"}
                      </p>
                      <p className="mt-1 font-heading text-xl font-extrabold text-ink">
                        {formatCurrency(
                          SQUARE_PAYMENTS_ENABLED
                            ? selectedPaymentAmount
                            : paymentOption === PAYMENT_OPTIONS.full
                              ? servicePrice
                              : requiredDeposit
                        )}
                      </p>
                    </div>
                    <div className="text-right text-xs text-ink/60">
                      <p>Service price: <strong>{formatCurrency(servicePrice)}</strong></p>
                      <p className="mt-1">Deposit: <strong>{formatCurrency(requiredDeposit)}</strong></p>
                    </div>
                  </div>
                </div>

                <p className="mt-3 flex items-start gap-2 text-xs text-ink/60">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  {SQUARE_PAYMENTS_ENABLED
                    ? "Online payments are enabled. Your appointment is confirmed after successful payment."
                    : "Square checkout is not connected yet. Your request will be saved and sent to the barber for confirmation."}
                </p>
              </div>

              {error && (
                <p role="alert" className="text-sm font-medium text-red-600 sm:col-span-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  loadingBarbers ||
                  loadingServices ||
                  !selectedBarberId ||
                  !selectedServiceId ||
                  !date ||
                  !time ||
                  !name.trim() ||
                  !email.trim() ||
                  !phone.trim() ||
                  servicePrice <= 0 ||
                  (SQUARE_PAYMENTS_ENABLED &&
                    paymentOption === PAYMENT_OPTIONS.deposit &&
                    requiredDeposit <= 0)
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cta py-4 font-heading text-sm font-bold tracking-wide text-white transition-colors hover:bg-cta/90 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Saving appointment...
                  </>
                ) : SQUARE_PAYMENTS_ENABLED ? (
                  "CONTINUE TO PAYMENT"
                ) : (
                  "REQUEST APPOINTMENT"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ label, children }) {
  return (
    <label className="block">
      <span className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function InputShell({ icon, children }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-ink/15 px-4 py-3">
      <span className="shrink-0 text-cta">{icon}</span>
      {children}
    </div>
  );
}

function PaymentButton({ active, disabled = false, icon, title, description, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? "border-cta bg-cyanAccent/40" : "border-ink/15 hover:bg-muted"
      }`}
    >
      <span className="mt-0.5 shrink-0 text-cta">{icon}</span>
      <span>
        <span className="block font-heading text-sm font-bold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-ink/60">{description}</span>
      </span>
    </button>
  );
}

function parseMoney(value) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(parseMoney(value));
}

function convertTimeToDatabaseFormat(timeValue) {
  if (!timeValue || typeof timeValue !== "string") return "";
  const trimmedValue = timeValue.trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmedValue)) return trimmedValue;
  if (/^\d{2}:\d{2}$/.test(trimmedValue)) return `${trimmedValue}:00`;

  const match = trimmedValue.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return trimmedValue;

  let hours = Number(match[1]);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  if (period === "AM" && hours === 12) hours = 0;
  if (period === "PM" && hours !== 12) hours += 12;

  return `${String(hours).padStart(2, "0")}:${minutes}:00`;
}

function createLocalAppointmentDate(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes, seconds] = timeValue.split(":").map(Number);
  if (![year, month, day, hours, minutes].every(Number.isFinite)) return null;
  return new Date(year, month - 1, day, hours, minutes, seconds || 0);
}

function createPaymentExpiration() {
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + 15);
  return expiration.toISOString();
}

function getTodayDate() {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60 * 1000;
  return new Date(today.getTime() - offset).toISOString().split("T")[0];
}

function formatDisplayDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
