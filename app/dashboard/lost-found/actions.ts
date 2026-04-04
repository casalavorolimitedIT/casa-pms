"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const CreateItemSchema = z.object({
  propertyId: z.string().uuid(),
  roomId: z.string().uuid().optional().or(z.literal("")),
  reservationId: z.string().uuid().optional().or(z.literal("")),
  itemName: z.string().min(2).max(140),
  description: z.string().max(2000).optional().or(z.literal("")),
});

const UpdateItemSchema = z.object({
  itemId: z.string().uuid(),
  status: z.enum(["logged", "in_storage", "claimed", "discarded"]),
  claimedByName: z.string().max(120).optional().or(z.literal("")),
  claimedContact: z.string().max(120).optional().or(z.literal("")),
  notes: z.string().max(1500).optional().or(z.literal("")),
});

export async function getLostFoundContext(propertyId: string) {
  const supabase = await createClient();

  const [itemsRes, roomsRes, reservationsRes] = await Promise.all([
    supabase
      .from("lost_found_items")
      .select("id, room_id, reservation_id, item_name, description, status, found_at, claimed_by_name, claimed_contact, claimed_at, notes, rooms(room_number), reservations(id, check_in, guests(first_name,last_name))")
      .eq("property_id", propertyId)
      .order("found_at", { ascending: false })
      .limit(300),
    supabase
      .from("rooms")
      .select("id, room_number")
      .eq("property_id", propertyId)
      .order("room_number", { ascending: true }),
    supabase
      .from("reservations")
      .select("id, check_in, status, guests(first_name,last_name)")
      .eq("property_id", propertyId)
      .in("status", ["tentative", "confirmed", "checked_in", "checked_out"])
      .order("check_in", { ascending: false })
      .limit(80),
  ]);

  return {
    items: itemsRes.data ?? [],
    rooms: roomsRes.data ?? [],
    reservations: reservationsRes.data ?? [],
  };
}

export async function createLostFoundItem(formData: FormData) {
  const parsed = CreateItemSchema.safeParse({
    propertyId: formData.get("propertyId"),
    roomId: formData.get("roomId"),
    reservationId: formData.get("reservationId"),
    itemName: formData.get("itemName"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid lost-and-found input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("lost_found_items").insert({
    property_id: parsed.data.propertyId,
    room_id: parsed.data.roomId || null,
    reservation_id: parsed.data.reservationId || null,
    item_name: parsed.data.itemName,
    description: parsed.data.description || null,
    status: "logged",
    created_by: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/lost-found");
  return { success: true };
}

export async function updateLostFoundItem(formData: FormData) {
  const parsed = UpdateItemSchema.safeParse({
    itemId: formData.get("itemId"),
    status: formData.get("status"),
    claimedByName: formData.get("claimedByName"),
    claimedContact: formData.get("claimedContact"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid update input" };
  }

  const updates: Record<string, string | null> = {
    status: parsed.data.status,
    claimed_by_name: parsed.data.claimedByName || null,
    claimed_contact: parsed.data.claimedContact || null,
    notes: parsed.data.notes || null,
  };

  if (parsed.data.status === "claimed") {
    updates.claimed_at = new Date().toISOString();
  }

  const supabase = await createClient();
  const { error } = await supabase.from("lost_found_items").update(updates).eq("id", parsed.data.itemId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/lost-found");
  return { success: true };
}
