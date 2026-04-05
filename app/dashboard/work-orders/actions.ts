"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertActivePropertyAccess, requireActivePropertyId } from "@/lib/pms/property-context";

const CreateWorkOrderSchema = z.object({
  propertyId: z.string().uuid(),
  roomId: z.string().uuid().optional().or(z.literal("")),
  title: z.string().min(3).max(180),
  category: z.string().min(2).max(80).default("general"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  description: z.string().max(2000).optional().or(z.literal("")),
  assignedTo: z.string().uuid().optional().or(z.literal("")),
  dueAt: z.string().optional().or(z.literal("")),
  blockRoom: z.coerce.boolean().default(false),
  blockUntil: z.string().optional().or(z.literal("")),
});

const AssignWorkOrderSchema = z.object({
  workOrderId: z.string().uuid(),
  assignedTo: z.string().uuid().optional().or(z.literal("")),
});

const UpdateStatusSchema = z.object({
  workOrderId: z.string().uuid(),
  status: z.enum(["open", "assigned", "in_progress", "on_hold", "resolved", "cancelled"]),
});

const ResolveWorkOrderSchema = z.object({
  workOrderId: z.string().uuid(),
  resolutionNote: z.string().max(2000).optional().or(z.literal("")),
  releaseRoom: z.coerce.boolean().default(false),
});

async function ensureWorkOrderInActiveProperty(workOrderId: string) {
  const supabase = await createClient();
  const activePropertyId = await requireActivePropertyId();

  const { data } = await supabase
    .from("work_orders")
    .select("id")
    .eq("id", workOrderId)
    .eq("property_id", activePropertyId)
    .maybeSingle();

  if (!data) {
    throw new Error("Work order not found for the active property");
  }

  return activePropertyId;
}

export async function getWorkOrdersContext(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("organization_id")
    .eq("id", propertyId)
    .maybeSingle();

  const organizationId = property?.organization_id ?? "";

  const [workOrdersRes, roomsRes, staffRes] = await Promise.all([
    supabase
      .from("work_orders")
      .select("id, room_id, title, category, priority, description, assigned_to, due_at, status, started_at, resolved_at, resolution_note, ooo_period_id, created_at, rooms(room_number), profiles:assigned_to(full_name,email)")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("rooms")
      .select("id, room_number, status")
      .eq("property_id", propertyId)
      .order("room_number", { ascending: true }),
    organizationId
      ? supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("organization_id", organizationId)
          .order("full_name", { ascending: true })
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string }> }),
  ]);

  return {
    workOrders: workOrdersRes.data ?? [],
    rooms: roomsRes.data ?? [],
    staff: staffRes.data ?? [],
  };
}

export async function createWorkOrder(formData: FormData) {
  const parsed = CreateWorkOrderSchema.safeParse({
    propertyId: formData.get("propertyId"),
    roomId: formData.get("roomId"),
    title: formData.get("title"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    description: formData.get("description"),
    assignedTo: formData.get("assignedTo"),
    dueAt: formData.get("dueAt"),
    blockRoom: formData.get("blockRoom") === "on",
    blockUntil: formData.get("blockUntil"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid work-order input" };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const status = parsed.data.assignedTo ? "assigned" : "open";

  const { data: order, error } = await supabase
    .from("work_orders")
    .insert({
      property_id: parsed.data.propertyId,
      room_id: parsed.data.roomId || null,
      title: parsed.data.title,
      category: parsed.data.category,
      priority: parsed.data.priority,
      description: parsed.data.description || null,
      assigned_to: parsed.data.assignedTo || null,
      due_at: parsed.data.dueAt || null,
      status,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !order) return { error: error?.message ?? "Unable to create work order" };

  if (parsed.data.blockRoom && parsed.data.roomId) {
    const { data: ooo, error: oooError } = await supabase
      .from("out_of_order_periods")
      .insert({
        property_id: parsed.data.propertyId,
        room_id: parsed.data.roomId,
        work_order_id: order.id,
        starts_at: new Date().toISOString(),
        ends_at: parsed.data.blockUntil || null,
        reason: `Blocked from work order: ${parsed.data.title}`,
      })
      .select("id")
      .single();

    if (oooError) return { error: oooError.message };

    await supabase.from("work_orders").update({ ooo_period_id: ooo?.id ?? null }).eq("id", order.id);

    await supabase.from("rooms").update({ status: "out_of_order" }).eq("id", parsed.data.roomId);

    await supabase.from("room_status_log").insert({
      room_id: parsed.data.roomId,
      status: "out_of_order",
      note: `Auto-blocked by work order ${order.id.slice(0, 8)}`,
      changed_by: user?.id ?? null,
    });
  }

  revalidatePath("/dashboard/work-orders");
  revalidatePath("/dashboard/rooms");
  return { success: true };
}

export async function assignWorkOrder(formData: FormData) {
  const parsed = AssignWorkOrderSchema.safeParse({
    workOrderId: formData.get("workOrderId"),
    assignedTo: formData.get("assignedTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid assignment input" };
  }

  await ensureWorkOrderInActiveProperty(parsed.data.workOrderId);

  const supabase = await createClient();

  const updates: Record<string, string | null> = {
    assigned_to: parsed.data.assignedTo || null,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.assignedTo) {
    updates.status = "assigned";
  }

  const { error } = await supabase
    .from("work_orders")
    .update(updates)
    .eq("id", parsed.data.workOrderId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/work-orders");
  return { success: true };
}

export async function updateWorkOrderStatus(formData: FormData) {
  const parsed = UpdateStatusSchema.safeParse({
    workOrderId: formData.get("workOrderId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid status update" };
  }

  await ensureWorkOrderInActiveProperty(parsed.data.workOrderId);

  const supabase = await createClient();

  const updates: Record<string, string | null> = {
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.status === "in_progress") {
    updates.started_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("work_orders")
    .update(updates)
    .eq("id", parsed.data.workOrderId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/work-orders");
  return { success: true };
}

export async function resolveWorkOrder(formData: FormData) {
  const parsed = ResolveWorkOrderSchema.safeParse({
    workOrderId: formData.get("workOrderId"),
    resolutionNote: formData.get("resolutionNote"),
    releaseRoom: formData.get("releaseRoom") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid resolve input" };
  }

  await ensureWorkOrderInActiveProperty(parsed.data.workOrderId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: order, error: orderError } = await supabase
    .from("work_orders")
    .select("id, room_id, ooo_period_id")
    .eq("id", parsed.data.workOrderId)
    .single();

  if (orderError || !order) return { error: orderError?.message ?? "Work order not found" };

  const { error } = await supabase
    .from("work_orders")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: user?.id ?? null,
      resolution_note: parsed.data.resolutionNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.workOrderId);

  if (error) return { error: error.message };

  if (parsed.data.releaseRoom && order.room_id && order.ooo_period_id) {
    await supabase
      .from("out_of_order_periods")
      .update({
        ends_at: new Date().toISOString(),
        released_at: new Date().toISOString(),
        released_by: user?.id ?? null,
      })
      .eq("id", order.ooo_period_id);

    await supabase.from("rooms").update({ status: "inspection" }).eq("id", order.room_id);

    await supabase.from("room_status_log").insert({
      room_id: order.room_id,
      status: "inspection",
      note: `Room released from OOO after work order ${order.id.slice(0, 8)} resolution`,
      changed_by: user?.id ?? null,
    });
  }

  revalidatePath("/dashboard/work-orders");
  revalidatePath("/dashboard/rooms");
  return { success: true };
}
