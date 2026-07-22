import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Loader2,
  Scissors,
  Settings,
  Ban,
} from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { ASSETS } from "@/lib/assets";

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

  const [tab, setTab] = useState("bookings");

  const [appointments, setAppointments] =
    useState([]);

  const [availability, setAvailability] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

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
                  onClick={() =>
                    setTab(id)
                  }
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
          ) : (
            <AppointmentHistory
              items={historyItems}
              onConfirm={onConfirm}
              onCancel={onCancel}
              onSaveNote={onSaveNote}
            />
          )}
        </div>
      </section>
    </div>
  );
}
