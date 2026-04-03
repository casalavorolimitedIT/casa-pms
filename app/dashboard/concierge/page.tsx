import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { redirect } from "next/navigation";
import { getActivePropertyId } from "@/lib/pms/property-context";
import {
  assignRequest,
  createRequest,
  getConciergeContext,
  postConciergeCharge,
  updateRequestStatus,
} from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FormStatusToast } from "@/components/custom/form-status-toast";

type ConciergePageProps = {
  searchParams?: Promise<{
    ok?: string | string[];
    error?: string | string[];
  }>;
};

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getGuestName(guestRaw: unknown) {
  if (!guestRaw) return "Unknown guest";
  if (Array.isArray(guestRaw)) {
    const guest = guestRaw[0] as { first_name?: string; last_name?: string } | undefined;
    return `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Unknown guest";
  }
  const guest = guestRaw as { first_name?: string; last_name?: string };
  return `${guest.first_name ?? ""} ${guest.last_name ?? ""}`.trim() || "Unknown guest";
}

const STATUS_TONE: Record<string, string> = {
  open: "bg-zinc-100 text-zinc-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-700",
};

export default async function ConciergePage({ searchParams }: ConciergePageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const context = await getConciergeContext(activePropertyId);

  const createRequestAction = async (formData: FormData) => {
    "use server";
    try {
      await createRequest(formData);
      redirect(`/dashboard/concierge?ok=${encodeURIComponent("Concierge request created.")}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create concierge request.";
      redirect(`/dashboard/concierge?error=${encodeURIComponent(message)}`);
    }
  };

  const assignRequestAction = async (formData: FormData) => {
    "use server";
    try {
      await assignRequest(formData);
      redirect(`/dashboard/concierge?ok=${encodeURIComponent("Staff assignment updated.")}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to assign request.";
      redirect(`/dashboard/concierge?error=${encodeURIComponent(message)}`);
    }
  };

  const updateStatusAction = async (formData: FormData) => {
    "use server";
    try {
      await updateRequestStatus(formData);
      redirect(`/dashboard/concierge?ok=${encodeURIComponent("Request status updated.")}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update request status.";
      redirect(`/dashboard/concierge?error=${encodeURIComponent(message)}`);
    }
  };

  const postChargeAction = async (formData: FormData) => {
    "use server";
    try {
      await postConciergeCharge(formData);
      redirect(`/dashboard/concierge?ok=${encodeURIComponent("Charge posted to folio.")}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to post concierge charge.";
      redirect(`/dashboard/concierge?error=${encodeURIComponent(message)}`);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-container">
      <FormStatusToast ok={ok} error={error} />
      <div className="space-y-1">
        <h1 className="page-title text-balance tracking-tight">Concierge Requests</h1>
        <p className="page-subtitle">Track service requests, assign staff, manage status SLA, and post billable service charges to folios.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_1.95fr]">
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">New Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createRequestAction} className="grid gap-4">
              <input type="hidden" name="propertyId" value={activePropertyId} />

              <div className="grid gap-2">
                <Label htmlFor="reservationId">Reservation (optional)</Label>
                <FormSelectField
                  name="reservationId"
                  options={context.reservations.map((reservation) => ({
                    value: reservation.id,
                    label: `${getGuestName(reservation.guests)} (${reservation.status})`,
                  }))}
                  placeholder="Select reservation"
                  emptyStateText="No active reservation found for this property."
                  emptyStateLinkHref="/dashboard/reservations"
                  emptyStateLinkLabel="Create reservation"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <FormSelectField
                    name="category"
                    defaultValue="general"
                    options={[
                      { value: "general", label: "General" },
                      { value: "housekeeping", label: "Housekeeping" },
                      { value: "transport", label: "Transport" },
                      { value: "dining", label: "Dining" },
                      { value: "maintenance", label: "Maintenance" },
                    ]}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <FormSelectField
                    name="priority"
                    defaultValue="normal"
                    options={[
                      { value: "low", label: "Low" },
                      { value: "normal", label: "Normal" },
                      { value: "high", label: "High" },
                      { value: "urgent", label: "Urgent" },
                    ]}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" required placeholder="Guest requested airport transfer for tomorrow 8 AM" />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="slaDueAt">SLA Due (optional)</Label>
                  <Input id="slaDueAt" name="slaDueAt" type="datetime-local" />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="chargeAmountMinor">Billable Amount (minor)</Label>
                  <Input id="chargeAmountMinor" name="chargeAmountMinor" type="number" min={0} defaultValue={0} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input id="billable" aria-label="Bill this service to guest folio" name="billable" type="checkbox" className="h-4 w-4" />
                <Label htmlFor="billable">Bill this service to guest folio</Label>
              </div>

              <FormSubmitButton idleText="Create Request" pendingText="Creating request..." />
            </form>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Active Board</CardTitle>
          </CardHeader>
          <CardContent>
            {context.requests.length === 0 ? (
              <p className="page-subtitle">No concierge requests yet.</p>
            ) : (
              <ul className="space-y-3">
                {context.requests.map((request) => {
                  const assignedRaw = request.profiles as { full_name?: string; email?: string } | Array<{ full_name?: string; email?: string }> | null;
                  const assigned = Array.isArray(assignedRaw) ? assignedRaw[0] : assignedRaw;
                  const isPosted = Boolean(request.posted_charge_id);

                  return (
                    <li key={request.id} className="rounded-lg border border-zinc-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-1">
                          <p className="font-medium text-zinc-900">{request.description}</p>
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span className="capitalize">{request.category}</span>
                            <span>•</span>
                            <span className="uppercase">{request.priority}</span>
                            <span>•</span>
                            <span>{new Date(request.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                        <Badge className={STATUS_TONE[request.status] ?? "bg-zinc-100 text-zinc-700"}>{request.status.replace("_", " ")}</Badge>
                      </div>

                      <div className="mt-3 grid gap-2 lg:grid-cols-3">
                        <form action={assignRequestAction} className="flex items-end gap-2">
                          <input type="hidden" name="requestId" value={request.id} />
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Assign Staff</Label>
                            <FormSelectField
                              name="assignedTo"
                              defaultValue={request.assigned_to ?? ""}
                              placeholder="Select staff"
                              options={context.staff.map((staff) => ({
                                value: staff.id,
                                label: staff.full_name?.trim() || staff.email,
                              }))}
                              emptyStateText="No staff profile found in this organization."
                            />
                          </div>
                          <FormSubmitButton idleText="Assign" pendingText="Assigning..." variant="outline" size="sm" />
                        </form>

                        <form action={updateStatusAction} className="flex items-end gap-2">
                          <input type="hidden" name="requestId" value={request.id} />
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Status</Label>
                            <FormSelectField
                              name="status"
                              defaultValue={request.status}
                              options={[
                                { value: "open", label: "Open" },
                                { value: "assigned", label: "Assigned" },
                                { value: "in_progress", label: "In Progress" },
                                { value: "completed", label: "Completed" },
                                { value: "cancelled", label: "Cancelled" },
                              ]}
                            />
                          </div>
                          <FormSubmitButton idleText="Update" pendingText="Updating..." variant="outline" size="sm" />
                        </form>

                        <form action={postChargeAction} className="flex items-end gap-2">
                          <input type="hidden" name="requestId" value={request.id} />
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Folio ID</Label>
                            <Input
                              name="folioId"
                              placeholder="Paste folio UUID"
                              defaultValue={request.folio_id ?? ""}
                              disabled={!request.is_billable || isPosted}
                            />
                          </div>
                          <div className="w-28 space-y-1">
                            <Label className="text-xs">Amount</Label>
                            <Input
                              name="amountMinor"
                              type="number"
                              min={1}
                              defaultValue={request.charge_amount_minor ?? 0}
                              disabled={!request.is_billable || isPosted}
                            />
                          </div>
                          <FormSubmitButton
                            idleText={isPosted ? "Posted" : "Post"}
                            pendingText="Posting..."
                            variant="outline"
                            size="sm"
                            disabled={!request.is_billable || isPosted}
                          />
                        </form>
                      </div>

                      <p className="mt-2 text-xs text-zinc-500">
                        Assigned to: {assigned?.full_name || assigned?.email || "Unassigned"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
