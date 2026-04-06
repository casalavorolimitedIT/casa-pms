"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { getScopedPropertiesForCurrentUser } from "@/lib/pms/property-scope";
import { hasPermission } from "@/lib/staff/server-permissions";
import {
  applyPropertyRateOverride,
  createChainRatePlanRecord,
  pushChainRatePlanToProperty,
} from "@/lib/pms/rates-chain";

const CreateChainPlanSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional().or(z.literal("")),
});

const PushSchema = z.object({
  chainRatePlanId: z.string().uuid(),
  propertyIds: z.array(z.string().uuid()).min(1),
});

const OverrideSchema = z.object({
  assignmentId: z.string().uuid(),
  roomTypeId: z.string().uuid(),
  dateFrom: z.string().date(),
  dateTo: z.string().date(),
  rateMinor: z.coerce.number().int().min(0),
});

async function getOrgAndUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { orgId: "", userId: "" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  return { orgId: profile?.organization_id ?? "", userId: user.id };
}

async function ensureCanManageRatesAtActiveProperty() {
  const activePropertyId = await getActivePropertyId();
  if (!activePropertyId) return { error: "No active property selected" };
  const canManage = await hasPermission(activePropertyId, "rates.manage");
  if (!canManage) return { error: "Rates manage permission is required" };
  return { activePropertyId };
}

export async function createChainRatePlan(formData: FormData) {
  const gate = await ensureCanManageRatesAtActiveProperty();
  if ("error" in gate) return gate;

  const parsed = CreateChainPlanSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid chain plan input" };

  const { orgId, userId } = await getOrgAndUser();
  if (!orgId) return { error: "No organization linked to current user" };

  const result = await createChainRatePlanRecord({
    organizationId: orgId,
    name: parsed.data.name,
    description: parsed.data.description || undefined,
    createdBy: userId,
  });

  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/rates/chain");
  return { success: true, chainRatePlanId: result.chainRatePlanId };
}

export async function pushChainRateToProperties(formData: FormData) {
  const parsed = PushSchema.safeParse({
    chainRatePlanId: formData.get("chainRatePlanId"),
    propertyIds: formData.getAll("propertyIds"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid push input" };

  for (const propertyId of parsed.data.propertyIds) {
    const canManage = await hasPermission(propertyId, "rates.manage");
    if (!canManage) {
      return { error: `Missing rates.manage permission for property ${propertyId.slice(0, 8)}` };
    }

    const result = await pushChainRatePlanToProperty({
      chainRatePlanId: parsed.data.chainRatePlanId,
      propertyId,
    });

    if (result.error) return { error: result.error };
  }

  revalidatePath("/dashboard/rates/chain");
  revalidatePath("/dashboard/rates");
  return { success: true };
}

export async function overridePropertyRate(formData: FormData) {
  const parsed = OverrideSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    roomTypeId: formData.get("roomTypeId"),
    dateFrom: formData.get("dateFrom"),
    dateTo: formData.get("dateTo"),
    rateMinor: formData.get("rateMinor"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid override input" };
  if (parsed.data.dateFrom > parsed.data.dateTo) return { error: "From date cannot be after To date" };

  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("chain_rate_plan_assignments")
    .select("id, property_id")
    .eq("id", parsed.data.assignmentId)
    .maybeSingle();

  if (!assignment) return { error: "Assignment not found" };

  const canManage = await hasPermission(assignment.property_id, "rates.manage");
  if (!canManage) return { error: "Missing rates.manage permission for target property" };

  const result = await applyPropertyRateOverride({
    assignmentId: parsed.data.assignmentId,
    roomTypeId: parsed.data.roomTypeId,
    dateFrom: parsed.data.dateFrom,
    dateTo: parsed.data.dateTo,
    rateMinor: parsed.data.rateMinor,
  });

  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/rates/chain");
  return { success: true };
}

export async function getChainRateContext() {
  const scoped = await getScopedPropertiesForCurrentUser();
  if (!scoped.organizationId) {
    return {
      plans: [],
      properties: [],
      assignments: [],
      roomTypes: [],
      overrides: [],
    };
  }

  const manageableProperties = [] as typeof scoped.properties;
  for (const property of scoped.properties) {
    const canManage = await hasPermission(property.id, "rates.manage");
    if (canManage) manageableProperties.push(property);
  }

  const propertyIds = manageableProperties.map((property) => property.id);
  if (propertyIds.length === 0) {
    return {
      plans: [],
      properties: [],
      assignments: [],
      roomTypes: [],
      overrides: [],
    };
  }

  const supabase = await createClient();

  const [plansRes, assignmentsRes, roomTypesRes, overridesRes] = await Promise.all([
    supabase
      .from("chain_rate_plans")
      .select("id, name, description, is_active, created_at")
      .eq("organization_id", scoped.organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("chain_rate_plan_assignments")
      .select("id, chain_rate_plan_id, property_id, property_rate_plan_id, override_allowed, properties(name), chain_rate_plans(name)")
      .in("property_id", propertyIds)
      .order("created_at", { ascending: false })
      .limit(400),
    supabase
      .from("room_types")
      .select("id, property_id, name")
      .in("property_id", propertyIds)
      .order("name", { ascending: true })
      .limit(500),
    supabase
      .from("chain_rate_plan_overrides")
      .select("id, assignment_id, room_type_id, date_from, date_to, rate_minor, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const assignmentIds = new Set((assignmentsRes.data ?? []).map((row) => row.id));
  const overrides = (overridesRes.data ?? []).filter((row) => assignmentIds.has(row.assignment_id));

  return {
    plans: plansRes.data ?? [],
    properties: manageableProperties,
    assignments: assignmentsRes.data ?? [],
    roomTypes: roomTypesRes.data ?? [],
    overrides,
  };
}
