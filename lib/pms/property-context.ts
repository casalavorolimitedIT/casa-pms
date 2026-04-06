import { cookies } from "next/headers";
import { ACTIVE_PROPERTY_COOKIE } from "@/lib/pms/property-cookie";
import { getScopedPropertiesForCurrentUser } from "@/lib/pms/property-scope";

export async function getActivePropertyId() {
  const scoped = await getScopedPropertiesForCurrentUser();
  if (!scoped.userId) {
    return process.env.DEMO_PROPERTY_ID?.trim() ?? "";
  }

  const allowedPropertyIds = new Set(scoped.properties.map((property) => property.id));

  const cookieStore = await cookies();
  const cookiePropertyId = cookieStore.get(ACTIVE_PROPERTY_COOKIE)?.value?.trim() ?? "";

  if (cookiePropertyId && allowedPropertyIds.has(cookiePropertyId)) {
    return cookiePropertyId;
  }

  const firstPropertyId = scoped.properties[0]?.id;
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