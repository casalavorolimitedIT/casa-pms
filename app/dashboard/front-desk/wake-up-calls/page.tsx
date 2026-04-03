import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormDateTimeField } from "@/components/ui/form-date-time-field";
import { createWakeupCall, getWakeupContext, updateWakeupCall } from "./actions";

type WakeupPageProps = {
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

const STATUS_TONE: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  called: "bg-emerald-100 text-emerald-700",
  missed: "bg-amber-100 text-amber-800",
  cancelled: "bg-zinc-100 text-zinc-700",
};

export default async function WakeUpCallsPage({ searchParams }: WakeupPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const context = await getWakeupContext(activePropertyId);

  const createAction = async (formData: FormData) => {
    "use server";
    const result = await createWakeupCall(formData);
    if (result?.success) redirect(`/dashboard/front-desk/wake-up-calls?ok=${encodeURIComponent("Wake-up call scheduled.")}`);
    redirect(`/dashboard/front-desk/wake-up-calls?error=${encodeURIComponent(result?.error ?? "Unable to schedule wake-up call.")}`);
  };

  const updateAction = async (formData: FormData) => {
    "use server";
    const result = await updateWakeupCall(formData);
    if (result?.success) redirect(`/dashboard/front-desk/wake-up-calls?ok=${encodeURIComponent("Wake-up call updated.")}`);
    redirect(`/dashboard/front-desk/wake-up-calls?error=${encodeURIComponent(result?.error ?? "Unable to update wake-up call.")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">Wake-up Calls</h1>
          <p className="page-subtitle">Schedule, execute, and close wake-up requests with a visible due queue.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Metric title="Scheduled" value={context.calls.filter((c) => c.status === "scheduled").length} />
          <Metric title="Due in 30m" value={context.dueSoonCount} />
          <Metric title="Completed" value={context.calls.filter((c) => c.status === "called").length} />
        </div>

        <div className="max-w-4xl mt-8 mb-8">
          <form action={createAction} className="flex flex-col gap-8">
            <input type="hidden" name="propertyId" value={activePropertyId} />

            <div className="grid gap-6 md:grid-cols-12 relative">
              <div className="md:col-span-4 space-y-1.5 pt-1">
                <h3 className="text-sm font-medium text-foreground">Schedule Request</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Set up a new wake-up call for a checked-in guest.</p>
              </div>

              <div className="md:col-span-8 grid gap-4 bg-card border border-border shadow-sm rounded-xl p-5">
                <div className="grid gap-2">
                  <Label className="text-zinc-700 font-medium">Reservation</Label>
                  <FormSelectField
                    name="reservationId"
                    options={context.reservations.map((reservation) => ({
                      value: reservation.id,
                      label: `${getGuestName(reservation.guests)} · ${reservation.check_in}`,
                    }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="text-zinc-700 font-medium">Scheduled For</Label>
                  <FormDateTimeField name="scheduledFor" placeholder="Select date and time" />
                </div>

                <div className="grid gap-2">
                  <Label className="text-zinc-700 font-medium">Note</Label>
                  <Textarea name="note" rows={2} placeholder="Optional note for the agent" className="bg-white resize-none shadow-sm" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <FormSubmitButton idleText="Schedule Call" pendingText="Saving..." className="w-full sm:w-auto px-8 shadow-sm" />
            </div>
          </form>
        </div>

        <div className="w-full h-px bg-border/60 mb-8 max-w-4xl" />

        <div className="max-w-4xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">Active Queue</h3>
            <Badge variant="outline" className="font-normal text-zinc-500 bg-zinc-50">{context.calls.length} Requests</Badge>
          </div>
          
          {context.calls.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center text-sm text-zinc-500">
              No wake-up calls recorded for this property.
            </div>
          ) : (
            <ul className="space-y-3">
              {context.calls.map((call) => {
                const reservationRaw = call.reservations as { guests?: unknown; reservation_rooms?: unknown } | Array<{ guests?: unknown; reservation_rooms?: unknown }> | null;
                const reservation = Array.isArray(reservationRaw) ? reservationRaw[0] : reservationRaw;
                return (
                  <li key={call.id} className="rounded-xl bg-card border border-border shadow-sm p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-zinc-900">{getGuestName(reservation?.guests)}</p>
                          <Badge variant="secondary" className={cn("text-xs font-medium px-2 py-0.5", STATUS_TONE[call.status] ?? STATUS_TONE.scheduled)}>
                            {call.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-600 flex items-center gap-1.5">
                          <svg className="size-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {new Date(call.scheduled_for).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                        {call.note ? <p className="text-sm text-zinc-500 mt-2 bg-zinc-50 rounded-md p-2 border border-zinc-100">{call.note}</p> : null}
                      </div>

                      <form action={updateAction} className="flex items-center gap-3 w-full sm:w-auto">
                        <input type="hidden" name="wakeupId" value={call.id} />
                        <div className="w-full sm:w-40">
                          <FormSelectField
                            name="status"
                            defaultValue={call.status}
                            options={[
                              { value: "scheduled", label: "Scheduled" },
                              { value: "called", label: "Called" },
                              { value: "missed", label: "Missed" },
                              { value: "cancelled", label: "Cancelled" },
                            ]}
                          />
                        </div>
                        <FormSubmitButton idleText="Update" pendingText="..." size="sm" variant="secondary" />
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
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
