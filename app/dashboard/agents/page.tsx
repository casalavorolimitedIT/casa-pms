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
import { Textarea } from "@/components/ui/textarea";
import { createAgent, assignAgentRate, getAgentsContext, updateCommissionStatus } from "./actions";

type AgentsPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getGuestName(guestRaw: unknown) {
  const guest = Array.isArray(guestRaw)
    ? (guestRaw[0] as { first_name?: string; last_name?: string } | undefined)
    : (guestRaw as { first_name?: string; last_name?: string } | null);
  return `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Unknown guest";
}

function formatCurrencyMinor(amountMinor: number, currencyCode = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
  }).format(amountMinor / 100);
}

const PAYOUT_TONE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-sky-100 text-sky-700",
  paid: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-zinc-100 text-zinc-700",
};

export default async function AgentsPage({ searchParams }: AgentsPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const context = await getAgentsContext(activePropertyId);

  const createAgentAction = async (formData: FormData) => {
    "use server";
    const result = await createAgent(formData);
    if (result?.success) {
      redirect(`/dashboard/agents?ok=${encodeURIComponent("Travel agent created.")}`);
    }
    redirect(`/dashboard/agents?error=${encodeURIComponent(result?.error ?? "Unable to create travel agent.")}`);
  };

  const assignRateAction = async (formData: FormData) => {
    "use server";
    const result = await assignAgentRate(formData);
    if (result?.success) {
      redirect(`/dashboard/agents?ok=${encodeURIComponent("Commission assignment saved.")}`);
    }
    redirect(`/dashboard/agents?error=${encodeURIComponent(result?.error ?? "Unable to assign commission.")}`);
  };

  const updateStatusAction = async (formData: FormData) => {
    "use server";
    const result = await updateCommissionStatus(formData);
    if (result?.success) {
      redirect(`/dashboard/agents?ok=${encodeURIComponent("Payout status updated.")}`);
    }
    redirect(`/dashboard/agents?error=${encodeURIComponent(result?.error ?? "Unable to update payout status.")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">Travel Agent Rates</h1>
          <p className="page-subtitle">Manage agent profiles, assign commission rates to reservations, and track payout progress.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Metric title="Active Agents" value={context.summary.activeAgents} />
          <Metric title="Assigned Bookings" value={context.summary.assignedBookings} />
          <Metric title="Pending Commission" value={formatCurrencyMinor(context.summary.pendingCommissionMinor)} />
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,4fr)_minmax(340px,3fr)]">
          <div className="space-y-8">
            <div className="max-w-4xl">
              <form action={createAgentAction} className="flex flex-col gap-8">
                <input type="hidden" name="propertyId" value={activePropertyId} />

                <div className="grid gap-6 md:grid-cols-12">
                  <div className="md:col-span-4 space-y-1.5 pt-1">
                    <h3 className="text-sm font-medium text-foreground">Agent Profile</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">Create a commercial profile with default commission terms and contact details.</p>
                  </div>

                  <div className="md:col-span-8 grid gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-2 sm:col-span-2">
                        <Label className="text-zinc-700 font-medium">Agency / Company</Label>
                        <Input name="companyName" placeholder="Skyline Travel Partners" className="bg-white shadow-sm" required />
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-zinc-700 font-medium">Contact Name</Label>
                        <Input name="contactName" placeholder="Amaka Okoro" className="bg-white shadow-sm" />
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-zinc-700 font-medium">Email</Label>
                        <Input type="email" name="email" placeholder="agent@skyline.com" className="bg-white shadow-sm" />
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-zinc-700 font-medium">Phone</Label>
                        <Input name="phone" placeholder="+234 800 000 0000" className="bg-white shadow-sm" />
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-zinc-700 font-medium">Default Commission %</Label>
                        <Input type="number" name="defaultCommissionPercent" min="0" max="100" step="0.01" defaultValue="10" className="bg-white shadow-sm" required />
                      </div>

                      <div className="grid gap-2 sm:col-span-2">
                        <label className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-700 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50">
                          <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4 rounded border-border" />
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">Active for new bookings</span>
                            <span className="text-xs text-muted-foreground">Inactive agents remain on historical reports but cannot be assigned by default.</span>
                          </div>
                        </label>
                      </div>

                      <div className="grid gap-2 sm:col-span-2">
                        <Label className="text-zinc-700 font-medium">Internal Notes</Label>
                        <Textarea name="notes" rows={3} placeholder="Contract notes, settlement terms, or account flags" className="resize-none bg-white shadow-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <FormSubmitButton idleText="Create Agent" pendingText="Saving..." className="w-full px-8 shadow-sm sm:w-auto" />
                </div>
              </form>
            </div>

            <div className="max-w-4xl">
              <form action={assignRateAction} className="flex flex-col gap-8">
                <input type="hidden" name="propertyId" value={activePropertyId} />

                <div className="grid gap-6 md:grid-cols-12">
                  <div className="md:col-span-4 space-y-1.5 pt-1">
                    <h3 className="text-sm font-medium text-foreground">Assign Commission</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">Attach an agent to a reservation and snapshot the commission amount for reporting.</p>
                  </div>

                  <div className="md:col-span-8 grid gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-2 sm:col-span-2">
                        <Label className="text-zinc-700 font-medium">Travel Agent</Label>
                        <FormSelectField
                          name="travelAgentId"
                          options={context.agents
                            .filter((agent) => agent.is_active)
                            .map((agent) => ({
                              value: agent.id,
                              label: `${agent.company_name} · ${agent.default_commission_percent}%`,
                            }))}
                        />
                      </div>

                      <div className="grid gap-2 sm:col-span-2">
                        <Label className="text-zinc-700 font-medium">Reservation</Label>
                        <FormSelectField
                          name="reservationId"
                          options={context.reservations.map((reservation) => ({
                            value: reservation.id,
                            label: `${getGuestName(reservation.guests)} · ${reservation.check_in} · ${formatCurrencyMinor(reservation.total_rate_minor ?? 0)}`,
                          }))}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-zinc-700 font-medium">Commission %</Label>
                        <Input type="number" name="commissionPercent" min="0" max="100" step="0.01" defaultValue="10" className="bg-white shadow-sm" required />
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-zinc-700 font-medium">Assignment Note</Label>
                        <Input name="notes" placeholder="Optional settlement note" className="bg-white shadow-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <FormSubmitButton idleText="Save Commission" pendingText="Saving..." className="w-full px-8 shadow-sm sm:w-auto" />
                </div>
              </form>
            </div>

            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="text-base">Commission Ledger</CardTitle>
              </CardHeader>
              <CardContent>
                {context.commissions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center text-sm text-zinc-500">
                    No travel-agent commissions recorded yet.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {context.commissions.map((commission) => {
                      const reservationRaw = commission.reservations as
                        | { check_in?: string; total_rate_minor?: number | null; guests?: unknown; status?: string }
                        | Array<{ check_in?: string; total_rate_minor?: number | null; guests?: unknown; status?: string }>
                        | null;
                      const reservation = Array.isArray(reservationRaw) ? reservationRaw[0] : reservationRaw;
                      const agentRaw = commission.travel_agents as
                        | { company_name?: string; contact_name?: string | null }
                        | Array<{ company_name?: string; contact_name?: string | null }>
                        | null;
                      const agent = Array.isArray(agentRaw) ? agentRaw[0] : agentRaw;

                      return (
                        <li key={commission.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-zinc-900">{agent?.company_name ?? "Unassigned agency"}</p>
                                <Badge className={PAYOUT_TONE[commission.payout_status] ?? PAYOUT_TONE.pending}>{commission.payout_status}</Badge>
                              </div>
                              <p className="text-sm text-zinc-600">{getGuestName(reservation?.guests)} · {reservation?.check_in ?? "Unknown stay date"}</p>
                              <p className="text-xs text-zinc-500">
                                {commission.commission_percent}% on {formatCurrencyMinor(reservation?.total_rate_minor ?? 0)} = {formatCurrencyMinor(commission.commission_minor ?? 0)}
                              </p>
                              {commission.notes ? <p className="text-sm text-zinc-500">{commission.notes}</p> : null}
                            </div>

                            <form action={updateStatusAction} className="flex w-full items-center gap-3 lg:w-auto">
                              <input type="hidden" name="commissionId" value={commission.id} />
                              <div className="w-full lg:w-40">
                                <FormSelectField
                                  name="payoutStatus"
                                  defaultValue={commission.payout_status}
                                  options={[
                                    { value: "pending", label: "Pending" },
                                    { value: "approved", label: "Approved" },
                                    { value: "paid", label: "Paid" },
                                    { value: "cancelled", label: "Cancelled" },
                                  ]}
                                />
                              </div>
                              <FormSubmitButton idleText="Update" pendingText="..." size="sm" variant="outline" />
                            </form>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="text-base">Agents</CardTitle>
              </CardHeader>
              <CardContent>
                {context.agents.length === 0 ? (
                  <p className="text-sm text-zinc-500">No travel agents configured yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {context.agents.map((agent) => (
                      <li key={agent.id} className="rounded-lg border border-zinc-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-zinc-900">{agent.company_name}</p>
                            <p className="text-xs text-zinc-500">{agent.contact_name || "No contact"}</p>
                          </div>
                          <Badge variant={agent.is_active ? "outline" : "secondary"}>{agent.is_active ? "Active" : "Inactive"}</Badge>
                        </div>
                        <div className="mt-3 space-y-1 text-xs text-zinc-500">
                          <p>Default commission: {agent.default_commission_percent}%</p>
                          {agent.email ? <p>{agent.email}</p> : null}
                          {agent.phone ? <p>{agent.phone}</p> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number | string }) {
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