import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Loader2,
  MapPin,
  Save,
} from "lucide-react";

import { LOCATIONS } from "@/lib/assets";
import { saveBarberAvailability } from "@/services/barberPortal";

/**
 * PostgreSQL-style day numbering:
 * Sunday = 0
 * Monday = 1
 * Tuesday = 2
 * Wednesday = 3
 * Thursday = 4
 * Friday = 5
 * Saturday = 6
 */
const DAYS = [
  {
    day_of_week: 1,
    label: "Monday",
  },
  {
    day_of_week: 2,
    label: "Tuesday",
  },
  {
    day_of_week: 3,
    label: "Wednesday",
  },
  {
    day_of_week: 4,
    label: "Thursday",
  },
  {
    day_of_week: 5,
    label: "Friday",
  },
  {
    day_of_week: 6,
    label: "Saturday",
  },
  {
    day_of_week: 0,
    label: "Sunday",
  },
];

const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_TIME = "17:00";

function createDefaultSchedule() {
  return DAYS.map((day) => ({
    day_of_week: day.day_of_week,
    label: day.label,
    available:
      day.day_of_week >= 2 &&
      day.day_of_week <= 6,
    start_time: DEFAULT_START_TIME,
    end_time: DEFAULT_END_TIME,
    location_name:
      LOCATIONS.find(
        (location) => location.available
      )?.name || "",
  }));
}

export default function AvailabilitySettings({
  availability = [],
  onSaved,
}) {
  const [schedule, setSchedule] = useState(
    createDefaultSchedule
  );

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const availableLocations = useMemo(
    () =>
      LOCATIONS.filter(
        (location) => location.available
      ),
    []
  );

  /**
   * Convert Supabase availability rows into the local
   * seven-day form used by this component.
   */
  useEffect(() => {
    const defaults = createDefaultSchedule();

    if (
      !Array.isArray(availability) ||
      availability.length === 0
    ) {
      setSchedule(defaults);
      return;
    }

    const rowsByDay = new Map(
      availability.map((row) => [
        Number(row.day_of_week),
        row,
      ])
    );

    const mergedSchedule = defaults.map(
      (defaultDay) => {
        const savedDay = rowsByDay.get(
          defaultDay.day_of_week
        );

        if (!savedDay) {
          return defaultDay;
        }

        return {
          ...defaultDay,
          available: Boolean(
            savedDay.available
          ),
          start_time:
            normalizeInputTime(
              savedDay.start_time
            ) || DEFAULT_START_TIME,
          end_time:
            normalizeInputTime(
              savedDay.end_time
            ) || DEFAULT_END_TIME,
          location_name:
            savedDay.location_name ||
            defaultDay.location_name,
        };
      }
    );

    setSchedule(mergedSchedule);
  }, [availability]);

  const updateDay = (
    dayOfWeek,
    updates
  ) => {
    setSchedule((currentSchedule) =>
      currentSchedule.map((day) =>
        day.day_of_week === dayOfWeek
          ? {
              ...day,
              ...updates,
            }
          : day
      )
    );

    setError("");
    setSuccessMessage("");
  };

  const validateSchedule = () => {
    for (const day of schedule) {
      if (!day.available) {
        continue;
      }

      if (
        !day.start_time ||
        !day.end_time
      ) {
        return `${day.label} needs a start and end time.`;
      }

      if (
        day.end_time <= day.start_time
      ) {
        return `${day.label}'s end time must be later than its start time.`;
      }

      if (!day.location_name) {
        return `Please select a location for ${day.label}.`;
      }
    }

    return "";
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const validationError =
      validateSchedule();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = schedule.map(
        (day) => ({
          day_of_week:
            day.day_of_week,
          available:
            Boolean(day.available),

          start_time: day.available
            ? normalizeDatabaseTime(
                day.start_time
              )
            : null,

          end_time: day.available
            ? normalizeDatabaseTime(
                day.end_time
              )
            : null,

          location_name:
            day.available
              ? day.location_name
              : null,
        })
      );

      await saveBarberAvailability(
        payload
      );

      setSuccessMessage(
        "Your weekly availability was saved."
      );

      if (
        typeof onSaved === "function"
      ) {
        await onSaved();
      }
    } catch (err) {
      console.error(
        "Unable to save barber availability:",
        err
      );

      setError(
        err?.message ||
          "Unable to save your availability."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="space-y-6"
    >
      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6">
          <h2 className="font-heading text-xl font-extrabold text-ink">
            Weekly availability
          </h2>

          <p className="mt-1 text-sm text-ink/60">
            Choose which days you work, your hours,
            and your location.
          </p>
        </div>

        <div className="space-y-3">
          {schedule.map((day) => (
            <div
              key={day.day_of_week}
              className="rounded-2xl border border-ink/10 p-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex min-w-[150px] items-center gap-3">
                  <input
                    id={`available-${day.day_of_week}`}
                    type="checkbox"
                    checked={day.available}
                    onChange={(event) =>
                      updateDay(
                        day.day_of_week,
                        {
                          available:
                            event.target
                              .checked,
                        }
                      )
                    }
                    className="h-4 w-4 rounded border-ink/20"
                  />

                  <label
                    htmlFor={`available-${day.day_of_week}`}
                    className="font-heading text-sm font-bold text-ink"
                  >
                    {day.label}
                  </label>
                </div>

                {day.available ? (
                  <div className="grid flex-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label
                        htmlFor={`start-${day.day_of_week}`}
                        className="block font-heading text-[10px] font-extrabold tracking-[0.18em] text-ink/45"
                      >
                        START TIME
                      </label>

                      <input
                        id={`start-${day.day_of_week}`}
                        type="time"
                        value={day.start_time}
                        onChange={(event) =>
                          updateDay(
                            day.day_of_week,
                            {
                              start_time:
                                event.target
                                  .value,
                            }
                          )
                        }
                        required
                        className="mt-2 w-full rounded-xl border border-ink/15 px-3 py-2.5 text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`end-${day.day_of_week}`}
                        className="block font-heading text-[10px] font-extrabold tracking-[0.18em] text-ink/45"
                      >
                        END TIME
                      </label>

                      <input
                        id={`end-${day.day_of_week}`}
                        type="time"
                        value={day.end_time}
                        onChange={(event) =>
                          updateDay(
                            day.day_of_week,
                            {
                              end_time:
                                event.target
                                  .value,
                            }
                          )
                        }
                        required
                        className="mt-2 w-full rounded-xl border border-ink/15 px-3 py-2.5 text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`location-${day.day_of_week}`}
                        className="block font-heading text-[10px] font-extrabold tracking-[0.18em] text-ink/45"
                      >
                        LOCATION
                      </label>

                      <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/15 px-3 py-2.5">
                        <MapPin
                          size={15}
                          className="shrink-0 text-cta"
                        />

                        <select
                          id={`location-${day.day_of_week}`}
                          value={
                            day.location_name
                          }
                          onChange={(event) =>
                            updateDay(
                              day.day_of_week,
                              {
                                location_name:
                                  event.target
                                    .value,
                              }
                            )
                          }
                          required
                          className="w-full bg-transparent text-sm focus:outline-none"
                        >
                          <option value="">
                            Select location
                          </option>

                          {availableLocations.map(
                            (location) => (
                              <option
                                key={
                                  location.name
                                }
                                value={
                                  location.name
                                }
                              >
                                {
                                  location.name
                                }
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-ink/45">
                    Not available
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </p>
        )}

        {successMessage && (
          <p
            role="status"
            className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
          >
            {successMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-cta px-6 py-3 font-heading text-sm font-bold text-white transition-colors hover:bg-cta/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <Loader2
              className="animate-spin"
              size={16}
            />
          ) : (
            <Save size={16} />
          )}

          {saving
            ? "Saving..."
            : "Save availability"}
        </button>
      </div>
    </form>
  );
}

/**
 * Converts PostgreSQL time values such as:
 * "09:00:00"
 *
 * into HTML time-input values:
 * "09:00"
 */
function normalizeInputTime(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 5);
}

/**
 * Converts HTML time-input values such as:
 * "09:00"
 *
 * into PostgreSQL-compatible values:
 * "09:00:00"
 */
function normalizeDatabaseTime(value) {
  if (!value) {
    return null;
  }

  const normalizedValue =
    String(value).trim();

  if (
    /^\d{2}:\d{2}:\d{2}$/.test(
      normalizedValue
    )
  ) {
    return normalizedValue;
  }

  if (
    /^\d{2}:\d{2}$/.test(
      normalizedValue
    )
  ) {
    return `${normalizedValue}:00`;
  }

  return normalizedValue;
}
