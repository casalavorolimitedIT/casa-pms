"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertActivePropertyAccess, requireActivePropertyId } from "@/lib/pms/property-context";
import { requirePermission } from "@/lib/staff/server-permissions";

function reservationDateSchema(message: string) {
  return z
    .string()
    .min(1, message)
    .transform((value) => value.split("T")[0] ?? value)
    .pipe(z.string().date(message));
}

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const CreateReservationSchema = z
  .object({
    propertyId: z.string().uuid(),
    guestId: z.string().uuid("Select a guest"),
    roomTypeId: z.string().uuid("Select a room type"),
    roomId: z.string().uuid().optional(),
    checkIn: reservationDateSchema("Invalid check-in date"),
    checkOut: reservationDateSchema("Invalid check-out date"),
    adults: z.coerce.number().int().min(1).max(20).default(1),
    children: z.coerce.number().int().min(0).max(20).default(0),
    source: z.string().max(60).optional(),
    notes: z.string().max(2000).optional(),
    ratePlanId: z.string().uuid().optional(),
  })
  .refine((d) => d.checkOut > d.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

const UpdateReservationStatusSchema = z.object({
  reservationId: z.string().uuid(),
  status: z.enum([
    "tentative",
    "confirmed",
    "checked_in",
    "checked_out",
    "cancelled",
    "no_show",
  ]),
});

const UpdateReservationDetailsSchema = z
  .object({
    reservationId: z.string().uuid(),
    checkIn: reservationDateSchema("Invalid check-in date"),
    checkOut: reservationDateSchema("Invalid check-out date"),
    adults: z.coerce.number().int().min(1).max(20).default(1),
    children: z.coerce.number().int().min(0).max(20).default(0),
    source: z.string().max(60).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((d) => d.checkOut > d.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

const DeleteReservationSchema = z.object({
  reservationId: z.string().uuid(),
});

async function ensureReservationInActiveProperty(reservationId: string) {
  const supabase = await createClient();
  const activePropertyId = await requireActivePropertyId();

  const { data } = await supabase
    .from("reservations")
    .select("id")
    .eq("id", reservationId)
    .eq("property_id", activePropertyId)
    .maybeSingle();

  if (!data) {
    throw new Error("Reservation not found for the active property");
  }

  return activePropertyId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Overlap validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns an error string if the given room or room type already has an active
 * reservation that overlaps [checkIn, checkOut) for this property.
 *
 * Overlap condition: existing.check_in < newCheckOut AND existing.check_out > newCheckIn
 * Cancelled/no_show reservations are excluded.
 *
 * @param excludeReservationId  Pass the current reservation ID when editing so
 *                              the record being updated is not compared to itself.
 */
async function checkOverlap({
  propertyId,
  roomId,
  roomTypeId,
  checkIn,
  checkOut,
  excludeReservationId,
}: {
  propertyId: string;
  roomId?: string | null;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  excludeReservationId?: string;
}): Promise<string | null> {
  const supabase = await createClient();

  // Find any reservation_rooms whose reservation overlaps the date range,
  // is on the same property, and is not cancelled/no_show.
  let query = supabase
    .from("reservation_rooms")
    .select("id, room_id, room_type_id, reservations!inner(id, check_in, check_out, status, property_id)")
    .eq("reservations.property_id", propertyId)
    .not("reservations.status", "in", '("cancelled","no_show")')
    .lt("reservations.check_in", checkOut)   // existing starts before new ends
    .gt("reservations.check_out", checkIn);  // existing ends after new starts

  if (excludeReservationId) {
    query = query.neq("reservations.id", excludeReservationId);
  }

  const { data: overlapping } = await query;

  if (!overlapping || overlapping.length === 0) return null;

  // Check specific room conflict
  if (roomId) {
    const roomConflict = overlapping.find((r) => r.room_id === roomId);
    if (roomConflict) {
      const res = Array.isArray(roomConflict.reservations)
        ? roomConflict.reservations[0]
        : roomConflict.reservations;
      return `Room is already booked from ${new Date(res.check_in).toLocaleDateString("en-GB")} to ${new Date(res.check_out).toLocaleDateString("en-GB")}. Please choose a different room or dates.`;
    }
  }

  // Check room type conflict
  const typeConflict = overlapping.find((r) => r.room_type_id === roomTypeId);
  if (typeConflict) {
    const res = Array.isArray(typeConflict.reservations)
      ? typeConflict.reservations[0]
      : typeConflict.reservations;
    return `This room type is fully booked from ${new Date(res.check_in).toLocaleDateString("en-GB")} to ${new Date(res.check_out).toLocaleDateString("en-GB")}. Please choose different dates or a different room type.`;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create reservation
// ─────────────────────────────────────────────────────────────────────────────

export async function createReservation(formData: FormData) {
  const parsed = CreateReservationSchema.safeParse({
    propertyId: formData.get("propertyId"),
    guestId: formData.get("guestId"),
    roomTypeId: formData.get("roomTypeId"),
    roomId: formData.get("roomId") || undefined,
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    adults: formData.get("adults"),
    children: formData.get("children"),
    source: formData.get("source"),
    notes: formData.get("notes"),
    ratePlanId: formData.get("ratePlanId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);
  await requirePermission("reservations.create", parsed.data.propertyId);

  const overlapError = await checkOverlap({
    propertyId: parsed.data.propertyId,
    roomId: parsed.data.roomId,
    roomTypeId: parsed.data.roomTypeId,
    checkIn: parsed.data.checkIn,
    checkOut: parsed.data.checkOut,
  });
  if (overlapError) return { error: overlapError };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Create reservation row
  const { data: res, error: resError } = await supabase
    .from("reservations")
    .insert({
      property_id: parsed.data.propertyId,
      guest_id: parsed.data.guestId,
      status: "confirmed",
      check_in: parsed.data.checkIn,
      check_out: parsed.data.checkOut,
      adults: parsed.data.adults,
      children: parsed.data.children,
      source: parsed.data.source || null,
      notes: parsed.data.notes || null,
      rate_plan_id: parsed.data.ratePlanId || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (resError) {
    if (resError.message.toLowerCase().includes("row-level security")) {
      return {
        error:
          "Access denied for this property. Ensure your profile is linked to the property's organization (and/or you have a user_property_roles entry).",
      };
    }
    return { error: resError.message };
  }

  // Attach rooms to reservation
  const { error: roomError } = await supabase.from("reservation_rooms").insert({
    reservation_id: res.id,
    room_id: parsed.data.roomId || null,
    room_type_id: parsed.data.roomTypeId,
  });

  if (roomError) return { error: roomError.message };

  revalidatePath("/dashboard/reservations");
  return { id: res.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Walk-in reservation (creates as checked_in, assigns room immediately)
// ─────────────────────────────────────────────────────────────────────────────

const WalkInReservationSchema = z
  .object({
    propertyId: z.string().uuid(),
    guestId: z.string().uuid("Select a guest"),
    roomTypeId: z.string().uuid("Select a room type"),
    roomId: z.string().uuid("Assign a room — room is required for walk-in check-in"),
    checkIn: reservationDateSchema("Invalid check-in date"),
    checkOut: reservationDateSchema("Invalid check-out date"),
    adults: z.coerce.number().int().min(1).max(20).default(1),
    children: z.coerce.number().int().min(0).max(20).default(0),
    notes: z.string().max(2000).optional(),
    ratePlanId: z.string().uuid().optional(),
  })
  .refine((d) => d.checkOut > d.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

export async function createWalkInReservation(formData: FormData) {
  // ID must be physically verified at the desk before calling this action
  const idVerified = formData.get("idVerified") === "on" || formData.get("idVerified") === "true";
  if (!idVerified) {
    return { error: "ID must be verified at the desk before walk-in check-in." };
  }

  const parsed = WalkInReservationSchema.safeParse({
    propertyId: formData.get("propertyId"),
    guestId: formData.get("guestId"),
    roomTypeId: formData.get("roomTypeId"),
    roomId: formData.get("roomId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    adults: formData.get("adults"),
    children: formData.get("children"),
    notes: formData.get("notes"),
    ratePlanId: formData.get("ratePlanId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);
  await requirePermission("checkin.perform", parsed.data.propertyId);

  const overlapError = await checkOverlap({
    propertyId: parsed.data.propertyId,
    roomId: parsed.data.roomId,
    roomTypeId: parsed.data.roomTypeId,
    checkIn: parsed.data.checkIn,
    checkOut: parsed.data.checkOut,
  });
  if (overlapError) return { error: overlapError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Create reservation directly as checked_in
  const { data: res, error: resError } = await supabase
    .from("reservations")
    .insert({
      property_id: parsed.data.propertyId,
      guest_id: parsed.data.guestId,
      status: "checked_in",
      check_in: parsed.data.checkIn,
      check_out: parsed.data.checkOut,
      adults: parsed.data.adults,
      children: parsed.data.children,
      source: "Walk-in",
      notes: parsed.data.notes || null,
      rate_plan_id: parsed.data.ratePlanId || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (resError) {
    if (resError.message.toLowerCase().includes("row-level security")) {
      return { error: "Access denied for this property." };
    }
    return { error: resError.message };
  }

  // Attach room (required — not optional for walk-in)
  const { error: roomError } = await supabase.from("reservation_rooms").insert({
    reservation_id: res.id,
    room_id: parsed.data.roomId,
    room_type_id: parsed.data.roomTypeId,
  });
  if (roomError) return { error: roomError.message };

  // Mark room as occupied
  await supabase.from("rooms").update({ status: "occupied" }).eq("id", parsed.data.roomId);

  // Record the check-in event
  await supabase.from("check_in_records").insert({
    reservation_id: res.id,
    checked_in_at: new Date().toISOString(),
  });

  revalidatePath("/dashboard/reservations");
  revalidatePath("/dashboard/front-desk");
  return { id: res.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Update status
// ─────────────────────────────────────────────────────────────────────────────

export async function updateReservationStatus(formData: FormData) {
  const parsed = UpdateReservationStatusSchema.safeParse({
    reservationId: formData.get("reservationId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const activePropertyId = await ensureReservationInActiveProperty(parsed.data.reservationId);

  if (parsed.data.status === "cancelled") {
    await requirePermission("reservations.cancel", activePropertyId);
  } else if (parsed.data.status === "checked_in") {
    await requirePermission("checkin.perform", activePropertyId);
  } else if (parsed.data.status === "checked_out") {
    await requirePermission("checkout.perform", activePropertyId);
  } else {
    await requirePermission("reservations.update", activePropertyId);
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("reservations")
    .update({
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.reservationId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/reservations");
  revalidatePath(`/dashboard/reservations/${parsed.data.reservationId}`);
  return { success: true };
}

export async function updateReservationDetails(formData: FormData) {
  const parsed = UpdateReservationDetailsSchema.safeParse({
    reservationId: formData.get("reservationId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    adults: formData.get("adults"),
    children: formData.get("children"),
    source: formData.get("source"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const activePropertyId = await ensureReservationInActiveProperty(parsed.data.reservationId);
  await requirePermission("reservations.update", activePropertyId);

  const supabase = await createClient();

  const { error } = await supabase
    .from("reservations")
    .update({
      check_in: parsed.data.checkIn,
      check_out: parsed.data.checkOut,
      adults: parsed.data.adults,
      children: parsed.data.children,
      source: parsed.data.source || null,
      notes: parsed.data.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.reservationId)
    .eq("property_id", activePropertyId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/reservations");
  revalidatePath(`/dashboard/reservations/${parsed.data.reservationId}`);
  return { success: true };
}

export async function deleteReservation(formData: FormData) {
  const parsed = DeleteReservationSchema.safeParse({
    reservationId: formData.get("reservationId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const activePropertyId = await ensureReservationInActiveProperty(parsed.data.reservationId);
  await requirePermission("reservations.cancel", activePropertyId);

  const supabase = await createClient();

  // Check for folios linked to this reservation — these block deletion
  const { count: folioCount } = await supabase
    .from("folios")
    .select("id", { count: "exact", head: true })
    .eq("reservation_id", parsed.data.reservationId);

  if (folioCount && folioCount > 0) {
    return {
      error: `Cannot delete: ${folioCount} folio${folioCount !== 1 ? "s" : ""} linked to this reservation. Remove the folio${folioCount !== 1 ? "s" : ""} first.`,
    };
  }

  // Check for concierge requests with posted charges — these also block deletion
  const { data: postedRequests } = await supabase
    .from("concierge_requests")
    .select("id")
    .eq("reservation_id", parsed.data.reservationId)
    .not("posted_charge_id", "is", null);

  if (postedRequests && postedRequests.length > 0) {
    return {
      error: `Cannot delete: ${postedRequests.length} concierge request${postedRequests.length !== 1 ? "s" : ""} have posted folio charges.`,
    };
  }

  // Safe to delete — cascade delete in dependency order

  // Delete unposted concierge requests linked to this reservation
  const { error: crError } = await supabase
    .from("concierge_requests")
    .delete()
    .eq("reservation_id", parsed.data.reservationId);

  if (crError) return { error: crError.message };

  // Delete room assignments
  const { error: roomsError } = await supabase
    .from("reservation_rooms")
    .delete()
    .eq("reservation_id", parsed.data.reservationId);

  if (roomsError) return { error: roomsError.message };

  // Delete the reservation itself
  const { error } = await supabase
    .from("reservations")
    .delete()
    .eq("id", parsed.data.reservationId)
    .eq("property_id", activePropertyId);

  if (error) {
    return {
      error:
        error.message ||
        "Unable to delete reservation. It may be linked to other records.",
    };
  }

  revalidatePath("/dashboard/reservations");
  revalidatePath(`/dashboard/reservations/${parsed.data.reservationId}`);
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Update full reservation (all fields including guest, room, rate plan)
// ─────────────────────────────────────────────────────────────────────────────

const UpdateFullReservationSchema = z
  .object({
    reservationId: z.string().uuid(),
    guestId: z.string().uuid("Select a guest"),
    roomTypeId: z.string().uuid("Select a room type"),
    roomId: z.string().uuid().optional(),
    checkIn: reservationDateSchema("Invalid check-in date"),
    checkOut: reservationDateSchema("Invalid check-out date"),
    adults: z.coerce.number().int().min(1).max(20).default(1),
    children: z.coerce.number().int().min(0).max(20).default(0),
    source: z.string().max(60).optional(),
    notes: z.string().max(2000).optional(),
    ratePlanId: z.string().uuid().optional(),
  })
  .refine((d) => d.checkOut > d.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

export async function updateFullReservation(formData: FormData) {
  const parsed = UpdateFullReservationSchema.safeParse({
    reservationId: formData.get("reservationId"),
    guestId: formData.get("guestId"),
    roomTypeId: formData.get("roomTypeId"),
    roomId: formData.get("roomId") || undefined,
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    adults: formData.get("adults"),
    children: formData.get("children"),
    source: formData.get("source"),
    notes: formData.get("notes"),
    ratePlanId: formData.get("ratePlanId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const activePropertyId = await ensureReservationInActiveProperty(parsed.data.reservationId);
  await requirePermission("reservations.update", activePropertyId);

  const overlapError = await checkOverlap({
    propertyId: activePropertyId,
    roomId: parsed.data.roomId,
    roomTypeId: parsed.data.roomTypeId,
    checkIn: parsed.data.checkIn,
    checkOut: parsed.data.checkOut,
    excludeReservationId: parsed.data.reservationId,
  });
  if (overlapError) return { error: overlapError };

  const supabase = await createClient();

  const { error: resError } = await supabase
    .from("reservations")
    .update({
      guest_id: parsed.data.guestId,
      check_in: parsed.data.checkIn,
      check_out: parsed.data.checkOut,
      adults: parsed.data.adults,
      children: parsed.data.children,
      source: parsed.data.source || null,
      notes: parsed.data.notes || null,
      rate_plan_id: parsed.data.ratePlanId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.reservationId)
    .eq("property_id", activePropertyId);

  if (resError) return { error: resError.message };

  // Update or insert the room assignment
  const { data: existingRoom } = await supabase
    .from("reservation_rooms")
    .select("id")
    .eq("reservation_id", parsed.data.reservationId)
    .maybeSingle();

  if (existingRoom) {
    const { error: roomError } = await supabase
      .from("reservation_rooms")
      .update({
        room_type_id: parsed.data.roomTypeId,
        room_id: parsed.data.roomId || null,
      })
      .eq("id", existingRoom.id);

    if (roomError) return { error: roomError.message };
  } else {
    const { error: roomError } = await supabase.from("reservation_rooms").insert({
      reservation_id: parsed.data.reservationId,
      room_type_id: parsed.data.roomTypeId,
      room_id: parsed.data.roomId || null,
    });

    if (roomError) return { error: roomError.message };
  }

  revalidatePath("/dashboard/reservations");
  revalidatePath(`/dashboard/reservations/${parsed.data.reservationId}`);
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Form options for new/edit reservation
// ─────────────────────────────────────────────────────────────────────────────

export async function getReservationFormOptions(propertyId: string) {
  await assertActivePropertyAccess(propertyId);

  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("organization_id")
    .eq("id", propertyId)
    .maybeSingle();

  const organizationId = property?.organization_id;

  const [guestsRes, roomTypesRes, roomsRes, ratePlansRes] = await Promise.all([
    organizationId
      ? supabase
          .from("guests")
          .select("id, first_name, last_name, email")
          .eq("organization_id", organizationId)
          .order("last_name", { ascending: true })
          .limit(200)
      : Promise.resolve({ data: [] as Array<{ id: string; first_name: string; last_name: string; email: string | null }> }),
    supabase
      .from("room_types")
      .select("id, name, max_occupancy")
      .eq("property_id", propertyId)
      .order("name", { ascending: true }),
    supabase
      .from("rooms")
      .select("id, room_number, status")
      .eq("property_id", propertyId)
      .order("room_number", { ascending: true }),
    supabase
      .from("rate_plans")
      .select("id, name")
      .eq("property_id", propertyId)
      .order("name", { ascending: true }),
  ]);

  return {
    guests: guestsRes.data ?? [],
    roomTypes: roomTypesRes.data ?? [],
    rooms: roomsRes.data ?? [],
    ratePlans: ratePlansRes.data ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

export async function getReservations(
  propertyId: string,
  filters?: {
    status?: string;
    checkIn?: string;
    checkOut?: string;
  },
) {
  await assertActivePropertyAccess(propertyId);
  await requirePermission("reservations.view", propertyId);

  const supabase = await createClient();

  let query = supabase
    .from("reservations")
    .select(
      `
      id, status, check_in, check_out, adults, children, source, notes, created_at,
      guests (id, first_name, last_name, email),
      reservation_rooms (
        id, room_id, room_type_id,
        rooms (id, room_number),
        room_types (id, name)
      )
    `,
    )
    .eq("property_id", propertyId)
    .order("check_in", { ascending: true });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.checkIn) query = query.gte("check_in", filters.checkIn);
  if (filters?.checkOut) query = query.lte("check_out", filters.checkOut);

  const { data, error } = await query.limit(200);
  if (error) return { error: error.message, reservations: [] };
  return { reservations: data ?? [] };
}

export async function getReservation(id: string) {
  const activePropertyId = await ensureReservationInActiveProperty(id);
  await requirePermission("reservations.view", activePropertyId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservations")
    .select(
      `
      id, status, check_in, check_out, adults, children, source, notes, created_at, updated_at,
      guests (id, first_name, last_name, email, phone),
      reservation_rooms (
        id, room_id, room_type_id, rate_per_night_minor,
        rooms (id, room_number, floor, status),
        room_types (id, name, base_rate_minor)
      ),
      rate_plans (id, name)
    `,
    )
    .eq("id", id)
    .eq("property_id", activePropertyId)
    .single();

  if (error) return { error: error.message };
  return { reservation: data };
}
