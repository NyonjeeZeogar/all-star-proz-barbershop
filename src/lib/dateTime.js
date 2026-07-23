/**
 * Shared date/time display helpers.
 *
 * Keep database values in ISO/24-hour format. Use these helpers only when
 * rendering values for customers or barbers.
 */

export function formatTime(timeValue, locale = "en-US") {
  if (!timeValue) return "";

  const raw = String(timeValue).trim();

  // Accept database values such as "13:30", "13:30:00", and UI values
  // such as "1:30 PM".
  const twelveHourMatch = raw.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  );

  let hours;
  let minutes;

  if (twelveHourMatch) {
    hours = Number(twelveHourMatch[1]);
    minutes = Number(twelveHourMatch[2]);
    const period = twelveHourMatch[3].toUpperCase();

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      return raw;
    }

    if (period === "AM" && hours === 12) hours = 0;
    if (period === "PM" && hours !== 12) hours += 12;
  } else {
    const twentyFourHourMatch = raw.match(
      /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/
    );

    if (!twentyFourHourMatch) return raw;

    hours = Number(twentyFourHourMatch[1]);
    minutes = Number(twentyFourHourMatch[2]);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return raw;
    }
  }

  const date = new Date(2000, 0, 1, hours, minutes, 0, 0);

  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDate(dateValue, locale = "en-US") {
  if (!dateValue) return "";

  const raw = String(dateValue);
  const date = new Date(
    raw.includes("T") ? raw : `${raw}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) return raw;

  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(dateTimeValue, locale = "en-US") {
  if (!dateTimeValue) return "";

  const date = new Date(dateTimeValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateTimeValue);
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
    hour12: true,
  }).format(date);
}
