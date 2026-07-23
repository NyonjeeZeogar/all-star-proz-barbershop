import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Ban,
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  Plus,
  Repeat2,
  Trash2,
} from "lucide-react";

import { formatTime } from "@/lib/dateTime";

import {
  createBarberTimeBlock,
  createBarberTimeBlocks,
  deleteBarberTimeBlock,
  getBarberTimeBlocks,
} from "@/services/barberPortal";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

function todayValue() {
  const now = new Date();
  return formatDateInput(now);
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  const [year, month, day] =
    value.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0
  );
}

function datesBetween(
  startDate,
  endDate,
  selectedWeekdays
) {
  if (!startDate || !endDate) {
    return [];
  }

  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  if (end < start) {
    return [];
  }

  const days = [];
  const current = new Date(start);

  while (current <= end) {
    if (
      selectedWeekdays.includes(
        current.getDay()
      )
    ) {
      days.push(
        formatDateInput(current)
      );
    }

    current.setDate(
      current.getDate() + 1
    );

    if (days.length > 366) {
      break;
    }
  }

  return days;
}

function formatDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat(
    "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(
    new Date(`${value}T12:00:00`)
  );
}

export default function BlockedTimes() {
  const [items, setItems] = useState([]);

  const [mode, setMode] =
    useState("single");
  const [blockDate, setBlockDate] =
    useState("");
  const [rangeStart, setRangeStart] =
    useState("");
  const [rangeEnd, setRangeEnd] =
    useState("");
  const [selectedWeekdays, setSelectedWeekdays] =
    useState([1, 2, 3, 4, 5]);

  const [wholeDay, setWholeDay] =
    useState(false);
  const [startTime, setStartTime] =
    useState("12:00");
  const [endTime, setEndTime] =
    useState("13:00");
  const [reason, setReason] =
    useState("");

  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [deletingId, setDeletingId] =
    useState("");
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");

  const repeatingDates = useMemo(
    () =>
      datesBetween(
        rangeStart,
        rangeEnd,
        selectedWeekdays
      ),
    [
      rangeStart,
      rangeEnd,
      selectedWeekdays,
    ]
  );

  const loadBlocks = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const rows =
          await getBarberTimeBlocks({
            fromDate: todayValue(),
          });

        setItems(rows);
      } catch (err) {
        console.error(
          "Unable to load blocked times:",
          err
        );

        setError(
          err?.message ||
            "Unable to load blocked times."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  function toggleWeekday(day) {
    setSelectedWeekdays(
      (current) =>
        current.includes(day)
          ? current.filter(
              (value) => value !== day
            )
          : [...current, day].sort()
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const effectiveStart =
      wholeDay ? "00:00" : startTime;
    const effectiveEnd =
      wholeDay ? "23:59" : endTime;

    if (
      !wholeDay &&
      effectiveEnd <= effectiveStart
    ) {
      setError(
        "The end time must be later than the start time."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (mode === "single") {
        if (!blockDate) {
          throw new Error(
            "Please choose a date."
          );
        }

        await createBarberTimeBlock({
          blockDate,
          startTime: effectiveStart,
          endTime: effectiveEnd,
          reason,
        });

        setSuccess(
          wholeDay
            ? "The entire day is now blocked."
            : "Blocked time saved. Customers will no longer see overlapping appointment slots."
        );

        setBlockDate("");
      } else {
        if (!rangeStart || !rangeEnd) {
          throw new Error(
            "Please choose a start date and end date."
          );
        }

        if (rangeEnd < rangeStart) {
          throw new Error(
            "The end date must be on or after the start date."
          );
        }

        if (
          selectedWeekdays.length === 0
        ) {
          throw new Error(
            "Select at least one weekday."
          );
        }

        if (
          repeatingDates.length === 0
        ) {
          throw new Error(
            "No matching dates were found in that range."
          );
        }

        await createBarberTimeBlocks(
          repeatingDates.map((date) => ({
            blockDate: date,
            startTime: effectiveStart,
            endTime: effectiveEnd,
            reason,
          }))
        );

        setSuccess(
          `${repeatingDates.length} blocked period${
            repeatingDates.length === 1
              ? ""
              : "s"
          } saved.`
        );

        setRangeStart("");
        setRangeEnd("");
      }

      setReason("");
      await loadBlocks();
    } catch (err) {
      console.error(
        "Unable to create blocked time:",
        err
      );

      setError(
        err?.message ||
          "Unable to save the blocked time."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(blockId) {
    setDeletingId(blockId);
    setError("");
    setSuccess("");

    try {
      await deleteBarberTimeBlock(
        blockId
      );

      setItems((current) =>
        current.filter(
          (item) =>
            item.id !== blockId
        )
      );

      setSuccess(
        "Blocked time removed."
      );
    } catch (err) {
      console.error(
        "Unable to remove blocked time:",
        err
      );

      setError(
        err?.message ||
          "Unable to remove the blocked time."
      );
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600">
              <Ban size={18} />
            </span>

            <div>
              <h2 className="font-heading text-xl font-extrabold text-ink">
                Block time
              </h2>

              <p className="mt-1 text-sm text-ink/60">
                Block one date, an entire day, or repeat the same break across several days.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setMode("single")
            }
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
              mode === "single"
                ? "bg-cta text-white"
                : "bg-muted text-ink/65"
            }`}
          >
            <CalendarDays size={15} />
            One date
          </button>

          <button
            type="button"
            onClick={() =>
              setMode("repeat")
            }
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
              mode === "repeat"
                ? "bg-cta text-white"
                : "bg-muted text-ink/65"
            }`}
          >
            <Repeat2 size={15} />
            Repeat across dates
          </button>
        </div>

        {mode === "single" ? (
          <label className="block">
            <span className="font-heading text-[10px] font-extrabold tracking-[0.18em] text-ink/45">
              DATE
            </span>

            <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/15 px-3 py-2.5">
              <CalendarDays
                size={16}
                className="text-cta"
              />

              <input
                type="date"
                min={todayValue()}
                value={blockDate}
                onChange={(event) =>
                  setBlockDate(
                    event.target.value
                  )
                }
                required
                className="w-full bg-transparent text-sm focus:outline-none"
              />
            </div>
          </label>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="font-heading text-[10px] font-extrabold tracking-[0.18em] text-ink/45">
                  START DATE
                </span>
                <input
                  type="date"
                  min={todayValue()}
                  value={rangeStart}
                  onChange={(event) =>
                    setRangeStart(
                      event.target.value
                    )
                  }
                  required
                  className="mt-2 w-full rounded-xl border border-ink/15 px-3 py-2.5 text-sm focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="font-heading text-[10px] font-extrabold tracking-[0.18em] text-ink/45">
                  END DATE
                </span>
                <input
                  type="date"
                  min={
                    rangeStart ||
                    todayValue()
                  }
                  value={rangeEnd}
                  onChange={(event) =>
                    setRangeEnd(
                      event.target.value
                    )
                  }
                  required
                  className="mt-2 w-full rounded-xl border border-ink/15 px-3 py-2.5 text-sm focus:outline-none"
                />
              </label>
            </div>

            <div>
              <span className="font-heading text-[10px] font-extrabold tracking-[0.18em] text-ink/45">
                REPEAT ON
              </span>

              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const active =
                    selectedWeekdays.includes(
                      day.value
                    );

                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() =>
                        toggleWeekday(
                          day.value
                        )
                      }
                      className={`inline-flex min-w-12 items-center justify-center gap-1 rounded-full border px-3 py-2 text-xs font-bold ${
                        active
                          ? "border-cta bg-cta text-white"
                          : "border-ink/15 text-ink/55"
                      }`}
                    >
                      {active && (
                        <Check size={12} />
                      )}
                      {day.label}
                    </button>
                  );
                })}
              </div>

              {rangeStart &&
                rangeEnd && (
                  <p className="mt-2 text-xs text-ink/50">
                    This will create{" "}
                    <strong>
                      {repeatingDates.length}
                    </strong>{" "}
                    blocked period
                    {repeatingDates.length === 1
                      ? ""
                      : "s"}
                    .
                  </p>
                )}
            </div>
          </div>
        )}

        <label className="mt-5 flex items-center gap-3 rounded-2xl bg-muted/60 p-4">
          <input
            type="checkbox"
            checked={wholeDay}
            onChange={(event) =>
              setWholeDay(
                event.target.checked
              )
            }
            className="h-4 w-4 rounded border-ink/20"
          />

          <span>
            <span className="block text-sm font-bold text-ink">
              Block entire day
            </span>
            <span className="block text-xs text-ink/55">
              Customers will not see any appointment times on the selected date or dates.
            </span>
          </span>
        </label>

        {!wholeDay && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-heading text-[10px] font-extrabold tracking-[0.18em] text-ink/45">
                START TIME
              </span>

              <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/15 px-3 py-2.5">
                <Clock3
                  size={16}
                  className="text-cta"
                />

                <input
                  type="time"
                  value={startTime}
                  onChange={(event) =>
                    setStartTime(
                      event.target.value
                    )
                  }
                  required
                  className="w-full bg-transparent text-sm focus:outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="font-heading text-[10px] font-extrabold tracking-[0.18em] text-ink/45">
                END TIME
              </span>

              <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/15 px-3 py-2.5">
                <Clock3
                  size={16}
                  className="text-cta"
                />

                <input
                  type="time"
                  value={endTime}
                  onChange={(event) =>
                    setEndTime(
                      event.target.value
                    )
                  }
                  required
                  className="w-full bg-transparent text-sm focus:outline-none"
                />
              </div>
            </label>
          </div>
        )}

        <label className="mt-5 block">
          <span className="font-heading text-[10px] font-extrabold tracking-[0.18em] text-ink/45">
            REASON
          </span>

          <input
            type="text"
            value={reason}
            onChange={(event) =>
              setReason(
                event.target.value
              )
            }
            placeholder="Lunch, vacation, personal time..."
            className="mt-2 w-full rounded-xl border border-ink/15 px-3 py-2.5 text-sm focus:outline-none"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            role="status"
            className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
          >
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-cta px-6 py-3 font-heading text-sm font-bold text-white transition-colors hover:bg-cta/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <Loader2
              size={16}
              className="animate-spin"
            />
          ) : (
            <Plus size={16} />
          )}

          {saving
            ? "Saving..."
            : mode === "repeat"
              ? `Block ${
                  repeatingDates.length ||
                  ""
                } date${
                  repeatingDates.length === 1
                    ? ""
                    : "s"
                }`
              : wholeDay
                ? "Block entire day"
                : "Block this time"}
        </button>
      </form>

      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-heading text-xl font-extrabold text-ink">
          Upcoming blocked times
        </h2>

        <p className="mt-1 text-sm text-ink/60">
          These periods are excluded from customer availability.
        </p>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2
              size={24}
              className="animate-spin text-ink/40"
            />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-muted/60 px-4 py-8 text-center text-sm text-ink/55">
            No upcoming blocked times.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {items.map((item) => {
              const isWholeDay =
                item.start_time?.startsWith(
                  "00:00"
                ) &&
                item.end_time?.startsWith(
                  "23:59"
                );

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 rounded-2xl border border-ink/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-heading text-sm font-bold text-ink">
                      {formatDate(
                        item.block_date
                      )}
                    </p>

                    <p className="mt-1 text-sm text-ink/65">
                      {isWholeDay
                        ? "Entire day"
                        : `${formatTime(
                            item.start_time
                          )} – ${formatTime(
                            item.end_time
                          )}`}
                    </p>

                    {item.reason && (
                      <p className="mt-1 text-xs text-ink/45">
                        {item.reason}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={
                      deletingId === item.id
                    }
                    onClick={() =>
                      handleDelete(item.id)
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId ===
                    item.id ? (
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <Trash2 size={15} />
                    )}

                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
