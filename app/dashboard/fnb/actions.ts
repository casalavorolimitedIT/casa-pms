"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertActivePropertyAccess } from "@/lib/pms/property-context";
import { requirePermission } from "@/lib/staff/server-permissions";

const CreateQrSchema = z.object({
  propertyId: z.string().uuid(),
  outletId: z.string().uuid(),
  reservationId: z.string().uuid().optional().or(z.literal("")),
  label: z.string().max(120).optional().or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal("")),
});

const SubmitGuestOrderSchema = z.object({
  qrCode: z.string().min(6).max(120),
  menuItemId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
  note: z.string().max(500).optional().or(z.literal("")),
  guestName: z.string().max(120).optional().or(z.literal("")),
});

const OrderIdSchema = z.object({
  orderId: z.string().uuid(),
});

const ItemIdSchema = z.object({
  itemId: z.string().uuid(),
});

const TicketCompleteSchema = z.object({
  orderId: z.string().uuid(),
  postToFolio: z.coerce.boolean().default(false),
});

export async function createOrderQrCode(formData: FormData) {
  const parsed = CreateQrSchema.safeParse({
    propertyId: formData.get("propertyId"),
    outletId: formData.get("outletId"),
    reservationId: formData.get("reservationId"),
    label: formData.get("label"),
    expiresAt: formData.get("expiresAt"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid QR input" };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);
  await requirePermission("minibar.manage", parsed.data.propertyId);

  const supabase = await createClient();
  const code = randomUUID().replaceAll("-", "").slice(0, 12);

  const { error } = await supabase.from("order_qr_codes").insert({
    property_id: parsed.data.propertyId,
    outlet_id: parsed.data.outletId,
    reservation_id: parsed.data.reservationId || null,
    code,
    label: parsed.data.label || null,
    expires_at: parsed.data.expiresAt || null,
    is_active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/fnb/qr");
  return { success: true, code };
}

export async function submitGuestOrder(formData: FormData) {
  const parsed = SubmitGuestOrderSchema.safeParse({
    qrCode: formData.get("qrCode"),
    menuItemId: formData.get("menuItemId"),
    quantity: formData.get("quantity"),
    note: formData.get("note"),
    guestName: formData.get("guestName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid order input" };
  }

  const supabase = await createClient();

  const { data: qrRow, error: qrError } = await supabase
    .from("order_qr_codes")
    .select("id, property_id, outlet_id, reservation_id, is_active, expires_at")
    .eq("code", parsed.data.qrCode)
    .maybeSingle();

  if (qrError) return { error: qrError.message };
  if (!qrRow || !qrRow.is_active) return { error: "QR code is invalid or inactive" };
  if (qrRow.expires_at && new Date(qrRow.expires_at).getTime() < Date.now()) {
    return { error: "QR code has expired" };
  }

  const { data: menuItem, error: itemError } = await supabase
    .from("menu_items")
    .select("id, name, base_price_minor, is_active")
    .eq("id", parsed.data.menuItemId)
    .eq("property_id", qrRow.property_id)
    .eq("outlet_id", qrRow.outlet_id)
    .maybeSingle();

  if (itemError) return { error: itemError.message };
  if (!menuItem || !menuItem.is_active) return { error: "Menu item not available" };

  const ticketSuffix = String(Date.now()).slice(-6);
  const ticketNumber = `K-${ticketSuffix}`;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      property_id: qrRow.property_id,
      outlet_id: qrRow.outlet_id,
      reservation_id: qrRow.reservation_id,
      qr_code_id: qrRow.id,
      status: "new",
      source: "qr",
      ticket_number: ticketNumber,
      notes: parsed.data.note || null,
      guest_name: parsed.data.guestName || null,
    })
    .select("id")
    .single();

  if (orderError || !order) return { error: orderError?.message ?? "Unable to create order" };

  const { error: itemInsertError } = await supabase.from("order_items").insert({
    property_id: qrRow.property_id,
    order_id: order.id,
    menu_item_id: menuItem.id,
    item_name: menuItem.name,
    quantity: parsed.data.quantity,
    unit_price_minor: menuItem.base_price_minor,
    status: "queued",
    note: parsed.data.note || null,
  });

  if (itemInsertError) return { error: itemInsertError.message };

  revalidatePath("/dashboard/fnb/kitchen");
  return { success: true, orderId: order.id, ticketNumber };
}

export async function confirmOrder(formData: FormData) {
  const parsed = OrderIdSchema.safeParse({ orderId: formData.get("orderId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid order" };

  const supabase = await createClient();
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, property_id")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (orderErr) return { error: orderErr.message };
  if (!order) return { error: "Order not found" };

  await assertActivePropertyAccess(order.property_id);
  await requirePermission("minibar.manage", order.property_id);

  const { error } = await supabase
    .from("orders")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", parsed.data.orderId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/fnb/kitchen");
  revalidatePath("/dashboard/fnb/qr");
  return { success: true };
}

export async function markItemReady(formData: FormData) {
  const parsed = ItemIdSchema.safeParse({ itemId: formData.get("itemId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid item" };

  const supabase = await createClient();
  const { data: item, error: itemErr } = await supabase
    .from("order_items")
    .select("id, property_id")
    .eq("id", parsed.data.itemId)
    .maybeSingle();

  if (itemErr) return { error: itemErr.message };
  if (!item) return { error: "Order item not found" };

  await assertActivePropertyAccess(item.property_id);
  await requirePermission("minibar.manage", item.property_id);

  const { error } = await supabase
    .from("order_items")
    .update({ status: "ready", ready_at: new Date().toISOString() })
    .eq("id", parsed.data.itemId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/fnb/kitchen");
  return { success: true };
}

export async function bumpTicket(formData: FormData) {
  const parsed = OrderIdSchema.safeParse({ orderId: formData.get("orderId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid ticket" };

  const supabase = await createClient();
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, property_id")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (orderErr) return { error: orderErr.message };
  if (!order) return { error: "Ticket not found" };

  await assertActivePropertyAccess(order.property_id);
  await requirePermission("minibar.manage", order.property_id);

  const { error } = await supabase
    .from("orders")
    .update({ status: "in_progress" })
    .eq("id", parsed.data.orderId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/fnb/kitchen");
  return { success: true };
}

export async function postOrderToFolio(orderId: string) {
  const supabase = await createClient();

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, property_id, reservation_id, posted_charge_id")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr) return { error: orderErr.message };
  if (!order) return { error: "Order not found" };

  await assertActivePropertyAccess(order.property_id);
  await requirePermission("folios.post_charge", order.property_id);

  if (!order.reservation_id) return { error: "Order has no reservation to post against" };
  if (order.posted_charge_id) return { success: true, chargeId: order.posted_charge_id };

  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("quantity, unit_price_minor")
    .eq("order_id", order.id)
    .in("status", ["ready", "served", "in_progress", "queued"]);

  if (itemsErr) return { error: itemsErr.message };

  const amountMinor = (items ?? []).reduce((sum, row) => sum + row.quantity * row.unit_price_minor, 0);
  if (amountMinor <= 0) return { error: "Order has no billable amount" };

  let folioId: string | null = null;
  const { data: existingFolio } = await supabase
    .from("folios")
    .select("id")
    .eq("reservation_id", order.reservation_id)
    .eq("status", "open")
    .maybeSingle();

  folioId = existingFolio?.id ?? null;

  if (!folioId) {
    const { data: newFolio, error: newFolioErr } = await supabase
      .from("folios")
      .insert({ reservation_id: order.reservation_id, status: "open", currency_code: "USD" })
      .select("id")
      .single();

    if (newFolioErr || !newFolio) return { error: newFolioErr?.message ?? "Unable to create folio" };
    folioId = newFolio.id;
  }

  const { data: charge, error: chargeErr } = await supabase
    .from("folio_charges")
    .insert({
      folio_id: folioId,
      amount_minor: amountMinor,
      category: "fnb",
      description: `F&B order ${order.id.slice(0, 8)}`,
    })
    .select("id")
    .single();

  if (chargeErr || !charge) return { error: chargeErr?.message ?? "Unable to post folio charge" };

  await supabase
    .from("orders")
    .update({ posted_charge_id: charge.id, folio_posted_at: new Date().toISOString() })
    .eq("id", order.id);

  revalidatePath("/dashboard/fnb/kitchen");
  revalidatePath(`/dashboard/folios/${folioId}`);
  return { success: true, chargeId: charge.id };
}

export async function markTicketComplete(formData: FormData) {
  const parsed = TicketCompleteSchema.safeParse({
    orderId: formData.get("orderId"),
    postToFolio: formData.get("postToFolio") === "on",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid completion input" };

  const supabase = await createClient();
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, property_id")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (orderErr) return { error: orderErr.message };
  if (!order) return { error: "Ticket not found" };

  await assertActivePropertyAccess(order.property_id);
  await requirePermission("minibar.manage", order.property_id);

  // Post folio first to avoid partial state where ticket is completed but billing failed.
  if (parsed.data.postToFolio) {
    const posted = await postOrderToFolio(parsed.data.orderId);
    if (posted?.error) return posted;
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", parsed.data.orderId);

  if (error) return { error: error.message };

  await supabase
    .from("order_items")
    .update({ status: "served" })
    .eq("order_id", parsed.data.orderId)
    .in("status", ["queued", "in_progress", "ready"]);

  revalidatePath("/dashboard/fnb/kitchen");
  return { success: true };
}

export async function getQrManagementContext(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const [outletsRes, reservationsRes, qrRes] = await Promise.all([
    supabase.from("outlets").select("id, name").eq("property_id", propertyId).eq("is_active", true).order("name"),
    supabase.from("reservations").select("id, guests(first_name,last_name), check_in, check_out, status").eq("property_id", propertyId).in("status", ["confirmed", "checked_in"]).order("check_in", { ascending: false }).limit(200),
    supabase.from("order_qr_codes").select("id, code, label, outlet_id, reservation_id, is_active, expires_at, created_at").eq("property_id", propertyId).order("created_at", { ascending: false }).limit(200),
  ]);

  return {
    outlets: outletsRes.data ?? [],
    reservations: reservationsRes.data ?? [],
    qrCodes: qrRes.data ?? [],
  };
}

export async function getGuestOrderingContext(qrCode: string) {
  const supabase = await createClient();

  const { data: qr, error: qrErr } = await supabase
    .from("order_qr_codes")
    .select("id, code, label, property_id, outlet_id, reservation_id, is_active, expires_at, outlets(name)")
    .eq("code", qrCode)
    .maybeSingle();

  if (qrErr) return { error: qrErr.message };
  if (!qr || !qr.is_active) return { error: "QR code unavailable" };
  if (qr.expires_at && new Date(qr.expires_at).getTime() < Date.now()) return { error: "QR code expired" };

  const [itemsRes, recentRes] = await Promise.all([
    supabase
      .from("menu_items")
      .select("id, name, description, base_price_minor, available_from, available_to, is_active")
      .eq("property_id", qr.property_id)
      .eq("outlet_id", qr.outlet_id)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("orders")
      .select("id, ticket_number, status, created_at")
      .eq("qr_code_id", qr.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return {
    qr,
    items: itemsRes.data ?? [],
    recentOrders: recentRes.data ?? [],
  };
}

export async function getKitchenQueue(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, ticket_number, status, source, guest_name, notes, created_at, outlet_id, folio_posted_at, outlets(name), order_items(id, item_name, quantity, unit_price_minor, status, ready_at)",
    )
    .eq("property_id", propertyId)
    .in("status", ["new", "confirmed", "in_progress"])
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return { queue: [], error: error.message };
  return { queue: data ?? [] };
}
