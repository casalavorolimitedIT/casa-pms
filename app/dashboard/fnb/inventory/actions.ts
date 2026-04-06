"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertActivePropertyAccess } from "@/lib/pms/property-context";
import { requirePermission } from "@/lib/staff/server-permissions";

const AdjustStockSchema = z.object({
  propertyId: z.string().uuid(),
  itemId: z.string().uuid(),
  qtyDelta: z.coerce.number(),
  reference: z.string().max(120).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

const CreatePoSchema = z.object({
  propertyId: z.string().uuid(),
  supplier: z.string().min(2).max(160),
  expectedAt: z.string().optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
  itemId: z.string().uuid(),
  qtyOrdered: z.coerce.number().positive(),
  costMinor: z.coerce.number().int().min(0).optional(),
});

const ReceivePoSchema = z.object({
  propertyId: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  lineId: z.string().uuid(),
  qtyReceived: z.coerce.number().positive(),
});

const ItemIdSchema = z.object({
  propertyId: z.string().uuid(),
  itemId: z.string().uuid(),
});

async function upsertLowStockAlert(propertyId: string, itemId: string) {
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("inventory_items")
    .select("id, name, current_qty, reorder_level")
    .eq("id", itemId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (!item) return;

  const isLow = Number(item.current_qty) <= Number(item.reorder_level);
  const { data: existing } = await supabase
    .from("inventory_alerts")
    .select("id, status")
    .eq("property_id", propertyId)
    .eq("item_id", itemId)
    .eq("alert_type", "low_stock")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (isLow) {
    if (!existing || existing.status !== "open") {
      await supabase.from("inventory_alerts").insert({
        property_id: propertyId,
        item_id: itemId,
        alert_type: "low_stock",
        status: "open",
        message: `Low stock: ${item.name} (${item.current_qty} <= ${item.reorder_level})`,
      });
    }
    return;
  }

  if (existing && existing.status === "open") {
    await supabase
      .from("inventory_alerts")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", existing.id);
  }
}

export async function adjustStock(formData: FormData) {
  const parsed = AdjustStockSchema.safeParse({
    propertyId: formData.get("propertyId"),
    itemId: formData.get("itemId"),
    qtyDelta: formData.get("qtyDelta"),
    reference: formData.get("reference"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid stock adjustment input" };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);
  await requirePermission("minibar.manage", parsed.data.propertyId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: item, error: itemErr } = await supabase
    .from("inventory_items")
    .select("id, current_qty")
    .eq("id", parsed.data.itemId)
    .eq("property_id", parsed.data.propertyId)
    .maybeSingle();

  if (itemErr) return { error: itemErr.message };
  if (!item) return { error: "Inventory item not found" };

  const nextQty = Number(item.current_qty) + parsed.data.qtyDelta;
  if (nextQty < 0) return { error: "Adjustment would result in negative stock" };

  const { error: updateErr } = await supabase
    .from("inventory_items")
    .update({ current_qty: nextQty })
    .eq("id", parsed.data.itemId);

  if (updateErr) return { error: updateErr.message };

  await supabase.from("inventory_movements").insert({
    property_id: parsed.data.propertyId,
    item_id: parsed.data.itemId,
    movement_type: "adjustment",
    qty_delta: parsed.data.qtyDelta,
    reference: parsed.data.reference || null,
    notes: parsed.data.notes || null,
    created_by: user?.id ?? null,
  });

  await upsertLowStockAlert(parsed.data.propertyId, parsed.data.itemId);

  revalidatePath("/dashboard/fnb/inventory");
  return { success: true };
}

export async function createPurchaseOrder(formData: FormData) {
  const parsed = CreatePoSchema.safeParse({
    propertyId: formData.get("propertyId"),
    supplier: formData.get("supplier"),
    expectedAt: formData.get("expectedAt"),
    notes: formData.get("notes"),
    itemId: formData.get("itemId"),
    qtyOrdered: formData.get("qtyOrdered"),
    costMinor: formData.get("costMinor") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid purchase order input" };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);
  await requirePermission("minibar.manage", parsed.data.propertyId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .insert({
      property_id: parsed.data.propertyId,
      supplier: parsed.data.supplier,
      status: "submitted",
      expected_at: parsed.data.expectedAt || null,
      notes: parsed.data.notes || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (poErr || !po) return { error: poErr?.message ?? "Unable to create purchase order" };

  const { error: lineErr } = await supabase.from("purchase_order_lines").insert({
    purchase_order_id: po.id,
    item_id: parsed.data.itemId,
    qty_ordered: parsed.data.qtyOrdered,
    qty_received: 0,
    cost_minor: parsed.data.costMinor ?? null,
  });

  if (lineErr) return { error: lineErr.message };

  revalidatePath("/dashboard/fnb/inventory");
  return { success: true };
}

export async function receivePurchaseOrder(formData: FormData) {
  const parsed = ReceivePoSchema.safeParse({
    propertyId: formData.get("propertyId"),
    purchaseOrderId: formData.get("purchaseOrderId"),
    lineId: formData.get("lineId"),
    qtyReceived: formData.get("qtyReceived"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid receiving input" };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);
  await requirePermission("minibar.manage", parsed.data.propertyId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: line, error: lineErr } = await supabase
    .from("purchase_order_lines")
    .select("id, item_id, qty_ordered, qty_received")
    .eq("id", parsed.data.lineId)
    .eq("purchase_order_id", parsed.data.purchaseOrderId)
    .maybeSingle();

  if (lineErr) return { error: lineErr.message };
  if (!line) return { error: "Purchase order line not found" };

  const nextReceived = Number(line.qty_received) + parsed.data.qtyReceived;
  if (nextReceived > Number(line.qty_ordered)) {
    return { error: "Received quantity exceeds ordered quantity" };
  }

  await supabase
    .from("purchase_order_lines")
    .update({ qty_received: nextReceived })
    .eq("id", line.id);

  const { data: item } = await supabase
    .from("inventory_items")
    .select("id, current_qty")
    .eq("id", line.item_id)
    .eq("property_id", parsed.data.propertyId)
    .maybeSingle();

  if (!item) return { error: "Linked inventory item not found" };

  const nextQty = Number(item.current_qty) + parsed.data.qtyReceived;
  await supabase.from("inventory_items").update({ current_qty: nextQty }).eq("id", item.id);

  await supabase.from("inventory_movements").insert({
    property_id: parsed.data.propertyId,
    item_id: item.id,
    movement_type: "purchase_receive",
    qty_delta: parsed.data.qtyReceived,
    reference: `PO:${parsed.data.purchaseOrderId.slice(0, 8)}`,
    notes: "Purchase order receiving",
    created_by: user?.id ?? null,
  });

  const status = nextReceived >= Number(line.qty_ordered) ? "received" : "partially_received";
  await supabase
    .from("purchase_orders")
    .update({ status, received_at: status === "received" ? new Date().toISOString() : null })
    .eq("id", parsed.data.purchaseOrderId)
    .eq("property_id", parsed.data.propertyId);

  await upsertLowStockAlert(parsed.data.propertyId, item.id);

  revalidatePath("/dashboard/fnb/inventory");
  return { success: true };
}

export async function generateLowStockAlert(formData: FormData) {
  const parsed = ItemIdSchema.safeParse({
    propertyId: formData.get("propertyId"),
    itemId: formData.get("itemId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid low-stock alert input" };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);
  await requirePermission("minibar.manage", parsed.data.propertyId);

  await upsertLowStockAlert(parsed.data.propertyId, parsed.data.itemId);
  revalidatePath("/dashboard/fnb/inventory");
  return { success: true };
}

export async function getInventoryContext(propertyId: string) {
  await assertActivePropertyAccess(propertyId);

  const supabase = await createClient();

  const [itemsRes, movementRes, poRes, lineRes, alertsRes] = await Promise.all([
    supabase
      .from("inventory_items")
      .select("id, name, unit, current_qty, reorder_level, is_active, outlet_id, outlets(name)")
      .eq("property_id", propertyId)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("inventory_movements")
      .select("id, item_id, movement_type, qty_delta, reference, created_at")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("purchase_orders")
      .select("id, supplier, status, expected_at, received_at, created_at")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("purchase_order_lines")
      .select("id, purchase_order_id, item_id, qty_ordered, qty_received, cost_minor, inventory_items(name)")
      .order("id", { ascending: false })
      .limit(300),
    supabase
      .from("inventory_alerts")
      .select("id, item_id, status, message, created_at")
      .eq("property_id", propertyId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(120),
  ]);

  return {
    items: itemsRes.data ?? [],
    movements: movementRes.data ?? [],
    purchaseOrders: poRes.data ?? [],
    purchaseOrderLines: lineRes.data ?? [],
    alerts: alertsRes.data ?? [],
  };
}
