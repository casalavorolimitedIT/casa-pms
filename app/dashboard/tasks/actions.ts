"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const CreateTaskSchema = z.object({
  propertyId: z.string().uuid(),
  title: z.string().min(2).max(160),
  roomId: z.string().uuid().optional().or(z.literal("")),
  reservationId: z.string().uuid().optional().or(z.literal("")),
  assignedTo: z.string().uuid().optional().or(z.literal("")),
  description: z.string().max(1500).optional().or(z.literal("")),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  dueAt: z.string().optional().or(z.literal("")),
});

const UpdateTaskStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(["todo", "in_progress", "done"]),
});

export async function getTaskBoardContext(propertyId: string) {
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("organization_id")
    .eq("id", propertyId)
    .maybeSingle();

  const organizationId = property?.organization_id ?? "";

  const [tasksRes, roomsRes, reservationsRes, staffRes] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, status, priority, description, due_at, room_id, reservation_id, assigned_to, created_at, rooms(room_number), reservations(id, check_in, guests(first_name,last_name)), profiles:assigned_to(full_name,email)",
      )
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
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
      .in("status", ["tentative", "confirmed", "checked_in"])
      .order("check_in", { ascending: true })
      .limit(80),
    organizationId
      ? supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("organization_id", organizationId)
          .order("full_name", { ascending: true })
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string }> }),
  ]);

  return {
    tasks: tasksRes.data ?? [],
    rooms: roomsRes.data ?? [],
    reservations: reservationsRes.data ?? [],
    staff: staffRes.data ?? [],
  };
}

export async function createTask(formData: FormData) {
  const parsed = CreateTaskSchema.safeParse({
    propertyId: formData.get("propertyId"),
    title: formData.get("title"),
    roomId: formData.get("roomId"),
    reservationId: formData.get("reservationId"),
    assignedTo: formData.get("assignedTo"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    dueAt: formData.get("dueAt"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid task input" };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("tasks").insert({
    property_id: parsed.data.propertyId,
    title: parsed.data.title,
    room_id: parsed.data.roomId || null,
    reservation_id: parsed.data.reservationId || null,
    assigned_to: parsed.data.assignedTo || null,
    description: parsed.data.description || null,
    priority: parsed.data.priority,
    due_at: parsed.data.dueAt || null,
    status: "todo",
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tasks");
  return { success: true };
}

export async function updateTaskStatus(formData: FormData) {
  const parsed = UpdateTaskStatusSchema.safeParse({
    taskId: formData.get("taskId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid status update" };
  }

  const supabase = await createClient();

  const updates: Record<string, string | null> = {
    status: parsed.data.status,
  };

  if (parsed.data.status === "done") {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("tasks").update(updates).eq("id", parsed.data.taskId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/tasks");
  return { success: true };
}
