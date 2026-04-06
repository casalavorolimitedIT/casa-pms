import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import {
  expireMembership,
  getSpaMembershipsContext,
  renewMembership,
  sellMembership,
  usePackageAllowance as consumeSpaAllowanceAction,
} from "../actions";

type SpaMembershipsPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SpaMembershipsPage({ searchParams }: SpaMembershipsPageProps) {
  await redirectIfNotAuthenticated();
  const propertyId = await getActivePropertyId();

  if (!propertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Select an active property to manage spa memberships.</div>;
  }

  const canManage = await hasPermission(propertyId, "spa.manage");
  if (!canManage) {
    redirect("/dashboard?error=You%20do%20not%20have%20access%20to%20spa%20memberships");
  }

  const query = (await searchParams) ?? {};
  const ok = first(query.ok);
  const error = first(query.error);

  const context = await getSpaMembershipsContext(propertyId);

  const guestOptions = context.guests.map((guest) => ({
    value: guest.id,
    label: `${guest.first_name ?? ""} ${guest.last_name ?? ""}`.trim() || guest.id.slice(0, 8),
  }));

  const reservationOptions = (context.reservations as Array<{ id: string; guests: { first_name?: string; last_name?: string } | Array<{ first_name?: string; last_name?: string }> | null }>).map((reservation) => {
    const guestRaw = reservation.guests;
    const guest = Array.isArray(guestRaw) ? guestRaw[0] : guestRaw;
    const guestName = `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Guest";
    return {
      value: reservation.id,
      label: `${guestName} · ${reservation.id.slice(0, 8)}`,
    };
  });

  const membershipOptions = context.memberships.map((membership) => ({
    value: membership.id,
    label: `${membership.plan_name} · ${membership.status} · ${membership.remaining_allowance}/${membership.total_allowance}`,
  }));

  const sellAction = async (formData: FormData) => {
    "use server";
    const result = await sellMembership(formData);
    if (result?.success) redirect("/dashboard/spa/memberships?ok=Membership%20sold");
    redirect(`/dashboard/spa/memberships?error=${encodeURIComponent(result?.error ?? "Unable to sell membership")}`);
  };

  const useAction = async (formData: FormData) => {
    "use server";
    const result = await consumeSpaAllowanceAction(formData);
    if (result?.success) redirect("/dashboard/spa/memberships?ok=Allowance%20used");
    redirect(`/dashboard/spa/memberships?error=${encodeURIComponent(result?.error ?? "Unable to use allowance")}`);
  };

  const renewAction = async (formData: FormData) => {
    "use server";
    const result = await renewMembership(formData);
    if (result?.success) redirect("/dashboard/spa/memberships?ok=Membership%20renewed");
    redirect(`/dashboard/spa/memberships?error=${encodeURIComponent(result?.error ?? "Unable to renew membership")}`);
  };

  const expireAction = async (formData: FormData) => {
    "use server";
    const result = await expireMembership(formData);
    if (result?.success) redirect("/dashboard/spa/memberships?ok=Membership%20expired");
    redirect(`/dashboard/spa/memberships?error=${encodeURIComponent(result?.error ?? "Unable to expire membership")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">Spa Memberships and Packages</h1>
          <p className="page-subtitle">Sell packages, consume allowance, renew validity, and expire inactive memberships.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Metric title="Memberships" value={context.memberships.length} />
          <Metric title="Usage Events" value={context.usage.length} />
          <Metric title="Guests" value={context.guests.length} />
          <Metric title="Active Plans" value={context.memberships.filter((m) => m.status === "active").length} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="glass-panel">
            <CardHeader><CardTitle className="text-base">Sell Membership</CardTitle></CardHeader>
            <CardContent>
              <form action={sellAction} className="grid gap-3">
                <input type="hidden" name="propertyId" value={propertyId} />
                <div className="grid gap-2">
                  <Label htmlFor="guestId">Guest</Label>
                  <FormSelectField name="guestId" options={guestOptions} placeholder="Select guest" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reservationId">Reservation (optional charge target)</Label>
                  <FormSelectField name="reservationId" options={reservationOptions} placeholder="No reservation link" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="planName">Plan Name</Label>
                  <Input id="planName" name="planName" placeholder="Wellness Plus" required />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="validFrom">Valid From</Label>
                    <Input id="validFrom" name="validFrom" type="date" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="validUntil">Valid Until</Label>
                    <Input id="validUntil" name="validUntil" type="date" required />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="allowance">Allowance Units</Label>
                    <Input id="allowance" name="allowance" type="number" min={0} defaultValue={4} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="soldAmountMinor">Sold Amount (minor)</Label>
                    <Input id="soldAmountMinor" name="soldAmountMinor" type="number" min={0} defaultValue={0} />
                  </div>
                </div>
                <FormSubmitButton idleText="Sell membership" pendingText="Saving..." className="w-full sm:w-auto" />
              </form>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader><CardTitle className="text-base">Use Package Allowance</CardTitle></CardHeader>
            <CardContent>
              <form action={useAction} className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="membershipId">Membership</Label>
                  <FormSelectField name="membershipId" options={membershipOptions} placeholder="Select membership" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unitsUsed">Units Used</Label>
                  <Input id="unitsUsed" name="unitsUsed" type="number" min={1} defaultValue={1} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bookingId">Booking ID (optional)</Label>
                  <Input id="bookingId" name="bookingId" placeholder="Spa booking id" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="note">Note</Label>
                  <Textarea id="note" name="note" rows={2} placeholder="Session details" />
                </div>
                <FormSubmitButton idleText="Use allowance" pendingText="Saving..." className="w-full sm:w-auto" />
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel mt-6">
          <CardHeader><CardTitle className="text-base">Renew and Expire</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              <form action={renewAction} className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="renewMembershipId">Membership</Label>
                  <FormSelectField name="membershipId" options={membershipOptions} placeholder="Select membership" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nextValidUntil">Next Valid Until</Label>
                  <Input id="nextValidUntil" name="nextValidUntil" type="date" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="addAllowance">Additional Allowance</Label>
                  <Input id="addAllowance" name="addAllowance" type="number" min={0} defaultValue={0} />
                </div>
                <FormSubmitButton idleText="Renew membership" pendingText="Saving..." className="w-full sm:w-auto" />
              </form>

              <form action={expireAction} className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="expireMembershipId">Membership</Label>
                  <FormSelectField name="membershipId" options={membershipOptions} placeholder="Select membership" />
                </div>
                <FormSubmitButton idleText="Expire membership" pendingText="Saving..." variant="outline" className="w-full sm:w-auto" />
              </form>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel mt-6">
          <CardHeader><CardTitle className="text-base">Membership Ledger</CardTitle></CardHeader>
          <CardContent>
            {context.memberships.length === 0 ? (
              <p className="text-sm text-zinc-500">No memberships yet.</p>
            ) : (
              <ul className="space-y-2">
                {context.memberships.map((membership) => {
                  const guestRaw = membership.guests as { first_name?: string; last_name?: string } | Array<{ first_name?: string; last_name?: string }> | null;
                  const guest = Array.isArray(guestRaw) ? guestRaw[0] : guestRaw;
                  const guestName = `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Guest";
                  return (
                    <li key={membership.id} className="rounded-lg border border-zinc-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-zinc-900">{membership.plan_name} · {guestName}</p>
                          <p className="text-xs text-zinc-500">
                            {membership.valid_from} to {membership.valid_until} · {membership.remaining_allowance}/{membership.total_allowance} units
                          </p>
                        </div>
                        <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">{membership.status}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-600">{title}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight text-zinc-900">{value}</p>
      </CardContent>
    </Card>
  );
}
