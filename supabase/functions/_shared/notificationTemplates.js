import { escapeHtml, formatCurrency } from "./utils.js";

const BRAND = "All Stylez Pro";

function row(label, value, last = false) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "";
  }

  return `
    <tr>
      <td
        style="
          padding:12px 14px;
          border-bottom:${last ? "none" : "1px solid #ddd"};
          font-size:14px;
          font-weight:700;
          width:42%;
        "
      >
        ${escapeHtml(label)}
      </td>

      <td
        style="
          padding:12px 14px;
          border-bottom:${last ? "none" : "1px solid #ddd"};
          font-size:14px;
          text-align:right;
        "
      >
        ${escapeHtml(String(value))}
      </td>
    </tr>
  `;
}

function button(label, url) {
  if (!url) {
    return "";
  }

  return `
    <div style="margin-top:28px;text-align:center">
      <a
        href="${escapeHtml(url)}"
        style="
          display:inline-block;
          background:#111;
          color:#fff;
          text-decoration:none;
          padding:12px 22px;
          border-radius:6px;
          font-weight:700;
        "
      >
        ${escapeHtml(label)}
      </a>
    </div>
  `;
}

function email({
  subject,
  heading,
  greeting,
  intro,
  details = [],
  actionLabel,
  actionUrl,
  note,
  closing = BRAND,
}) {
  const validDetails = details.filter(
    ([, value]) =>
      value !== undefined &&
      value !== null &&
      value !== "",
  );

  const rows = validDetails
    .map(([label, value], index, list) =>
      row(label, value, index === list.length - 1)
    )
    .join("");

  const textDetails = validDetails
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");

  const text = [
    greeting,
    "",
    intro,
    "",
    textDetails,
    note ? `\n${note}` : "",
    actionUrl && actionLabel
      ? `\n${actionLabel}: ${actionUrl}`
      : "",
    "",
    "Thank you,",
    closing,
  ]
    .filter((value) => value !== undefined && value !== null)
    .join("\n")
    .trim();

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        >
        <title>${escapeHtml(subject)}</title>
      </head>

      <body
        style="
          margin:0;
          padding:0;
          background:#f4f4f4;
          font-family:Arial,Helvetica,sans-serif;
          color:#222;
        "
      >
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
        >
          <tr>
            <td
              align="center"
              style="padding:32px 16px"
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  max-width:600px;
                  background:#fff;
                  border-radius:12px;
                  overflow:hidden;
                "
              >
                <tr>
                  <td
                    style="
                      background:#111;
                      color:#fff;
                      padding:24px 32px;
                      text-align:center;
                    "
                  >
                    <h1 style="margin:0;font-size:24px">
                      ${BRAND}
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px">
                    <h2
                      style="
                        margin:0 0 20px;
                        font-size:22px;
                      "
                    >
                      ${escapeHtml(heading)}
                    </h2>

                    <p
                      style="
                        margin:0 0 16px;
                        font-size:16px;
                        line-height:1.6;
                      "
                    >
                      ${escapeHtml(greeting)}
                    </p>

                    <p
                      style="
                        margin:0 0 24px;
                        font-size:16px;
                        line-height:1.6;
                      "
                    >
                      ${escapeHtml(intro)}
                    </p>

                    ${
                      rows
                        ? `
                          <table
                            role="presentation"
                            width="100%"
                            cellspacing="0"
                            cellpadding="0"
                            border="0"
                            style="
                              border-collapse:collapse;
                              border:1px solid #ddd;
                              border-radius:8px;
                            "
                          >
                            ${rows}
                          </table>
                        `
                        : ""
                    }

                    ${button(actionLabel, actionUrl)}

                    ${
                      note
                        ? `
                          <p
                            style="
                              margin:28px 0 0;
                              font-size:14px;
                              line-height:1.6;
                              color:#555;
                            "
                          >
                            ${escapeHtml(note)}
                          </p>
                        `
                        : ""
                    }

                    <p
                      style="
                        margin:20px 0 0;
                        font-size:16px;
                        line-height:1.6;
                      "
                    >
                      Thank you,<br>
                      <strong>${BRAND}</strong>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      background:#f8f8f8;
                      padding:20px 32px;
                      text-align:center;
                      font-size:12px;
                      color:#777;
                    "
                  >
                    This is an automated notification.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return {
    subject,
    text,
    html,
  };
}

function money(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  return formatCurrency(value);
}

function customerGreeting(data) {
  return `Hi ${data.customerName || "Customer"},`;
}

function barberGreeting(data) {
  return `Hi ${data.barberName || "Barber"},`;
}

function commonAppointment(data) {
  return [
    ["Service", data.serviceName],
    ["Barber", data.barberName],
    ["Date", data.appointmentDate],
    ["Time", data.appointmentTime],
    ["Location", data.locationName || BRAND],
  ];
}

function barberAppointment(data) {
  return [
    ["Customer", data.customerName],
    ["Customer phone", data.customerPhone],
    ["Service", data.serviceName],
    ["Date", data.appointmentDate],
    ["Time", data.appointmentTime],
    ["Customer notes", data.customerNotes],
  ];
}

function refundTemplate(data, audience, kind) {
  const isFullRefund = kind === "full";
  const isCustomer = audience === "customer";

  return email({
    subject: isCustomer
      ? `Your ${
          isFullRefund ? "full" : "partial"
        } refund has been processed`
      : `${
          isFullRefund ? "Full" : "Partial"
        } refund processed${
          data.customerName
            ? ` — ${data.customerName}`
            : ""
        }`,

    heading: `${
      isFullRefund ? "Full" : "Partial"
    } refund processed`,

    greeting: isCustomer
      ? customerGreeting(data)
      : barberGreeting(data),

    intro: isCustomer
      ? "Your refund was processed successfully through Square."
      : "A refund was processed for an appointment booked with you.",

    details: [
      [
        "Customer",
        isCustomer ? undefined : data.customerName,
      ],
      ["Service", data.serviceName],
      ["Appointment date", data.appointmentDate],
      [
        "Original payment",
        money(data.originalPaymentAmount),
      ],
      ["Refund amount", money(data.refundAmount)],
      [
        "Remaining paid amount",
        money(data.remainingPaidAmount),
      ],
      ["Reason", data.refundReason],
      ["Refund reference", data.refundReference],
    ],

    actionLabel: "View Appointment",

    actionUrl: isCustomer
      ? data.manageBookingUrl
      : data.barberAppointmentUrl,

    note: isCustomer
      ? (
        data.refundTimingNote ||
        "Depending on your bank, the refund may take several business days to appear."
      )
      : undefined,
  });
}

export const notificationTemplates = {
  booking_confirmation_customer: (data) =>
    email({
      subject: "Your appointment is booked",
      heading: "Appointment booked",
      greeting: customerGreeting(data),
      intro:
        "Your appointment has been successfully booked.",

      details: [
        ...commonAppointment(data),
        ["Amount paid", money(data.amountPaid)],
        [
          "Remaining balance",
          money(data.remainingBalance),
        ],
      ],

      actionLabel: "Manage Appointment",
      actionUrl: data.manageBookingUrl,

      note:
        "Please arrive 5–10 minutes before your scheduled appointment.",
    }),

  new_booking_barber: (data) =>
    email({
      subject: `New appointment booked${
        data.customerName
          ? ` with ${data.customerName}`
          : ""
      }`,

      heading: "New booking",
      greeting: barberGreeting(data),

      intro:
        "A customer has booked an appointment with you.",

      details: [
        ...barberAppointment(data),
        ["Amount paid", money(data.amountPaid)],
        [
          "Remaining balance",
          money(data.remainingBalance),
        ],
        ["Payment status", data.paymentStatus],
      ],

      actionLabel: "View Appointment",
      actionUrl: data.barberAppointmentUrl,
    }),

  appointment_cancelled_customer: (data) =>
    email({
      subject: "Your appointment has been cancelled",
      heading: "Appointment cancelled",
      greeting: customerGreeting(data),
      intro: "Your appointment has been cancelled.",

      details: [
        ...commonAppointment(data),
        ["Cancelled by", data.cancelledBy],
        ["Reason", data.cancellationReason],
      ],

      actionLabel: "Book Another Appointment",
      actionUrl: data.rebookUrl,

      note: data.refundPending
        ? "A separate refund email will be sent when the refund is processed."
        : undefined,
    }),

  appointment_cancelled_barber: (data) =>
    email({
      subject: `Booking cancelled${
        data.customerName
          ? ` — ${data.customerName}`
          : ""
      }`,

      heading: "Booking cancelled",
      greeting: barberGreeting(data),

      intro:
        "An appointment on your schedule has been cancelled.",

      details: [
        ...barberAppointment(data),
        ["Cancelled by", data.cancelledBy],
        ["Reason", data.cancellationReason],
      ],

      actionLabel: "View Schedule",
      actionUrl: data.barberScheduleUrl,
    }),

  appointment_rescheduled_customer: (data) =>
    email({
      subject: "Your appointment has been rescheduled",
      heading: "Appointment rescheduled",
      greeting: customerGreeting(data),
      intro: "Your appointment time has changed.",

      details: [
        ["Previous date", data.previousDate],
        ["Previous time", data.previousTime],
        ["New date", data.appointmentDate],
        ["New time", data.appointmentTime],
        ["Barber", data.barberName],
        ["Service", data.serviceName],
        ["Location", data.locationName || BRAND],
      ],

      actionLabel: "Manage Appointment",
      actionUrl: data.manageBookingUrl,
    }),

  appointment_rescheduled_barber: (data) =>
    email({
      subject: `Appointment rescheduled${
        data.customerName
          ? ` — ${data.customerName}`
          : ""
      }`,

      heading: "Appointment rescheduled",
      greeting: barberGreeting(data),

      intro:
        "An appointment on your schedule has been rescheduled.",

      details: [
        ["Customer", data.customerName],
        ["Service", data.serviceName],
        ["Previous date", data.previousDate],
        ["Previous time", data.previousTime],
        ["New date", data.appointmentDate],
        ["New time", data.appointmentTime],
      ],

      actionLabel: "View Appointment",
      actionUrl: data.barberAppointmentUrl,
    }),

  appointment_tomorrow_customer: (data) =>
    email({
      subject: "Your appointment is tomorrow",
      heading: "Appointment tomorrow",
      greeting: customerGreeting(data),

      intro:
        "This is a reminder that your appointment is tomorrow.",

      details: commonAppointment(data),

      actionLabel: "Manage Appointment",
      actionUrl: data.manageBookingUrl,

      note: "Please arrive 5–10 minutes early.",
    }),

  appointment_tomorrow_barber: (data) =>
    email({
      subject: `Tomorrow's appointment${
        data.customerName
          ? ` — ${data.customerName}`
          : ""
      }`,

      heading: "Appointment tomorrow",
      greeting: barberGreeting(data),

      intro:
        "You have an appointment scheduled for tomorrow.",

      details: [
        ...barberAppointment(data),
        ["Payment status", data.paymentStatus],
        [
          "Remaining balance",
          money(data.remainingBalance),
        ],
      ],

      actionLabel: "View Appointment",
      actionUrl: data.barberAppointmentUrl,
    }),

  appointment_courtesy_customer: (data) =>
    email({
      subject: "Your appointment starts in 2 hours",
      heading: "Two-hour courtesy reminder",
      greeting: customerGreeting(data),

      intro:
        "Your appointment starts in approximately 2 hours.",

      details: commonAppointment(data),

      actionLabel: "Manage Appointment",
      actionUrl: data.manageBookingUrl,

      note: "We look forward to seeing you soon.",
    }),

  appointment_courtesy_barber: (data) =>
    email({
      subject: `Appointment in 2 hours${
        data.customerName
          ? ` — ${data.customerName}`
          : ""
      }`,

      heading: "Two-hour courtesy reminder",
      greeting: barberGreeting(data),

      intro:
        "Your next appointment starts in approximately 2 hours.",

      details: [
        ...barberAppointment(data),
        ["Payment status", data.paymentStatus],
        [
          "Remaining balance",
          money(data.remainingBalance),
        ],
      ],

      actionLabel: "View Appointment",
      actionUrl: data.barberAppointmentUrl,
    }),

  payment_received_customer: (data) =>
    email({
      subject: "Payment received for your appointment",
      heading: "Payment received",
      greeting: customerGreeting(data),

      intro:
        "We received your payment successfully.",

      details: [
        ...commonAppointment(data),
        ["Payment amount", money(data.amountPaid)],
        ["Payment type", data.paymentType],
        [
          "Remaining balance",
          money(data.remainingBalance),
        ],
      ],

      actionLabel: "View Receipt",
      actionUrl: data.receiptUrl,
    }),

  payment_received_barber: (data) =>
    email({
      subject: `Payment received${
        data.customerName
          ? ` from ${data.customerName}`
          : ""
      }`,

      heading: "Payment received",
      greeting: barberGreeting(data),

      intro:
        "A payment was received for an appointment booked with you.",

      details: [
        ["Customer", data.customerName],
        ["Service", data.serviceName],
        ["Date", data.appointmentDate],
        ["Time", data.appointmentTime],
        ["Payment amount", money(data.amountPaid)],
        ["Payment type", data.paymentType],
        [
          "Remaining balance",
          money(data.remainingBalance),
        ],
      ],

      actionLabel: "View Appointment",
      actionUrl: data.barberAppointmentUrl,
    }),

  refund_partial_customer: (data) =>
    refundTemplate(data, "customer", "partial"),

  refund_partial_barber: (data) =>
    refundTemplate(data, "barber", "partial"),

  refund_full_customer: (data) =>
    refundTemplate(data, "customer", "full"),

  refund_full_barber: (data) =>
    refundTemplate(data, "barber", "full"),

  square_connected_barber: (data) =>
    email({
      subject: "Your Square account is connected",
      heading: "Square connected",
      greeting: barberGreeting(data),

      intro:
        "Your Square account was connected successfully. You are ready to accept online payments.",

      details: [
        ["Business", data.businessName],
        ["Square location", data.squareLocationName],
        ["Connected at", data.connectedAt],
      ],

      actionLabel: "Open Barber Dashboard",
      actionUrl: data.barberDashboardUrl,
    }),

  square_connected_admin: (data) =>
    email({
      subject: `${
        data.barberName || "A barber"
      } connected Square`,

      heading: "Barber connected Square",

      greeting: `Hi ${data.adminName || "Admin"},`,

      intro:
        "A barber has successfully connected a Square account.",

      details: [
        ["Barber", data.barberName],
        ["Email", data.barberEmail],
        ["Square location", data.squareLocationName],
        ["Connected at", data.connectedAt],
      ],

      actionLabel: "View Barber Profile",
      actionUrl: data.barberProfileUrl,
    }),
};
