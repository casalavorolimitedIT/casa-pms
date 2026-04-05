"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertActivePropertyAccess, requireActivePropertyId } from "@/lib/pms/property-context";

const CreateWakeupSchema = z.object({
  propertyId: z.string().uuid(),
  reservationId: z.string().uuid(),
  scheduledFor: z.string().min(1),
  note: z.string().max(500).optional().or(z.literal("")),
});

const UpdateWakeupSchema = z.object({
  wakeupId: z.string().uuid(),
  status: z.enum(["scheduled", "called", "missed", "cancelled"]),
});

async function ensureWakeupInActiveProperty(wakeupId: string) {
  const supabase = await createClient();
  const activePropertyId = await requireActivePropertyId();

  const { data } = await supabase
    .from("wake_up_calls")
    .select("id")
    .eq("id", wakeupId)
    .eq("property_id", activePropertyId)
    .maybeSingle();

  if (!data) {
    throw new Error("Wake-up call not found for the active property");
  }
}

export async function getWakeupContext(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const [callsRes, reservationsRes, dueSoonRes] = await Promise.all([
    supabase
      .from("wake_up_calls")
      .select("id, reservation_id, scheduled_for, status, note, completed_at, created_at, reservations(id, check_in, check_out, guests(first_name,last_name), reservation_rooms(rooms(room_number)))")
      .eq("property_id", propertyId)
      .order("scheduled_for", { ascending: true })
      .limit(300),
    supabase
      .from("reservations")
      .select("id, check_in, check_out, status, guests(first_name,last_name)")
      .eq("property_id", propertyId)
      .in("status", ["confirmed", "checked_in"])
      .order("check_in", { ascending: true })
      .limit(120),
    supabase
      .from("wake_up_calls")
      .select("id", { count: "exact", head: true })
      .eq("property_id", propertyId)
      .eq("status", "scheduled")
      .lte("scheduled_for", new Date(Date.now() + 30 * 60 * 1000).toISOString()),
  ]);

  return {
    calls: callsRes.data ?? [],
    reservations: reservationsRes.data ?? [],
    dueSoonCount: dueSoonRes.count ?? 0,
  };
}

export async function createWakeupCall(formData: FormData) {
  const parsed = CreateWakeupSchema.safeParse({
    propertyId: formData.get("propertyId"),
    reservationId: formData.get("reservationId"),
    scheduledFor: formData.get("scheduledFor"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid wake-up request" };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);

  const supabase = await createClient();

  const scheduledForIso = new Date(parsed.data.scheduledFor).toISOString();

  const { error } = await supabase.from("wake_up_calls").insert({
    property_id: parsed.data.propertyId,
    reservation_id: parsed.data.reservationId,
    scheduled_for: scheduledForIso,
    status: "scheduled",
    note: parsed.data.note || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/front-desk/wake-up-calls");
  revalidatePath("/dashboard/housekeeping");
  return { success: true };
}

export async function updateWakeupCall(formData: FormData) {
  const parsed = UpdateWakeupSchema.safeParse({
    wakeupId: formData.get("wakeupId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid wake-up update" };
  }

  await ensureWakeupInActiveProperty(parsed.data.wakeupId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const updates: Record<string, string | null> = {
    status: parsed.data.status,
  };

  if (parsed.data.status === "called") {
    updates.completed_at = new Date().toISOString();
    updates.completed_by = user?.id ?? null;
  }

  const { error } = await supabase.from("wake_up_calls").update(updates).eq("id", parsed.data.wakeupId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/front-desk/wake-up-calls");
  revalidatePath("/dashboard/housekeeping");
  return { success: true };
}
