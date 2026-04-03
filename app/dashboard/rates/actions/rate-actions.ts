"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const RatePlanSchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().min(1).max(120),
  currencyCode: z.string().min(3).max(3),
  isActive: z.coerce.boolean().default(true),
});

const RestrictionSchema = z.object({
  ratePlanId: z.string().uuid(),
  roomTypeId: z.string().uuid(),
  dateFrom: z.string().date(),
  dateTo: z.string().date(),
  rateMinor: z.coerce.number().int().min(0),
  minStay: z.coerce.number().int().min(1).optional(),
  maxStay: z.coerce.number().int().min(1).optional(),
  closedToArrival: z.coerce.boolean().optional(),
  closedToDeparture: z.coerce.boolean().optional(),
});

const UpdateRestrictionSchema = z.object({
  restrictionId: z.string().uuid(),
  ratePlanId: z.string().uuid(),
  roomTypeId: z.string().uuid(),
  dateFrom: z.string().date(),
  dateTo: z.string().date(),
  rateMinor: z.coerce.number().int().min(0),
  minStay: z.coerce.number().int().min(1).optional(),
  maxStay: z.coerce.number().int().min(1).optional(),
  closedToArrival: z.coerce.boolean().optional(),
  closedToDeparture: z.coerce.boolean().optional(),
});

function toDateOnly(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export async function getRatePlans(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rate_plans")
    .select("id, name, currency_code, is_active, created_at")
    .eq("property_id", propertyId)
    .order("name", { ascending: true });
  if (error) return { plans: [], error: error.message };
  return { plans: data ?? [] };
}

export async function createRatePlan(formData: FormData) {
  const supabase = await createClient();
  const parsed = RatePlanSchema.safeParse({
    propertyId: formData.get("propertyId"),
    name: formData.get("name"),
    currencyCode: formData.get("currencyCode"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data, error } = await supabase
    .from("rate_plans")
    .insert({
      property_id: parsed.data.propertyId,
      name: parsed.data.name,
      currency_code: parsed.data.currencyCode.toUpperCase(),
      is_active: parsed.data.isActive,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/rates");
  return { success: true, id: data.id };
}

export async function getRatePlanDetail(planId: string) {
  const supabase = await createClient();

  const [planRes, roomTypesRes, ratesRes] = await Promise.all([
    supabase
      .from("rate_plans")
      .select("id, property_id, name, currency_code, is_active, created_at")
      .eq("id", planId)
      .single(),
    supabase
      .from("room_types")
      .select("id, name, base_rate_minor")
      .order("name", { ascending: true }),
    supabase
      .from("room_rates")
      .select("id, room_type_id, date_from, date_to, rate_minor, min_stay, max_stay, closed_to_arrival, closed_to_departure")
      .eq("rate_plan_id", planId)
      .order("date_from", { ascending: true }),
  ]);

  if (planRes.error) return { error: planRes.error.message };

  return {
    plan: planRes.data,
    roomTypes: roomTypesRes.data ?? [],
    restrictions: ratesRes.data ?? [],
  };
}

export async function addRateRestriction(formData: FormData) {
  const supabase = await createClient();
  const dateFrom = toDateOnly(formData.get("dateFrom"));
  const dateTo = toDateOnly(formData.get("dateTo"));

  const parsed = RestrictionSchema.safeParse({
    ratePlanId: formData.get("ratePlanId"),
    roomTypeId: formData.get("roomTypeId"),
    dateFrom,
    dateTo,
    rateMinor: formData.get("rateMinor"),
    minStay: formData.get("minStay") || undefined,
    maxStay: formData.get("maxStay") || undefined,
    closedToArrival: formData.get("closedToArrival") === "on",
    closedToDeparture: formData.get("closedToDeparture") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  if (parsed.data.dateFrom > parsed.data.dateTo) {
    return { error: "From date cannot be after To date." };
  }

  const modernPayload = {
    rate_plan_id: parsed.data.ratePlanId,
    room_type_id: parsed.data.roomTypeId,
    date_from: parsed.data.dateFrom,
    date_to: parsed.data.dateTo,
    rate_minor: parsed.data.rateMinor,
    min_stay: parsed.data.minStay ?? null,
    max_stay: parsed.data.maxStay ?? null,
    closed_to_arrival: parsed.data.closedToArrival ?? false,
    closed_to_departure: parsed.data.closedToDeparture ?? false,
  };

  let { error } = await supabase.from("room_rates").insert(modernPayload);

  const shouldRetryLegacy =
    !!error &&
    /(null value in column "date"|null value in column "amount_minor"|legacy schema|not-null constraint)/i.test(
      error.message,
    );

  if (shouldRetryLegacy) {
    const legacyPayload = {
      ...modernPayload,
      date: parsed.data.dateFrom,
      amount_minor: parsed.data.rateMinor,
    };

    const retry = await supabase.from("room_rates").insert(legacyPayload);
    error = retry.error;
  }

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/rates/${parsed.data.ratePlanId}`);
  revalidatePath("/dashboard/rates/seasons");
  return { success: true };
}

export async function updateRateRestriction(formData: FormData) {
  const supabase = await createClient();
  const dateFrom = toDateOnly(formData.get("dateFrom"));
  const dateTo = toDateOnly(formData.get("dateTo"));

  const parsed = UpdateRestrictionSchema.safeParse({
    restrictionId: formData.get("restrictionId"),
    ratePlanId: formData.get("ratePlanId"),
    roomTypeId: formData.get("roomTypeId"),
    dateFrom,
    dateTo,
    rateMinor: formData.get("rateMinor"),
    minStay: formData.get("minStay") || undefined,
    maxStay: formData.get("maxStay") || undefined,
    closedToArrival: formData.get("closedToArrival") === "on",
    closedToDeparture: formData.get("closedToDeparture") === "on",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (parsed.data.dateFrom > parsed.data.dateTo) {
    return { error: "From date cannot be after To date." };
  }

  const { error } = await supabase
    .from("room_rates")
    .update({
      room_type_id: parsed.data.roomTypeId,
      date_from: parsed.data.dateFrom,
      date_to: parsed.data.dateTo,
      rate_minor: parsed.data.rateMinor,
      min_stay: parsed.data.minStay ?? null,
      max_stay: parsed.data.maxStay ?? null,
      closed_to_arrival: parsed.data.closedToArrival ?? false,
      closed_to_departure: parsed.data.closedToDeparture ?? false,
      // Legacy compatibility for environments with legacy columns still present.
      date: parsed.data.dateFrom,
      amount_minor: parsed.data.rateMinor,
    })
    .eq("id", parsed.data.restrictionId)
    .eq("rate_plan_id", parsed.data.ratePlanId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/rates/${parsed.data.ratePlanId}`);
  revalidatePath("/dashboard/rates/seasons");
  return { success: true };
}

export async function getSeasonView(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("room_rates")
    .select("id, date_from, date_to, rate_minor, room_type_id, rate_plans!inner(property_id, name), room_types(name)")
    .eq("rate_plans.property_id", propertyId)
    .order("date_from", { ascending: true })
    .limit(300);

  if (error) return { rows: [], error: error.message };
  return { rows: data ?? [] };
}
