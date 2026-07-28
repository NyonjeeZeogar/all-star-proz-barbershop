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

const BARBER_APPLICATION_TYPES = new Set([
  "barber_application_approved",
  "barber_application_rejected",
]);

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

  const adminClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  let notificationLogId: string | null = null;

  try {
    const body = await request.json();

    const {
      type,
      appointmentId = null,
      applicationId = null,
      recipient: requestedRecipient,
      data: requestedData = {},
    } = body;

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

    let recipient = requestedRecipient;
    let data = requestedData;

    if (BARBER_APPLICATION_TYPES.has(type)) {
      const adminUser = await requireAdmin(
        request,
        supabaseUrl,
        serviceRoleKey,
        adminClient,
      );

      if (!applicationId) {
        return jsonResponse(
          {
            success: false,
            error: "applicationId is required.",
          },
          400,
          corsHeaders,
        );
      }

      const {
        data: application,
        error: applicationError,
      } = await adminClient
        .from("barber_applications")
        .select(
          `
            id,
            user_id,
            full_name,
            email,
            business_name,
            status,
            rejection_reason,
            reviewed_at
          `,
        )
        .eq("id", applicationId)
        .single();

      if (applicationError || !application) {
        throw new Error(
          applicationError?.message ||
            "Barber application not found.",
        );
      }

      const requiredStatus =
        type === "barber_application_approved"
          ? "approved"
          : "rejected";

      if (application.status !== requiredStatus) {
        return jsonResponse(
          {
            success: false,
            error:
              `The application must be ${requiredStatus} before this email can be sent.`,
          },
          409,
          corsHeaders,
        );
      }

      let squareStatus: string | undefined;

      if (type === "barber_application_approved") {
        const { data: squareConnection } = await adminClient
          .from("square_connections")
          .select("status")
          .eq("barber_id", application.user_id)
          .maybeSingle();

        squareStatus =
          squareConnection?.status === "connected"
            ? "Connected"
            : "Not connected";
      }

      recipient = application.email;
      data = {
        barberName: application.full_name,
        businessName: application.business_name,
        reviewedAt: formatDateTime(application.reviewed_at),
        rejectionReason: application.rejection_reason,
        squareStatus,
        barberDashboardUrl: buildUrl("/portal"),
        contactUrl: buildUrl("/contact"),
        reviewedBy: adminUser.email,
      };
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

      contactUrl:
        data.contactUrl || buildUrl("/contact"),
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
    } = await adminClient
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

    const { error: logUpdateError } = await adminClient
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
      const { error: failedLogUpdateError } = await adminClient
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

async function requireAdmin(
  request: Request,
  supabaseUrl: string,
  serviceRoleKey: string,
  adminClient: ReturnType<typeof createClient>,
) {
  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Authentication is required.");
  }

  const userClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(
    authorization.replace("Bearer ", ""),
  );

  if (userError || !user) {
    throw new Error("The authenticated user could not be verified.");
  }

  const { data: profile, error: profileError } =
    await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (
    profileError ||
    String(profile?.role ?? "").trim().toLowerCase() !== "admin"
  ) {
    throw new Error(
      "Only administrators can send barber application emails.",
    );
  }

  return user;
}

function buildUrl(path: string): string | undefined {
  const appUrl = Deno.env.get("APP_URL");

  if (!appUrl) {
    return undefined;
  }

  return `${appUrl.replace(/\/+$/, "")}${path}`;
}

function formatDateTime(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
