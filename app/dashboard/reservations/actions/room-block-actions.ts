"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertActivePropertyAccess, requireActivePropertyId } from "@/lib/pms/property-context";
import { requirePermission } from "@/lib/staff/server-permissions";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export async function createRoomBlock(input: {
  propertyId: string;
  roomId: string;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<{ id: string } | { error: string }> {
  const parsed = z
    .object({
      propertyId: z.string().uuid(),
      roomId: z.string().uuid(),
      startDate: z.string().regex(dateRegex, "Invalid start date"),
      endDate: z.string().regex(dateRegex, "Invalid end date"),
      reason: z.string().min(1).max(200),
    })
    .refine((d) => d.endDate > d.startDate, { message: "End date must be after start date" })
    .safeParse(input);

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await assertActivePropertyAccess(parsed.data.propertyId);
  await requirePermission("reservations.update", parsed.data.propertyId);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("room_blocks")
    .insert({
      property_id: parsed.data.propertyId,
      room_id: parsed.data.roomId,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      reason: parsed.data.reason,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/reservations/calendar");
  return { id: data.id };
}

export async function deleteRoomBlock(
  blockId: string,
): Promise<{ success: true } | { error: string }> {
  const parsed = z.string().uuid().safeParse(blockId);
  if (!parsed.success) return { error: "Invalid block ID" };

  const activePropertyId = await requireActivePropertyId();
  await requirePermission("reservations.update", activePropertyId);

  const supabase = await createClient();

  const { error } = await supabase
    .from("room_blocks")
    .delete()
    .eq("id", parsed.data)
    .eq("property_id", activePropertyId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/reservations/calendar");
  return { success: true };
}

export async function getRoomBlocks(
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<{ id: string; roomId: string; startDate: string; endDate: string; reason: string }[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("room_blocks")
    .select("id, room_id, start_date, end_date, reason")
    .eq("property_id", propertyId)
    .lt("start_date", endDate)
    .gt("end_date", startDate);

  return (data ?? []).map((b) => ({
    id: b.id,
    roomId: b.room_id,
    startDate: b.start_date,
    endDate: b.end_date,
    reason: b.reason,
  }));
}
