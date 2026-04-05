import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { FormDateTimeField } from "@/components/ui/form-date-time-field";
import {
  assignWorkOrder,
  createWorkOrder,
  getWorkOrdersContext,
  resolveWorkOrder,
  updateWorkOrderStatus,
} from "./actions";

type WorkOrdersPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const STATUS_TONE: Record<string, string> = {
  open: "bg-zinc-100 text-zinc-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-800",
  on_hold: "bg-orange-100 text-orange-700",
  resolved: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const PRIORITY_TONE: Record<string, string> = {
  low: "bg-zinc-100 text-zinc-700",
  normal: "bg-sky-100 text-sky-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default async function WorkOrdersPage({ searchParams }: WorkOrdersPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const context = await getWorkOrdersContext(activePropertyId);

  const createAction = async (formData: FormData) => {
    "use server";
    const result = await createWorkOrder(formData);
    if (result?.success) {
      redirect(`/dashboard/work-orders?ok=${encodeURIComponent("Work order created.")}`);
    }
    redirect(`/dashboard/work-orders?error=${encodeURIComponent(result?.error ?? "Unable to create work order.")}`);
  };

  const assignAction = async (formData: FormData) => {
    "use server";
    const result = await assignWorkOrder(formData);
    if (result?.success) {
      redirect(`/dashboard/work-orders?ok=${encodeURIComponent("Assignment updated.")}`);
    }
    redirect(`/dashboard/work-orders?error=${encodeURIComponent(result?.error ?? "Unable to assign work order.")}`);
  };

  const statusAction = async (formData: FormData) => {
    "use server";
    const result = await updateWorkOrderStatus(formData);
    if (result?.success) {
      redirect(`/dashboard/work-orders?ok=${encodeURIComponent("Status updated.")}`);
    }
    redirect(`/dashboard/work-orders?error=${encodeURIComponent(result?.error ?? "Unable to update status.")}`);
  };

  const resolveAction = async (formData: FormData) => {
    "use server";
    const result = await resolveWorkOrder(formData);
    if (result?.success) {
      redirect(`/dashboard/work-orders?ok=${encodeURIComponent("Work order resolved.")}`);
    }
    redirect(`/dashboard/work-orders?error=${encodeURIComponent(result?.error ?? "Unable to resolve work order.")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">Work Orders</h1>
          <p className="page-subtitle">Create, assign, track, and resolve engineering work with optional room blocking.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Metric title="Open" value={context.workOrders.filter((o) => ["open", "assigned", "in_progress", "on_hold"].includes(o.status)).length} />
          <Metric title="In Progress" value={context.workOrders.filter((o) => o.status === "in_progress").length} />
          <Metric title="Resolved" value={context.workOrders.filter((o) => o.status === "resolved").length} />
          <Metric title="Urgent" value={context.workOrders.filter((o) => o.priority === "urgent").length} />
        </div>

        <div className="max-w-4xl mt-8 mb-8">
          <form action={createAction} className="flex flex-col gap-8">
            <input type="hidden" name="propertyId" value={activePropertyId} />

            <div className="grid gap-6 md:grid-cols-12 relative">
              <div className="md:col-span-4 space-y-1.5 pt-1">
                <h3 className="text-sm font-medium text-foreground">Issue Details</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Capture what is broken and why it matters before assigning.</p>
              </div>

              <div className="md:col-span-8 grid gap-4 bg-card border border-border shadow-sm rounded-xl p-5">
                <div className="grid gap-2">
                  <Label className="text-zinc-700 font-medium">Title</Label>
                  <Input name="title" placeholder="AC unit not cooling" required className="bg-white shadow-sm" />
                </div>

                <div className="grid gap-2">
                  <Label className="text-zinc-700 font-medium">Description</Label>
                  <Textarea name="description" rows={3} placeholder="Issue details, affected equipment, guest impact" className="bg-white resize-none shadow-sm" />
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-border/60" />

            <div className="grid gap-6 md:grid-cols-12 relative">
              <div className="md:col-span-4 space-y-1.5 pt-1">
                <h3 className="text-sm font-medium text-foreground">Routing & Priority</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Select urgency, destination room, assignee, and downtime window.</p>
              </div>

              <div className="md:col-span-8 grid gap-5 bg-card border border-border shadow-sm rounded-xl p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-zinc-700 font-medium">Category</Label>
                    <Input name="category" defaultValue="general" className="bg-white shadow-sm" />
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-zinc-700 font-medium">Priority</Label>
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

                  <div className="grid gap-2">
                    <Label className="text-zinc-700 font-medium">Room</Label>
                    <FormSelectField
                      name="roomId"
                      placeholder="Optional"
                      options={context.rooms.map((room) => ({
                        value: room.id,
                        label: `${room.room_number} (${room.status})`,
                      }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-zinc-700 font-medium">Assign To</Label>
                    <FormSelectField
                      name="assignedTo"
                      placeholder="Optional"
                      options={context.staff.map((staff) => ({
                        value: staff.id,
                        label: staff.full_name?.trim() || staff.email,
                      }))}
                    />
                  </div>

                  <div className="grid gap-2 sm:col-span-2">
                    <Label className="text-zinc-700 font-medium">Due</Label>
                    <FormDateTimeField name="dueAt" placeholder="Select due date and time" />
                  </div>

                  <div className="grid gap-2 sm:col-span-2 pt-2">
                    <label className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-700 cursor-pointer hover:bg-zinc-50 hover:border-zinc-300 transition-colors shadow-sm">
                      <input name="blockRoom" type="checkbox" className="h-4 w-4 rounded border-border text-zinc-900 focus:ring-zinc-900" />
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">Block Room</span>
                        <span className="text-muted-foreground text-xs">Mark room as out-of-order until resolved</span>
                      </div>
                    </label>
                  </div>

                  <div className="grid gap-2 sm:col-span-2">
                    <Label className="text-zinc-700 font-medium">Block Until (optional)</Label>
                    <FormDateTimeField name="blockUntil" placeholder="Select room release time" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <FormSubmitButton idleText="Create Work Order" pendingText="Creating..." className="w-full sm:w-auto px-8 shadow-sm" />
            </div>
          </form>
        </div>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Work Order Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {context.workOrders.length === 0 ? (
              <p className="text-sm text-zinc-500">No work orders yet.</p>
            ) : (
              <ul className="space-y-3">
                {context.workOrders.map((order) => {
                  const roomRaw = order.rooms as { room_number?: string } | Array<{ room_number?: string }> | null;
                  const room = Array.isArray(roomRaw) ? roomRaw[0] : roomRaw;
                  const assigneeRaw = order.profiles as { full_name?: string; email?: string } | Array<{ full_name?: string; email?: string }> | null;
                  const assignee = Array.isArray(assigneeRaw) ? assigneeRaw[0] : assigneeRaw;

                  return (
                    <li key={order.id} className="rounded-xl border border-zinc-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-zinc-900">{order.title}</p>
                          <p className="text-xs text-zinc-500">
                            {order.category} · {room?.room_number ? `Room ${room.room_number}` : "No room"}
                            {order.due_at ? ` · Due ${new Date(order.due_at).toLocaleString("en-GB")}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Badge className={PRIORITY_TONE[order.priority] ?? PRIORITY_TONE.normal}>{order.priority}</Badge>
                          <Badge className={STATUS_TONE[order.status] ?? STATUS_TONE.open}>{order.status.replaceAll("_", " ")}</Badge>
                        </div>
                      </div>

                      {order.description ? <p className="mt-2 text-sm text-zinc-600">{order.description}</p> : null}
                      <p className="mt-2 text-xs text-zinc-500">Assignee: {assignee?.full_name || assignee?.email || "Unassigned"}</p>

                      <details className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                        <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.12em] text-zinc-600">Minimize / Expand Actions</summary>
                        <div className="mt-3 grid gap-3 lg:grid-cols-3">
                          <form action={assignAction} className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-2">
                            <input type="hidden" name="workOrderId" value={order.id} />
                            <Label className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Assign</Label>
                            <FormSelectField
                              name="assignedTo"
                              defaultValue={order.assigned_to ?? ""}
                              placeholder="Unassigned"
                              options={context.staff.map((staff) => ({
                                value: staff.id,
                                label: staff.full_name?.trim() || staff.email,
                              }))}
                            />
                            <FormSubmitButton idleText="Save" pendingText="..." size="sm" variant="outline" />
                          </form>

                          <form action={statusAction} className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-2">
                            <input type="hidden" name="workOrderId" value={order.id} />
                            <Label className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Status</Label>
                            <FormSelectField
                              name="status"
                              defaultValue={order.status}
                              options={[
                                { value: "open", label: "Open" },
                                { value: "assigned", label: "Assigned" },
                                { value: "in_progress", label: "In Progress" },
                                { value: "on_hold", label: "On Hold" },
                                { value: "resolved", label: "Resolved" },
                                { value: "cancelled", label: "Cancelled" },
                              ]}
                            />
                            <FormSubmitButton idleText="Update" pendingText="..." size="sm" variant="outline" />
                          </form>

                          <form action={resolveAction} className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-2">
                            <input type="hidden" name="workOrderId" value={order.id} />
                            <Label className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Resolve</Label>
                            <Textarea name="resolutionNote" rows={2} placeholder="Resolution details" />
                            <label className="flex items-center gap-2 text-xs text-zinc-700">
                              <input name="releaseRoom" type="checkbox" className="h-4 w-4" />
                              Release room from OOO
                            </label>
                            <FormSubmitButton idleText="Resolve" pendingText="Resolving..." size="sm" />
                          </form>
                        </div>
                      </details>
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
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-zinc-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight text-zinc-900">{value}</p>
      </CardContent>
    </Card>
  );
}
