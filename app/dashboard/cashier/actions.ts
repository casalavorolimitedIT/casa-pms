"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const OpenShiftSchema = z.object({
  propertyId: z.string().uuid(),
  openingFloatMinor: z.coerce.number().int().min(0),
});

const DrawerEntrySchema = z.object({
  shiftId: z.string().uuid(),
  entryType: z.enum(["cash_in", "cash_out"]),
  amountMinor: z.coerce.number().int().min(1),
});

const CloseShiftSchema = z.object({
  shiftId: z.string().uuid(),
  closingCountMinor: z.coerce.number().int().min(0),
});

export async function getCashierContext(propertyId: string) {
  const supabase = await createClient();

  const { data: activeShift } = await supabase
    .from("shifts")
    .select("id, opened_at, opening_float_minor, closing_count_minor")
    .eq("property_id", propertyId)
    .is("closed_at", null)
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let entries: Array<{ id: string; entry_type: string; amount_minor: number; created_at: string }> = [];

  if (activeShift?.id) {
    const { data } = await supabase
      .from("cash_drawer_entries")
      .select("id, entry_type, amount_minor, created_at")
      .eq("shift_id", activeShift.id)
      .order("created_at", { ascending: false });
    entries = data ?? [];
  }

  const { data: recentShifts } = await supabase
    .from("shifts")
    .select("id, opened_at, closed_at, opening_float_minor, closing_count_minor")
    .eq("property_id", propertyId)
    .order("opened_at", { ascending: false })
    .limit(10);

  return {
    activeShift: activeShift ?? null,
    entries,
    recentShifts: recentShifts ?? [],
  };
}

export async function openShift(formData: FormData) {
  const parsed = OpenShiftSchema.safeParse({
    propertyId: formData.get("propertyId"),
    openingFloatMinor: formData.get("openingFloatMinor"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("shifts")
    .select("id")
    .eq("property_id", parsed.data.propertyId)
    .is("closed_at", null)
    .maybeSingle();

  if (existing) {
    return { error: "An active shift is already open." };
  }

  const { error } = await supabase.from("shifts").insert({
    property_id: parsed.data.propertyId,
    opening_float_minor: parsed.data.openingFloatMinor,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/cashier");
  return { success: true };
}

export async function addCashDrawerEntry(formData: FormData) {
  const parsed = DrawerEntrySchema.safeParse({
    shiftId: formData.get("shiftId"),
    entryType: formData.get("entryType"),
    amountMinor: formData.get("amountMinor"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("cash_drawer_entries").insert({
    shift_id: parsed.data.shiftId,
    entry_type: parsed.data.entryType,
    amount_minor: parsed.data.amountMinor,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/cashier");
  return { success: true };
}

export async function closeShift(formData: FormData) {
  const parsed = CloseShiftSchema.safeParse({
    shiftId: formData.get("shiftId"),
    closingCountMinor: formData.get("closingCountMinor"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  const { data: shift } = await supabase
    .from("shifts")
    .select("id")
    .eq("id", parsed.data.shiftId)
    .is("closed_at", null)
    .maybeSingle();

  if (!shift) {
    return { error: "Shift not found or already closed." };
  }

  const { error } = await supabase
    .from("shifts")
    .update({
      closing_count_minor: parsed.data.closingCountMinor,
      closed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.shiftId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/cashier");
  return { success: true };
}
