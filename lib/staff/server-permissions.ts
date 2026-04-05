import { cookies } from "next/headers";
import { forbidden } from "next/navigation";
import { ACTIVE_PROPERTY_COOKIE } from "@/lib/pms/property-cookie";
import { createClient } from "@/lib/supabase/server";

export async function getActivePropertyId(): Promise<string | null> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(ACTIVE_PROPERTY_COOKIE)?.value?.trim();
  if (fromCookie) return fromCookie;

  // No cookie set yet (e.g. first login) — fall back to the first property in the user's org
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) return null;

  const { data: firstProperty } = await supabase
    .from("properties")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .order("name", { ascending: true })
    .limit(1)
    .maybeSingle();

  return firstProperty?.id ?? null;
}

/**
 * Check if the current authenticated user has a specific permission for the given property.
 */
export async function hasPermission(propertyId: string, permissionKey: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_user_has_permission", {
    p_property_id: propertyId,
    p_permission: permissionKey,
  });

  if (error) {
    console.error(`Error checking permission ${permissionKey}:`, error);
    return false;
  }
  
  return data === true;
}

/**
 * Throws an error if the user doesn't have the permission for the active property.
 * If propertyId is omitted, it uses the active property ID from cookies.
 */
export async function requirePermission(permissionKey: string, propertyId?: string) {
  const activePropertyId = propertyId ?? (await getActivePropertyId());
  
  if (!activePropertyId) {
    throw new Error("No active property selected");
  }

  const authorized = await hasPermission(activePropertyId, permissionKey);
  
  if (!authorized) {
    forbidden();
  }
}

/**
 * Helper to get all permissions for the current user at the active property.
 */
export async function getCurrentUserPermissions(propertyId?: string): Promise<string[]> {
  const activePropertyId = propertyId ?? (await getActivePropertyId());
  if (!activePropertyId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_user_permissions", {
    p_property_id: activePropertyId,
  });

  if (error) {
    console.error("Error fetching permissions:", error);
    return [];
  }

  return Array.isArray(data) ? data.map((d: any) => d.permission_key) : [];
}
