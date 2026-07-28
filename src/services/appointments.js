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

    service_subtotal_cents:
      appointment.service_subtotal_cents ?? Math.round(servicePrice * 100),

    taxable_subtotal_cents:
      appointment.taxable_subtotal_cents ?? Math.round(servicePrice * 100),

    tax_rate:
      appointment.tax_rate ?? 0,

    tax_cents:
      appointment.tax_cents ?? 0,

    booking_fee_cents:
      appointment.booking_fee_cents ?? 0,

    tip_cents:
      appointment.tip_cents ?? 0,

    deposit_cents:
      appointment.deposit_cents ?? Math.round(depositAmount * 100),

    charged_today_cents:
      appointment.charged_today_cents ?? Math.round(amountDueNow * 100),

    remaining_balance_cents:
      appointment.remaining_balance_cents ?? Math.round(remainingBalance * 100),

    pricing_snapshot:
      appointment.pricing_snapshot ?? null,

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
          taxable,
          is_add_on,
          active
        ),
        appointment_services (
          id,
          service_id,
          service_name,
          unit_price_cents,
          quantity,
          line_total_cents
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
 * Loads one appointment owned by the authenticated customer.
 */
export async function getAppointmentById(appointmentId) {
  const user = await getAuthenticatedUser();

  if (!appointmentId) {
    throw new Error("An appointment ID is required.");
  }

  const { data, error } = await supabase
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
        taxable,
        is_add_on,
        active
      ),
      appointment_services (
        id,
        service_id,
        service_name,
        unit_price_cents,
        quantity,
        line_total_cents
      ),
      barber:profiles!appointments_barber_id_fkey (
        id,
        full_name,
        email,
        phone,
        role
      )
    `)
    .eq("id", appointmentId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (error) {
    logSupabaseError(
      "Unable to load appointment",
      error
    );

    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "This appointment could not be found or you do not have permission to view it."
    );
  }

  return data;
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
        taxable,
        category_id,
        is_add_on,
        display_order,
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
export async function getBarberServices(barberId) {
  if (!barberId) return [];

  const [catalogResult, barberResult] = await Promise.all([
    supabase
      .from("services")
      .select(`
        id,
        name,
        description,
        price,
        deposit,
        duration_minutes,
        taxable,
        category_id,
        is_add_on,
        display_order,
        active
      `)
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),

    supabase
      .from("barber_services")
      .select(`
        id,
        barber_id,
        service_id,
        custom_price,
        custom_deposit,
        custom_duration_minutes,
        active
      `)
      .eq("barber_id", barberId),
  ]);

  if (catalogResult.error) {
    logSupabaseError("Unable to load the service catalog", catalogResult.error);
    throw new Error(catalogResult.error.message);
  }

  if (barberResult.error) {
    logSupabaseError(
      "Unable to load barber service overrides",
      barberResult.error
    );
    throw new Error(barberResult.error.message);
  }

  const overrides = new Map(
    (barberResult.data ?? []).map((row) => [row.service_id, row])
  );

  return (catalogResult.data ?? [])
    .filter((service) => overrides.get(service.id)?.active !== false)
    .map((service) => {
      const override = overrides.get(service.id);

      return {
        barber_service_id: override?.id ?? null,
        barber_id: barberId,
        id: service.id,
        service_id: service.id,
        name: service.name || "Service",
        description: service.description || "",
        price: override?.custom_price ?? service.price ?? 0,
        deposit: override?.custom_deposit ?? service.deposit ?? 0,
        duration_minutes:
          override?.custom_duration_minutes ?? service.duration_minutes ?? 30,
        taxable: service.taxable !== false,
        category_id: service.category_id ?? null,
        is_add_on: service.is_add_on === true,
        display_order: service.display_order ?? 0,
        active: true,
      };
    })
    .sort((a, b) => {
      const order = Number(a.display_order || 0) - Number(b.display_order || 0);
      return order || a.name.localeCompare(b.name);
    });
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
 * Returns dates that still have at least one valid appointment slot.
 *
 * Requires the public.get_available_appointment_dates RPC from the
 * accompanying Supabase migration.
 */
export async function getAvailableAppointmentDates({
  barberId,
  serviceId,
  startDate,
  days = 60,
}) {
  if (!barberId || !serviceId || !startDate) {
    return [];
  }

  const { data, error } = await supabase.rpc(
    "get_available_appointment_dates",
    {
      p_barber_id: barberId,
      p_service_id: serviceId,
      p_start_date: startDate,
      p_days: days,
    }
  );

  if (error) {
    logSupabaseError(
      "Unable to load available appointment dates",
      error
    );
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    typeof row === "string"
      ? row
      : row.appointment_date
  );
}

/**
 * Returns only currently bookable times for a barber, service, and date.
 *
 * The database function removes:
 * - times outside weekly working hours
 * - times overlapping appointments
 * - times overlapping barber_time_blocks
 * - past times
 * - times where the service would finish after closing
 */
export async function getAvailableAppointmentSlots({
  barberId,
  serviceId,
  appointmentDate,
  totalDurationMinutes,
}) {
  if (!barberId || !serviceId || !appointmentDate) {
    return [];
  }

  const duration = Math.max(
    1,
    Number.parseInt(totalDurationMinutes, 10) || 1
  );

  const { data, error } = await supabase.rpc(
    "get_available_appointment_slots_for_duration",
    {
      p_barber_id: barberId,
      p_service_id: serviceId,
      p_appointment_date: appointmentDate,
      p_total_duration_minutes: duration,
    }
  );

  if (error) {
    logSupabaseError(
      "Unable to load available appointment slots",
      error
    );
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    if (typeof row === "string") {
      return row;
    }

    return (
      row.slot_time ||
      row.start_time ||
      row.available_time
    );
  }).filter(Boolean);
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


/**
 * Returns a server-calculated quote for one or more services.
 * The browser never decides the authoritative tax, fee, or deposit.
 */
export async function getPricingQuote({
  serviceIds,
  quantities,
  tipCents = 0,
  paymentOption = "deposit",
}) {
  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    throw new Error("Select at least one service.");
  }

  const normalizedQuantities = Array.isArray(quantities)
    ? quantities.map((value) => Math.max(1, Number.parseInt(value, 10) || 1))
    : serviceIds.map(() => 1);

  const { data, error } = await supabase.rpc("quote_selected_services", {
    p_service_ids: serviceIds,
    p_quantities: normalizedQuantities,
    p_tip_cents: Math.max(0, Number.parseInt(tipCents, 10) || 0),
    p_payment_option: paymentOption,
  });

  if (error) {
    logSupabaseError("Unable to calculate pricing", error);
    throw new Error(error.message);
  }

  return Array.isArray(data) ? data[0] : data;
}

/**
 * Inserts immutable service snapshots after an appointment is created.
 * Prices are loaded from the database instead of accepted from the browser.
 */
export async function addAppointmentServices(appointmentId, selectedServices) {
  if (!appointmentId) {
    throw new Error("An appointment ID is required.");
  }

  if (!Array.isArray(selectedServices) || selectedServices.length === 0) {
    throw new Error("At least one service is required.");
  }

  const serviceIds = selectedServices.map((item) => item.service_id || item.id);
  const { data: catalog, error: catalogError } = await supabase
    .from("services")
    .select("id,name,price,active")
    .in("id", serviceIds)
    .eq("active", true);

  if (catalogError) {
    logSupabaseError("Unable to load selected services", catalogError);
    throw new Error(catalogError.message);
  }

  const byId = new Map((catalog ?? []).map((service) => [service.id, service]));
  const rows = selectedServices.map((item) => {
    const serviceId = item.service_id || item.id;
    const service = byId.get(serviceId);

    if (!service) {
      throw new Error("One of the selected services is unavailable.");
    }

    return {
      appointment_id: appointmentId,
      service_id: service.id,
      service_name: service.name,
      unit_price_cents: Math.round(Number(service.price) * 100),
      quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1),
    };
  });

  const { data, error } = await supabase
    .from("appointment_services")
    .insert(rows)
    .select("*");

  if (error) {
    logSupabaseError("Unable to save appointment services", error);
    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Creates an appointment and then stores all selected service snapshots.
 * Pass the server quote returned by getPricingQuote.
 */
export async function createAppointmentWithServices(
  appointment,
  selectedServices,
  quote
) {
  const primary = selectedServices?.[0];

  if (!primary) {
    throw new Error("Select at least one service.");
  }

  if (!quote) {
    throw new Error("A server pricing quote is required.");
  }

  let created = null;

  try {
    created = await createAppointment({
      ...appointment,
      service_id: primary.service_id || primary.id,
      service: primary.name,
      service_price: Number(quote.service_subtotal_cents) / 100,
      deposit_amount: Number(quote.deposit_cents) / 100,
      amount_due_now: Number(quote.charged_today_cents) / 100,
      remaining_balance: Number(quote.remaining_balance_cents) / 100,
      service_subtotal_cents: Number(quote.service_subtotal_cents),
      taxable_subtotal_cents: Number(quote.taxable_subtotal_cents),
      tax_rate: Number(quote.tax_rate),
      tax_cents: Number(quote.tax_cents),
      booking_fee_cents: Number(quote.booking_fee_cents),
      tip_cents: Number(quote.tip_cents),
      deposit_cents: Number(quote.deposit_cents),
      charged_today_cents: Number(quote.charged_today_cents),
      remaining_balance_cents: Number(quote.remaining_balance_cents),
      pricing_snapshot: quote,
    });

    await addAppointmentServices(created.id, selectedServices);
    return await getAppointmentById(created.id);
  } catch (error) {
    if (created?.id) {
      const { error: cleanupError } = await supabase
        .from("appointments")
        .delete()
        .eq("id", created.id);

      if (cleanupError) {
        logSupabaseError(
          "Unable to remove incomplete appointment",
          cleanupError
        );
      }
    }

    throw error;
  }
}
