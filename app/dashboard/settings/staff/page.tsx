import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import Link from "next/link";
import { currentUserCanManageStaffAccess, getOrgStaff } from "@/app/dashboard/staff/actions/staff-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROLE_COLORS, STAFF_ADMIN_ROLES, STAFF_ROLE_LABELS } from "@/lib/staff/roles";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroupIcon, Add01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

export default async function StaffSettingsPage() {
  await redirectIfNotAuthenticated();

  const [canManage, staffResult] = await Promise.all([
    currentUserCanManageStaffAccess(),
    getOrgStaff(),
  ]);

  const staff = staffResult.staff ?? [];
  const activeStaff = staff.filter((s) => s.isActive);
  const adminStaff = staff.filter((s) =>
    s.roles.some((r) => STAFF_ADMIN_ROLES.includes(r.role))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Staff</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Manage your team, assign property access, and control who can do what.
          </p>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/staff">View All Staff</Link>
            </Button>
            <Button asChild size="sm" className="bg-[#ff6900] text-white hover:bg-[#e55f00]">
              <Link href="/dashboard/staff/invite">
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="mr-1.5 size-4" />
                Invite Staff
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      {staffResult.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {staffResult.error}
        </div>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="border-zinc-200/80">
          <CardHeader className="pb-2">
            <CardDescription>Total staff</CardDescription>
            <CardTitle className="text-3xl">{staff.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Across your organization
          </CardContent>
        </Card>
        <Card className="border-zinc-200/80">
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl">{activeStaff.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Currently enabled for PMS access
          </CardContent>
        </Card>
        <Card className="border-zinc-200/80 col-span-2 sm:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription>Admins</CardDescription>
            <CardTitle className="text-3xl">{adminStaff.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Owners & general managers
          </CardContent>
        </Card>
      </div>

      {/* Quick staff list (admins first, max 6) */}
      {staff.length > 0 ? (
        <Card className="border-zinc-200/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent team members</CardTitle>
                <CardDescription>Your most recently added staff members.</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/dashboard/staff">
                  View all
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...staff]
                .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
                .slice(0, 6)
                .map((member) => {
                  const initials = [
                    member.fullName?.split(" ")[0]?.[0],
                    member.fullName?.split(" ").at(-1)?.[0],
                  ]
                    .filter(Boolean)
                    .join("")
                    .toUpperCase() || member.email[0].toUpperCase();

                  return (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 px-3 py-2.5"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {member.fullName ?? member.email}
                        </p>
                        <p className="truncate text-xs text-zinc-500">{member.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {member.roles.slice(0, 2).map((role) => (
                          <span
                            key={role.roleAssignmentId}
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${ROLE_COLORS[role.role]}`}
                          >
                            {STAFF_ROLE_LABELS[role.role]}
                          </span>
                        ))}
                        {member.roles.length === 0 ? (
                          <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-500">
                            No role
                          </span>
                        ) : null}
                        {!member.isActive ? (
                          <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">
                            Inactive
                          </Badge>
                        ) : null}
                      </div>
                      {canManage ? (
                        <Button asChild variant="ghost" size="sm" className="shrink-0 text-xs">
                          <Link href={`/dashboard/staff/${member.userId}`}>Edit</Link>
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Quick action cards */}
      {canManage ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/dashboard/staff/access"
            className="group rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm transition-all hover:border-[#ff6900]/30 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 transition-all group-hover:border-[#ff6900]/30 group-hover:bg-[#ff6900]/6 group-hover:text-[#c75200]">
                <HugeiconsIcon icon={UserGroupIcon} strokeWidth={1.75} className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-zinc-900">Access Assignments</p>
                <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed">
                  Grant or revoke property-level access for each staff member.
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/settings/roles"
            className="group rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm transition-all hover:border-[#ff6900]/30 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 transition-all group-hover:border-[#ff6900]/30 group-hover:bg-[#ff6900]/6 group-hover:text-[#c75200]">
                <HugeiconsIcon icon={UserGroupIcon} strokeWidth={1.75} className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-zinc-900">Roles & Permissions</p>
                <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed">
                  Configure what each role is allowed to do in the PMS.
                </p>
              </div>
            </div>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
