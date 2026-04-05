"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertActivePropertyAccess, requireActivePropertyId } from "@/lib/pms/property-context";

const AssignmentSchema = z.object({
  propertyId: z.string().uuid(),
  roomId: z.string().uuid(),
  attendantUserId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["pending", "in_progress", "completed"]),
});

const StatusSchema = z.object({
  roomId: z.string().uuid(),
  status: z.enum(["vacant", "occupied", "dirty", "inspection", "maintenance", "out_of_order"]),
  note: z.string().max(500).optional(),
});

type AssignmentRow = {
  id: string;
  room_id: string;
  attendant_user_id: string | null;
  status: "pending" | "in_progress" | "completed";
  created_at: string;
};

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
}

export async function getHousekeepingBoardContext(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("organization_id")
    .eq("id", propertyId)
    .maybeSingle();

  const organizationId = property?.organization_id ?? "";

  const [roomsRes, assignmentsRes, staffRes, arrivalsRes, dndRes, wakeupsRes] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, room_number, floor, status, room_types(name)")
      .eq("property_id", propertyId)
      .order("floor", { ascending: true, nullsFirst: true })
      .order("room_number", { ascending: true }),
    supabase
      .from("housekeeping_assignments")
      .select("id, room_id, attendant_user_id, status, created_at")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(300),
    organizationId
      ? supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("organization_id", organizationId)
          .order("full_name", { ascending: true })
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string }> }),
    supabase
      .from("reservations")
      .select("id, check_in, status, reservation_rooms(room_id)")
      .eq("property_id", propertyId)
      .eq("check_in", new Date().toISOString().slice(0, 10))
      .in("status", ["confirmed", "tentative"]),
    supabase
      .from("room_dnd_logs")
      .select("id, room_id, starts_at")
      .eq("property_id", propertyId)
      .eq("is_dnd", true)
      .is("ends_at", null),
    supabase
      .from("wake_up_calls")
      .select("id, scheduled_for, status")
      .eq("property_id", propertyId)
      .eq("status", "scheduled")
      .lte("scheduled_for", new Date(Date.now() + 30 * 60 * 1000).toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(50),
  ]);

  const latestAssignmentsByRoom = new Map<string, AssignmentRow>();
  for (const row of (assignmentsRes.data ?? []) as AssignmentRow[]) {
    if (!latestAssignmentsByRoom.has(row.room_id)) {
      latestAssignmentsByRoom.set(row.room_id, row);
    }
  }

  const arrivalRoomIds = new Set<string>();
  for (const reservation of arrivalsRes.data ?? []) {
    const rrRaw = reservation.reservation_rooms as Array<{ room_id?: string | null }> | { room_id?: string | null } | null;
    const rrList = Array.isArray(rrRaw) ? rrRaw : rrRaw ? [rrRaw] : [];
    for (const rr of rrList) {
      if (rr?.room_id) arrivalRoomIds.add(rr.room_id);
    }
  }

  return {
    rooms: roomsRes.data ?? [],
    staff: staffRes.data ?? [],
    latestAssignmentsByRoom: Object.fromEntries(latestAssignmentsByRoom),
    arrivalRoomIds: Array.from(arrivalRoomIds),
    activeDndRoomIds: (dndRes.data ?? []).map((row) => row.room_id),
    dueWakeups: wakeupsRes.data ?? [],
  };
}

export async function upsertHousekeepingAssignment(formData: FormData) {
  const parsed = AssignmentSchema.safeParse({
    propertyId: formData.get("propertyId"),
    roomId: formData.get("roomId"),
    attendantUserId: formData.get("attendantUserId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid assignment input" };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);

  const supabase = await createClient();

  const { data: latest } = await supabase
    .from("housekeeping_assignments")
    .select("id")
    .eq("property_id", parsed.data.propertyId)
    .eq("room_id", parsed.data.roomId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    property_id: parsed.data.propertyId,
    room_id: parsed.data.roomId,
    attendant_user_id: parsed.data.attendantUserId || null,
    status: parsed.data.status,
  };

  const { error } = latest?.id
    ? await supabase.from("housekeeping_assignments").update(payload).eq("id", latest.id)
    : await supabase.from("housekeeping_assignments").insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/housekeeping");
  return { success: true };
}

export async function updateHousekeepingRoomStatus(formData: FormData) {
  const parsed = StatusSchema.safeParse({
    roomId: formData.get("roomId"),
    status: formData.get("status"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid status input" };
  }

  await ensureRoomInActiveProperty(parsed.data.roomId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: roomError } = await supabase
    .from("rooms")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.roomId);

  if (roomError) return { error: roomError.message };

  await supabase.from("room_status_log").insert({
    room_id: parsed.data.roomId,
    status: parsed.data.status,
    note: parsed.data.note ?? null,
    changed_by: user?.id ?? null,
  });

  revalidatePath("/dashboard/rooms");
  revalidatePath(`/dashboard/rooms/${parsed.data.roomId}`);
  revalidatePath("/dashboard/housekeeping");
  return { success: true };
}