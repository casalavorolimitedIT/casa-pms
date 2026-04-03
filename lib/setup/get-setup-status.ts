import { createClient } from "@/lib/supabase/server";

export interface SetupStatus {
  user: { id: string; email?: string | null } | null;
  hasProfile: boolean;
  organizationId: string | null;
}

export async function getSetupStatus(): Promise<SetupStatus> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, hasProfile: false, organizationId: null };
  }

  const { data, error } = await supabase.rpc("current_user_profile_status");

  if (error) {
    return {
      user: { id: user.id, email: user.email },
      hasProfile: false,
      organizationId: null,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    user: { id: user.id, email: user.email },
    hasProfile: Boolean(row?.has_profile),
    organizationId: row?.organization_id ?? null,
  };
}