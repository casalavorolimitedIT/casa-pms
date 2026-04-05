"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertActivePropertyAccess } from "@/lib/pms/property-context";

const ToggleDndSchema = z.object({
  propertyId: z.string().uuid(),
  roomId: z.string().uuid(),
  isDnd: z.coerce.boolean(),
  note: z.string().max(500).optional().or(z.literal("")),
});

export async function getDndContext(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const [roomsRes, logsRes] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, room_number, floor, status")
      .eq("property_id", propertyId)
      .order("floor", { ascending: true, nullsFirst: true })
      .order("room_number", { ascending: true }),
    supabase
      .from("room_dnd_logs")
      .select("id, room_id, is_dnd, starts_at, ends_at, note, created_at")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(400),
  ]);

  const activeByRoom = new Map<string, { id: string; starts_at: string; note: string | null }>();
  for (const row of logsRes.data ?? []) {
    if (row.is_dnd && !row.ends_at && !activeByRoom.has(row.room_id)) {
      activeByRoom.set(row.room_id, { id: row.id, starts_at: row.starts_at, note: row.note });
    }
  }

  return {
    rooms: roomsRes.data ?? [],
    logs: logsRes.data ?? [],
    activeByRoom: Object.fromEntries(activeByRoom),
  };
}

export async function toggleRoomDnd(formData: FormData) {
  const parsed = ToggleDndSchema.safeParse({
    propertyId: formData.get("propertyId"),
    roomId: formData.get("roomId"),
    isDnd: formData.get("isDnd") === "true",
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid DND input" };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (parsed.data.isDnd) {
    await supabase.from("room_dnd_logs").insert({
      property_id: parsed.data.propertyId,
      room_id: parsed.data.roomId,
      is_dnd: true,
      starts_at: new Date().toISOString(),
      note: parsed.data.note || null,
      set_by: user?.id ?? null,
    });
  } else {
    const { data: active } = await supabase
      .from("room_dnd_logs")
      .select("id")
      .eq("property_id", parsed.data.propertyId)
      .eq("room_id", parsed.data.roomId)
      .eq("is_dnd", true)
      .is("ends_at", null)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (active?.id) {
      await supabase
        .from("room_dnd_logs")
        .update({ ends_at: new Date().toISOString() })
        .eq("id", active.id);
    }
  }

  revalidatePath("/dashboard/dnd-log");
  revalidatePath("/dashboard/housekeeping");
  revalidatePath("/dashboard/room-board");
  return { success: true };
}
