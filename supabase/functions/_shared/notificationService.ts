import { sendEmail } from "./sendEmail.js";
import { sendSMS } from "./sendSMS.ts";

export type NotificationChannel = "email" | "sms";

export type EmailNotification = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SMSNotification = {
  to: string;
  body: string;
  statusCallbackUrl?: string;
};

export type SendNotificationInput = {
  email?: EmailNotification;
  sms?: SMSNotification;
};

export type ChannelResult = {
  channel: NotificationChannel;
  success: boolean;
  providerMessageId: string | null;
  status: string;
  error: string | null;
};

export async function sendNotification({
  email,
  sms,
}: SendNotificationInput): Promise<ChannelResult[]> {
  if (!email && !sms) {
    throw new Error("At least one notification channel is required.");
  }

  const results: ChannelResult[] = [];

  if (email) {
    try {
      const emailResult = await sendEmail(email);

      results.push({
        channel: "email",
        success: true,
        providerMessageId: emailResult.id ?? null,
        status: "sent",
        error: null,
      });
    } catch (error) {
      results.push({
        channel: "email",
        success: false,
        providerMessageId: null,
        status: "failed",
        error: getErrorMessage(error),
      });
    }
  }

  if (sms) {
    try {
      const smsResult = await sendSMS(sms);

      results.push({
        channel: "sms",
        success: true,
        providerMessageId: smsResult.id,
        status: smsResult.status,
        error: null,
      });
    } catch (error) {
      results.push({
        channel: "sms",
        success: false,
        providerMessageId: null,
        status: "failed",
        error: getErrorMessage(error),
      });
    }
  }

  return results;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unknown notification error occurred.";
}
