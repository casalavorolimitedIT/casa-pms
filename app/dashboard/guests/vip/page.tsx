import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import {
  createAmenityTasks,
  generateVipBrief,
  getVipContext,
  revokeVipFlag,
  tagAsVip,
} from "./actions";

const TIER_COLORS: Record<string, string> = {
  Silver: "bg-zinc-100 text-zinc-700",
  Gold: "bg-amber-100 text-amber-800",
  Platinum: "bg-violet-100 text-violet-800",
  "Invitation Only": "bg-rose-100 text-rose-800",
};

function getGuestName(guestRaw: unknown) {
  if (!guestRaw) return "Unknown guest";
  const guest = Array.isArray(guestRaw)
    ? (guestRaw[0] as { first_name?: string; last_name?: string } | undefined)
    : (guestRaw as { first_name?: string; last_name?: string } | null);
  return `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Unknown guest";
}

interface VipManagementPageProps {
  searchParams: Promise<{ error?: string; ok?: string }>;
}

export default async function VipManagementPage({ searchParams }: VipManagementPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const { error, ok } = await searchParams;

  if (!activePropertyId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.
      </div>
    );
  }

  const context = await getVipContext(activePropertyId);

  // Upcoming arrivals that have VIP flags
  const vipGuestIds = new Set(context.flags.map((f) => f.guest_id));
  const vipArrivals = context.reservations.filter(
    (r) => r.guest_id && vipGuestIds.has(r.guest_id as string)
  );

  async function tagVipAndRedirect(formData: FormData) {
    "use server";
    try {
      await tagAsVip(formData);
      redirect("/dashboard/guests/vip?ok=vip-tagged");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to tag VIP";
      redirect(`/dashboard/guests/vip?error=${encodeURIComponent(message)}`);
    }
  }

  async function createTasksAndRedirect(formData: FormData) {
    "use server";
    try {
      await createAmenityTasks(formData);
      redirect("/dashboard/guests/vip?ok=tasks-created");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create amenity tasks";
      redirect(`/dashboard/guests/vip?error=${encodeURIComponent(message)}`);
    }
  }

  async function revokeVipAndRedirect(formData: FormData) {
    "use server";
    try {
      await revokeVipFlag(formData);
      redirect("/dashboard/guests/vip?ok=vip-revoked");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to revoke VIP";
      redirect(`/dashboard/guests/vip?error=${encodeURIComponent(message)}`);
    }
  }

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast error={error} ok={ok} successTitle="VIP action completed" />
        <div className="space-y-1">
          <h1 className="page-title text-balance tracking-tight">VIP Guest Management</h1>
          <p className="page-subtitle">
            Tag guests with VIP tiers, generate arrival briefs, and dispatch pre-arrival amenity tasks for the
            housekeeping and operations teams.
          </p>
        </div>

        {/* ── Stats ── */}
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="border-zinc-200">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Active VIPs</p>
              <p className="text-3xl font-semibold tabular-nums text-zinc-900">{context.flags.length}</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-200">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">VIP Arrivals</p>
              <p className="text-3xl font-semibold tabular-nums text-zinc-900">{vipArrivals.length}</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-200">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Tiers in use</p>
              <p className="text-3xl font-semibold tabular-nums text-zinc-900">
                {new Set(context.flags.map((f) => f.vip_tier)).size}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* ── Tag form ── */}
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Tag Guest as VIP</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={tagVipAndRedirect} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="guestId">Guest</Label>
                  <FormSelectField
                    name="guestId"
                    options={context.guests.map((g) => ({
                      value: g.id,
                      label: `${g.first_name} ${g.last_name}${g.email ? ` — ${g.email}` : ""}`,
                    }))}
                    placeholder="Select guest"
                    emptyStateText="No guests found for this property."
                    emptyStateLinkHref="/dashboard/guests"
                    emptyStateLinkLabel="View guests"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="vipTier">VIP Tier</Label>
                  <select
                    id="vipTier"
                    name="vipTier"
                    title="VIP tier"
                    aria-label="VIP tier"
                    className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Invitation Only">Invitation Only</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="note">Note (optional)</Label>
                  <Textarea name="note" rows={2} placeholder="e.g. CEO of Acme Corp — prefers suite 402" />
                </div>

                <FormSubmitButton
                  idleText="Tag as VIP"
                  pendingText="Saving..."
                  className="bg-[#ff6900] text-white hover:bg-[#e55f00]"
                />
              </form>
            </CardContent>
          </Card>

          {/* ── VIP arrivals ── */}
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Upcoming VIP Arrivals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {vipArrivals.length === 0 ? (
                <p className="text-sm text-zinc-400">No VIP arrivals in the current window.</p>
              ) : (
                vipArrivals.map((res) => {
                  const flag = context.flags.find((f) => f.guest_id === res.guest_id);
                  return (
                    <div
                      key={res.id}
                      className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-900">
                            {getGuestName(res.guests)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {res.check_in} → {res.check_out}
                          </p>
                          {flag?.note && (
                            <p className="mt-1 text-xs text-zinc-400 italic">{flag.note}</p>
                          )}
                        </div>
                        {flag && (
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TIER_COLORS[flag.vip_tier] ?? "bg-zinc-100 text-zinc-700"}`}
                          >
                            {flag.vip_tier}
                          </span>
                        )}
                      </div>
                      {/* Amenity tasks trigger */}
                      <form action={createTasksAndRedirect} className="mt-2 flex gap-2">
                        <input type="hidden" name="propertyId" value={activePropertyId} />
                        <input type="hidden" name="reservationId" value={res.id} />
                        <input type="hidden" name="roomId" value={res.room_id ?? ""} />
                        <input type="hidden" name="guestName" value={getGuestName(res.guests)} />
                        <input type="hidden" name="tier" value={flag?.vip_tier ?? "VIP"} />
                        <FormSubmitButton
                          idleText="Create arrival tasks"
                          pendingText="Creating..."
                          className="h-7 rounded-md bg-zinc-900 px-3 text-xs text-white hover:bg-zinc-700"
                        />
                      </form>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Active VIP flags ── */}
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Active VIP Guests</CardTitle>
          </CardHeader>
          <CardContent>
            {context.flags.length === 0 ? (
              <p className="text-sm text-zinc-400">No active VIP guests.</p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {context.flags.map((flag) => {
                  const guest = Array.isArray(flag.guests)
                    ? flag.guests[0]
                    : (flag.guests as { first_name?: string; last_name?: string; email?: string; phone?: string } | null);
                  const name = `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Unknown";

                  return (
                    <div
                      key={flag.id}
                      className="flex items-center gap-3 py-3"
                    >
                      <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-semibold text-zinc-600">
                        {name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900">{name}</p>
                        <p className="text-xs text-zinc-400">
                          {guest?.email}
                          {flag.note ? ` — ${flag.note}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TIER_COLORS[flag.vip_tier] ?? "bg-zinc-100 text-zinc-700"}`}
                      >
                        {flag.vip_tier}
                      </span>
                      <form action={revokeVipAndRedirect}>
                        <input type="hidden" name="flagId" value={flag.id} />
                        <FormSubmitButton
                          idleText="Revoke"
                          pendingText="..."
                          className="h-7 rounded-md border border-zinc-200 bg-white px-3 text-xs text-zinc-600 hover:bg-zinc-50"
                        />
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── VIP brief viewer ── */}
        {context.flags.length > 0 && (
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Generate Arrival Brief</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-zinc-500">
                Select a VIP guest to generate a structured arrival brief you can share with department heads.
              </p>
              <div className="grid gap-4">
                {context.flags.map((flag) => {
                  const guest = Array.isArray(flag.guests)
                    ? flag.guests[0]
                    : (flag.guests as { first_name?: string; last_name?: string } | null);
                  const name = `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim();
                  return (
                    <VipBriefRow
                      key={flag.id}
                      guestId={flag.guest_id}
                      guestName={name || "Guest"}
                      tier={flag.vip_tier}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Brief row component (server) ───────────────────────────────────────────

async function VipBriefRow({
  guestId,
  guestName,
  tier,
}: {
  guestId: string;
  guestName: string;
  tier: string;
}) {
  const brief = await generateVipBrief(guestId);

  return (
    <details className="rounded-xl border border-zinc-100 bg-zinc-50/70">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-900">
        {guestName}{" "}
        <span className="ml-1 text-xs font-normal text-zinc-400">— {tier}</span>
      </summary>
      <pre className="overflow-x-auto whitespace-pre-wrap px-4 pb-4 text-xs leading-relaxed text-zinc-600">
        {brief}
      </pre>
    </details>
  );
}
