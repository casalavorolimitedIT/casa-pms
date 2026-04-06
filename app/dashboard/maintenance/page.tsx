import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormDateTimeField } from "@/components/ui/form-date-time-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  createRecurringInstances,
  createSchedule,
  getMaintenanceContext,
  logMaintenanceCompleted,
} from "./actions";

type MaintenancePageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MaintenancePage({ searchParams }: MaintenancePageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const query = (await searchParams) ?? {};
  const ok = readSearchValue(query.ok);
  const error = readSearchValue(query.error);

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Select an active property from the header.</div>;
  }

  const context = await getMaintenanceContext(activePropertyId);
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const dueNowCount = context.dueItems.filter((item) => item.due_on <= todayIso).length;

  const createAction = async (formData: FormData) => {
    "use server";
    const result = await createSchedule(formData);
    if (result?.success) {
      redirect(`/dashboard/maintenance?ok=${encodeURIComponent("Schedule created.")}`);
    }
    redirect(`/dashboard/maintenance?error=${encodeURIComponent(result?.error ?? "Unable to create schedule.")}`);
  };

  const completeAction = async (formData: FormData) => {
    "use server";
    const result = await logMaintenanceCompleted(formData);
    if (result?.success) {
      redirect(`/dashboard/maintenance?ok=${encodeURIComponent("Maintenance item completed.")}`);
    }
    redirect(`/dashboard/maintenance?error=${encodeURIComponent(result?.error ?? "Unable to complete maintenance item.")}`);
  };

  const generateAction = async (formData: FormData) => {
    "use server";
    const result = await createRecurringInstances(formData);
    if (result?.success) {
      redirect(`/dashboard/maintenance?ok=${encodeURIComponent("Future maintenance items generated.")}`);
    }
    redirect(`/dashboard/maintenance?error=${encodeURIComponent(result?.error ?? "Unable to generate recurrence.")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">Preventive Maintenance</h1>
          <p className="page-subtitle">Create recurring schedules and keep a live queue of due and overdue maintenance actions.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Metric title="Active schedules" value={context.schedules.length} />
          <Metric title="Actionable today" value={dueNowCount} />
          <Metric title="Open due items" value={context.dueItems.length} />
        </div>

        <Card className="border-zinc-200 mt-8">
          <CardHeader>
            <CardTitle className="text-base">Create Recurring Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAction} className="grid gap-4">
              <input type="hidden" name="propertyId" value={activePropertyId} />

              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" placeholder="Monthly AC filter check" required />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="grid gap-2">
                  <Label htmlFor="recurrence">Recurrence</Label>
                  <FormSelectField
                    name="recurrence"
                    defaultValue="monthly"
                    options={[
                      { value: "daily", label: "Daily" },
                      { value: "weekly", label: "Weekly" },
                      { value: "monthly", label: "Monthly" },
                      { value: "quarterly", label: "Quarterly" },
                    ]}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="everyInterval">Every N cycles</Label>
                  <Input id="everyInterval" name="everyInterval" type="number" min={1} max={30} defaultValue={1} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="roomId">Room (optional)</Label>
                  <FormSelectField
                    name="roomId"
                    placeholder="No room link"
                    options={context.rooms.map((room) => ({
                      value: room.id,
                      label: room.room_number,
                    }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="assetId">Asset (optional)</Label>
                  <FormSelectField
                    name="assetId"
                    placeholder="No asset link"
                    options={context.assets.map((asset) => ({
                      value: asset.id,
                      label: asset.name,
                    }))}
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:max-w-sm">
                <Label htmlFor="startsOn">Starts On</Label>
                <FormDateTimeField name="startsOn" includeTime={false} placeholder="Select start date" />
              </div>

              <FormSubmitButton idleText="Create schedule" pendingText="Creating..." className="w-full sm:w-auto" />
            </form>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 mt-6">
          <CardHeader>
            <CardTitle className="text-base">Due and Overdue Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {context.dueItems.length === 0 ? (
              <p className="text-sm text-zinc-500">No due maintenance tasks yet.</p>
            ) : (
              <ul className="space-y-3">
                {context.dueItems.map((item) => {
                  const scheduleRaw = item.maintenance_schedules as { title?: string; recurrence?: string } | Array<{ title?: string; recurrence?: string }> | null;
                  const schedule = Array.isArray(scheduleRaw) ? scheduleRaw[0] : scheduleRaw;
                  const isOverdue = item.due_on < todayIso;
                  return (
                    <li key={item.id} className="rounded-xl border border-zinc-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-zinc-900">{schedule?.title ?? "Maintenance item"}</p>
                          <p className="text-xs text-zinc-500">
                            Due {item.due_on} · {schedule?.recurrence ?? "recurring"}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs ${isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                          {isOverdue ? "Overdue" : "Due"}
                        </span>
                      </div>

                      <form action={completeAction} className="mt-3 grid gap-2">
                        <input type="hidden" name="instanceId" value={item.id} />
                        <Textarea name="note" rows={2} placeholder="Completion notes (optional)" />
                        <FormSubmitButton idleText="Mark completed" pendingText="Saving..." size="sm" className="w-full sm:w-auto" />
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-200 mt-6">
          <CardHeader>
            <CardTitle className="text-base">Recurrence Regeneration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500 mb-3">Generate future actionable items for active schedules.</p>
            <div className="space-y-2">
              {context.schedules.length === 0 ? (
                <p className="text-sm text-zinc-500">No schedules yet.</p>
              ) : (
                context.schedules.map((schedule) => (
                  <form key={schedule.id} action={generateAction} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-2">
                    <input type="hidden" name="scheduleId" value={schedule.id} />
                    <input type="hidden" name="horizonDays" value="90" />
                    <p className="text-sm text-zinc-800">{schedule.title}</p>
                    <FormSubmitButton idleText="Generate next 90 days" pendingText="Generating..." size="sm" variant="outline" />
                  </form>
                ))
              )}
            </div>
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
