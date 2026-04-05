import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { getKeyContext, issueDigitalKey, revokeKey } from "./actions";

const STATUS_TONE: Record<string, string> = {
  issued: "bg-blue-100 text-blue-700",
  active: "bg-emerald-100 text-emerald-800",
  revoked: "bg-red-100 text-red-700",
  expired: "bg-zinc-100 text-zinc-500",
};

const PROVIDER_LABELS: Record<string, string> = {
  manual: "Manual / card",
  kaba: "Kaba",
  assa: "ASSA ABLOY",
  salto: "SALTO",
  dormakaba: "dormakaba",
};

function getGuestName(guestRaw: unknown) {
  if (!guestRaw) return "Unknown guest";
  const guest = Array.isArray(guestRaw)
    ? (guestRaw[0] as { first_name?: string; last_name?: string } | undefined)
    : (guestRaw as { first_name?: string; last_name?: string } | null);
  return `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Unknown guest";
}

function getRoomLabel(roomRaw: unknown) {
  if (!roomRaw) return "—";
  const room = Array.isArray(roomRaw)
    ? (roomRaw[0] as { number?: string; floor?: string } | undefined)
    : (roomRaw as { number?: string; floor?: string } | null);
  return room?.number ? `Room ${room.number}` : "—";
}

interface KeysPageProps {
  searchParams: Promise<{ error?: string; ok?: string }>;
}

export default async function KeysPage({ searchParams }: KeysPageProps) {
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

  const context = await getKeyContext(activePropertyId);

  const activeCount = context.keys.filter((k) => k.status === "active").length;
  const revokedCount = context.keys.filter((k) => k.status === "revoked").length;
  const expiredCount = context.keys.filter((k) => k.status === "expired").length;

  async function issueKeyAndRedirect(formData: FormData) {
    "use server";
    try {
      await issueDigitalKey(formData);
      redirect("/dashboard/keys?ok=key-issued");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to issue key";
      redirect(`/dashboard/keys?error=${encodeURIComponent(message)}`);
    }
  }

  async function revokeKeyAndRedirect(formData: FormData) {
    "use server";
    try {
      await revokeKey(formData);
      redirect("/dashboard/keys?ok=key-revoked");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to revoke key";
      redirect(`/dashboard/keys?error=${encodeURIComponent(message)}`);
    }
  }

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast error={error} ok={ok} successTitle="Key action completed" />
        <div className="space-y-1">
          <h1 className="page-title text-balance tracking-tight">Digital Key Management</h1>
          <p className="page-subtitle">
            Issue, track, and revoke digital keys across all supported providers (Kaba, ASSA, SALTO, dormakaba, manual card).
          </p>
        </div>

        {/* ── Stats ── */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border-zinc-200">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Active Keys</p>
              <p className="text-3xl font-semibold tabular-nums text-emerald-600">{activeCount}</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-200">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Revoked</p>
              <p className="text-3xl font-semibold tabular-nums text-red-600">{revokedCount}</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-200">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Expired</p>
              <p className="text-3xl font-semibold tabular-nums text-zinc-400">{expiredCount}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          {/* ── Issue key form ── */}
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Issue New Key</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={issueKeyAndRedirect} className="grid gap-4">
                <input type="hidden" name="propertyId" value={activePropertyId} />

                <div className="grid gap-2">
                  <Label>Reservation</Label>
                  <FormSelectField
                    name="reservationId"
                    options={context.reservations.map((r) => ({
                      value: r.id,
                      label: `${getGuestName(r.guests)} — ${r.check_in} → ${r.check_out}`,
                    }))}
                    placeholder="Select reservation"
                    emptyStateText="No confirmed reservations found."
                    emptyStateLinkHref="/dashboard/reservations"
                    emptyStateLinkLabel="View reservations"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Room</Label>
                  <FormSelectField
                    name="roomId"
                    options={context.rooms.map((room) => ({
                      value: room.id,
                      label: `Room ${room.number}${room.floor ? ` (Floor ${room.floor})` : ""}`,
                    }))}
                    placeholder="Select room"
                    emptyStateText="No rooms found."
                    emptyStateLinkHref="/dashboard/rooms"
                    emptyStateLinkLabel="Manage rooms"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="provider">Provider</Label>
                  <select
                    id="provider"
                    name="provider"
                    title="Digital key provider"
                    aria-label="Digital key provider"
                    className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="providerKeyId">Provider key ID (optional)</Label>
                  <Input
                    id="providerKeyId"
                    name="providerKeyId"
                    placeholder="e.g. external encoder ID"
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="validFrom">Valid from</Label>
                    <Input id="validFrom" name="validFrom" type="datetime-local" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="validUntil">Valid until</Label>
                    <Input id="validUntil" name="validUntil" type="datetime-local" />
                  </div>
                </div>

                <FormSubmitButton
                  idleText="Issue Key"
                  pendingText="Issuing..."
                  className="bg-[#ff6900] text-white hover:bg-[#e55f00]"
                />
              </form>
            </CardContent>
          </Card>

          {/* ── Active keys summary ── */}
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Active Keys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {context.keys.filter((k) => k.status === "active").length === 0 ? (
                <p className="text-sm text-zinc-400">No active keys.</p>
              ) : (
                context.keys
                  .filter((k) => k.status === "active")
                  .slice(0, 12)
                  .map((key) => {
                    const res = Array.isArray(key.reservations)
                      ? key.reservations[0]
                      : key.reservations;
                    return (
                      <div
                        key={key.id}
                        className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-900">
                            {getGuestName((res as { guests?: unknown } | null)?.guests)}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {getRoomLabel(key.rooms)} · {PROVIDER_LABELS[key.provider] ?? key.provider}
                          </p>
                          {key.valid_until && (
                            <p className="text-xs text-zinc-400">
                              Until: {new Date(key.valid_until).toLocaleString("en-GB")}
                            </p>
                          )}
                        </div>
                        <form action={revokeKeyAndRedirect} className="shrink-0">
                          <input type="hidden" name="keyId" value={key.id} />
                          <input type="hidden" name="reason" value="Staff revoke" />
                          <FormSubmitButton
                            idleText="Revoke"
                            pendingText="..."
                            className="h-7 rounded-md border border-red-200 bg-red-50 px-3 text-xs text-red-700 hover:bg-red-100"
                          />
                        </form>
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Full key history ── */}
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Key History</CardTitle>
          </CardHeader>
          <CardContent>
            {context.keys.length === 0 ? (
              <p className="text-sm text-zinc-400">No keys issued yet.</p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {context.keys.map((key) => {
                  const res = Array.isArray(key.reservations)
                    ? key.reservations[0]
                    : key.reservations;
                  const auditLog: Array<{ event: string; at: string; reason?: string }> = Array.isArray(
                    key.audit_log
                  )
                    ? (key.audit_log as Array<{ event: string; at: string; reason?: string }>)
                    : [];

                  return (
                    <details key={key.id} className="py-3">
                      <summary className="flex cursor-pointer items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">
                          {getGuestName((res as { guests?: unknown } | null)?.guests)} — {getRoomLabel(key.rooms)}
                        </span>
                        <span className="text-xs text-zinc-400">{PROVIDER_LABELS[key.provider] ?? key.provider}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[key.status] ?? "bg-zinc-100 text-zinc-700"}`}
                        >
                          {key.status}
                        </span>
                      </summary>
                      <div className="mt-2 ml-2 space-y-1">
                        {key.issued_at && (
                          <p className="text-xs text-zinc-400">
                            Issued: {new Date(key.issued_at).toLocaleString("en-GB")}
                          </p>
                        )}
                        {key.valid_from && (
                          <p className="text-xs text-zinc-400">
                            Valid from: {new Date(key.valid_from).toLocaleString("en-GB")}
                          </p>
                        )}
                        {key.valid_until && (
                          <p className="text-xs text-zinc-400">
                            Valid until: {new Date(key.valid_until).toLocaleString("en-GB")}
                          </p>
                        )}
                        {key.revoked_at && (
                          <p className="text-xs text-red-500">
                            Revoked: {new Date(key.revoked_at).toLocaleString("en-GB")}
                          </p>
                        )}
                        {auditLog.length > 0 && (
                          <div className="mt-2 space-y-0.5">
                            <p className="text-xs font-medium text-zinc-500">Audit log</p>
                            {auditLog.map((entry, i) => (
                              <p key={i} className="text-xs text-zinc-400">
                                [{new Date(entry.at).toLocaleString("en-GB")}] {entry.event}
                                {entry.reason ? ` — ${entry.reason}` : ""}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
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
