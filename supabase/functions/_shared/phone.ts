const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

/**
 * Converts a phone number into E.164 format.
 *
 * Examples:
 * (555) 123-4567 -> +15551234567
 * 555-123-4567   -> +15551234567
 * +1 555 123 4567 -> +15551234567
 */
export function normalizePhoneNumber(
  value: string,
  defaultCountryCode = "1",
): string {
  if (typeof value !== "string") {
    throw new TypeError("Phone number must be a string.");
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Phone number is required.");
  }

  const hasLeadingPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) {
    throw new Error("Phone number does not contain any digits.");
  }

  let normalized: string;

  if (hasLeadingPlus) {
    normalized = `+${digits}`;
  } else if (digits.length === 10) {
    normalized = `+${defaultCountryCode}${digits}`;
  } else if (
    defaultCountryCode === "1" &&
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    normalized = `+${digits}`;
  } else {
    normalized = `+${digits}`;
  }

  if (!isValidE164(normalized)) {
    throw new Error("Phone number is not valid E.164 format.");
  }

  return normalized;
}

export function isValidE164(value: string): boolean {
  return typeof value === "string" && E164_PATTERN.test(value);
}

export function maskPhoneNumber(value: string): string {
  if (!value || value.length < 4) {
    return "****";
  }

  return `***${value.slice(-4)}`;
}
