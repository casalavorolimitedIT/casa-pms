"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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

// ─────────────────────────────────────────────────────────────────────────────
// Create reservation
// ─────────────────────────────────────────────────────────────────────────────

export async function createReservation(formData: FormData) {
  const supabase = await createClient();

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
// Update status
// ─────────────────────────────────────────────────────────────────────────────

export async function updateReservationStatus(formData: FormData) {
  const supabase = await createClient();

  const parsed = UpdateReservationStatusSchema.safeParse({
    reservationId: formData.get("reservationId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

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
  const supabase = await createClient();

  let query = supabase
    .from("reservations")
    .select(
      `
      id, status, check_in, check_out, adults, children, source, created_at,
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
    .single();

  if (error) return { error: error.message };
  return { reservation: data };
}
