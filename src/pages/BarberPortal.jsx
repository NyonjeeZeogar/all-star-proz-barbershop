import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";

import {
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Loader2,
  Scissors,
  Settings,
  Ban,
  MessageSquareText,
  Send,
  LockKeyhole,
} from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { ASSETS } from "@/lib/assets";
import { supabase } from "@/lib/supabaseClient";

import TodayAppointments from "@/components/portal/TodayAppointments";
import AppointmentHistory from "@/components/portal/AppointmentHistory";
import WeeklySchedule from "@/components/portal/WeeklySchedule";
import AvailabilitySettings from "@/components/portal/AvailabilitySettings";
import MyServices from "@/components/portal/MyServices";
import BlockedTimes from "@/components/portal/BlockedTimes";

import {
  cancelPortalAppointment,
  confirmPortalAppointment,
  getBarberAvailability,
  getPortalAppointments,
  savePortalAppointmentNote,
} from "@/services/barberPortal";


function normalizeUsPhoneNumber(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/\D/g, "");

    if (digits.length >= 8 && digits.length <= 15) {
      return `+${digits}`;
    }

    return null;
  }

  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return null;
}

const SMS_TESTING_ENABLED =
  import.meta.env.VITE_ENABLE_SMS_TESTING === "true";

const TABS = [
  {
    id: "bookings",
    label: "Bookings",
    Icon: CalendarCheck,
  },
  {
    id: "schedule",
    label: "Weekly Schedule",
    Icon: CalendarDays,
  },
  {
    id: "availability",
    label: "Availability",
    Icon: Settings,
  },
  {
    id: "services",
    label: "My Services",
    Icon: Scissors,
  },
  {
    id: "blocked-times",
    label: "Blocked Times",
    Icon: Ban,
  },
  {
    id: "history",
    label: "History",
    Icon: CalendarRange,
  },
  {
    id: "notifications",
    label: SMS_TESTING_ENABLED
      ? "Notification Testing"
      : "SMS Notifications",
    Icon: MessageSquareText,
  },
];

function getAppointmentTimestamp(appointment) {
  const appointmentDate =
    appointment?.appointment_date;

  const appointmentTime =
    appointment?.start_time ||
    appointment?.appointment_time ||
    "00:00:00";

  if (!appointmentDate) {
    return Number.MIN_SAFE_INTEGER;
  }

  const timestamp = new Date(
    `${appointmentDate}T${appointmentTime}`
  ).getTime();

  return Number.isNaN(timestamp)
    ? Number.MIN_SAFE_INTEGER
    : timestamp;
}

export default function BarberPortal() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = TABS.some(({ id }) => id === requestedTab)
    ? requestedTab
    : "bookings";

  const [tab, setTab] = useState(initialTab);

  const [appointments, setAppointments] =
    useState([]);

  const [availability, setAvailability] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [testPhone, setTestPhone] = useState(
    profile?.phone || ""
  );

  const [sendingTestSms, setSendingTestSms] =
    useState(false);

  const [testSmsResult, setTestSmsResult] =
    useState("");

  const loadAppointments =
    useCallback(async () => {
      try {
        const list =
          await getPortalAppointments();

        setAppointments(list);
      } catch (err) {
        console.error(
          "Unable to load barber appointments:",
          err
        );

        setError(
          err?.message ||
            "Unable to load appointments."
        );
      }
    }, []);

  const loadAvailability =
    useCallback(async () => {
      try {
        const rows =
          await getBarberAvailability();

        setAvailability(rows);
      } catch (err) {
        console.error(
          "Unable to load barber availability:",
          err
        );

        setError(
          err?.message ||
            "Unable to load availability."
        );
      }
    }, []);

  const loadPortalData =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        await Promise.all([
          loadAppointments(),
          loadAvailability(),
        ]);
      } finally {
        setLoading(false);
      }
    }, [
      loadAppointments,
      loadAvailability,
    ]);

  useEffect(() => {
    loadPortalData();
  }, [loadPortalData]);

  /*
   * Active bookings.
   *
   * Pending and confirmed appointments appear here.
   * Newer scheduled appointments appear first.
   *
   * Cancelled, completed, and no-show appointments
   * are removed from the active Bookings view.
   */
  const bookingItems = useMemo(
    () =>
      appointments
        .filter((appointment) => {
          const status = String(
            appointment?.status || ""
          )
            .trim()
            .toLowerCase();

          return (
            status !== "cancelled" &&
            status !== "completed" &&
            status !== "no_show"
          );
        })
        .sort(
          (
            firstAppointment,
            secondAppointment
          ) =>
            getAppointmentTimestamp(
              secondAppointment
            ) -
            getAppointmentTimestamp(
              firstAppointment
            )
        ),
    [appointments]
  );

  /*
   * History is also displayed newest first.
   *
   * AppointmentHistory can perform any additional
   * filtering it needs internally.
   */
  const historyItems = useMemo(
    () =>
      [...appointments].sort(
        (
          firstAppointment,
          secondAppointment
        ) =>
          getAppointmentTimestamp(
            secondAppointment
          ) -
          getAppointmentTimestamp(
            firstAppointment
          )
      ),
    [appointments]
  );

  const updateLocal = (
    appointmentId,
    patch
  ) => {
    setAppointments(
      (currentAppointments) =>
        currentAppointments.map(
          (appointment) =>
            appointment.id ===
            appointmentId
              ? {
                  ...appointment,
                  ...patch,
                }
              : appointment
        )
    );
  };

  const onConfirm = async (
    appointmentId
  ) => {
    try {
      setError("");

      const updated =
        await confirmPortalAppointment(
          appointmentId
        );

      updateLocal(
        appointmentId,
        updated
      );
    } catch (err) {
      console.error(
        "Unable to confirm appointment:",
        err
      );

      setError(
        err?.message ||
          "Unable to confirm the appointment."
      );
    }
  };

  const onCancel = async (
    appointmentId
  ) => {
    try {
      setError("");

      const updated =
        await cancelPortalAppointment(
          appointmentId
        );

      updateLocal(
        appointmentId,
        updated
      );
    } catch (err) {
      console.error(
        "Unable to cancel appointment:",
        err
      );

      setError(
        err?.message ||
          "Unable to cancel the appointment."
      );
    }
  };

  const onRefund = async (
    appointmentId,
    {
      amount_cents,
      reason,
    }
  ) => {
    try {
      setError("");

      const {
        data,
        error: refundError,
      } = await supabase.functions.invoke(
        "square-create-refund",
        {
          body: {
            booking_id:
              appointmentId,
            amount_cents,
            reason,
          },
        }
      );

      if (refundError) {
        throw refundError;
      }

      /*
       * Square sends the final completed state through
       * refund webhooks. Refresh immediately and once
       * more after a short delay so the UI picks up the
       * webhook update without a full page reload.
       */
      await loadAppointments();

      window.setTimeout(() => {
        loadAppointments();
      }, 1800);

      return data;
    } catch (err) {
      console.error(
        "Unable to refund appointment payment:",
        err
      );

      const message =
        err?.context?.body?.message ||
        err?.message ||
        "Unable to submit the refund.";

      setError(message);
      throw new Error(message);
    }
  };

  const onSaveNote = async (
    appointmentId,
    note
  ) => {
    try {
      setError("");

      const updated =
        await savePortalAppointmentNote(
          appointmentId,
          note
        );

      updateLocal(
        appointmentId,
        updated
      );
    } catch (err) {
      console.error(
        "Unable to save appointment note:",
        err
      );

      setError(
        err?.message ||
          "Unable to save the appointment note."
      );

      throw err;
    }
  };

  const onSendTestSms = async () => {
    const phone =
      normalizeUsPhoneNumber(
        testPhone
      );

    if (!phone) {
      setTestSmsResult("");
      setError(
        "Enter a valid US phone number, such as 7636202266, (763) 620-2266, or +17636202266."
      );
      return;
    }

    setTestPhone(phone);
    setSendingTestSms(true);
    setError("");
    setTestSmsResult("");

    try {
      const { data, error: invokeError } =
        await supabase.functions.invoke(
          "sendSMS",
          {
            body: {
              to: phone,
              body:
                "All Stylez Pro SMS test. Your Twilio and Supabase integration is working.",
            },
          }
        );

      if (invokeError) {
        let message =
          invokeError.message ||
          "Unable to send the test SMS.";

        try {
          const responseBody =
            await invokeError.context?.json?.();

          if (responseBody?.error) {
            message = responseBody.error;
          }
        } catch {
          // Keep the original invocation error message.
        }

        throw new Error(message);
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            "The SMS function did not report success."
        );
      }

      setTestSmsResult(
        `Test SMS submitted successfully to ${phone}.`
      );

      console.log(
        "sendSMS response:",
        data
      );
    } catch (err) {
      console.error(
        "Unable to send test SMS:",
        err
      );

      setError(
        err?.message ||
          "Unable to send the test SMS."
      );
    } finally {
      setSendingTestSms(false);
    }
  };

  return (
    <div>
      <section className="relative flex min-h-[36vh] items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={ASSETS.heroImage}
            alt=""
            className="h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-ink/65" />
        </div>

        <div className="relative mx-auto w-full max-w-5xl px-5 py-16 text-center sm:px-8">
          <span className="mb-4 block font-heading text-xs font-bold tracking-[0.3em] text-cyanAccent">
            BARBER PORTAL
          </span>

          <h1 className="font-heading text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Welcome
            {profile?.full_name
              ? `, ${profile.full_name}`
              : ""}
            .
          </h1>

          <p className="mt-3 text-white/70">
            Manage your appointments, schedule,
            availability, and services.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {TABS.map(
              ({
                id,
                label,
                Icon,
              }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTab(id);
                    setSearchParams({ tab: id });
                  }}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 font-heading text-sm font-bold transition-colors ${
                    tab === id
                      ? "bg-cta text-white"
                      : "bg-muted text-ink/70 hover:bg-muted/70"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              )
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2
                className="animate-spin text-ink/40"
                size={28}
              />
            </div>
          ) : tab === "bookings" ? (
            <TodayAppointments
              items={bookingItems}
              onConfirm={onConfirm}
              onCancel={onCancel}
              onSaveNote={onSaveNote}
              onRefund={onRefund}
            />
          ) : tab === "schedule" ? (
            <WeeklySchedule
              availability={availability}
            />
          ) : tab ===
            "availability" ? (
            <AvailabilitySettings
              availability={availability}
              onSaved={loadAvailability}
            />
          ) : tab === "services" ? (
            <MyServices />
          ) : tab === "blocked-times" ? (
            <BlockedTimes />
          ) : tab === "history" ? (
            <AppointmentHistory
              items={historyItems}
              onConfirm={onConfirm}
              onCancel={onCancel}
              onSaveNote={onSaveNote}
              onRefund={onRefund}
            />
          ) : SMS_TESTING_ENABLED ? (
            <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-cyanAccent/15 p-3 text-ink">
                  <MessageSquareText size={22} />
                </div>

                <div>
                  <h2 className="font-heading text-xl font-extrabold text-ink">
                    SMS Notification Testing
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-ink/65">
                    Send one real test message through the deployed
                    Supabase <code>sendSMS</code> function. Twilio trial
                    accounts can send only to verified recipient numbers.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="test-sms-phone"
                  className="mb-2 block font-heading text-sm font-bold text-ink"
                >
                  Test recipient phone number
                </label>

                <input
                  id="test-sms-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={testPhone}
                  onChange={(event) =>
                    setTestPhone(
                      event.target.value
                    )
                  }
                  placeholder="7636202266"
                  className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition focus:border-cyanAccent focus:ring-2 focus:ring-cyanAccent/20"
                />
              </div>

              <button
                type="button"
                onClick={onSendTestSms}
                disabled={sendingTestSms}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-cta px-5 py-3 font-heading text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingTestSms ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Send size={17} />
                )}

                {sendingTestSms
                  ? "Sending test SMS..."
                  : "Send test SMS"}
              </button>

              {testSmsResult && (
                <div
                  role="status"
                  className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                >
                  {testSmsResult}
                </div>
              )}

              <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                This button sends a real, billable SMS. It currently tests
                one message only.
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
                  <LockKeyhole size={22} />
                </div>

                <div>
                  <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
                    Upgrade required
                  </div>

                  <h2 className="mt-3 font-heading text-xl font-extrabold text-ink">
                    SMS Notifications
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
                    SMS confirmations, reminders, cancellations, and
                    reschedule alerts are available as an optional upgrade.
                    Activation requires an approved messaging provider
                    account, carrier registration, and ongoing messaging
                    fees.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
