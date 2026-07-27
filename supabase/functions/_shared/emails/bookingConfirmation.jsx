import {
  escapeHtml,
  formatCurrency,
} from "../utils.js";

export function bookingConfirmationEmail({
  customerName,
  barberName,
  serviceName,
  appointmentDate,
  appointmentTime,
  locationName,
  amountPaid,
  remainingBalance,
  manageBookingUrl,
}) {
  const safeCustomerName = escapeHtml(customerName || "Customer");
  const safeBarberName = escapeHtml(barberName || "your barber");
  const safeServiceName = escapeHtml(serviceName || "your service");
  const safeAppointmentDate = escapeHtml(appointmentDate || "");
  const safeAppointmentTime = escapeHtml(appointmentTime || "");
  const safeLocationName = escapeHtml(
    locationName || "All Stylez Pro",
  );

  const paid = formatCurrency(amountPaid);
  const balance = formatCurrency(remainingBalance);

  const manageButton = manageBookingUrl
    ? `
      <div style="margin-top:28px;text-align:center;">
        <a
          href="${escapeHtml(manageBookingUrl)}"
          style="
            display:inline-block;
            background:#111111;
            color:#ffffff;
            text-decoration:none;
            padding:12px 22px;
            border-radius:6px;
            font-weight:700;
          "
        >
          Manage Appointment
        </a>
      </div>
    `
    : "";

  return {
    subject: "Your appointment is confirmed",

    text: `
Hi ${customerName || "Customer"},

Your appointment with All Stylez Pro is confirmed.

Service: ${serviceName || ""}
Barber: ${barberName || ""}
Date: ${appointmentDate || ""}
Time: ${appointmentTime || ""}
Location: ${locationName || "All Stylez Pro"}
Amount paid: ${paid}
Remaining balance: ${balance}

Thank you,
All Stylez Pro
    `.trim(),

    html: `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>Your appointment is confirmed</title>
        </head>

        <body
          style="
            margin:0;
            padding:0;
            background:#f4f4f4;
            font-family:Arial,Helvetica,sans-serif;
            color:#222222;
          "
        >
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="background:#f4f4f4;"
          >
            <tr>
              <td align="center" style="padding:32px 16px;">
                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="
                    max-width:600px;
                    background:#ffffff;
                    border-radius:12px;
                    overflow:hidden;
                  "
                >
                  <tr>
                    <td
                      style="
                        background:#111111;
                        color:#ffffff;
                        padding:24px 32px;
                        text-align:center;
                      "
                    >
                      <h1
                        style="
                          margin:0;
                          font-size:24px;
                          line-height:1.3;
                        "
                      >
                        All Stylez Pro
                      </h1>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:32px;">
                      <h2
                        style="
                          margin:0 0 20px;
                          font-size:22px;
                          line-height:1.4;
                        "
                      >
                        Appointment confirmed
                      </h2>

                      <p
                        style="
                          margin:0 0 16px;
                          font-size:16px;
                          line-height:1.6;
                        "
                      >
                        Hi ${safeCustomerName},
                      </p>

                      <p
                        style="
                          margin:0 0 24px;
                          font-size:16px;
                          line-height:1.6;
                        "
                      >
                        Your appointment has been successfully confirmed.
                      </p>

                      <table
                        role="presentation"
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        style="
                          border-collapse:collapse;
                          border:1px solid #dddddd;
                          border-radius:8px;
                        "
                      >
                        ${detailRow("Service", safeServiceName)}
                        ${detailRow("Barber", safeBarberName)}
                        ${detailRow("Date", safeAppointmentDate)}
                        ${detailRow("Time", safeAppointmentTime)}
                        ${detailRow("Location", safeLocationName)}
                        ${detailRow("Amount paid", paid)}
                        ${detailRow("Remaining balance", balance, true)}
                      </table>

                      ${manageButton}

                      <p
                        style="
                          margin:28px 0 0;
                          font-size:14px;
                          line-height:1.6;
                          color:#555555;
                        "
                      >
                        Please arrive a few minutes before your scheduled
                        appointment time.
                      </p>

                      <p
                        style="
                          margin:20px 0 0;
                          font-size:16px;
                          line-height:1.6;
                        "
                      >
                        Thank you,<br />
                        <strong>All Stylez Pro</strong>
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
                        line-height:1.5;
                        color:#777777;
                      "
                    >
                      This is an automated appointment notification.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };
}

function detailRow(label, value, lastRow = false) {
  return `
    <tr>
      <td
        style="
          padding:12px 14px;
          border-bottom:${lastRow ? "none" : "1px solid #dddddd"};
          font-size:14px;
          font-weight:700;
          width:42%;
        "
      >
        ${label}
      </td>

      <td
        style="
          padding:12px 14px;
          border-bottom:${lastRow ? "none" : "1px solid #dddddd"};
          font-size:14px;
          text-align:right;
        "
      >
        ${value}
      </td>
    </tr>
  `;
}
