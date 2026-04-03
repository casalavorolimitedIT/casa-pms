import Link from "next/link";
import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import {
  bulkImportStaff,
  currentUserCanManageStaffAccess,
  getOrgProperties,
} from "@/app/dashboard/staff/actions/staff-actions";
import { ALL_STAFF_ROLES, STAFF_ROLE_LABELS } from "@/lib/staff/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";

interface InviteStaffPageProps {
  searchParams: Promise<{ error?: string; ok?: string; tmpPwd?: string; tmpEmail?: string }>;
}

export default async function InviteStaffPage({ searchParams }: InviteStaffPageProps) {
  await redirectIfNotAuthenticated();

  const [canManageAccess, propertyResult, params] = await Promise.all([
    currentUserCanManageStaffAccess(),
    getOrgProperties(),
    searchParams,
  ]);

  if (!canManageAccess) {
    redirect("/dashboard/staff");
  }

  async function inviteStaffAction(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim();
    const row = {
      email,
      full_name: String(formData.get("fullName") ?? "").trim(),
      job_title: String(formData.get("jobTitle") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      property_id: String(formData.get("propertyId") ?? "").trim(),
      role: String(formData.get("role") ?? "").trim(),
    };

    const result = await bulkImportStaff([row]);
    const failure = result.failed[0];

    if (failure) {
      redirect(`/dashboard/staff/invite?error=${encodeURIComponent(failure.error)}`);
    }

    const created = result.created[0];
    if (created) {
      redirect(
        `/dashboard/staff/invite?ok=Account+created&tmpEmail=${encodeURIComponent(email)}&tmpPwd=${encodeURIComponent(created.tempPassword)}`
      );
    }

    // Existing user — role/profile updated, no new password
    redirect("/dashboard/staff/invite?ok=Staff+access+updated");
  }

  const properties = propertyResult.properties ?? [];

  return (
    <div className="page-shell">
      <div className="page-container max-w-3xl space-y-6">
        <FormStatusToast error={params.error} ok={params.tmpPwd ? undefined : params.ok} successTitle="Done" />

        {params.tmpPwd && params.tmpEmail ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-amber-800">Account created — share these credentials</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-amber-200 bg-white px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Email</p>
                <p className="mt-0.5 font-mono text-sm text-zinc-800 break-all">{decodeURIComponent(params.tmpEmail)}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-white px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Temporary password</p>
                <p className="mt-0.5 font-mono text-sm select-all text-zinc-800">{decodeURIComponent(params.tmpPwd)}</p>
              </div>
            </div>
            <p className="text-xs text-amber-700">Staff can log in immediately. Ask them to set a new password after first sign-in.</p>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Invite Staff</h1>
            <p className="page-subtitle">
              Create a staff account, send the invite email, and assign the first property role.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/staff">Back to Staff</Link>
          </Button>
        </div>

        {propertyResult.error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {propertyResult.error}
          </div>
        ) : null}

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Staff Invitation</CardTitle>
            <CardDescription>
              Restricted to owners and general managers. A temporary password is generated for the new account — share it with the staff member and ask them to change it on first sign-in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={inviteStaffAction} className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-zinc-800">Email</span>
                  <Input name="email" type="email" placeholder="ops@hotel.com" required />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-zinc-800">Full name</span>
                  <Input name="fullName" placeholder="Jane Doe" required />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-zinc-800">Job title</span>
                  <Input name="jobTitle" placeholder="Front Office Supervisor" />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-zinc-800">Phone</span>
                  <Input name="phone" type="tel" placeholder="+234 800 123 4567" />
                </label>
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
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button asChild variant="outline">
                  <Link href="/dashboard/staff">Cancel</Link>
                </Button>
                <FormSubmitButton idleText="Send invite" pendingText="Sending invite..." className="bg-[#ff6900] text-white hover:bg-[#e55f00]" />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}