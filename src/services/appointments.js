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
    logSupabaseError("Unable to get authenticated user", error);
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error("You must be signed in to manage appointments.");
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

  // Already in 24-hour database format.
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmedTime)) {
    return trimmedTime;
  }

  if (/^\d{2}:\d{2}$/.test(trimmedTime)) {
    return `${trimmedTime}:00`;
  }

  // Convert values such as "4:00 PM".
  const match = trimmedTime.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  );

  if (!match) {
    throw new Error(`Invalid appointment time: ${time}`);
  }

  let hours = Number(match[1]);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  if (hours < 1 || hours > 12) {
    throw new Error(`Invalid appointment time: ${time}`);
  }

  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  if (period === "PM" && hours !== 12) {
    hours += 12;
  }

  return `${String(hours).padStart(2, "0")}:${minutes}:00`;
}

/**
 * Calculates an appointment end time.
 */
function calculateEndTime(startTime, durationMinutes) {
  const normalizedStartTime = normalizeTime(startTime);

  if (!normalizedStartTime) {
    return null;
  }

  const duration = Number(durationMinutes);

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(
      "A valid service duration is required to calculate the end time."
    );
  }

  const [hours, minutes, seconds] = normalizedStartTime
    .split(":")
    .map(Number);

  const startDate = new Date(2000, 0, 1, hours, minutes, seconds);
  startDate.setMinutes(startDate.getMinutes() + duration);

  return [
    String(startDate.getHours()).padStart(2, "0"),
    String(startDate.getMinutes()).padStart(2, "0"),
    String(startDate.getSeconds()).padStart(2, "0"),
  ].join(":");
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
export async function createAppointment(appointment) {
  const user = await getAuthenticatedUser();

  if (!appointment) {
    throw new Error("Appointment information is required.");
  }

  if (!appointment.barber_id) {
    throw new Error("Please select a barber before booking.");
  }

  if (!appointment.service_id) {
    throw new Error("Please select a valid service before booking.");
  }

  if (!appointment.appointment_date) {
    throw new Error("Please select an appointment date.");
  }

  const rawStartTime =
    appointment.start_time || appointment.appointment_time;

  if (!rawStartTime) {
    throw new Error("Please select an appointment time.");
  }

  const startTime = normalizeTime(rawStartTime);

  const endTime = appointment.end_time
    ? normalizeTime(appointment.end_time)
    : calculateEndTime(
        startTime,
        appointment.duration_minutes
      );

  if (!endTime) {
    throw new Error("Unable to determine the appointment end time.");
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

  const appointmentPayload = {
    customer_id: user.id,
    barber_id: appointment.barber_id,
    service_id: appointment.service_id,
    appointment_date: appointment.appointment_date,
    start_time: startTime,
    end_time: endTime,
    status: appointment.status || "pending",
    customer_notes:
      appointment.customer_notes?.trim() ||
      appointment.notes?.trim() ||
      null,

    // These columns exist in your current table.
    user_id: user.id,
    appointment_time: startTime,
    name: customerName,
    email: customerEmail,
    phone: appointment.phone?.trim() || "",
    service: appointment.service?.trim() || null,
  };

  const { data, error } = await supabase
    .from("appointments")
    .insert(appointmentPayload)
    .select("*")
    .single();

  if (error) {
    logSupabaseError("Unable to create appointment", error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Loads appointments belonging to the authenticated customer.
 */
export async function getMyAppointments() {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      service:services (
        id,
        name,
        description,
        price,
        duration_minutes
      ),
      barber:profiles!appointments_barber_id_fkey (
        id,
        full_name,
        email,
        phone,
        role
      )
    `)
    .eq("customer_id", user.id)
    .order("appointment_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    logSupabaseError("Unable to load appointments", error);
    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Loads active services from Supabase.
 */
export async function getActiveServices() {
  const { data, error } = await supabase
    .from("services")
    .select(`
      id,
      name,
      description,
      price,
      duration_minutes,
      active
    `)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    logSupabaseError("Unable to load services", error);
    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Loads profiles that have the barber role.
 */
export async function getBarbers() {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      phone,
      role
    `)
    .eq("role", "barber")
    .order("full_name", { ascending: true });

  if (error) {
    logSupabaseError("Unable to load barbers", error);
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
  const user = await getAuthenticatedUser();

  if (!appointmentId) {
    throw new Error("An appointment ID is required.");
  }

  if (!updates || typeof updates !== "object") {
    throw new Error("Appointment changes are required.");
  }

  const allowedUpdates = {};

  if (updates.barber_id !== undefined) {
    if (!updates.barber_id) {
      throw new Error("Please select a valid barber.");
    }

    allowedUpdates.barber_id = updates.barber_id;
  }

  if (updates.service_id !== undefined) {
    if (!updates.service_id) {
      throw new Error("Please select a valid service.");
    }

    allowedUpdates.service_id = updates.service_id;
  }

  if (updates.service !== undefined) {
    allowedUpdates.service =
      updates.service?.trim() || null;
  }

  if (updates.appointment_date !== undefined) {
    if (!updates.appointment_date) {
      throw new Error("Please select an appointment date.");
    }

    allowedUpdates.appointment_date =
      updates.appointment_date;
  }

  const suppliedStartTime =
    updates.start_time !== undefined
      ? updates.start_time
      : updates.appointment_time;

  if (suppliedStartTime !== undefined) {
    if (!suppliedStartTime) {
      throw new Error("Please select an appointment time.");
    }

    const normalizedStartTime =
      normalizeTime(suppliedStartTime);

    allowedUpdates.start_time = normalizedStartTime;
    allowedUpdates.appointment_time =
      normalizedStartTime;
  }

  if (updates.end_time !== undefined) {
    if (!updates.end_time) {
      throw new Error("An appointment end time is required.");
    }

    allowedUpdates.end_time =
      normalizeTime(updates.end_time);
  } else if (
    suppliedStartTime !== undefined &&
    updates.duration_minutes !== undefined
  ) {
    allowedUpdates.end_time = calculateEndTime(
      suppliedStartTime,
      updates.duration_minutes
    );
  }

  if (updates.status !== undefined) {
    allowedUpdates.status = updates.status;
  }

  if (updates.customer_notes !== undefined) {
    allowedUpdates.customer_notes =
      updates.customer_notes?.trim() || null;
  }

  if (updates.notes !== undefined) {
    allowedUpdates.customer_notes =
      updates.notes?.trim() || null;
  }

  if (updates.name !== undefined) {
    allowedUpdates.name = updates.name?.trim() || "";
  }

  if (updates.email !== undefined) {
    allowedUpdates.email = updates.email?.trim() || "";
  }

  if (updates.phone !== undefined) {
    allowedUpdates.phone = updates.phone?.trim() || "";
  }

  if (Object.keys(allowedUpdates).length === 0) {
    throw new Error(
      "No valid appointment changes were provided."
    );
  }

  const { data, error } = await supabase
    .from("appointments")
    .update(allowedUpdates)
    .eq("id", appointmentId)
    .eq("customer_id", user.id)
    .select("*")
    .single();

  if (error) {
    logSupabaseError("Unable to update appointment", error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Marks an appointment as cancelled.
 */
export async function cancelAppointment(appointmentId) {
  return updateAppointment(appointmentId, {
    status: "cancelled",
  });
}

/**
 * Permanently deletes an appointment owned by the authenticated customer.
 */
export async function deleteAppointment(appointmentId) {
  const user = await getAuthenticatedUser();

  if (!appointmentId) {
    throw new Error("An appointment ID is required.");
  }

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId)
    .eq("customer_id", user.id);

  if (error) {
    logSupabaseError("Unable to delete appointment", error);
    throw new Error(error.message);
  }
}

/**
 * Logs complete Supabase errors in a readable format.
 */
function logSupabaseError(label, error) {
  console.error(`${label}:`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
    status: error?.status,
  });
}
