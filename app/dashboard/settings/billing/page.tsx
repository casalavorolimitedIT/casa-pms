import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { currentUserCanManageStaffAccess } from "@/app/dashboard/staff/actions/staff-actions";
import { redirect } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { CreditCardIcon, CheckmarkBadgeIcon } from "@hugeicons/core-free-icons";

export default async function BillingPage() {
  await redirectIfNotAuthenticated();

  const canManage = await currentUserCanManageStaffAccess();
  if (!canManage) {
    redirect("/dashboard/settings/general");
  }

  const PLAN_FEATURES = [
    "Unlimited properties",
    "Unlimited staff accounts",
    "All PMS modules enabled",
    "Guest portal & pre-arrival",
    "Integrations & API access",
    "Priority support",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Billing</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your subscription and invoices.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Coming soon.</strong> Billing management will be available in a future release.
      </div>

      {/* Current plan card */}
      <Card className="overflow-hidden border-zinc-200/80">
        <div className="relative bg-linear-to-br from-zinc-900 to-zinc-800 p-6 text-white">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-[#ff6900] opacity-20 blur-[60px]" />
          </div>
          <div className="relative space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff6900]/40 bg-[#ff6900]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff9a50]">
              <HugeiconsIcon icon={CheckmarkBadgeIcon} strokeWidth={2} className="size-3" />
              Casa PMS Pro
            </div>
            <div>
              <p className="text-3xl font-semibold">Free during beta</p>
              <p className="mt-1 text-sm text-zinc-400">
                Full access while Casa PMS is in early access.
              </p>
            </div>
          </div>
        </div>
        <CardContent className="pt-5">
          <p className="mb-4 text-sm font-medium text-zinc-700">What&apos;s included:</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PLAN_FEATURES.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-zinc-600">
                <HugeiconsIcon
                  icon={CheckmarkBadgeIcon}
                  strokeWidth={2}
                  className="size-4 shrink-0 text-emerald-500"
                />
                {feature}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-200/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HugeiconsIcon icon={CreditCardIcon} strokeWidth={2} className="size-4 text-zinc-400" />
            Payment Method
          </CardTitle>
          <CardDescription>No payment method required during beta.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-400">
            Billing will be configured here after beta.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
