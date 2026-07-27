const RESEND_EMAIL_URL = "https://api.resend.com/emails";

/**
 * Sends an email through the Resend HTTP API.
 *
 * @param {Object} options
 * @param {string|string[]} options.to
 * @param {string} options.subject
 * @param {string} options.html
 * @param {string} [options.text]
 * @param {string} [options.replyTo]
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  if (!from) {
    throw new Error("EMAIL_FROM is not configured.");
  }

  if (!to) {
    throw new Error("Email recipient is required.");
  }

  if (!subject) {
    throw new Error("Email subject is required.");
  }

  if (!html) {
    throw new Error("Email HTML is required.");
  }

  const payload = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  };

  if (text) {
    payload.text = text;
  }

  if (replyTo) {
    payload.reply_to = replyTo;
  }

  const response = await fetch(RESEND_EMAIL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      `Resend returned an unreadable response with status ${response.status}.`,
    );
  }

  if (!response.ok) {
    const message =
      result?.message ||
      result?.error?.message ||
      `Resend request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return result;
}
