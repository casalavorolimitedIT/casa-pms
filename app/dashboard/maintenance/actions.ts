"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertActivePropertyAccess, requireActivePropertyId } from "@/lib/pms/property-context";

const CreateScheduleSchema = z.object({
  propertyId: z.string().uuid(),
  roomId: z.string().uuid().optional().or(z.literal("")),
  assetId: z.string().uuid().optional().or(z.literal("")),
  title: z.string().min(3).max(180),
  recurrence: z.enum(["daily", "weekly", "monthly", "quarterly"]),
  everyInterval: z.coerce.number().int().min(1).max(30).default(1),
  startsOn: z.string().min(4),
});

const CompleteInstanceSchema = z.object({
  instanceId: z.string().uuid(),
  note: z.string().max(1000).optional().or(z.literal("")),
});

const GenerateInstancesSchema = z.object({
  scheduleId: z.string().uuid(),
  horizonDays: z.coerce.number().int().min(7).max(365).default(90),
});

function addByRecurrence(base: Date, recurrence: "daily" | "weekly" | "monthly" | "quarterly", everyInterval: number) {
  const next = new Date(base);
  if (recurrence === "daily") next.setDate(next.getDate() + everyInterval);
  if (recurrence === "weekly") next.setDate(next.getDate() + everyInterval * 7);
  if (recurrence === "monthly") next.setMonth(next.getMonth() + everyInterval);
  if (recurrence === "quarterly") next.setMonth(next.getMonth() + everyInterval * 3);
  return next;
}

function toDateOnlyISO(d: Date) {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function ensureScheduleInActiveProperty(scheduleId: string) {
  const supabase = await createClient();
  const activePropertyId = await requireActivePropertyId();

  const { data } = await supabase
    .from("maintenance_schedules")
    .select("id")
    .eq("id", scheduleId)
    .eq("property_id", activePropertyId)
    .maybeSingle();

  if (!data) throw new Error("Schedule not found for active property");
  return activePropertyId;
}

export async function createRecurringInstances(formData: FormData) {
  const parsed = GenerateInstancesSchema.safeParse({
    scheduleId: formData.get("scheduleId"),
    horizonDays: formData.get("horizonDays") ?? 90,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid recurrence generation input" };
  }

  const activePropertyId = await ensureScheduleInActiveProperty(parsed.data.scheduleId);
  const supabase = await createClient();

  const { data: schedule } = await supabase
    .from("maintenance_schedules")
    .select("id, recurrence, every_interval, starts_on")
    .eq("id", parsed.data.scheduleId)
    .eq("property_id", activePropertyId)
    .maybeSingle();

  if (!schedule) return { error: "Schedule not found" };

  const { data: latest } = await supabase
    .from("maintenance_schedule_instances")
    .select("due_on")
    .eq("schedule_id", schedule.id)
    .order("due_on", { ascending: false })
    .limit(1)
    .maybeSingle();

  const startFrom = latest?.due_on ? new Date(latest.due_on) : new Date(schedule.starts_on);
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + parsed.data.horizonDays);

  const rows: Array<{ schedule_id: string; property_id: string; due_on: string; status: "due" }> = [];
  let cursor = new Date(startFrom);

  // If there are no existing instances, include the start date first.
  if (!latest?.due_on) {
    rows.push({
      schedule_id: schedule.id,
      property_id: activePropertyId,
      due_on: toDateOnlyISO(cursor),
      status: "due",
    });
  }

  for (let i = 0; i < 512; i += 1) {
    cursor = addByRecurrence(cursor, schedule.recurrence, schedule.every_interval);
    if (cursor > horizon) break;
    rows.push({
      schedule_id: schedule.id,
      property_id: activePropertyId,
      due_on: toDateOnlyISO(cursor),
      status: "due",
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from("maintenance_schedule_instances")
      .upsert(rows, { onConflict: "schedule_id,due_on", ignoreDuplicates: true });
    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard/maintenance");
  return { success: true, generated: rows.length };
}

export async function createSchedule(formData: FormData) {
  const parsed = CreateScheduleSchema.safeParse({
    propertyId: formData.get("propertyId"),
    roomId: formData.get("roomId"),
    assetId: formData.get("assetId"),
    title: formData.get("title"),
    recurrence: formData.get("recurrence"),
    everyInterval: formData.get("everyInterval"),
    startsOn: formData.get("startsOn"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid schedule input" };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: schedule, error } = await supabase
    .from("maintenance_schedules")
    .insert({
      property_id: parsed.data.propertyId,
      room_id: parsed.data.roomId || null,
      asset_id: parsed.data.assetId || null,
      title: parsed.data.title,
      recurrence: parsed.data.recurrence,
      every_interval: parsed.data.everyInterval,
      starts_on: parsed.data.startsOn,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !schedule) return { error: error?.message ?? "Unable to create schedule" };

  const generateFd = new FormData();
  generateFd.set("scheduleId", schedule.id);
  generateFd.set("horizonDays", "90");
  const generated = await createRecurringInstances(generateFd);
  if (generated?.error) return { error: generated.error };

  revalidatePath("/dashboard/maintenance");
  return { success: true, scheduleId: schedule.id };
}

export async function logMaintenanceCompleted(formData: FormData) {
  const parsed = CompleteInstanceSchema.safeParse({
    instanceId: formData.get("instanceId"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid completion input" };
  }

  const supabase = await createClient();
  const activePropertyId = await requireActivePropertyId();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: instance } = await supabase
    .from("maintenance_schedule_instances")
    .select("id")
    .eq("id", parsed.data.instanceId)
    .eq("property_id", activePropertyId)
    .maybeSingle();

  if (!instance) return { error: "Maintenance item not found for active property" };

  const { error } = await supabase
    .from("maintenance_schedule_instances")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: user?.id ?? null,
      note: parsed.data.note || null,
    })
    .eq("id", parsed.data.instanceId)
    .eq("property_id", activePropertyId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/maintenance");
  return { success: true };
}

export async function getMaintenanceContext(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const [schedulesRes, dueRes, roomsRes, assetsRes] = await Promise.all([
    supabase
      .from("maintenance_schedules")
      .select("id, title, recurrence, every_interval, starts_on, is_active, room_id, asset_id, created_at")
      .eq("property_id", propertyId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("maintenance_schedule_instances")
      .select("id, schedule_id, due_on, status, note, completed_at, maintenance_schedules(title, recurrence)")
      .eq("property_id", propertyId)
      .in("status", ["due"])
      .order("due_on", { ascending: true })
      .limit(300),
    supabase
      .from("rooms")
      .select("id, room_number")
      .eq("property_id", propertyId)
      .order("room_number", { ascending: true }),
    supabase
      .from("assets")
      .select("id, name")
      .eq("property_id", propertyId)
      .order("name", { ascending: true }),
  ]);

  return {
    schedules: schedulesRes.data ?? [],
    dueItems: dueRes.data ?? [],
    rooms: roomsRes.data ?? [],
    assets: assetsRes.data ?? [],
  };
}
