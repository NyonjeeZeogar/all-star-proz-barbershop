import { supabase } from "../lib/supabaseClient";

function normalizeRole(role) {
  return role?.trim().toLowerCase() || "";
}

function logSupabaseError(label, error) {
  console.error(`${label}:`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
    status: error?.status,
  });
}

/**
 * Returns the authenticated user's profile and verifies
 * that the account belongs to a barber or administrator.
 */
export async function getAuthenticatedBarberProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logSupabaseError(
      "Unable to get authenticated user",
      userError
    );

    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error(
      "You must be signed in to access the barber portal."
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      phone,
      role
    `)
    .eq("id", user.id)
    .single();

  if (profileError) {
    logSupabaseError(
      "Unable to load barber profile",
      profileError
    );

    throw new Error(profileError.message);
  }

  const role = normalizeRole(
    profile?.role
  );

  if (
    role !== "barber" &&
    role !== "admin"
  ) {
    throw new Error(
      "This account does not have access to the barber portal."
    );
  }

  return {
    ...profile,
    role,
    isAdmin: role === "admin",
  };
}

/**
 * Loads appointments assigned to the signed-in barber.
 * Administrators may see every appointment.
 *
 * Appointments are returned with newer scheduled
 * appointments first.
 */
export async function getPortalAppointments() {
  const profile =
    await getAuthenticatedBarberProfile();

  let query = supabase
    .from("appointments")
    .select(`
      id,
      customer_id,
      barber_id,
      service_id,
      appointment_date,
      start_time,
      end_time,
      appointment_time,
      status,
      customer_notes,
      barber_notes,
      name,
      email,
      phone,
      created_at,

      customer:profiles!appointments_customer_id_fkey (
        id,
        full_name,
        email,
        phone
      ),

      barber:profiles!appointments_barber_id_fkey (
        id,
        full_name,
        email,
        phone,
        role
      ),

      service:services!appointments_service_id_fkey (
        id,
        name,
        description,
        price,
        duration_minutes,
        active
      )
    `)
    .order("appointment_date", {
      ascending: false,
    })
    .order("start_time", {
      ascending: false,
    });

  if (!profile.isAdmin) {
    query = query.eq(
      "barber_id",
      profile.id
    );
  }

  const { data, error } =
    await query;

  if (error) {
    logSupabaseError(
      "Unable to load barber appointments",
      error
    );

    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Updates fields that a barber is allowed to manage.
 */
export async function updatePortalAppointment(
  appointmentId,
  updates
) {
  if (!appointmentId) {
    throw new Error(
      "An appointment ID is required."
    );
  }

  const profile =
    await getAuthenticatedBarberProfile();

  const allowedUpdates = {};

  if (updates.status !== undefined) {
    const status = String(
      updates.status
    )
      .trim()
      .toLowerCase();

    const allowedStatuses = [
      "pending",
      "confirmed",
      "completed",
      "cancelled",
      "no_show",
    ];

    if (
      !allowedStatuses.includes(status)
    ) {
      throw new Error(
        "Invalid appointment status."
      );
    }

    allowedUpdates.status = status;
  }

  if (
    updates.barber_notes !== undefined
  ) {
    allowedUpdates.barber_notes =
      updates.barber_notes?.trim() ||
      null;
  }

  if (
    Object.keys(allowedUpdates)
      .length === 0
  ) {
    throw new Error(
      "No valid appointment changes were provided."
    );
  }

  let query = supabase
    .from("appointments")
    .update(allowedUpdates)
    .eq("id", appointmentId);

  if (!profile.isAdmin) {
    query = query.eq(
      "barber_id",
      profile.id
    );
  }

  const { data, error } =
    await query
      .select(`
        id,
        customer_id,
        barber_id,
        service_id,
        appointment_date,
        start_time,
        end_time,
        appointment_time,
        status,
        customer_notes,
        barber_notes,
        name,
        email,
        phone,
        created_at,

        customer:profiles!appointments_customer_id_fkey (
          id,
          full_name,
          email,
          phone
        ),

        barber:profiles!appointments_barber_id_fkey (
          id,
          full_name,
          email,
          phone,
          role
        ),

        service:services!appointments_service_id_fkey (
          id,
          name,
          description,
          price,
          duration_minutes,
          active
        )
      `)
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

export function confirmPortalAppointment(
  id
) {
  return updatePortalAppointment(id, {
    status: "confirmed",
  });
}

export function completePortalAppointment(
  id
) {
  return updatePortalAppointment(id, {
    status: "completed",
  });
}

export function cancelPortalAppointment(
  id
) {
  return updatePortalAppointment(id, {
    status: "cancelled",
  });
}

export function savePortalAppointmentNote(
  id,
  note
) {
  return updatePortalAppointment(id, {
    barber_notes: note,
  });
}

/**
 * Loads shop-wide services and this barber's selections.
 */
export async function getBarberServices() {
  const profile =
    await getAuthenticatedBarberProfile();

  const { data, error } =
    await supabase
      .from("barber_services")
      .select(`
        id,
        barber_id,
        service_id,
        custom_price,
        custom_duration_minutes,
        active,
        created_at,

        service:services!barber_services_service_id_fkey (
          id,
          name,
          description,
          price,
          duration_minutes,
          active
        )
      `)
      .eq(
        "barber_id",
        profile.id
      )
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    logSupabaseError(
      "Unable to load barber services",
      error
    );

    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Loads services that may be assigned to a barber.
 */
export async function getAvailableShopServices() {
  await getAuthenticatedBarberProfile();

  const { data, error } =
    await supabase
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
      .order("name", {
        ascending: true,
      });

  if (error) {
    logSupabaseError(
      "Unable to load shop services",
      error
    );

    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Adds or updates a service selection
 * for the signed-in barber.
 */
export async function saveBarberService({
  serviceId,
  customPrice,
  customDurationMinutes,
  active = true,
}) {
  const profile =
    await getAuthenticatedBarberProfile();

  if (!serviceId) {
    throw new Error(
      "Please select a service."
    );
  }

  const payload = {
    barber_id: profile.id,
    service_id: serviceId,

    custom_price:
      customPrice === "" ||
      customPrice === null ||
      customPrice === undefined
        ? null
        : Number(customPrice),

    custom_duration_minutes:
      customDurationMinutes === "" ||
      customDurationMinutes === null ||
      customDurationMinutes ===
        undefined
        ? null
        : Number(
            customDurationMinutes
          ),

    active: Boolean(active),

    updated_at:
      new Date().toISOString(),
  };

  if (
    payload.custom_price !== null &&
    (!Number.isFinite(
      payload.custom_price
    ) ||
      payload.custom_price < 0)
  ) {
    throw new Error(
      "Custom price must be zero or greater."
    );
  }

  if (
    payload.custom_duration_minutes !==
      null &&
    (!Number.isInteger(
      payload.custom_duration_minutes
    ) ||
      payload.custom_duration_minutes <=
        0)
  ) {
    throw new Error(
      "Custom duration must be a positive whole number."
    );
  }

  const { data, error } =
    await supabase
      .from("barber_services")
      .upsert(payload, {
        onConflict:
          "barber_id,service_id",
      })
      .select(`
        id,
        barber_id,
        service_id,
        custom_price,
        custom_duration_minutes,
        active,

        service:services!barber_services_service_id_fkey (
          id,
          name,
          description,
          price,
          duration_minutes,
          active
        )
      `)
      .single();

  if (error) {
    logSupabaseError(
      "Unable to save barber service",
      error
    );

    throw new Error(error.message);
  }

  return data;
}

export async function toggleBarberService(
  barberServiceId,
  active
) {
  const profile =
    await getAuthenticatedBarberProfile();

  const { data, error } =
    await supabase
      .from("barber_services")
      .update({
        active: Boolean(active),
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        barberServiceId
      )
      .eq(
        "barber_id",
        profile.id
      )
      .select("*")
      .single();

  if (error) {
    logSupabaseError(
      "Unable to update barber service",
      error
    );

    throw new Error(error.message);
  }

  return data;
}

export async function deleteBarberService(
  barberServiceId
) {
  const profile =
    await getAuthenticatedBarberProfile();

  const { error } =
    await supabase
      .from("barber_services")
      .delete()
      .eq(
        "id",
        barberServiceId
      )
      .eq(
        "barber_id",
        profile.id
      );

  if (error) {
    logSupabaseError(
      "Unable to remove barber service",
      error
    );

    throw new Error(error.message);
  }
}

/**
 * Loads recurring weekly availability.
 */
export async function getBarberAvailability() {
  const profile =
    await getAuthenticatedBarberProfile();

  const { data, error } =
    await supabase
      .from("barber_availability")
      .select(`
        id,
        barber_id,
        day_of_week,
        start_time,
        end_time,
        available,
        location_name
      `)
      .eq(
        "barber_id",
        profile.id
      )
      .order("day_of_week", {
        ascending: true,
      });

  if (error) {
    logSupabaseError(
      "Unable to load availability",
      error
    );

    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Saves one recurring availability
 * row for each weekday.
 */
export async function saveBarberAvailability(
  schedule
) {
  const profile =
    await getAuthenticatedBarberProfile();

  if (!Array.isArray(schedule)) {
    throw new Error(
      "Availability must be provided as an array."
    );
  }

  const rows = schedule.map(
    (day) => ({
      barber_id: profile.id,

      day_of_week: Number(
        day.day_of_week
      ),

      start_time: day.available
        ? day.start_time
        : null,

      end_time: day.available
        ? day.end_time
        : null,

      available: Boolean(
        day.available
      ),

      location_name:
        day.location_name?.trim() ||
        null,

      updated_at:
        new Date().toISOString(),
    })
  );

  for (const row of rows) {
    if (
      !Number.isInteger(
        row.day_of_week
      ) ||
      row.day_of_week < 0 ||
      row.day_of_week > 6
    ) {
      throw new Error(
        "Each availability row needs a valid day."
      );
    }

    if (
      row.available &&
      (!row.start_time ||
        !row.end_time)
    ) {
      throw new Error(
        "Available days require start and end times."
      );
    }
  }

  const { data, error } =
    await supabase
      .from("barber_availability")
      .upsert(rows, {
        onConflict:
          "barber_id,day_of_week",
      })
      .select("*")
      .order("day_of_week", {
        ascending: true,
      });

  if (error) {
    logSupabaseError(
      "Unable to save availability",
      error
    );

    throw new Error(error.message);
  }

  return data ?? [];
}
