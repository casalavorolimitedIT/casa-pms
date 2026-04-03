"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendStaffWelcomeEmail } from "@/lib/email/mailer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserOrganizationId } from "@/app/dashboard/actions/property-actions";
import {
  ALL_STAFF_ROLES,
  STAFF_ROLE_VALUES,
  type StaffMember,
  type StaffRole,
} from "@/lib/staff/roles";

function revalidateStaffPaths() {
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/staff/access");
}

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const AssignRoleSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  propertyId: z.string().uuid("Invalid property ID"),
  role: z.enum(STAFF_ROLE_VALUES),
});

const UpdateProfileSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(1).max(120).optional(),
  jobTitle: z.string().max(80).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

const BulkStaffRowSchema = z.object({
  email: z.string().email("Invalid email in row"),
  full_name: z.string().min(1).max(120),
  job_title: z.string().max(80).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  property_id: z.string().uuid("property_id must be a valid UUID"),
  role: z.enum(STAFF_ROLE_VALUES),
});

export interface OrgProperty {
  id: string;
  name: string;
}

export interface RolePermissionMatrixEntry {
  role: StaffRole;
  permissions: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrgStaff(): Promise<{ staff?: StaffMember[]; error?: string }> {
  const supabase = await createClient();
  const orgId = await getUserOrganizationId();
  if (!orgId) return { error: "No organization linked to your account." };

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, job_title, phone, avatar_url, is_active, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  if (profileError) return { error: profileError.message };
  if (!profiles || profiles.length === 0) return { staff: [] };

  const userIds = profiles.map((p) => p.id);

  const { data: roleRows, error: roleError } = await supabase
    .from("user_property_roles")
    .select("id, user_id, property_id, role, created_at, properties(name)")
    .in("user_id", userIds);

  if (roleError) return { error: roleError.message };

  const rolesByUser = new Map<string, StaffMember["roles"]>();
  for (const r of roleRows ?? []) {
    if (!rolesByUser.has(r.user_id)) rolesByUser.set(r.user_id, []);
    const propName =
      r.properties && typeof r.properties === "object" && "name" in r.properties
        ? (r.properties as { name: string }).name
        : "Unknown property";
    rolesByUser.get(r.user_id)!.push({
      roleAssignmentId: r.id,
      propertyId: r.property_id,
      propertyName: propName,
      role: r.role as StaffRole,
      assignedAt: r.created_at,
    });
  }

  const staff: StaffMember[] = profiles.map((p) => ({
    userId: p.id,
    email: p.email,
    fullName: p.full_name,
    jobTitle: p.job_title,
    phone: p.phone,
    avatarUrl: p.avatar_url,
    isActive: p.is_active ?? true,
    joinedAt: p.created_at,
    roles: rolesByUser.get(p.id) ?? [],
  }));

  return { staff };
}

export async function getPropertyStaff(
  propertyId: string
): Promise<{ staff?: StaffMember[]; error?: string }> {
  const supabase = await createClient();

  const { data: roleRows, error: roleError } = await supabase
    .from("user_property_roles")
    .select("id, user_id, property_id, role, created_at, properties(name)")
    .eq("property_id", propertyId);

  if (roleError) return { error: roleError.message };
  if (!roleRows || roleRows.length === 0) return { staff: [] };

  const userIds = roleRows.map((r) => r.user_id);

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, job_title, phone, avatar_url, is_active, created_at")
    .in("id", userIds);

  if (profileError) return { error: profileError.message };

  const staff: StaffMember[] = (profiles ?? []).map((p) => {
    const fallbackName =
      roleRows[0]?.properties &&
      typeof roleRows[0].properties === "object" &&
      "name" in roleRows[0].properties
        ? (roleRows[0].properties as { name: string }).name
        : "Unknown property";

    return {
      userId: p.id,
      email: p.email,
      fullName: p.full_name,
      jobTitle: p.job_title,
      phone: p.phone,
      avatarUrl: p.avatar_url,
      isActive: p.is_active ?? true,
      joinedAt: p.created_at,
      roles: roleRows
        .filter((r) => r.user_id === p.id)
        .map((r) => ({
          roleAssignmentId: r.id,
          propertyId: r.property_id,
          propertyName:
            r.properties && typeof r.properties === "object" && "name" in r.properties
              ? (r.properties as { name: string }).name
              : fallbackName,
          role: r.role as StaffRole,
          assignedAt: r.created_at,
        })),
    };
  });

  return { staff };
}

export async function getOrgProperties(): Promise<{ properties?: OrgProperty[]; error?: string }> {
  const supabase = await createClient();
  const orgId = await getUserOrganizationId();

  if (!orgId) {
    return { error: "No organization linked to your account." };
  }

  const { data, error } = await supabase
    .from("properties")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return {
    properties: (data ?? []).map((property) => ({ id: property.id, name: property.name })),
  };
}

export async function getRolePermissionMatrix(): Promise<{
  matrix?: RolePermissionMatrixEntry[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("permissions")
    .select("role, permission_key")
    .in("role", ALL_STAFF_ROLES)
    .order("role", { ascending: true })
    .order("permission_key", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  const grouped = new Map<StaffRole, string[]>();

  for (const role of ALL_STAFF_ROLES) {
    grouped.set(role, []);
  }

  for (const row of data ?? []) {
    const role = row.role as StaffRole;
    if (!grouped.has(role)) continue;
    grouped.get(role)?.push(row.permission_key);
  }

  return {
    matrix: ALL_STAFF_ROLES.map((role) => ({
      role,
      permissions: grouped.get(role) ?? [],
    })),
  };
}

export async function currentUserCanManageStaffAccess(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_user_can_manage_staff_access");

  if (error) {
    return false;
  }

  return Boolean(data);
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export async function assignStaffRole(formData: FormData) {
  if (!(await currentUserCanManageStaffAccess())) {
    return { error: "Only owners and general managers can manage staff access." };
  }

  const parsed = AssignRoleSchema.safeParse({
    userId: formData.get("userId"),
    propertyId: formData.get("propertyId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("user_property_roles").upsert(
    {
      user_id: parsed.data.userId,
      property_id: parsed.data.propertyId,
      role: parsed.data.role,
    },
    { onConflict: "user_id,property_id,role" }
  );

  if (error) return { error: error.message };

  revalidateStaffPaths();
  return { success: true };
}

export async function removeStaffRole(formData: FormData) {
  if (!(await currentUserCanManageStaffAccess())) {
    return { error: "Only owners and general managers can manage staff access." };
  }

  const roleAssignmentId = formData.get("roleAssignmentId");
  if (typeof roleAssignmentId !== "string" || !roleAssignmentId) {
    return { error: "Invalid role assignment ID." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("user_property_roles")
    .delete()
    .eq("id", roleAssignmentId);

  if (error) return { error: error.message };

  revalidateStaffPaths();
  return { success: true };
}

export async function updateStaffProfile(formData: FormData) {
  const parsed = UpdateProfileSchema.safeParse({
    userId: formData.get("userId"),
    fullName: formData.get("fullName") ?? undefined,
    jobTitle: formData.get("jobTitle") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    isActive:
      formData.get("isActive") === "true"
        ? true
        : formData.get("isActive") === "false"
        ? false
        : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { userId, ...fields } = parsed.data;
  const supabase = await createClient();
  const orgId = await getUserOrganizationId();
  if (!orgId) return { error: "No organization linked to your account." };

  const updates: Record<string, unknown> = {};
  if (fields.fullName !== undefined) updates.full_name = fields.fullName;
  if (fields.jobTitle !== undefined) updates.job_title = fields.jobTitle || null;
  if (fields.phone !== undefined) updates.phone = fields.phone || null;
  if (fields.isActive !== undefined) updates.is_active = fields.isActive;

  if (Object.keys(updates).length === 0) return { success: true };

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  revalidateStaffPaths();
  return { success: true };
}

export async function deactivateStaff(formData: FormData) {
  const userId = formData.get("userId");
  if (typeof userId !== "string") return { error: "Invalid user." };

  const supabase = await createClient();
  const orgId = await getUserOrganizationId();
  if (!orgId) return { error: "No organization linked to your account." };

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: false })
    .eq("id", userId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  revalidateStaffPaths();
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk import
// ─────────────────────────────────────────────────────────────────────────────

function generateTempPassword(): string {
  // 16 chars from an unambiguous set that satisfies common strength requirements
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  const bytes = randomBytes(16);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

/**
 * Look up a user's UUID from auth.users by email using the GoTrue admin REST
 * endpoint. The JS SDK's auth.admin.listUsers() does not support email
 * filtering, so we call the underlying HTTP endpoint directly.
 */
async function findAuthUserIdByEmail(email: string): Promise<string | undefined> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) return undefined;
  try {
    const res = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&page=1&per_page=10`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );
    if (!res.ok) return undefined;
    const body = await res.json() as { users?: Array<{ id: string; email: string }> };
    // Match exactly — GoTrue filter is a substring search
    return body.users?.find((u) => u.email === email)?.id;
  } catch {
    return undefined;
  }
}

export interface BulkImportRow {
  email: string;
  full_name: string;
  job_title?: string;
  phone?: string;
  property_id: string;
  role: string;
}

export interface BulkImportResult {
  succeeded: number;
  /** New accounts created this run — each entry has a one-time temp password to share. */
  created: Array<{ row: number; email: string; tempPassword: string }>;
  failed: Array<{ row: number; email: string; error: string }>;
}

export async function bulkImportStaff(rows: BulkImportRow[]): Promise<BulkImportResult> {
  if (!(await currentUserCanManageStaffAccess())) {
    return {
      succeeded: 0,
      created: [],
      failed: rows.map((row, index) => ({
        row: index + 2,
        email: row.email,
        error: "Only owners and general managers can manage staff access.",
      })),
    };
  }

  const adminClient = createAdminClient();
  const orgId = await getUserOrganizationId();

  if (!orgId) {
    return {
      succeeded: 0,
      created: [],
      failed: rows.map((r, i) => ({ row: i + 2, email: r.email, error: "No organization linked." })),
    };
  }

  const result: BulkImportResult = { succeeded: 0, created: [], failed: [] };

  // Pre-fetch property names for welcome emails (best-effort — no failure on miss)
  const propertyIds = [...new Set(rows.map((r) => r.property_id).filter(Boolean))];
  const { data: propertyRows } = await adminClient
    .from("properties")
    .select("id, name")
    .in("id", propertyIds);
  const propertyNameMap = new Map<string, string>(
    (propertyRows ?? []).map((p: { id: string; name: string }) => [p.id, p.name])
  );

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/login`;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // 1-based, row 1 is the header
    const raw = rows[i];

    const parsed = BulkStaffRowSchema.safeParse(raw);
    if (!parsed.success) {
      result.failed.push({
        row: rowNum,
        email: raw.email ?? "",
        error: parsed.error.issues[0]?.message ?? "Validation failed",
      });
      continue;
    }

    const { email, full_name, job_title, phone, property_id, role } = parsed.data;

    // ── 1. Create auth user with a generated temp password ─────────────────
    // email_confirm:true skips the confirmation email; staff can log in immediately.
    // Service role bypasses email-uniqueness guards and RLS everywhere.
    const tempPassword = generateTempPassword();
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    let userId: string | undefined = createData?.user?.id;
    let showCredentials = !!userId; // true only when we have a fresh/reset password to display

    // ── 2. Handle "user already exists" ────────────────────────────────────
    if (!userId && createError) {
      const msg = createError.message.toLowerCase();
      const alreadyExists =
        msg.includes("already") ||
        msg.includes("duplicate") ||
        (createError as { code?: string }).code === "email_exists";

      if (alreadyExists) {
        // Look up the auth user via the GoTrue admin REST endpoint.
        // We cannot rely on pms.profiles here — the profile may not exist yet
        // (which is exactly the state we are trying to fix).
        userId = await findAuthUserIdByEmail(email);

        if (userId) {
          // Reset to a new temp password so we can surface credentials to the
          // admin and the staff member still gets a working login.
          const { error: pwError } = await adminClient.auth.admin.updateUserById(userId, {
            password: tempPassword,
            email_confirm: true,
          });
          if (!pwError) {
            showCredentials = true;
          }
        }
      }

      if (!userId) {
        result.failed.push({ row: rowNum, email, error: createError.message });
        continue;
      }
    }

    if (!userId) {
      result.failed.push({ row: rowNum, email, error: "Could not resolve user ID." });
      continue;
    }

    // ── 3. Upsert profile (admin client bypasses RLS) ───────────────────────
    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        id: userId,
        organization_id: orgId,
        email,
        full_name,
        job_title: job_title || null,
        phone: phone || null,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      result.failed.push({ row: rowNum, email, error: profileError.message });
      continue;
    }

    // ── 4. Upsert role assignment (admin client bypasses RLS) ───────────────
    const { error: roleError } = await adminClient.from("user_property_roles").upsert(
      { user_id: userId, property_id, role },
      { onConflict: "user_id,property_id,role" }
    );

    if (roleError) {
      result.failed.push({ row: rowNum, email, error: roleError.message });
      continue;
    }

    result.succeeded++;
    if (showCredentials) {
      result.created.push({ row: rowNum, email, tempPassword });

      // Send welcome email — fire-and-forget; don't fail the import if email errors
      sendStaffWelcomeEmail({
        to: email,
        fullName: full_name,
        role,
        propertyName: propertyNameMap.get(property_id),
        tempPassword,
        loginUrl,
      }).catch((err: unknown) => {
        console.error(`[staff-import] Failed to send welcome email to ${email}:`, err);
      });
    }
  }

  if (result.succeeded > 0) revalidateStaffPaths();
  return result;
}
