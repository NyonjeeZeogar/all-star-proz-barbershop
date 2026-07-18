import { supabase } from "../lib/supabaseClient";

/**
 * Returns the currently authenticated Supabase user.
 */
export async function getAuthenticatedUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logSupabaseError(
      "Unable to get authenticated user",
      error
    );

    throw new Error(error.message);
  }

  if (!user) {
    throw new Error(
      "You must be signed in to manage appointments."
    );
  }

  return user;
}

/**
 * Converts a time value to HH:MM:SS.
 *
 * Supported examples:
 * - "16:00"
 * - "16:00:00"
 * - "4:00 PM"
 */
function normalizeTime(time) {
  if (!time || typeof time !== "string") {
    return null;
  }

  const trimmedTime = time.trim();

  if (
    /^\d{2}:\d{2}:\d{2}$/.test(
      trimmedTime
    )
  ) {
    return trimmedTime;
  }

  if (
    /^\d{2}:\d{2}$/.test(trimmedTime)
  ) {
    return `${trimmedTime}:00`;
  }

  const match = trimmedTime.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  );

  if (!match) {
    throw new Error(
      `Invalid appointment time: ${time}`
    );
  }

  let hours = Number(match[1]);
  const minutes = match[2];
  const period =
    match[3].toUpperCase();

  if (hours < 1 || hours > 12) {
    throw new Error(
      `Invalid appointment time: ${time}`
    );
  }

  if (
    period === "AM" &&
    hours === 12
  ) {
    hours = 0;
  }

  if (
    period === "PM" &&
    hours !== 12
  ) {
    hours += 12;
  }

  return `${String(hours).padStart(
    2,
    "0"
  )}:${minutes}:00`;
}

/**
 * Calculates an appointment end time.
 */
function calculateEndTime(
  startTime,
  durationMinutes
) {
  const normalizedStartTime =
    normalizeTime(startTime);

  if (!normalizedStartTime) {
    return null;
  }

  const duration =
    Number(durationMinutes);

  if (
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    throw new Error(
      "A valid service duration is required to calculate the end time."
    );
  }

  const [
    hours,
    minutes,
    seconds,
  ] = normalizedStartTime
    .split(":")
    .map(Number);

  const startDate = new Date(
    2000,
    0,
    1,
    hours,
    minutes,
    seconds
  );

  startDate.setMinutes(
    startDate.getMinutes() +
      duration
  );

  return [
    String(
      startDate.getHours()
    ).padStart(2, "0"),
    String(
      startDate.getMinutes()
    ).padStart(2, "0"),
    String(
      startDate.getSeconds()
    ).padStart(2, "0"),
  ].join(":");
}

/**
 * Converts a value into a valid money amount.
 */
function normalizeMoney(
  value,
  fallback = 0
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return fallback;
  }

  return Number(
    amount.toFixed(2)
  );
}

/**
 * Creates an appointment owned by the authenticated customer.
 *
 * Required appointment properties:
 * - barber_id
 * - service_id
 * - appointment_date
 * - start_time or appointment_time
 * - end_time or duration_minutes
 */
export async function createAppointment(
  appointment
) {
  const user =
    await getAuthenticatedUser();

  if (!appointment) {
    throw new Error(
      "Appointment information is required."
    );
  }

  if (!appointment.barber_id) {
    throw new Error(
      "Please select a barber before booking."
    );
  }

  if (!appointment.service_id) {
    throw new Error(
      "Please select a valid service before booking."
    );
  }

  if (!appointment.appointment_date) {
    throw new Error(
      "Please select an appointment date."
    );
  }

  const rawStartTime =
    appointment.start_time ||
    appointment.appointment_time;

  if (!rawStartTime) {
    throw new Error(
      "Please select an appointment time."
    );
  }

  const startTime =
    normalizeTime(rawStartTime);

  const endTime =
    appointment.end_time
      ? normalizeTime(
          appointment.end_time
        )
      : calculateEndTime(
          startTime,
          appointment.duration_minutes
        );

  if (!endTime) {
    throw new Error(
      "Unable to determine the appointment end time."
    );
  }

  const customerName =
    appointment.name?.trim() ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "";

  const customerEmail =
    appointment.email?.trim() ||
    user.email ||
    "";

  const servicePrice =
    normalizeMoney(
      appointment.service_price
    );

  const depositAmount =
    normalizeMoney(
      appointment.deposit_amount
    );

  const paymentOption =
    appointment.payment_option ||
    "deposit";

  const amountDueNow =
    normalizeMoney(
      appointment.amount_due_now,
      paymentOption === "full"
        ? servicePrice
        : depositAmount
    );

  const amountPaid =
    normalizeMoney(
      appointment.amount_paid
    );

  const remainingBalance =
    normalizeMoney(
      appointment.remaining_balance,
      Math.max(
        servicePrice - amountPaid,
        0
      )
    );

  if (servicePrice < 0) {
    throw new Error(
      "The service price cannot be negative."
    );
  }

  if (depositAmount < 0) {
    throw new Error(
      "The deposit amount cannot be negative."
    );
  }

  if (
    depositAmount > servicePrice
  ) {
    throw new Error(
      "The deposit cannot be greater than the service price."
    );
  }

  if (
    !["deposit", "full"].includes(
      paymentOption
    )
  ) {
    throw new Error(
      "Invalid payment option."
    );
  }

  const appointmentPayload = {
    customer_id: user.id,

    barber_id:
      appointment.barber_id,

    service_id:
      appointment.service_id,

    appointment_date:
      appointment.appointment_date,

    start_time: startTime,
    end_time: endTime,

    status:
      appointment.status ||
      "pending",

    customer_notes:
      appointment.customer_notes?.trim() ||
      appointment.notes?.trim() ||
      null,

    user_id: user.id,
    appointment_time: startTime,

    name: customerName,
    email: customerEmail,

    phone:
      appointment.phone?.trim() ||
      "",

    service:
      appointment.service?.trim() ||
      null,

    booking_source:
      appointment.booking_source ||
      "online",

    payment_option:
      paymentOption,

    payment_status:
      appointment.payment_status ||
      "payment_not_connected",

    service_price:
      servicePrice,

    deposit_amount:
      depositAmount,

    amount_due_now:
      amountDueNow,

    amount_paid:
      amountPaid,

    remaining_balance:
      remainingBalance,

    currency:
      appointment.currency ||
      "USD",

    payment_expires_at:
      appointment.payment_expires_at ||
      null,

    paid_at:
      appointment.paid_at ||
      null,

    square_payment_id:
      appointment.square_payment_id ||
      null,

    square_order_id:
      appointment.square_order_id ||
      null,

    square_receipt_url:
      appointment.square_receipt_url ||
      null,

    square_location_id:
      appointment.square_location_id ||
      null,
  };

  const { data, error } =
    await supabase
      .from("appointments")
      .insert(appointmentPayload)
      .select("*")
      .single();

  if (error) {
    logSupabaseError(
      "Unable to create appointment",
      error
    );

    throw new Error(error.message);
  }

  return data;
}

/**
 * Loads appointments belonging to the authenticated customer.
 */
export async function getMyAppointments() {
  const user =
    await getAuthenticatedUser();

  const { data, error } =
    await supabase
      .from("appointments")
      .select(`
        *,
        service_details:services (
          id,
          name,
          description,
          price,
          deposit,
          duration_minutes,
          active
        ),
        barber:profiles!appointments_barber_id_fkey (
          id,
          full_name,
          email,
          phone,
          role
        )
      `)
      .eq(
        "customer_id",
        user.id
      )
      .order(
        "appointment_date",
        { ascending: true }
      )
      .order(
        "start_time",
        { ascending: true }
      );

  if (error) {
    logSupabaseError(
      "Unable to load appointments",
      error
    );

    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Loads active services from the agency-managed service catalog.
 */
export async function getActiveServices() {
  const { data, error } =
    await supabase
      .from("services")
      .select(`
        id,
        name,
        description,
        price,
        deposit,
        duration_minutes,
        active,
        created_at
      `)
      .eq("active", true)
      .order("name", {
        ascending: true,
      });

  if (error) {
    logSupabaseError(
      "Unable to load services",
      error
    );

    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Loads active services configured for one barber.
 *
 * Barber-specific values override the agency catalog defaults.
 */
export async function getBarberServices(
  barberId
) {
  if (!barberId) {
    return [];
  }

  const { data, error } =
    await supabase
      .from("barber_services")
      .select(`
        id,
        barber_id,
        service_id,
        custom_price,
        custom_deposit,
        custom_duration_minutes,
        active,
        service:services (
          id,
          name,
          description,
          price,
          deposit,
          duration_minutes,
          active
        )
      `)
      .eq("barber_id", barberId)
      .eq("active", true);

  if (error) {
    logSupabaseError(
      "Unable to load barber services",
      error
    );

    throw new Error(error.message);
  }

  return (data ?? [])
    .filter(
      (row) =>
        row.service &&
        row.service.active !== false
    )
    .map((row) => ({
      barber_service_id: row.id,
      barber_id: row.barber_id,

      id: row.service_id,
      service_id: row.service_id,

      name:
        row.service?.name ||
        "Service",

      description:
        row.service?.description ||
        "",

      price:
        row.custom_price ??
        row.service?.price ??
        0,

      deposit:
        row.custom_deposit ??
        row.service?.deposit ??
        0,

      duration_minutes:
        row.custom_duration_minutes ??
        row.service?.duration_minutes ??
        30,

      active: row.active,
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );
}

/**
 * Loads profiles that have the barber role.
 */
export async function getBarbers() {
  const { data, error } =
    await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        phone,
        role
      `)
      .eq("role", "barber")
      .order("full_name", {
        ascending: true,
      });

  if (error) {
    logSupabaseError(
      "Unable to load barbers",
      error
    );

    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Updates one appointment owned by the authenticated customer.
 */
export async function updateAppointment(
  appointmentId,
  updates
) {
  const user =
    await getAuthenticatedUser();

  if (!appointmentId) {
    throw new Error(
      "An appointment ID is required."
    );
  }

  if (
    !updates ||
    typeof updates !== "object"
  ) {
    throw new Error(
      "Appointment changes are required."
    );
  }

  const allowedUpdates = {};

  if (
    updates.barber_id !==
    undefined
  ) {
    if (!updates.barber_id) {
      throw new Error(
        "Please select a valid barber."
      );
    }

    allowedUpdates.barber_id =
      updates.barber_id;
  }

  if (
    updates.service_id !==
    undefined
  ) {
    if (!updates.service_id) {
      throw new Error(
        "Please select a valid service."
      );
    }

    allowedUpdates.service_id =
      updates.service_id;
  }

  if (
    updates.service !==
    undefined
  ) {
    allowedUpdates.service =
      updates.service?.trim() ||
      null;
  }

  if (
    updates.appointment_date !==
    undefined
  ) {
    if (
      !updates.appointment_date
    ) {
      throw new Error(
        "Please select an appointment date."
      );
    }

    allowedUpdates.appointment_date =
      updates.appointment_date;
  }

  const suppliedStartTime =
    updates.start_time !==
    undefined
      ? updates.start_time
      : updates.appointment_time;

  if (
    suppliedStartTime !==
    undefined
  ) {
    if (!suppliedStartTime) {
      throw new Error(
        "Please select an appointment time."
      );
    }

    const normalizedStartTime =
      normalizeTime(
        suppliedStartTime
      );

    allowedUpdates.start_time =
      normalizedStartTime;

    allowedUpdates.appointment_time =
      normalizedStartTime;
  }

  if (
    updates.end_time !==
    undefined
  ) {
    if (!updates.end_time) {
      throw new Error(
        "An appointment end time is required."
      );
    }

    allowedUpdates.end_time =
      normalizeTime(
        updates.end_time
      );
  } else if (
    suppliedStartTime !==
      undefined &&
    updates.duration_minutes !==
      undefined
  ) {
    allowedUpdates.end_time =
      calculateEndTime(
        suppliedStartTime,
        updates.duration_minutes
      );
  }

  if (
    updates.status !==
    undefined
  ) {
    allowedUpdates.status =
      updates.status;
  }

  if (
    updates.customer_notes !==
    undefined
  ) {
    allowedUpdates.customer_notes =
      updates.customer_notes?.trim() ||
      null;
  }

  if (
    updates.notes !==
    undefined
  ) {
    allowedUpdates.customer_notes =
      updates.notes?.trim() ||
      null;
  }

  if (
    updates.name !==
    undefined
  ) {
    allowedUpdates.name =
      updates.name?.trim() ||
      "";
  }

  if (
    updates.email !==
    undefined
  ) {
    allowedUpdates.email =
      updates.email?.trim() ||
      "";
  }

  if (
    updates.phone !==
    undefined
  ) {
    allowedUpdates.phone =
      updates.phone?.trim() ||
      "";
  }

  if (
    updates.booking_source !==
    undefined
  ) {
    allowedUpdates.booking_source =
      updates.booking_source;
  }

  if (
    updates.payment_option !==
    undefined
  ) {
    if (
      !["deposit", "full"].includes(
        updates.payment_option
      )
    ) {
      throw new Error(
        "Invalid payment option."
      );
    }

    allowedUpdates.payment_option =
      updates.payment_option;
  }

  if (
    updates.payment_status !==
    undefined
  ) {
    allowedUpdates.payment_status =
      updates.payment_status;
  }

  if (
    updates.service_price !==
    undefined
  ) {
    allowedUpdates.service_price =
      normalizeMoney(
        updates.service_price
      );
  }

  if (
    updates.deposit_amount !==
    undefined
  ) {
    allowedUpdates.deposit_amount =
      normalizeMoney(
        updates.deposit_amount
      );
  }

  if (
    updates.amount_due_now !==
    undefined
  ) {
    allowedUpdates.amount_due_now =
      normalizeMoney(
        updates.amount_due_now
      );
  }

  if (
    updates.amount_paid !==
    undefined
  ) {
    allowedUpdates.amount_paid =
      normalizeMoney(
        updates.amount_paid
      );
  }

  if (
    updates.remaining_balance !==
    undefined
  ) {
    allowedUpdates.remaining_balance =
      normalizeMoney(
        updates.remaining_balance
      );
  }

  if (
    updates.currency !==
    undefined
  ) {
    allowedUpdates.currency =
      updates.currency ||
      "USD";
  }

  if (
    updates.payment_expires_at !==
    undefined
  ) {
    allowedUpdates.payment_expires_at =
      updates.payment_expires_at ||
      null;
  }

  if (
    updates.paid_at !==
    undefined
  ) {
    allowedUpdates.paid_at =
      updates.paid_at ||
      null;
  }

  if (
    updates.square_payment_id !==
    undefined
  ) {
    allowedUpdates.square_payment_id =
      updates.square_payment_id ||
      null;
  }

  if (
    updates.square_order_id !==
    undefined
  ) {
    allowedUpdates.square_order_id =
      updates.square_order_id ||
      null;
  }

  if (
    updates.square_receipt_url !==
    undefined
  ) {
    allowedUpdates.square_receipt_url =
      updates.square_receipt_url ||
      null;
  }

  if (
    updates.square_location_id !==
    undefined
  ) {
    allowedUpdates.square_location_id =
      updates.square_location_id ||
      null;
  }

  if (
    Object.keys(
      allowedUpdates
    ).length === 0
  ) {
    throw new Error(
      "No valid appointment changes were provided."
    );
  }

  const { data, error } =
    await supabase
      .from("appointments")
      .update(allowedUpdates)
      .eq("id", appointmentId)
      .eq(
        "customer_id",
        user.id
      )
      .select("*")
      .single();

  if (error) {
    logSupabaseError(
      "Unable to update appointment",
      error
    );

    throw new Error(error.message);
  }

  return data;
}

/**
 * Marks an appointment as cancelled.
 */
export async function cancelAppointment(
  appointmentId
) {
  return updateAppointment(
    appointmentId,
    {
      status: "cancelled",
    }
  );
}

/**
 * Permanently deletes an appointment owned by the authenticated customer.
 */
export async function deleteAppointment(
  appointmentId
) {
  const user =
    await getAuthenticatedUser();

  if (!appointmentId) {
    throw new Error(
      "An appointment ID is required."
    );
  }

  const { error } =
    await supabase
      .from("appointments")
      .delete()
      .eq("id", appointmentId)
      .eq(
        "customer_id",
        user.id
      );

  if (error) {
    logSupabaseError(
      "Unable to delete appointment",
      error
    );

    throw new Error(error.message);
  }
}

/**
 * Logs complete Supabase errors in a readable format.
 */
function logSupabaseError(
  label,
  error
) {
  console.error(`${label}:`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
    status: error?.status,
  });
}
