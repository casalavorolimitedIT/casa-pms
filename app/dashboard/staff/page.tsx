import Link from "next/link";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { currentUserCanManageStaffAccess, getOrgStaff, getOrgProperties } from "./actions/staff-actions";
import {
  STAFF_ROLE_LABELS,
  ROLE_COLORS,
  ROLE_DESCRIPTIONS,
  type StaffRole,
} from "@/lib/staff/roles";
import { Button } from "@/components/ui/button";
import { StaffBulkUpload } from "./staff-bulk-upload";
import { StaffList } from "./staff-list";

export default async function StaffPage() {
  await redirectIfNotAuthenticated();

  const [{ staff, error }, canManageAccess, { properties }] = await Promise.all([
    getOrgStaff(),
    currentUserCanManageStaffAccess(),
    getOrgProperties(),
  ]);

  return (
    <div className="page-shell">
      <div className="page-container space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Staff</h1>
            <p className="page-subtitle">
              Hotel employees with access to the PMS. Staff are separate from hotel guests.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManageAccess ? (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/staff/access">Roles & Permissions</Link>
                </Button>
                <StaffBulkUpload properties={properties ?? []} />
                <Button asChild size="sm" className="bg-[#ff6900] text-white hover:bg-[#e55f00]">
                  <Link href="/dashboard/staff/invite">Invite Staff</Link>
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* Staff list with search, filters, pagination */}
        <StaffList staff={staff ?? []} canManageAccess={canManageAccess} />

        {/* Role legend */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Role Reference
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.entries(STAFF_ROLE_LABELS) as [StaffRole, string][]).map(([role, label]) => (
              <div key={role} className="flex items-center gap-2">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[role]}`}>
                  {label}
                </span>
                <span className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
