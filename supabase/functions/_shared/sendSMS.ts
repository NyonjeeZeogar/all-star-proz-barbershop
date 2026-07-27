import {
  isValidE164,
  maskPhoneNumber,
  normalizePhoneNumber,
} from "./phone.ts";

export type SendSMSInput = {
  to: string;
  body: string;
  statusCallbackUrl?: string;
};

export type SendSMSResult = {
  id: string;
  status: string;
  to: string;
  from: string;
  errorCode: number | null;
  errorMessage: string | null;
};

type TwilioMessageResponse = {
  sid?: string;
  status?: string;
  to?: string;
  from?: string;
  error_code?: number | null;
  error_message?: string | null;
  message?: string;
  code?: number;
};

export async function sendSMS({
  to,
  body,
  statusCallbackUrl,
}: SendSMSInput): Promise<SendSMSResult> {
  const accountSid = requireEnvironmentVariable("TWILIO_ACCOUNT_SID");
  const authToken = requireEnvironmentVariable("TWILIO_AUTH_TOKEN");
  const fromNumber = normalizePhoneNumber(
    requireEnvironmentVariable("TWILIO_PHONE_NUMBER"),
  );

  const normalizedRecipient = normalizePhoneNumber(to);

  if (!isValidE164(normalizedRecipient)) {
    throw new Error("SMS recipient must be a valid E.164 phone number.");
  }

  const normalizedBody = body?.trim();

  if (!normalizedBody) {
    throw new Error("SMS message body is required.");
  }

  if (normalizedBody.length > 1_600) {
    throw new Error("SMS message body cannot exceed 1,600 characters.");
  }

  const formData = new URLSearchParams({
    To: normalizedRecipient,
    From: fromNumber,
    Body: normalizedBody,
  });

  if (statusCallbackUrl) {
    formData.set("StatusCallback", statusCallbackUrl);
  }

  const endpoint =
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const authorization = btoa(`${accountSid}:${authToken}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  const result = await readTwilioResponse(response);

  if (!response.ok || !result.sid) {
    const providerMessage =
      result.message || result.error_message || "Twilio rejected the SMS.";

    throw new Error(
      `Could not send SMS to ${maskPhoneNumber(normalizedRecipient)}: ${providerMessage}`,
    );
  }

  return {
    id: result.sid,
    status: result.status || "queued",
    to: result.to || normalizedRecipient,
    from: result.from || fromNumber,
    errorCode: result.error_code ?? null,
    errorMessage: result.error_message ?? null,
  };
}

function requireEnvironmentVariable(name: string): string {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function readTwilioResponse(
  response: Response,
): Promise<TwilioMessageResponse> {
  try {
    return await response.json();
  } catch {
    return {
      message: `Twilio returned an unreadable response with status ${response.status}.`,
    };
  }
}
