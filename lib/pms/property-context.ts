import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_PROPERTY_COOKIE } from "@/lib/pms/property-cookie";

export async function getActivePropertyId() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return process.env.DEMO_PROPERTY_ID?.trim() ?? "";
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  const organizationId = profile?.organization_id;
  if (!organizationId) {
    return process.env.DEMO_PROPERTY_ID?.trim() ?? "";
  }

  const { data: userProperties } = await supabase
    .from("properties")
    .select("id")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  const allowedPropertyIds = new Set((userProperties ?? []).map((property) => property.id));

  const cookieStore = await cookies();
  const cookiePropertyId = cookieStore.get(ACTIVE_PROPERTY_COOKIE)?.value?.trim() ?? "";

  if (cookiePropertyId && allowedPropertyIds.has(cookiePropertyId)) {
    return cookiePropertyId;
  }

  const firstPropertyId = userProperties?.[0]?.id;
  if (firstPropertyId) {
    return firstPropertyId;
  }

  return process.env.DEMO_PROPERTY_ID?.trim() ?? "";
}

export async function requireActivePropertyId() {
  const activePropertyId = await getActivePropertyId();
  if (!activePropertyId) {
    throw new Error("No active property selected");
  }

  return activePropertyId;
}

export async function assertActivePropertyAccess(propertyId: string) {
  const activePropertyId = await requireActivePropertyId();
  if (propertyId !== activePropertyId) {
    throw new Error("Operation is not allowed outside the active property");
  }

  return activePropertyId;
}