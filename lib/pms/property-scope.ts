import { createClient } from "@/lib/supabase/server";

export interface ScopedProperty {
  id: string;
  name: string;
  currency_code?: string | null;
  timezone?: string | null;
}

export async function getScopedPropertiesForCurrentUser(): Promise<{
  organizationId: string;
  userId: string;
  properties: ScopedProperty[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { organizationId: "", userId: "", properties: [] };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  const organizationId = profile?.organization_id ?? "";
  if (!organizationId) {
    return { organizationId: "", userId: user.id, properties: [] };
  }

  const { data: roleRows } = await supabase
    .from("user_property_roles")
    .select("property_id")
    .eq("user_id", user.id);

  const scopedPropertyIds = Array.from(new Set((roleRows ?? []).map((row) => row.property_id)));

  const propertyQuery = supabase
    .from("properties")
    .select("id, name, currency_code, timezone")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  const { data: properties } = scopedPropertyIds.length
    ? await propertyQuery.in("id", scopedPropertyIds)
    : await propertyQuery;

  return {
    organizationId,
    userId: user.id,
    properties: (properties ?? []) as ScopedProperty[],
  };
}
