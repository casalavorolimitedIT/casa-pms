import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { createClient } from "@/lib/supabase/server";
import {
  assignStaffRole,
  currentUserCanManageStaffAccess,
  getOrgProperties,
  getOrgStaff,
  removeStaffRole,
  updateStaffProfile,
} from "@/app/dashboard/staff/actions/staff-actions";
import { ALL_STAFF_ROLES, ROLE_COLORS, STAFF_ROLE_LABELS } from "@/lib/staff/roles";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";

interface StaffDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}

export default async function StaffDetailPage({ params, searchParams }: StaffDetailPageProps) {
  await redirectIfNotAuthenticated();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ id }, query, { staff, error }, propertyResult, canManageAccess] = await Promise.all([
    params,
    searchParams,
    getOrgStaff(),
    getOrgProperties(),
    currentUserCanManageStaffAccess(),
  ]);

  const member = (staff ?? []).find((entry) => entry.userId === id);

  if (!member) {
    notFound();
  }

  const canEditProfile = canManageAccess || user?.id === member.userId;
  const properties = propertyResult.properties ?? [];

  async function saveProfileAction(formData: FormData) {
    "use server";

    const result = await updateStaffProfile(formData);

    if (result?.error) {
      redirect(`/dashboard/staff/${id}?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/staff/${id}?ok=Staff+profile+updated`);
  }

  async function changeStatusAction(formData: FormData) {
    "use server";

    const result = await updateStaffProfile(formData);

    if (result?.error) {
      redirect(`/dashboard/staff/${id}?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/staff/${id}?ok=Staff+status+updated`);
  }

  async function assignRoleAction(formData: FormData) {
    "use server";

    const result = await assignStaffRole(formData);

    if (result?.error) {
      redirect(`/dashboard/staff/${id}?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/staff/${id}?ok=Role+assignment+saved`);
  }

  async function removeRoleAction(formData: FormData) {
    "use server";

    const result = await removeStaffRole(formData);

    if (result?.error) {
      redirect(`/dashboard/staff/${id}?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/staff/${id}?ok=Role+assignment+removed`);
  }

  const initials = [
    member.fullName?.split(" ")[0]?.[0],
    member.fullName?.split(" ").at(-1)?.[0],
  ]
    .filter(Boolean)
    .join("")
    .toUpperCase() || member.email[0].toUpperCase();

  return (
    <div className="page-shell">
      <div className="page-container max-w-4xl space-y-6">
        <FormStatusToast error={query.error} ok={query.ok} successTitle="Staff updated" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-lg font-semibold text-zinc-700">
              {initials}
            </div>
            <div>
              <h1 className="page-title">{member.fullName ?? member.email}</h1>
              <p className="page-subtitle">
                {member.email}
                {member.jobTitle ? ` • ${member.jobTitle}` : ""}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/staff">Back to Staff</Link>
          </Button>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>
                {canEditProfile
                  ? "Update staff contact details and account status."
                  : "You can view this staff profile but you do not have permission to edit it."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={saveProfileAction} className="grid gap-4">
                <input type="hidden" name="userId" value={member.userId} />
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-zinc-800">Full name</span>
                    <Input name="fullName" defaultValue={member.fullName ?? ""} disabled={!canEditProfile} />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-zinc-800">Email</span>
                    <Input value={member.email} disabled />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-zinc-800">Job title</span>
                    <Input name="jobTitle" defaultValue={member.jobTitle ?? ""} disabled={!canEditProfile} />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-zinc-800">Phone</span>
                    <Input name="phone" defaultValue={member.phone ?? ""} disabled={!canEditProfile} />
                  </label>
                </div>
                {canEditProfile ? (
                  <div className="flex justify-end">
                    <FormSubmitButton idleText="Save profile" pendingText="Saving..." className="bg-[#ff6900] text-white hover:bg-[#e55f00]" />
                  </div>
                ) : null}
              </form>
            </CardContent>
          </Card>

          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Account Status</CardTitle>
              <CardDescription>
                Owners and general managers can suspend or restore PMS access for this staff member.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900">Current status</p>
                  <p className="text-xs text-muted-foreground">Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
                </div>
                <Badge variant={member.isActive ? "default" : "secondary"} className="rounded-full px-3 py-1">
                  {member.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              {canManageAccess ? (
                <form action={changeStatusAction} className="flex justify-end">
                  <input type="hidden" name="userId" value={member.userId} />
                  <input type="hidden" name="isActive" value={member.isActive ? "false" : "true"} />
                  <FormSubmitButton
                    idleText={member.isActive ? "Deactivate access" : "Reactivate access"}
                    pendingText="Updating..."
                    variant={member.isActive ? "outline" : "default"}
                    className={member.isActive ? "border-red-200 text-red-700 hover:bg-red-50" : "bg-[#ff6900] text-white hover:bg-[#e55f00]"}
                  />
                </form>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Property Roles</CardTitle>
            <CardDescription>
              Current property assignments for this staff member.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {member.roles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {member.roles.map((role) => (
                  <div key={role.roleAssignmentId} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${ROLE_COLORS[role.role]}`}>
                    <span>{STAFF_ROLE_LABELS[role.role]}</span>
                    <span className="opacity-70">@ {role.propertyName}</span>
                    {canManageAccess ? (
                      <form action={removeRoleAction}>
                        <input type="hidden" name="roleAssignmentId" value={role.roleAssignmentId} />
                        <button type="submit" className="rounded-full bg-black/8 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                          Remove
                        </button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                No property role assigned yet.
              </div>
            )}

            {canManageAccess ? (
              <form action={assignRoleAction} className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="userId" value={member.userId} />
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-zinc-800">Property</span>
                  <select
                    name="propertyId"
                    required
                    defaultValue=""
                    className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="" disabled>
                      Select property
                    </option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-zinc-800">Role</span>
                  <select
                    name="role"
                    required
                    defaultValue=""
                    className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="" disabled>
                      Select role
                    </option>
                    {ALL_STAFF_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {STAFF_ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <FormSubmitButton idleText="Assign role" pendingText="Assigning..." className="w-full bg-[#ff6900] text-white hover:bg-[#e55f00]" />
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}