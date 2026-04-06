"use server";

import { cookies } from "next/headers";
import { ACTIVE_PROPERTY_COOKIE } from "@/lib/pms/property-cookie";
import { getScopedPropertiesForCurrentUser } from "@/lib/pms/property-scope";
import { type PropertySwitcherItem } from "./property-actions";

export async function getPropertySwitcherData(): Promise<{
  properties: PropertySwitcherItem[];
  selectedId: string;
}> {
  const scoped = await getScopedPropertiesForCurrentUser();
  if (!scoped.organizationId) {
    return { properties: [], selectedId: "" };
  }

  const properties: PropertySwitcherItem[] = scoped.properties.map((row) => ({
    id: row.id,
    name: row.name,
    currencyCode: row.currency_code ?? "USD",
    timezone: row.timezone ?? "UTC",
  }));

  const cookieStore = await cookies();
  const cookieSelectedId = cookieStore.get(ACTIVE_PROPERTY_COOKIE)?.value?.trim() ?? "";
  const selectedExists = properties.some((property) => property.id === cookieSelectedId);
  const selectedId = selectedExists ? cookieSelectedId : properties[0]?.id ?? "";

  return { properties, selectedId };
}
