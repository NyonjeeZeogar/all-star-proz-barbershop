import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/sendEmail.js";
import { notificationTemplates } from "../_shared/notificationTemplates.js";
import { jsonResponse } from "../_shared/utils.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Method not allowed.",
      },
      405,
      corsHeaders,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      {
        success: false,
        error: "Supabase server configuration is missing.",
      },
      500,
      corsHeaders,
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let notificationLogId: string | null = null;

  try {
    const {
      type,
      appointmentId = null,
      recipient,
      data = {},
    } = await request.json();

    const templateFactory = notificationTemplates[type];

    if (!type || !templateFactory) {
      return jsonResponse(
        {
          success: false,
          error: `Unsupported notification type: ${type ?? "missing"}`,
        },
        400,
        corsHeaders,
      );
    }

    if (!recipient || typeof recipient !== "string") {
      return jsonResponse(
        {
          success: false,
          error: "A valid recipient email is required.",
        },
        400,
        corsHeaders,
      );
    }

    const normalizedRecipient = recipient.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedRecipient)) {
      return jsonResponse(
        {
          success: false,
          error: "The recipient email address is invalid.",
        },
        400,
        corsHeaders,
      );
    }

    const enrichedData = {
      ...data,

      manageBookingUrl:
        data.manageBookingUrl ||
        (appointmentId
          ? buildUrl(`/appointments/${appointmentId}`)
          : undefined),

      barberAppointmentUrl:
        data.barberAppointmentUrl ||
        (appointmentId
          ? buildUrl(`/barber/appointments/${appointmentId}`)
          : undefined),

      barberScheduleUrl:
        data.barberScheduleUrl || buildUrl("/portal?tab=schedule"),

      barberDashboardUrl:
        data.barberDashboardUrl || buildUrl("/portal"),

      rebookUrl:
        data.rebookUrl || buildUrl("/bookings"),
    };

    const template = templateFactory(enrichedData);

    const logPayload = {
      channel: "email",
      notification_type: type,
      recipient: normalizedRecipient,
      status: "processing",
      ...(appointmentId
        ? {
            appointment_id: appointmentId,
          }
        : {}),
    };

    const {
      data: logRow,
      error: logInsertError,
    } = await supabase
      .from("notification_logs")
      .insert(logPayload)
      .select("id")
      .single();

    if (logInsertError) {
      throw new Error(
        `Could not create notification log: ${logInsertError.message}`,
      );
    }

    notificationLogId = logRow.id;

    const providerResult = await sendEmail({
      to: normalizedRecipient,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    const { error: logUpdateError } = await supabase
      .from("notification_logs")
      .update({
        status: "sent",
        provider_message_id: providerResult.id ?? null,
        error_message: null,
        sent_at: new Date().toISOString(),
      })
      .eq("id", notificationLogId);

    if (logUpdateError) {
      console.error(
        "Email sent, but notification log update failed:",
        logUpdateError,
      );
    }

    return jsonResponse(
      {
        success: true,
        notificationId: notificationLogId,
        providerMessageId: providerResult.id ?? null,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "An unknown notification error occurred.";

    console.error("send-notification error:", message);

    if (notificationLogId) {
      const { error: failedLogUpdateError } = await supabase
        .from("notification_logs")
        .update({
          status: "failed",
          error_message: message,
        })
        .eq("id", notificationLogId);

      if (failedLogUpdateError) {
        console.error(
          "Could not update failed notification log:",
          failedLogUpdateError,
        );
      }
    }

    return jsonResponse(
      {
        success: false,
        error: message,
      },
      500,
      corsHeaders,
    );
  }
});

function buildUrl(path: string): string | undefined {
  const appUrl = Deno.env.get("APP_URL");

  if (!appUrl) {
    return undefined;
  }

  return `${appUrl.replace(/\/+$/, "")}${path}`;
}
