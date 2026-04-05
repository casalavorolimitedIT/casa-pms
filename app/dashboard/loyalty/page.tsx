import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { earnPoints, getLoyaltyContext, redeemPoints, upgradeTier } from "./actions";

type LoyaltyPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getGuestName(guestRaw: unknown) {
  const guest = Array.isArray(guestRaw)
    ? (guestRaw[0] as { first_name?: string; last_name?: string; email?: string } | undefined)
    : (guestRaw as { first_name?: string; last_name?: string; email?: string } | null);
  const name = `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim();
  return name || guest?.email || "Unknown guest";
}

export default async function LoyaltyPage({ searchParams }: LoyaltyPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const context = await getLoyaltyContext(activePropertyId);

  const earnAction = async (formData: FormData) => {
    "use server";
    const result = await earnPoints(formData);
    if (result?.success) redirect(`/dashboard/loyalty?ok=${encodeURIComponent("Points earned.")}`);
    redirect(`/dashboard/loyalty?error=${encodeURIComponent(result?.error ?? "Unable to earn points.")}`);
  };

  const redeemAction = async (formData: FormData) => {
    "use server";
    const result = await redeemPoints(formData);
    if (result?.success) redirect(`/dashboard/loyalty?ok=${encodeURIComponent("Points redeemed.")}`);
    redirect(`/dashboard/loyalty?error=${encodeURIComponent(result?.error ?? "Unable to redeem points.")}`);
  };

  const upgradeAction = async (formData: FormData) => {
    "use server";
    const result = await upgradeTier(formData);
    if (result?.success) redirect(`/dashboard/loyalty?ok=${encodeURIComponent("Tier updated.")}`);
    redirect(`/dashboard/loyalty?error=${encodeURIComponent(result?.error ?? "Unable to update tier.")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">Loyalty Programme</h1>
          <p className="page-subtitle">Track points earn and redemption, automate tiers, and maintain auditable member history.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Metric title="Members" value={context.summary.members} />
          <Metric title="Total Points" value={context.summary.totalPoints} />
          <Metric title="Top Tiers" value={context.summary.topTierMembers} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Ledger</CardTitle>
            </CardHeader>
            <CardContent>
              {context.ledger.length === 0 ? (
                <p className="text-sm text-zinc-500">No loyalty entries recorded yet.</p>
              ) : (
                <ul className="space-y-3">
                  {context.ledger.map((entry) => (
                    <li key={entry.id} className="rounded-lg border border-zinc-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-zinc-900">{getGuestName(entry.guests)}</p>
                          <p className="text-xs text-zinc-500">{new Date(entry.created_at).toLocaleString("en-GB")}</p>
                        </div>
                        <Badge variant="outline">{entry.entry_type}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-zinc-700">Points: {entry.points_delta > 0 ? `+${entry.points_delta}` : entry.points_delta}</p>
                      {entry.note ? <p className="text-xs text-zinc-500">{entry.note}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <ActionCard
              title="Earn Points"
              action={earnAction}
              guests={context.guestOptions}
              submitLabel="Add Points"
              includeReservation
            />
            <ActionCard
              title="Redeem Points"
              action={redeemAction}
              guests={context.guestOptions}
              submitLabel="Redeem"
              includeReservation
            />

            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="text-base">Upgrade Tier</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={upgradeAction} className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label>Guest</Label>
                    <FormSelectField
                      name="guestId"
                      options={context.guestOptions.map((guest) => ({ value: guest.id, label: guest.label }))}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Tier</Label>
                    <FormSelectField
                      name="tier"
                      defaultValue="silver"
                      options={[
                        { value: "bronze", label: "Bronze" },
                        { value: "silver", label: "Silver" },
                        { value: "gold", label: "Gold" },
                        { value: "platinum", label: "Platinum" },
                        { value: "diamond", label: "Diamond" },
                      ]}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Note</Label>
                    <Input name="note" placeholder="Reason for upgrade" />
                  </div>
                  <FormSubmitButton idleText="Upgrade" pendingText="Saving..." variant="outline" />
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  title,
  action,
  guests,
  submitLabel,
  includeReservation,
}: {
  title: string;
  action: (formData: FormData) => void | Promise<void>;
  guests: Array<{ id: string; label: string }>;
  submitLabel: string;
  includeReservation?: boolean;
}) {
  return (
    <Card className="border-zinc-200">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Guest</Label>
            <FormSelectField
              name="guestId"
              options={guests.map((guest) => ({ value: guest.id, label: guest.label }))}
            />
          </div>
          {includeReservation ? (
            <div className="grid gap-1.5">
              <Label>Reservation ID (optional)</Label>
              <Input name="reservationId" placeholder="Optional UUID" />
            </div>
          ) : null}
          <div className="grid gap-1.5">
            <Label>Points</Label>
            <Input type="number" name="points" min="1" required />
          </div>
          <div className="grid gap-1.5">
            <Label>Note</Label>
            <Input name="note" placeholder="Optional note" />
          </div>
          <FormSubmitButton idleText={submitLabel} pendingText="Saving..." variant="outline" />
        </form>
      </CardContent>
    </Card>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-zinc-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight text-zinc-900">{value}</p>
      </CardContent>
    </Card>
  );
}
