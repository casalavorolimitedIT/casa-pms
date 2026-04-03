import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getOrgSettings, updateOrgSettings } from "@/app/dashboard/settings/actions/settings-actions";
import { currentUserCanManageStaffAccess } from "@/app/dashboard/staff/actions/staff-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

interface Props {
  searchParams: Promise<{ success?: string; error?: string }>;
}

export default async function GeneralSettingsPage({ searchParams }: Props) {
  await redirectIfNotAuthenticated();

  const [orgResult, canManage, params] = await Promise.all([
    getOrgSettings(),
    currentUserCanManageStaffAccess(),
    searchParams,
  ]);

  const successMessage = params.success ? decodeURIComponent(params.success) : null;
  const errorMessage = params.error ? decodeURIComponent(params.error) : null;

  async function handleUpdateOrg(formData: FormData) {
    "use server";
    const result = await updateOrgSettings(formData);
    if (result?.error) {
      redirect(`/dashboard/settings/general?error=${encodeURIComponent(result.error)}`);
    }
    redirect("/dashboard/settings/general?success=Organization+updated+successfully");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">General</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Update your organization name and basic display information.
        </p>
      </div>

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {orgResult.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {orgResult.error}
        </div>
      ) : null}

      <Card className="border-zinc-200/80">
        <CardHeader>
          <CardTitle className="text-base">Organization Details</CardTitle>
          <CardDescription>The name displayed throughout the PMS and on reports.</CardDescription>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <form action={handleUpdateOrg} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="org-name">Organization name</Label>
                <Input
                  id="org-name"
                  name="name"
                  type="text"
                  defaultValue={orgResult.settings?.name ?? ""}
                  placeholder="Acme Hospitality Ltd."
                  required
                  maxLength={120}
                />
              </div>
              <div className="flex items-center gap-3">
                <FormSubmitButton
                  idleText="Save changes"
                  pendingText="Saving..."
                  className="bg-[#ff6900] text-white hover:bg-[#e55f00]"
                />
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Organization name</Label>
                <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                  {orgResult.settings?.name ?? "—"}
                </p>
              </div>
              <p className="text-sm text-zinc-500">
                Only owners and general managers can update organization settings.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {orgResult.settings ? (
        <Card className="border-zinc-200/80">
          <CardHeader>
            <CardTitle className="text-base">Account Info</CardTitle>
            <CardDescription>Read-only reference information about your organization.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                  Organization ID
                </dt>
                <dd className="break-all font-mono text-xs text-zinc-600">{orgResult.settings.id}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                  Created
                </dt>
                <dd className="text-sm text-zinc-700">
                  {new Date(orgResult.settings.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
