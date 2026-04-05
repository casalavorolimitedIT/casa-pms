import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getActivePropertyId } from "@/lib/pms/property-context";
import {
  assignRequest,
  createRequest,
  deleteRequest,
  getConciergeContext,
  postConciergeCharge,
  setRequestBillable,
  updateRequest,
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
import { PageHelpDialog } from "@/components/custom/page-help-dialog";
import { ServerActionDeleteModal } from "@/components/custom/server-action-delete-modal";
import { FormDateTimeField } from "@/components/ui/form-date-time-field";

type ConciergePageProps = {
  searchParams?: Promise<{
    ok?: string | string[];
    error?: string | string[];
    view?: string | string[];
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
  const view = readSearchValue(params.view) === "cards" ? "cards" : "compact";

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const context = await getConciergeContext(activePropertyId);

  const folioOptions = context.folios.map((folio) => {
    const reservationRaw = (folio as { reservations?: unknown }).reservations;
    const reservation = Array.isArray(reservationRaw) ? reservationRaw[0] : reservationRaw;
    const guestName = getGuestName((reservation as { guests?: unknown } | null)?.guests);
    return {
      value: folio.id,
      label: `${guestName} - ${folio.id.slice(0, 8)} (${folio.status})`,
    };
  });

  const createRequestAction = async (formData: FormData) => {
    "use server";
    let target = "/dashboard/concierge";
    try {
      await createRequest(formData);
      target = `/dashboard/concierge?ok=${encodeURIComponent("Concierge request created.")}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create concierge request.";
      target = `/dashboard/concierge?error=${encodeURIComponent(message)}`;
    }
    redirect(target);
  };

  const assignRequestAction = async (formData: FormData) => {
    "use server";
    let target = "/dashboard/concierge";
    try {
      await assignRequest(formData);
      target = `/dashboard/concierge?ok=${encodeURIComponent("Staff assignment updated.")}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to assign request.";
      target = `/dashboard/concierge?error=${encodeURIComponent(message)}`;
    }
    redirect(target);
  };

  const updateStatusAction = async (formData: FormData) => {
    "use server";
    let target = "/dashboard/concierge";
    try {
      await updateRequestStatus(formData);
      target = `/dashboard/concierge?ok=${encodeURIComponent("Request status updated.")}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update request status.";
      target = `/dashboard/concierge?error=${encodeURIComponent(message)}`;
    }
    redirect(target);
  };

  const postChargeAction = async (formData: FormData) => {
    "use server";
    let target = "/dashboard/concierge";
    try {
      await postConciergeCharge(formData);
      target = `/dashboard/concierge?ok=${encodeURIComponent("Charge posted to folio.")}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to post concierge charge.";
      target = `/dashboard/concierge?error=${encodeURIComponent(message)}`;
    }
    redirect(target);
  };

  const editRequestAction = async (formData: FormData) => {
    "use server";
    let target = "/dashboard/concierge";
    try {
      await updateRequest(formData);
      target = `/dashboard/concierge?ok=${encodeURIComponent("Request details updated.")}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update request.";
      target = `/dashboard/concierge?error=${encodeURIComponent(message)}`;
    }
    redirect(target);
  };

  const deleteRequestAction = async (formData: FormData) => {
    "use server";
    let target = "/dashboard/concierge";
    try {
      await deleteRequest(formData);
      target = `/dashboard/concierge?ok=${encodeURIComponent("Request deleted.")}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete request.";
      target = `/dashboard/concierge?error=${encodeURIComponent(message)}`;
    }
    redirect(target);
  };

  const toggleBillableAction = async (formData: FormData) => {
    "use server";
    let target = "/dashboard/concierge";
    try {
      await setRequestBillable(formData);
      target = `/dashboard/concierge?ok=${encodeURIComponent("Billing mode updated.")}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update billing mode.";
      target = `/dashboard/concierge?error=${encodeURIComponent(message)}`;
    }
    redirect(target);
  };

  const categoryOptions = [
    { value: "general", label: "General" },
    { value: "housekeeping", label: "Housekeeping" },
    { value: "transport", label: "Transport" },
    { value: "dining", label: "Dining" },
    { value: "maintenance", label: "Maintenance" },
  ];

  const priorityOptions = [
    { value: "low", label: "Low" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
  ];

  const renderRequestForm = ({
    mode,
    idPrefix,
    action,
    request,
  }: {
    mode: "create" | "edit";
    idPrefix: string;
    action: (formData: FormData) => Promise<void>;
    request?: {
      id: string;
      category: string;
      priority: string;
      description: string;
      sla_due_at: string | null;
      charge_amount_minor: number | null;
      is_billable: boolean;
    };
  }) => (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl font-semibold">{mode === "create" ? "New Request" : "Edit Request"}</DialogTitle>
        <p className="text-sm text-zinc-500 mt-1">
          {mode === "create"
            ? "Log a new guest request to the concierge desk."
            : "Update details and billing flags for this concierge request."}
        </p>
      </DialogHeader>
      <form action={action} className="grid pt-4 gap-6">
        {mode === "create" ? (
          <input type="hidden" name="propertyId" value={activePropertyId} />
        ) : (
          <input type="hidden" name="requestId" value={request?.id ?? ""} />
        )}

        {mode === "create" ? (
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-reservationId`} className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Reservation (optional)</Label>
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
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-category`} className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Category</Label>
            <FormSelectField
              name="category"
              defaultValue={request?.category ?? "general"}
              options={categoryOptions}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-priority`} className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Priority</Label>
            <FormSelectField
              name="priority"
              defaultValue={request?.priority ?? "normal"}
              options={priorityOptions}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-description`} className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Description</Label>
          <Textarea
            id={`${idPrefix}-description`}
            name="description"
            required
            defaultValue={request?.description ?? ""}
            placeholder="Guest requested airport transfer for tomorrow 8 AM"
            className="min-h-[100px] resize-none rounded-xl bg-zinc-50"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-slaDueAt`} className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">SLA Due (optional)</Label>
            <FormDateTimeField
              name="slaDueAt"
              includeTime={true}
              defaultValue={request?.sla_due_at ?? ""}
              placeholder="Select deadline"
              className="bg-zinc-50"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-chargeAmountMinor`} className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Billable (minor)</Label>
            <Input
              id={`${idPrefix}-chargeAmountMinor`}
              name="chargeAmountMinor"
              type="number"
              min={0}
              defaultValue={request?.charge_amount_minor ?? 0}
              className="h-10 rounded-xl bg-zinc-50 border-zinc-200/60 block appearance-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 bg-zinc-50 p-4 border border-zinc-100 rounded-xl focus-within:ring-2 ring-primary/20">
          <input
            id={`${idPrefix}-billable`}
            aria-label="Bill this service to guest folio"
            name="billable"
            type="checkbox"
            defaultChecked={request?.is_billable ?? false}
            className="h-4 w-4 rounded border-zinc-300 text-primary"
          />
          <Label htmlFor={`${idPrefix}-billable`} className="text-sm font-medium text-zinc-700 cursor-pointer">Bill to guest folio</Label>
        </div>

        <FormSubmitButton
          idleText={mode === "create" ? "Create Request" : "Save Changes"}
          pendingText={mode === "create" ? "Creating request..." : "Saving..."}
          className="w-full mt-2 rounded-xl h-12 font-medium shadow-primary/20 shadow-lg"
        />
      </form>
    </>
  );

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-[1600px] p-6 sm:p-8 lg:p-12 space-y-10">
        <FormStatusToast ok={ok} error={error} />
        
        {/* Header Section */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <PageHelpDialog
                pageName="Concierge Requests"
                summary="Handle guest service tickets, assign staff, track progress, and post approved charges to folios."
                responsibilities={[
                  "Create and update concierge requests with category, priority, and SLA.",
                  "Assign requests to staff and move statuses from open to completed.",
                  "Enable billable mode, select the target folio, and post concierge charges.",
                  "Use compact view for dense operations or card view for richer detail editing.",
                ]}
                relatedPages={[
                  {
                    href: "/dashboard/folios",
                    label: "Folios",
                    description: "Verify folio availability and review posted charges.",
                  },
                  {
                    href: "/dashboard/reservations",
                    label: "Reservations",
                    description: "Reference active stays when creating concierge requests.",
                  },
                ]}
              />
              <h1 className="page-title group-hover:text-zinc-700 transition-colors">
                Concierge Requests
              </h1>
            </div>
            <p className="text-sm font-medium tracking-wide text-zinc-700">
              Track requests, manage status SLA, and process billable service charges.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="inline-flex h-11 items-center rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
              <Link
                href="/dashboard/concierge?view=compact"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  view === "compact" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"
                }`}
                aria-label="Compact view"
                title="Compact view"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </Link>
              <Link
                href="/dashboard/concierge?view=cards"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  view === "cards" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"
                }`}
                aria-label="Card view"
                title="Card view"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <rect x="1" y="2" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4 5.5h6M4 8.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </Link>
            </div>

            <Dialog>
              <DialogTrigger render={<Button className="shrink-0 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98] rounded-full px-6 text-sm font-medium h-11" />}>
                <span className="mr-2 opacity-70">+</span> New Request
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                {renderRequestForm({ mode: "create", idPrefix: "create", action: createRequestAction })}
              </DialogContent>
            </Dialog>
          </div>
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
        ) : view === "cards" ? (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {context.requests.map((request, i) => {
              const assignedRaw = request.profiles as { full_name?: string; email?: string } | Array<{ full_name?: string; email?: string }> | null;
              const assigned = Array.isArray(assignedRaw) ? assignedRaw[0] : assignedRaw;
              const isPosted = Boolean(request.posted_charge_id);
              const canPostCharge = request.is_billable && !isPosted && folioOptions.length > 0;

              return (
                <div 
                  key={request.id} 
                  className="group relative flex flex-col gap-6 overflow-hidden rounded-3xl bg-white border border-zinc-100 p-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] hover:border-zinc-200/60 transition-all duration-500 hover:-translate-y-1.5 will-change-transform"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                       <Badge variant="outline" className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-widest rounded-full ${STATUS_TONE[request.status] ?? "bg-zinc-100 text-zinc-700"}`}>
                         {request.status.replace("_", " ")}
                       </Badge>
                       <div className="flex items-center gap-1.5">
                         <Dialog>
                           <DialogTrigger render={<Button variant="ghost" size="xs" className="rounded-full underline px-2.5 text-[11px] font-semibold text-zinc-600" />}>
                             Edit
                           </DialogTrigger>
                           <DialogContent className="sm:max-w-[520px]">
                               {renderRequestForm({
                                 mode: "edit",
                                 idPrefix: `card-${request.id}`,
                                 action: editRequestAction,
                                 request: {
                                   id: request.id,
                                   category: request.category,
                                   priority: request.priority,
                                   description: request.description,
                                   sla_due_at: request.sla_due_at,
                                   charge_amount_minor: request.charge_amount_minor,
                                   is_billable: request.is_billable,
                                 },
                               })}
                           </DialogContent>
                         </Dialog>
                         <ServerActionDeleteModal
                           action={deleteRequestAction}
                           fields={{ requestId: request.id }}
                           triggerLabel="Delete"
                           triggerVariant="destructive"
                           triggerSize="xs"
                           triggerClassName="rounded-full px-2.5 text-[11px]"
                           title="Delete request"
                           description="This permanently removes the concierge request. Requests with posted folio charges cannot be deleted."
                           itemName={request.description}
                           confirmText="Delete request"
                           loadingText="Deleting request..."
                         />
                         <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 max-w-[45%] truncate">
                           <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300"></div>
                           {assigned?.full_name || assigned?.email || "Unassigned"}
                         </div>
                       </div>
                    </div>
                    
                    <p className="font-medium text-[15px] leading-relaxed text-zinc-900 min-h-[44px]">
                      {request.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                      <span className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-full">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {new Date(request.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}
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

                    <div className="flex flex-col gap-1.5 pt-4 border-t border-dashed border-amber-200/50">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-[10px] uppercase font-bold tracking-wider text-amber-500">Post To Folio</Label>
                        {isPosted ? (
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-600">Already Posted</span>
                        ) : null}
                      </div>
                      <form action={toggleBillableAction} className="flex items-center justify-between rounded-xl border border-amber-200/50 bg-amber-50/30 p-2">
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="billable" value={request.is_billable ? "false" : "true"} />
                        <span className="text-[11px] font-medium text-amber-800/90">
                          {request.is_billable ? "Billable is ON" : "Billable is OFF"}
                        </span>
                        <Button
                          type="submit"
                          size="xs"
                          variant={request.is_billable ? "outline" : "secondary"}
                          className="h-7 rounded-lg px-2.5 text-[11px]"
                          disabled={isPosted}
                        >
                          {request.is_billable ? "Disable" : "Make Billable"}
                        </Button>
                      </form>
                      <form action={postChargeAction} className="flex items-center gap-2">
                        <input type="hidden" name="requestId" value={request.id} />
                        <div className="flex-1 min-w-0">
                          <FormSelectField
                            name="folioId"
                            placeholder={folioOptions.length ? "Select folio" : "No folios"}
                            options={folioOptions}
                            defaultValue={request.folio_id ?? ""}
                            disabled={!canPostCharge}
                            className="[&_button]:h-9 [&_button]:rounded-xl [&_button]:border-amber-200/50 [&_button]:bg-amber-50/30 [&_button]:text-xs text-wrap"
                            emptyStateText="No folios found for this property."
                            emptyStateLinkHref="/dashboard/folios"
                            emptyStateLinkLabel="Open folios"
                          />
                        </div>
                        <div className="w-[84px] shrink-0">
                          <Input
                            name="amountMinor"
                            type="number"
                            min={1}
                            defaultValue={request.charge_amount_minor ?? 0}
                            disabled={!canPostCharge}
                            className="h-9 text-xs rounded-xl bg-amber-50/30 border-amber-200/50"
                          />
                        </div>
                        <FormSubmitButton
                          idleText={isPosted ? "Posted" : "Post"}
                          pendingText="Wait"
                          variant="secondary"
                          className="h-9 px-4 text-xs font-medium rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50 shadow-none border-0"
                          disabled={!canPostCharge}
                        />
                      </form>
                      {!request.is_billable ? (
                        <p className="text-[11px] text-zinc-500">Use Make Billable above, then fill folio ID and amount to post.</p>
                      ) : folioOptions.length === 0 ? (
                        <p className="text-[11px] text-zinc-500">No folios available for this property yet. Open the folios page to create one first.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="grid grid-cols-[1.4fr_0.8fr_0.9fr_1.2fr_0.9fr] gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              <span>Request</span>
              <span>Assignee</span>
              <span>Status</span>
              <span>Folio Charge</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-zinc-100">
              {context.requests.map((request) => {
                const assignedRaw = request.profiles as { full_name?: string; email?: string } | Array<{ full_name?: string; email?: string }> | null;
                const assigned = Array.isArray(assignedRaw) ? assignedRaw[0] : assignedRaw;
                const isPosted = Boolean(request.posted_charge_id);
                const canPostCharge = request.is_billable && !isPosted && folioOptions.length > 0;

                return (
                  <div key={request.id} className="grid grid-cols-1 gap-3 px-4 py-4 lg:grid-cols-[1.4fr_0.8fr_0.9fr_1.2fr_0.9fr] lg:items-center lg:gap-4">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{request.description}</p>
                      <p className="text-[11px] uppercase tracking-wider text-zinc-500">
                        {request.category} · {request.priority} · {new Date(request.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    <form action={assignRequestAction} className="flex items-center gap-2">
                      <input type="hidden" name="requestId" value={request.id} />
                      <div className="min-w-0 flex-1">
                        <FormSelectField
                          name="assignedTo"
                          defaultValue={request.assigned_to ?? ""}
                          placeholder={assigned?.full_name || assigned?.email || "Select staff"}
                          options={context.staff.map((staff) => ({ value: staff.id, label: staff.full_name?.trim() || staff.email }))}
                          emptyStateText="No staff profile found."
                          className="[&_button]:h-9 [&_button]:text-xs"
                        />
                      </div>
                      <FormSubmitButton idleText="Set" pendingText="..." variant="outline" className="h-9 px-3 text-xs" />
                    </form>

                    <form action={updateStatusAction} className="flex items-center gap-2">
                      <input type="hidden" name="requestId" value={request.id} />
                      <div className="min-w-0 flex-1">
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
                          className="[&_button]:h-9 [&_button]:text-xs"
                        />
                      </div>
                      <FormSubmitButton idleText="Set" pendingText="..." variant="outline" className="h-9 px-3 text-xs" />
                    </form>

                    <form action={postChargeAction} className="flex items-center gap-2">
                      <input type="hidden" name="requestId" value={request.id} />
                      <div className="min-w-0 flex-1">
                        <FormSelectField
                          name="folioId"
                          placeholder={request.is_billable ? "Select folio" : "Set billable in actions"}
                          options={folioOptions}
                          defaultValue={request.folio_id ?? ""}
                          disabled={!canPostCharge}
                          className="[&_button]:h-9 [&_button]:text-xs"
                          emptyStateText="No folios found for this property."
                          emptyStateLinkHref="/dashboard/folios"
                          emptyStateLinkLabel="Open folios"
                        />
                      </div>
                      <Input
                        name="amountMinor"
                        type="number"
                        min={1}
                        defaultValue={request.charge_amount_minor ?? 0}
                        disabled={!canPostCharge}
                        className="h-9 w-20 text-xs"
                      />
                      <FormSubmitButton idleText={isPosted ? "Done" : "Post"} pendingText="..." variant="secondary" className="h-9 px-3 text-xs" disabled={!canPostCharge} />
                    </form>

                    <div className="flex items-center justify-end gap-2">
                      <form action={toggleBillableAction}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="billable" value={request.is_billable ? "false" : "true"} />
                        <Button type="submit" size="xs" variant={request.is_billable ? "outline" : "secondary"} className="h-8 rounded-lg px-2.5 text-[11px]" disabled={isPosted}>
                          {request.is_billable ? "Billable ON" : "Billable OFF"}
                        </Button>
                      </form>

                      <Dialog>
                        <DialogTrigger render={<Button variant="ghost" size="xs" className="h-8 rounded-lg px-2.5 text-[11px]" />}>
                          Edit
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[520px]">
                          {renderRequestForm({
                            mode: "edit",
                            idPrefix: `table-${request.id}`,
                            action: editRequestAction,
                            request: {
                              id: request.id,
                              category: request.category,
                              priority: request.priority,
                              description: request.description,
                              sla_due_at: request.sla_due_at,
                              charge_amount_minor: request.charge_amount_minor,
                              is_billable: request.is_billable,
                            },
                          })}
                        </DialogContent>
                      </Dialog>

                      <ServerActionDeleteModal
                        action={deleteRequestAction}
                        fields={{ requestId: request.id }}
                        triggerLabel="Delete"
                        triggerVariant="destructive"
                        triggerSize="xs"
                        triggerClassName="h-8 rounded-lg px-2.5 text-[11px]"
                        title="Delete request"
                        description="This permanently removes the concierge request. Requests with posted folio charges cannot be deleted."
                        itemName={request.description}
                        confirmText="Delete request"
                        loadingText="Deleting request..."
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
