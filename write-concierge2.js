const fs = require('fs');

const content = \`import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { redirect } from "next/navigation";
import { getActivePropertyId } from "@/lib/pms/property-context";
import {
  assignRequest,
  createRequest,
  getConciergeContext,
  postConciergeCharge,
  updateRequestStatus,
} from "./actions";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { FormDateTimeField } from "@/components/ui/form-date-time-field";

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
    return \`\${guest?.first_name ?? ""} \${guest?.last_name ?? ""}\`.trim() || "Unknown guest";
  }
  const guest = guestRaw as { first_name?: string; last_name?: string };
  return \`\${guest.first_name ?? ""} \${guest.last_name ?? ""}\`.trim() || "Unknown guest";
}

const STATUS_TONE: Record<string, string> = {
  open: "border-zinc-200 bg-zinc-50 text-zinc-600",
  assigned: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-400",
  in_progress: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-400",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-400",
  cancelled: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400",
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
      redirect(\`/dashboard/concierge?ok=\${encodeURIComponent("Concierge request created.")}\`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create concierge request.";
      redirect(\`/dashboard/concierge?error=\${encodeURIComponent(message)}\`);
    }
  };

  const assignRequestAction = async (formData: FormData) => {
    "use server";
    try {
      await assignRequest(formData);
      redirect(\`/dashboard/concierge?ok=\${encodeURIComponent("Staff assignment updated.")}\`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to assign request.";
      redirect(\`/dashboard/concierge?error=\${encodeURIComponent(message)}\`);
    }
  };

  const updateStatusAction = async (formData: FormData) => {
    "use server";
    try {
      await updateRequestStatus(formData);
      redirect(\`/dashboard/concierge?ok=\${encodeURIComponent("Request status updated.")}\`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update request status.";
      redirect(\`/dashboard/concierge?error=\${encodeURIComponent(message)}\`);
    }
  };

  const postChargeAction = async (formData: FormData) => {
    "use server";
    try {
      await postConciergeCharge(formData);
      redirect(\`/dashboard/concierge?ok=\${encodeURIComponent("Charge posted to folio.")}\`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to post concierge charge.";
      redirect(\`/dashboard/concierge?error=\${encodeURIComponent(message)}\`);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-[1600px] p-6 sm:p-8 lg:p-12 space-y-10">
        <FormStatusToast ok={ok} error={error} />
        
        {/* Header Section */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
          <div className="space-y-2">
            <h1 className="text-4xl font-light tracking-tight text-zinc-900 group-hover:text-zinc-700 transition-colors">
              Concierge Requests
            </h1>
            <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase opacity-80">
              Track requests, manage status SLA, and process billable service charges.
            </p>
          </div>
          
          <Dialog>
            <DialogTrigger render={<Button className="shrink-0 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98] rounded-full px-6 text-sm font-medium h-11" />}>
              <span className="mr-2 opacity-70">+</span> New Request
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-light">New Request</DialogTitle>
                <p className="text-sm text-zinc-500 mt-1">Log a new guest request to the concierge desk.</p>
              </DialogHeader>
              <form action={createRequestAction} className="grid pt-4 gap-6">
                <input type="hidden" name="propertyId" value={activePropertyId} />

                <div className="grid gap-2">
                  <Label htmlFor="reservationId" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Reservation (optional)</Label>
                  <FormSelectField
                    name="reservationId"
                    options={context.reservations.map((reservation) => ({
                      value: reservation.id,
                      label: \`\${getGuestName(reservation.guests)} (\${reservation.status})\`,
                    }))}
                    placeholder="Select reservation"
                    emptyStateText="No active reservation found for this property."
                    emptyStateLinkHref="/dashboard/reservations"
                    emptyStateLinkLabel="Create reservation"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="category" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Category</Label>
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
                    <Label htmlFor="priority" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Priority</Label>
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
                  <Label htmlFor="description" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Description</Label>
                  <Textarea id="description" name="description" required placeholder="Guest requested airport transfer for tomorrow 8 AM" className="min-h-[100px] resize-none rounded-xl bg-zinc-50" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="slaDueAt" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">SLA Due (optional)</Label>
                    <FormDateTimeField name="slaDueAt" includeTime={true} placeholder="Select deadline" className="bg-zinc-50" />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="chargeAmountMinor" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Billable (minor)</Label>
                    <Input id="chargeAmountMinor" name="chargeAmountMinor" type="number" min={0} defaultValue={0} className="h-10 rounded-xl bg-zinc-50 border-zinc-200/60 block appearance-none" />
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-zinc-50 p-4 border border-zinc-100 rounded-xl focus-within:ring-2 ring-primary/20">
                  <input id="billable" name="billable" type="checkbox" className="h-4 w-4 rounded border-zinc-300 text-primary" />
                  <Label htmlFor="billable" className="text-sm font-medium text-zinc-700 cursor-pointer">Bill to guest folio</Label>
                </div>

                <FormSubmitButton idleText="Create Request" pendingText="Creating request..." className="w-full mt-2 rounded-xl h-12 font-medium shadow-primary/20 shadow-lg" />
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Board */}
        {context.requests.length === 0 ? (
          <div className="py-32 text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
            <div className="h-20 w-20 mb-6 rounded-3xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-300 shadow-inner">
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4M12 16h.01"/></svg>
            </div>
            <h3 className="text-xl font-light tracking-tight text-zinc-900">No active requests</h3>
            <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed">Your team currently has no open concierge tickets. Incoming requests will appear here seamlessly.</p>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {context.requests.map((request, i) => {
              const assignedRaw = request.profiles as { full_name?: string; email?: string } | Array<{ full_name?: string; email?: string }> | null;
              const assigned = Array.isArray(assignedRaw) ? assignedRaw[0] : assignedRaw;
              const isPosted = Boolean(request.posted_charge_id);

              return (
                <div 
                  key={request.id} 
                  className="group relative flex flex-col gap-6 overflow-hidden rounded-3xl bg-white border border-zinc-100 p-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] hover:border-zinc-200/60 transition-all duration-500 hover:-translate-y-1.5 will-change-transform"
                  style={{ animationDelay: \`\${i * 40}ms\` }}
                >
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                       <Badge variant="outline" className={\`px-2.5 py-1 text-[10px] uppercase font-bold tracking-widest rounded-full \${STATUS_TONE[request.status] ?? "bg-zinc-100 text-zinc-700"}\`}>
                         {request.status.replace("_", " ")}
                       </Badge>
                       <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 max-w-[50%] truncate">
                         <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300"></div>
                         {assigned?.full_name || assigned?.email || "Unassigned"}
                       </div>
                    </div>
                    
                    <p className="font-medium text-[15px] leading-relaxed text-zinc-900 min-h-[44px]">
                      {request.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                      <span className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-full">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {new Date(request.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})}
                      </span>
                      <span className="bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-full">
                        {request.category}
                      </span>
                      <span className="bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-full text-zinc-400">
                        {request.priority} Prio
                      </span>
                    </div>
                  </div>

                  <div className="space-y-5 pt-6 border-t border-zinc-100/80">
                    <form action={assignRequestAction} className="flex flex-col gap-1.5">
                      <input type="hidden" name="requestId" value={request.id} />
                      <Label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Assignment</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <FormSelectField
                            name="assignedTo"
                            defaultValue={request.assigned_to ?? ""}
                            placeholder="Select staff"
                            options={context.staff.map((staff) => ({
                              value: staff.id,
                              label: staff.full_name?.trim() || staff.email,
                            }))}
                            emptyStateText="No staff profile found."
                          />
                        </div>
                        <FormSubmitButton idleText="Assign" pendingText="Wait" variant="outline" className="h-9 px-4 text-xs font-medium rounded-xl border-zinc-200" />
                      </div>
                    </form>

                    <form action={updateStatusAction} className="flex flex-col gap-1.5">
                      <input type="hidden" name="requestId" value={request.id} />
                      <Label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Progress</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
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
                        <FormSubmitButton idleText="Update" pendingText="Wait" variant="outline" className="h-9 px-4 text-xs font-medium rounded-xl border-zinc-200" />
                      </div>
                    </form>

                    {request.is_billable && (
                    <form action={postChargeAction} className="flex flex-col gap-1.5 pt-4">
                      <input type="hidden" name="requestId" value={request.id} />
                      <Label className="text-[10px] uppercase font-bold tracking-wider text-amber-500">Billable Folio Charge</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <Input
                            name="folioId"
                            placeholder="Paste UUID"
                            defaultValue={request.folio_id ?? ""}
                            disabled={isPosted}
                            className="h-9 text-xs rounded-xl bg-amber-50/30 border-amber-200/50"
                          />
                        </div>
                        <div className="w-[84px] shrink-0">
                          <Input
                            name="amountMinor"
                            type="number"
                            min={1}
                            defaultValue={request.charge_amount_minor ?? 0}
                            disabled={isPosted}
                            className="h-9 text-xs rounded-xl bg-amber-50/30 border-amber-200/50"
                          />
                        </div>
                        <FormSubmitButton
                          idleText={isPosted ? "Posted" : "Post"}
                          pendingText="Wait"
                          variant="secondary"
                          className="h-9 px-4 text-xs font-medium rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                          disabled={isPosted}
                        />
                      </div>
                    </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
\`;

fs.writeFileSync('app/dashboard/concierge/page.tsx', content);
