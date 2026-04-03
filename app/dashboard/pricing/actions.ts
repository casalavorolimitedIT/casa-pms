"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { calculateRate } from "@/lib/pms/rates";
import { differenceInCalendarDays, parseISO } from "date-fns";

const CreateRuleSchema = z.object({
  propertyId: z.string().uuid(),
  roomTypeId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(1).max(120),
  minOccupancyPercent: z.coerce.number().int().min(0).max(100).optional(),
  minLeadDays: z.coerce.number().int().min(0).optional(),
  adjustmentPercent: z.coerce.number().min(-100).max(300),
  isLocked: z.coerce.boolean().default(false),
});

const ToggleSchema = z.object({
  ruleId: z.string().uuid(),
  isActive: z.coerce.boolean(),
});

const UpdateRuleSchema = z.object({
  ruleId: z.string().uuid(),
  roomTypeId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(1).max(120),
  minOccupancyPercent: z.coerce.number().int().min(0).max(100).optional(),
  minLeadDays: z.coerce.number().int().min(0).optional(),
  adjustmentPercent: z.coerce.number().min(-100).max(300),
  isLocked: z.coerce.boolean().default(false),
});

const PreviewSchema = z.object({
  propertyId: z.string().uuid(),
  roomTypeId: z.string().uuid(),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  adjustmentPercent: z.coerce.number(),
});

export async function getPricingContext(propertyId: string) {
  const supabase = await createClient();

  const [rulesRes, roomTypesRes] = await Promise.all([
    supabase
      .from("dynamic_pricing_rules")
      .select("id, room_type_id, name, min_occupancy_percent, min_lead_days, adjustment_percent, is_active, is_locked, created_at")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("room_types")
      .select("id, name, base_rate_minor")
      .eq("property_id", propertyId)
      .order("name", { ascending: true }),
  ]);

  const rules = rulesRes.data ?? [];

  return {
    rules,
    roomTypes: roomTypesRes.data ?? [],
    summary: {
      activeRules: rules.filter((r) => r.is_active).length,
      lockedRules: rules.filter((r) => r.is_locked).length,
      totalRules: rules.length,
    },
  };
}

export async function createPricingRule(formData: FormData) {
  const parsed = CreateRuleSchema.safeParse({
    propertyId: formData.get("propertyId"),
    roomTypeId: formData.get("roomTypeId"),
    name: formData.get("name"),
    minOccupancyPercent: formData.get("minOccupancyPercent") || undefined,
    minLeadDays: formData.get("minLeadDays") || undefined,
    adjustmentPercent: formData.get("adjustmentPercent"),
    isLocked: formData.get("isLocked") === "on",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid pricing rule" };

  const supabase = await createClient();
  const { error } = await supabase.from("dynamic_pricing_rules").insert({
    property_id: parsed.data.propertyId,
    room_type_id: parsed.data.roomTypeId || null,
    name: parsed.data.name,
    min_occupancy_percent: parsed.data.minOccupancyPercent ?? null,
    min_lead_days: parsed.data.minLeadDays ?? null,
    adjustment_percent: parsed.data.adjustmentPercent,
    is_locked: parsed.data.isLocked,
    is_active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/pricing");
  return { success: true };
}

export async function toggleDynamicPricing(formData: FormData) {
  const parsed = ToggleSchema.safeParse({
    ruleId: formData.get("ruleId"),
    isActive: formData.get("isActive") === "true",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid toggle request" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("dynamic_pricing_rules")
    .update({ is_active: !parsed.data.isActive })
    .eq("id", parsed.data.ruleId)
    .eq("is_locked", false);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/pricing");
  return { success: true };
}

export async function updatePricingRule(formData: FormData) {
  const parsed = UpdateRuleSchema.safeParse({
    ruleId: formData.get("ruleId"),
    roomTypeId: formData.get("roomTypeId"),
    name: formData.get("name"),
    minOccupancyPercent: formData.get("minOccupancyPercent") || undefined,
    minLeadDays: formData.get("minLeadDays") || undefined,
    adjustmentPercent: formData.get("adjustmentPercent"),
    isLocked: formData.get("isLocked") === "on",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid pricing rule update" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("dynamic_pricing_rules")
    .update({
      room_type_id: parsed.data.roomTypeId || null,
      name: parsed.data.name,
      min_occupancy_percent: parsed.data.minOccupancyPercent ?? null,
      min_lead_days: parsed.data.minLeadDays ?? null,
      adjustment_percent: parsed.data.adjustmentPercent,
      is_locked: parsed.data.isLocked,
    })
    .eq("id", parsed.data.ruleId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/pricing");
  return { success: true };
}

export async function previewPricingImpact(formData: FormData) {
  const parsed = PreviewSchema.safeParse({
    propertyId: formData.get("propertyId"),
    roomTypeId: formData.get("roomTypeId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    adjustmentPercent: formData.get("adjustmentPercent"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid preview request" };

  const nights = differenceInCalendarDays(parseISO(parsed.data.checkOut), parseISO(parsed.data.checkIn));
  if (nights <= 0) {
    return { error: "Check-out must be after check-in to simulate pricing." };
  }

  const supabase = await createClient();
  const { data: roomType, error: roomTypeError } = await supabase
    .from("room_types")
    .select("base_rate_minor")
    .eq("id", parsed.data.roomTypeId)
    .eq("property_id", parsed.data.propertyId)
    .maybeSingle();

  if (roomTypeError) return { error: roomTypeError.message };
  if (!roomType) return { error: "Room type not found for this property." };
  if (!roomType.base_rate_minor || roomType.base_rate_minor <= 0) {
    return { error: "Selected room type has no base rate configured. Set a base rate before simulating." };
  }

  const base = await calculateRate({
    propertyId: parsed.data.propertyId,
    roomTypeId: parsed.data.roomTypeId,
    checkIn: parsed.data.checkIn,
    checkOut: parsed.data.checkOut,
  });

  const computedBaseMinor = base.totalMinor > 0 ? base.totalMinor : roomType.base_rate_minor * nights;
  const adjustedMinor = Math.round(computedBaseMinor * (1 + parsed.data.adjustmentPercent / 100));

  return {
    success: true,
    baseMinor: computedBaseMinor,
    adjustedMinor,
    currency: base.currency,
  };
}
