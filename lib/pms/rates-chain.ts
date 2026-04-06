import { createClient } from "@/lib/supabase/server";

export async function createChainRatePlanRecord(input: {
  organizationId: string;
  name: string;
  description?: string;
  createdBy?: string | null;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chain_rate_plans")
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      description: input.description || null,
      is_active: true,
      created_by: input.createdBy ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Unable to create chain rate plan" };
  return { success: true, chainRatePlanId: data.id };
}

export async function pushChainRatePlanToProperty(input: {
  chainRatePlanId: string;
  propertyId: string;
}) {
  const supabase = await createClient();

  const { data: plan, error: planError } = await supabase
    .from("chain_rate_plans")
    .select("id, name")
    .eq("id", input.chainRatePlanId)
    .maybeSingle();

  if (planError) return { error: planError.message };
  if (!plan) return { error: "Chain rate plan not found" };

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("currency_code")
    .eq("id", input.propertyId)
    .maybeSingle();

  if (propertyError) return { error: propertyError.message };
  if (!property) return { error: "Property not found" };

  const { data: ratePlan, error: ratePlanError } = await supabase
    .from("rate_plans")
    .upsert(
      {
        property_id: input.propertyId,
        name: `[Chain] ${plan.name}`,
        currency_code: property.currency_code,
        is_active: true,
      },
      { onConflict: "property_id,name" },
    )
    .select("id")
    .single();

  if (ratePlanError || !ratePlan) {
    return { error: ratePlanError?.message ?? "Unable to create property rate plan" };
  }

  const { error: assignmentError } = await supabase
    .from("chain_rate_plan_assignments")
    .upsert(
      {
        chain_rate_plan_id: input.chainRatePlanId,
        property_id: input.propertyId,
        property_rate_plan_id: ratePlan.id,
        override_allowed: true,
      },
      { onConflict: "chain_rate_plan_id,property_id" },
    );

  if (assignmentError) return { error: assignmentError.message };

  return { success: true, propertyRatePlanId: ratePlan.id };
}

export async function applyPropertyRateOverride(input: {
  assignmentId: string;
  roomTypeId: string;
  dateFrom: string;
  dateTo: string;
  rateMinor: number;
}) {
  const supabase = await createClient();

  const { data: assignment, error: assignmentError } = await supabase
    .from("chain_rate_plan_assignments")
    .select("id, property_rate_plan_id, override_allowed")
    .eq("id", input.assignmentId)
    .maybeSingle();

  if (assignmentError) return { error: assignmentError.message };
  if (!assignment) return { error: "Chain assignment not found" };
  if (!assignment.override_allowed) return { error: "Overrides are disabled for this assignment" };
  if (!assignment.property_rate_plan_id) return { error: "Assignment is missing linked property rate plan" };

  const { error: roomRateError } = await supabase.from("room_rates").insert({
    rate_plan_id: assignment.property_rate_plan_id,
    room_type_id: input.roomTypeId,
    date_from: input.dateFrom,
    date_to: input.dateTo,
    rate_minor: input.rateMinor,
    min_stay: null,
    max_stay: null,
    closed_to_arrival: false,
    closed_to_departure: false,
    date: input.dateFrom,
    amount_minor: input.rateMinor,
  });

  if (roomRateError) return { error: roomRateError.message };

  const { error: overrideError } = await supabase.from("chain_rate_plan_overrides").insert({
    assignment_id: input.assignmentId,
    room_type_id: input.roomTypeId,
    date_from: input.dateFrom,
    date_to: input.dateTo,
    rate_minor: input.rateMinor,
  });

  if (overrideError) return { error: overrideError.message };

  return { success: true };
}
