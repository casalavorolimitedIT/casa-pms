import Link from "next/link";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getAllPermissions } from "@/app/dashboard/settings/actions/settings-actions";
import { currentUserCanManageStaffAccess } from "@/app/dashboard/staff/actions/staff-actions";
import { PermissionMatrix } from "./permission-matrix";
import { Button } from "@/components/ui/button";
import { ALL_STAFF_ROLES } from "@/lib/staff/roles";

export default async function RolesSettingsPage() {
  await redirectIfNotAuthenticated();

  const [canManage, permissionsResult] = await Promise.all([
    currentUserCanManageStaffAccess(),
    getAllPermissions(),
  ]);

  // Non-admins can still see a read-only view, but cannot edit
  // Hard-redirect if the user doesn't even have settings.view

  if (permissionsResult.error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Roles & Permissions</h2>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {permissionsResult.error}
        </div>
      </div>
    );
  }

  const permissions = permissionsResult.permissions ?? [];

  // Count unique permission keys per role for summary cards
  const rolePermCounts = ALL_STAFF_ROLES.reduce(
    (acc, role) => ({
      ...acc,
      [role]: permissions.filter((p) => p.role === role).length,
    }),
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Roles & Permissions</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {canManage
              ? "Toggle individual permissions for each role. Changes take effect immediately."
              : "Read-only view. Only owners and general managers can modify role permissions."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/settings/staff">Manage Access</Link>
          </Button>
          {canManage ? (
            <Button asChild size="sm" className="bg-[#ff6900] text-white hover:bg-[#e55f00]">
              <Link href="/dashboard/staff/invite">Invite Staff</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ALL_STAFF_ROLES.slice(0, 5).map((role) => (
          <div
            key={role}
            className="rounded-2xl border border-zinc-200 bg-white/80 p-3 text-center shadow-sm"
          >
            <p className="text-2xl font-semibold text-zinc-900">{rolePermCounts[role]}</p>
            <p className="mt-1 text-xs text-zinc-500 truncate">{role.replace(/_/g, " ")}</p>
          </div>
        ))}
      </div>

      <PermissionMatrix permissions={permissions} canEdit={canManage} />
    </div>
  );
}
