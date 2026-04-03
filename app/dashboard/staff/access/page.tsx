import Link from "next/link";
import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import {
  assignStaffRole,
  currentUserCanManageStaffAccess,
  getOrgProperties,
  getOrgStaff,
  getRolePermissionMatrix,
  removeStaffRole,
} from "@/app/dashboard/staff/actions/staff-actions";
import {
  ALL_STAFF_ROLES,
  ROLE_COLORS,
  ROLE_DESCRIPTIONS,
  STAFF_ADMIN_ROLES,
  STAFF_ROLE_LABELS,
  type StaffRole,
} from "@/lib/staff/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

interface AccessPageProps {
  searchParams: Promise<{ error?: string; success?: string }>;
}

function titleCase(value: string) {
  return value
    .split(/[_\.]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function groupPermissions(permissions: string[]) {
  const grouped = new Map<string, string[]>();

  for (const permission of permissions) {
    const [group] = permission.split(".");
    const key = titleCase(group ?? "general");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(permission);
  }

  return [...grouped.entries()];
}

export default async function StaffAccessPage({ searchParams }: AccessPageProps) {
  await redirectIfNotAuthenticated();

  const [canManage, staffResult, propertyResult, matrixResult, params] = await Promise.all([
    currentUserCanManageStaffAccess(),
    getOrgStaff(),
    getOrgProperties(),
    getRolePermissionMatrix(),
    searchParams,
  ]);

  if (!canManage) {
    redirect("/dashboard/staff");
  }

  async function grantAccessAction(formData: FormData) {
    "use server";

    const result = await assignStaffRole(formData);

    if (result?.error) {
      redirect(`/dashboard/staff/access?error=${encodeURIComponent(result.error)}`);
    }

    redirect("/dashboard/staff/access?success=Staff+access+updated");
  }

  async function revokeAccessAction(formData: FormData) {
    "use server";

    const result = await removeStaffRole(formData);

    if (result?.error) {
      redirect(`/dashboard/staff/access?error=${encodeURIComponent(result.error)}`);
    }

    redirect("/dashboard/staff/access?success=Role+assignment+removed");
  }

  const staff = staffResult.staff ?? [];
  const properties = propertyResult.properties ?? [];
  const permissionMatrix = matrixResult.matrix ?? [];
  const activeStaff = staff.filter((member) => member.isActive);
  const privilegedStaff = staff.filter((member) =>
    member.roles.some((role) => STAFF_ADMIN_ROLES.includes(role.role))
  );

  const errorMessage = params.error ? decodeURIComponent(params.error) : null;
  const successMessage = params.success ? decodeURIComponent(params.success) : null;

  return (
    <div className="page-shell">
      <div className="page-container space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full border border-[#ff6900]/20 bg-[#ff6900]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#c75200]">
              Access Control
            </div>
            <div>
              <h1 className="page-title">Roles & Permissions</h1>
              <p className="page-subtitle max-w-3xl">
                Owners and general managers control who can enter the PMS, what property they belong to,
                and which operational permissions each role grants.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/staff">Back to Staff</Link>
            </Button>
            <Button asChild size="sm" className="bg-[#ff6900] text-white hover:bg-[#e55f00]">
              <Link href="/dashboard/staff/invite">Invite Staff</Link>
            </Button>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {staffResult.error || propertyResult.error || matrixResult.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {staffResult.error ?? propertyResult.error ?? matrixResult.error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-[#ff6900]/15 from-white to-[#fff3eb]">
            <CardHeader>
              <CardDescription>Access owners</CardDescription>
              <CardTitle>{privilegedStaff.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Staff with owner or general manager assignments who can grant or revoke access.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Active staff</CardDescription>
              <CardTitle>{activeStaff.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Team members currently enabled for PMS access across your organization.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Available roles</CardDescription>
              <CardTitle>{ALL_STAFF_ROLES.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Canonical staff roles with database-backed permission bundles.
            </CardContent>
          </Card>
        </div>

        <Card className="border-zinc-200/80">
          <CardHeader className="pb-3">
            <CardTitle>Permission Matrix</CardTitle>
            <CardDescription>
              Each role below inherits these exact permission keys from the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-100">
              {permissionMatrix.map((entry) => {
                const groupedPermissions = groupPermissions(entry.permissions);

                return (
                  <details key={entry.role} className="group px-6">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 select-none">
                      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                        <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[entry.role]}`}>
                          {STAFF_ROLE_LABELS[entry.role]}
                        </span>
                        <span className="hidden truncate text-sm text-muted-foreground sm:block">
                          {ROLE_DESCRIPTIONS[entry.role]}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs tabular-nums">
                          {entry.permissions.length}
                        </Badge>
                        <svg
                          className="h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-150 group-open:rotate-180"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </summary>

                    <div className="pb-4 pt-1 space-y-2">
                      {groupedPermissions.map(([group, permissions]) => (
                        <div key={`${entry.role}-${group}`} className="flex flex-wrap items-start gap-1.5">
                          <span className="mt-px shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-500">
                            {group}
                          </span>
                          {permissions.map((permission) => (
                            <span
                              key={permission}
                              className="inline-flex rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600"
                            >
                              {titleCase(permission.split(".").slice(1).join(" "))}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80">
          <CardHeader>
            <CardTitle>Staff Access Assignments</CardTitle>
            <CardDescription>
              Grant or revoke property-level access. Only owner and general manager roles can use these controls.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeStaff.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-12 text-center text-sm text-muted-foreground">
                No active staff available to assign.
              </div>
            ) : (
              <div className="grid gap-4">
                {activeStaff.map((member) => {
                  const initials = [
                    member.fullName?.split(" ")[0]?.[0],
                    member.fullName?.split(" ").at(-1)?.[0],
                  ]
                    .filter(Boolean)
                    .join("")
                    .toUpperCase() || member.email[0].toUpperCase();

                  return (
                    <div key={member.userId} className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex min-w-0 flex-1 gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700">
                            {initials}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-zinc-950">{member.fullName ?? member.email}</p>
                              {member.jobTitle ? (
                                <span className="text-xs text-muted-foreground">{member.jobTitle}</span>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {member.roles.length > 0 ? (
                                member.roles.map((role) => (
                                  <form key={role.roleAssignmentId} action={revokeAccessAction}>
                                    <input type="hidden" name="roleAssignmentId" value={role.roleAssignmentId} />
                                    <button
                                      type="submit"
                                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:brightness-[0.98] ${ROLE_COLORS[role.role]}`}
                                    >
                                      <span>{STAFF_ROLE_LABELS[role.role]}</span>
                                      <span className="opacity-65">@ {role.propertyName}</span>
                                      <span className="rounded-full bg-black/6 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Remove</span>
                                    </button>
                                  </form>
                                ))
                              ) : (
                                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                  No access assigned yet
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <form action={grantAccessAction} className="grid min-w-full gap-2 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 xl:min-w-96 xl:max-w-xl xl:grid-cols-[1fr_1fr_auto]">
                          <input type="hidden" name="userId" value={member.userId} />
                          <label className="space-y-1 text-xs font-medium text-zinc-600">
                            <span>Property</span>
                            <select
                              name="propertyId"
                              required
                              defaultValue=""
                              className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none ring-0 transition-colors focus:border-[#ff6900]"
                            >
                              <option value="" disabled>
                                Choose property
                              </option>
                              {properties.map((property) => (
                                <option key={property.id} value={property.id}>
                                  {property.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-1 text-xs font-medium text-zinc-600">
                            <span>Role</span>
                            <select
                              name="role"
                              required
                              defaultValue=""
                              className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none ring-0 transition-colors focus:border-[#ff6900]"
                            >
                              <option value="" disabled>
                                Choose role
                              </option>
                              {ALL_STAFF_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {STAFF_ROLE_LABELS[role]}
                                </option>
                              ))}
                            </select>
                          </label>

                          <div className="flex items-end">
                            <FormSubmitButton
                              idleText="Grant access"
                              pendingText="Granting..."
                              className="h-10 w-full bg-[#ff6900] text-white hover:bg-[#e55f00]"
                              disabled={properties.length === 0}
                            />
                          </div>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}