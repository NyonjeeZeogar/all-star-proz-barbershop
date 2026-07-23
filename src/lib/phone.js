/**
 * US phone-number helpers used by the booking form.
 *
 * The UI stores a formatted 10-digit national number, while API payloads use
 * E.164 format: +1XXXXXXXXXX.
 */

const US_PHONE_DIGIT_COUNT = 10;

/**
 * Returns at most 10 US national-number digits.
 *
 * Accepts:
 * - 7636202266
 * - (763) 620-2266
 * - +1 763 620 2266
 * - 1-763-620-2266
 */
export function getUsPhoneDigits(value) {
  if (value === null || value === undefined) {
    return "";
  }

  let digits = String(value).replace(/\D/g, "");

  // Remove a pasted US country code.
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  return digits.slice(0, US_PHONE_DIGIT_COUNT);
}

/**
 * Formats a US number progressively for display.
 *
 * Examples:
 * 7          -> 7
 * 7636       -> 763-6
 * 7636202    -> 763-620-2
 * 7636202266 -> 763-620-2266
 */
export function formatUsPhone(value) {
  const digits = getUsPhoneDigits(value);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Returns true only when the value contains a complete US national number.
 * Blank values are intentionally not considered complete.
 */
export function isCompleteUsPhone(value) {
  return getUsPhoneDigits(value).length === US_PHONE_DIGIT_COUNT;
}

/**
 * Converts a complete US number to E.164.
 *
 * Returns null for blank or incomplete values so callers can omit the phone
 * without blocking booking or checkout.
 */
export function normalizeUsPhone(value) {
  const digits = getUsPhoneDigits(value);

  if (digits.length !== US_PHONE_DIGIT_COUNT) {
    return null;
  }

  return `+1${digits}`;
}
