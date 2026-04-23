import { cookies } from "next/headers";
import { ACTIVE_PROPERTY_COOKIE } from "@/lib/pms/property-cookie";
import { getScopedPropertiesForCurrentUser } from "@/lib/pms/property-scope";
import type { ScopedProperty } from "@/lib/pms/property-scope";

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

// Returns the full active property object (includes currency_code, timezone etc.)
// Re-uses the already-fetched scoped properties list — no extra DB query.
export async function getActiveProperty(): Promise<ScopedProperty | null> {
  const scoped = await getScopedPropertiesForCurrentUser();
  if (!scoped.userId) return null;

  const cookieStore = await cookies();
  const cookiePropertyId = cookieStore.get(ACTIVE_PROPERTY_COOKIE)?.value?.trim() ?? "";
  const allowed = new Set(scoped.properties.map((p) => p.id));

  if (cookiePropertyId && allowed.has(cookiePropertyId)) {
    return scoped.properties.find((p) => p.id === cookiePropertyId) ?? scoped.properties[0] ?? null;
  }

  return scoped.properties[0] ?? null;
}

// Returns the ISO 4217 currency code (e.g. "NGN", "USD") for the active property.
export async function getActivePropertyCurrency(): Promise<string> {
  const property = await getActiveProperty();
  return property?.currency_code ?? "USD";
}