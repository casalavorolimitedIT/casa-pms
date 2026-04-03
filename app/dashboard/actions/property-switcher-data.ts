"use server";

import { cookies } from "next/headers";
import { ACTIVE_PROPERTY_COOKIE } from "@/lib/pms/property-cookie";
import { createClient } from "@/lib/supabase/server";
import { getUserOrganizationId, type PropertySwitcherItem } from "./property-actions";

export async function getPropertySwitcherData(): Promise<{
  properties: PropertySwitcherItem[];
  selectedId: string;
}> {
  const supabase = await createClient();
  const orgId = await getUserOrganizationId();

  if (!orgId) {
    return { properties: [], selectedId: "" };
  }

  const { data } = await supabase
    .from("properties")
    .select("id, name, currency_code, timezone")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });

  const properties: PropertySwitcherItem[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    currencyCode: row.currency_code,
    timezone: row.timezone,
  }));

  const cookieStore = await cookies();
  const cookieSelectedId = cookieStore.get(ACTIVE_PROPERTY_COOKIE)?.value?.trim() ?? "";
  const selectedExists = properties.some((property) => property.id === cookieSelectedId);
  const selectedId = selectedExists ? cookieSelectedId : properties[0]?.id ?? "";

  return { properties, selectedId };
}
