"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserOrganizationId } from "@/app/dashboard/actions/property-actions";
import { currentUserCanManageStaffAccess } from "@/app/dashboard/staff/actions/staff-actions";
import { ALL_STAFF_ROLES, STAFF_ROLE_VALUES, type StaffRole } from "@/lib/staff/roles";

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const UpdateOrgSchema = z.object({
  name: z.string().min(2).max(120),
});

const UpdatePropertyBaseSchema = z.object({
  propertyId: z.string().uuid("Invalid property ID"),
  name: z.string().min(2).max(120),
  currencyCode: z.string().length(3, "Currency code must be 3 characters"),
  timezone: z.string().min(2).max(80),
  checkInTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:MM format")
    .default("15:00"),
  checkOutTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:MM format")
    .default("11:00"),
});

const TogglePermissionSchema = z.object({
  role: z.enum(STAFF_ROLE_VALUES),
  permissionKey: z.string().min(3).max(120),
  enable: z.enum(["true", "false"]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface OrgSettings {
  id: string;
  name: string;
  createdAt: string;
}

export interface PropertyWithSettings {
  id: string;
  name: string;
  currencyCode: string;
  timezone: string;
  checkInTime: string;
  checkOutTime: string;
}

export interface PermissionEntry {
  role: StaffRole;
  permissionKey: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrgSettings(): Promise<{ settings?: OrgSettings; error?: string }> {
  const supabase = await createClient();
  const orgId = await getUserOrganizationId();
  if (!orgId) return { error: "No organization linked to your account." };

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, created_at")
    .eq("id", orgId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Organization not found." };

  return {
    settings: {
      id: data.id,
      name: data.name,
      createdAt: data.created_at,
    },
  };
}

export async function getPropertiesWithSettings(): Promise<{
  properties?: PropertyWithSettings[];
  error?: string;
}> {
  const supabase = await createClient();
  const orgId = await getUserOrganizationId();
  if (!orgId) return { error: "No organization linked to your account." };

  const { data: properties, error: propError } = await supabase
    .from("properties")
    .select("id, name, currency_code, timezone")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });

  if (propError) return { error: propError.message };
  if (!properties || properties.length === 0) return { properties: [] };

  const propertyIds = properties.map((p) => p.id);

  const { data: settingsRows, error: settingsError } = await supabase
    .from("property_settings")
    .select("property_id, check_in_time, check_out_time")
    .in("property_id", propertyIds);

  if (settingsError) return { error: settingsError.message };

  const settingsMap = new Map<string, { checkInTime: string; checkOutTime: string }>();
  for (const row of settingsRows ?? []) {
    settingsMap.set(row.property_id, {
      checkInTime: (row.check_in_time as string).slice(0, 5),
      checkOutTime: (row.check_out_time as string).slice(0, 5),
    });
  }

  return {
    properties: properties.map((p) => ({
      id: p.id,
      name: p.name,
      currencyCode: p.currency_code,
      timezone: p.timezone,
      checkInTime: settingsMap.get(p.id)?.checkInTime ?? "15:00",
      checkOutTime: settingsMap.get(p.id)?.checkOutTime ?? "11:00",
    })),
  };
}

export async function getAllPermissions(): Promise<{
  permissions?: PermissionEntry[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("permissions")
    .select("role, permission_key")
    .in("role", ALL_STAFF_ROLES)
    .order("role", { ascending: true })
    .order("permission_key", { ascending: true });

  if (error) return { error: error.message };

  return {
    permissions: (data ?? []).map((row) => ({
      role: row.role as StaffRole,
      permissionKey: row.permission_key,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export async function updateOrgSettings(formData: FormData) {
  if (!(await currentUserCanManageStaffAccess())) {
    return { error: "Only owners and general managers can update organization settings." };
  }

  const parsed = UpdateOrgSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const orgId = await getUserOrganizationId();
  if (!orgId) return { error: "No organization linked to your account." };

  const { error } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name })
    .eq("id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings/general");
  return { success: true };
}

export async function updatePropertySettings(formData: FormData) {
  if (!(await currentUserCanManageStaffAccess())) {
    return { error: "Only owners and general managers can update property settings." };
  }

  const parsed = UpdatePropertyBaseSchema.safeParse({
    propertyId: formData.get("propertyId"),
    name: formData.get("name"),
    currencyCode: formData.get("currencyCode"),
    timezone: formData.get("timezone"),
    checkInTime: formData.get("checkInTime"),
    checkOutTime: formData.get("checkOutTime"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const orgId = await getUserOrganizationId();
  if (!orgId) return { error: "No organization linked to your account." };

  // Update property's core fields
  const { error: propError } = await supabase
    .from("properties")
    .update({
      name: parsed.data.name,
      currency_code: parsed.data.currencyCode.toUpperCase(),
      timezone: parsed.data.timezone,
    })
    .eq("id", parsed.data.propertyId)
    .eq("organization_id", orgId);

  if (propError) return { error: propError.message };

  // Upsert property_settings
  const { error: settingsError } = await supabase.from("property_settings").upsert(
    {
      property_id: parsed.data.propertyId,
      check_in_time: parsed.data.checkInTime,
      check_out_time: parsed.data.checkOutTime,
    },
    { onConflict: "property_id" }
  );

  if (settingsError) return { error: settingsError.message };

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings/property");
  return { success: true };
}

export async function toggleRolePermission(formData: FormData) {
  if (!(await currentUserCanManageStaffAccess())) {
    return { error: "Only owners and general managers can modify role permissions." };
  }

  const parsed = TogglePermissionSchema.safeParse({
    role: formData.get("role"),
    permissionKey: formData.get("permissionKey"),
    enable: formData.get("enable"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { role, permissionKey, enable } = parsed.data;
  const supabase = await createClient();

  if (enable === "true") {
    const { error } = await supabase
      .from("permissions")
      .upsert({ role, permission_key: permissionKey }, { onConflict: "role,permission_key" });

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("permissions")
      .delete()
      .eq("role", role)
      .eq("permission_key", permissionKey);

    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard/settings/roles");
  return { success: true };
}
