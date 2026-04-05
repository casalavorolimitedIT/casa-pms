"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertActivePropertyAccess, requireActivePropertyId } from "@/lib/pms/property-context";

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const RoomTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  description: z.string().max(500).optional(),
  baseRateMinor: z.coerce
    .number()
    .int()
    .min(0, "Rate must be 0 or more"),
  maxOccupancy: z.coerce.number().int().min(1).max(20).default(2),
  propertyId: z.string().uuid(),
});

const RoomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required").max(20),
  floor: z.coerce.number().int().min(0).max(200).optional(),
  roomTypeId: z.string().uuid(),
  propertyId: z.string().uuid(),
});

const RoomStatusSchema = z.object({
  roomId: z.string().uuid(),
  status: z.enum([
    "vacant",
    "occupied",
    "dirty",
    "inspection",
    "maintenance",
    "out_of_order",
  ]),
  note: z.string().max(500).optional(),
});

async function ensureRoomInActiveProperty(roomId: string) {
  const supabase = await createClient();
  const activePropertyId = await requireActivePropertyId();

  const { data } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", roomId)
    .eq("property_id", activePropertyId)
    .maybeSingle();

  if (!data) {
    throw new Error("Room not found for the active property");
  }

  return activePropertyId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Room Types
// ─────────────────────────────────────────────────────────────────────────────

export async function createRoomType(formData: FormData) {
  const supabase = await createClient();

  const parsed = RoomTypeSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    baseRateMinor: formData.get("baseRateMinor"),
    maxOccupancy: formData.get("maxOccupancy"),
    propertyId: formData.get("propertyId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);

  const { data, error } = await supabase
    .from("room_types")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      base_rate_minor: parsed.data.baseRateMinor,
      max_occupancy: parsed.data.maxOccupancy,
      property_id: parsed.data.propertyId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/rooms/types");
  return { id: data.id };
}

export async function updateRoomType(id: string, formData: FormData) {
  const supabase = await createClient();

  const parsed = RoomTypeSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    baseRateMinor: formData.get("baseRateMinor"),
    maxOccupancy: formData.get("maxOccupancy"),
    propertyId: formData.get("propertyId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);

  const { error } = await supabase
    .from("room_types")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      base_rate_minor: parsed.data.baseRateMinor,
      max_occupancy: parsed.data.maxOccupancy,
    })
    .eq("id", id)
    .eq("property_id", parsed.data.propertyId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/rooms/types");
  revalidatePath(`/dashboard/rooms/types/${id}/edit`);
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rooms
// ─────────────────────────────────────────────────────────────────────────────

export async function createRoom(formData: FormData) {
  const supabase = await createClient();

  const parsed = RoomSchema.safeParse({
    roomNumber: formData.get("roomNumber"),
    floor: formData.get("floor"),
    roomTypeId: formData.get("roomTypeId"),
    propertyId: formData.get("propertyId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);

  const { data, error } = await supabase
    .from("rooms")
    .insert({
      room_number: parsed.data.roomNumber,
      floor: parsed.data.floor ?? null,
      room_type_id: parsed.data.roomTypeId,
      property_id: parsed.data.propertyId,
      status: "vacant",
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.toLowerCase().includes("row-level security")) {
      return {
        error:
          "Access denied for this property. Ensure your profile is linked to the property's organization (and/or you have a user_property_roles entry).",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/rooms");
  return { id: data.id };
}

export async function updateRoomStatus(formData: FormData) {
  const supabase = await createClient();

  const parsed = RoomStatusSchema.safeParse({
    roomId: formData.get("roomId"),
    status: formData.get("status"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  await ensureRoomInActiveProperty(parsed.data.roomId);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Update room status
  const { error: roomError } = await supabase
    .from("rooms")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.roomId);

  if (roomError) return { error: roomError.message };

  // Log status change
  await supabase.from("room_status_log").insert({
    room_id: parsed.data.roomId,
    status: parsed.data.status,
    note: parsed.data.note ?? null,
    changed_by: user?.id ?? null,
  });

  revalidatePath("/dashboard/rooms");
  revalidatePath(`/dashboard/rooms/${parsed.data.roomId}`);
  return { success: true };
}

export async function getRooms(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rooms")
    .select(
      `
      id, room_number, floor, status, created_at,
      room_types (id, name, base_rate_minor, max_occupancy)
    `,
    )
    .eq("property_id", propertyId)
    .order("floor", { ascending: true, nullsFirst: true })
    .order("room_number", { ascending: true });

  if (error) return { error: error.message, rooms: [] };
  return { rooms: data ?? [] };
}

export async function getRoomTypes(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("room_types")
    .select("id, name, description, base_rate_minor, max_occupancy, created_at")
    .eq("property_id", propertyId)
    .order("name", { ascending: true });

  if (error) return { error: error.message, roomTypes: [] };
  return { roomTypes: data ?? [] };
}
