import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { PageHelpDialog } from "@/components/custom/page-help-dialog";
import { WorkflowStepperSheet } from "@/components/custom/workflow-stepper-sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { createSpaTreatmentRoom, getSpaTreatmentRoomsContext, updateSpaTreatmentRoom } from "../actions";

type SpaRoomsPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SpaRoomsPage({ searchParams }: SpaRoomsPageProps) {
  await redirectIfNotAuthenticated();
  const propertyId = await getActivePropertyId();

  if (!propertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Select an active property to manage treatment rooms.</div>;
  }

  const canManage = await hasPermission(propertyId, "spa.manage");
  if (!canManage) {
    redirect("/dashboard?error=You%20do%20not%20have%20access%20to%20spa%20treatment%20rooms");
  }

  const query = (await searchParams) ?? {};
  const ok = first(query.ok);
  const error = first(query.error);

  const context = await getSpaTreatmentRoomsContext(propertyId);

  const createAction = async (formData: FormData) => {
    "use server";
    const result = await createSpaTreatmentRoom(formData);
    if (result?.success) redirect("/dashboard/spa/rooms?ok=Treatment%20room%20created");
    redirect(`/dashboard/spa/rooms?error=${encodeURIComponent(result?.error ?? "Unable to create treatment room")}`);
  };

  const updateAction = async (formData: FormData) => {
    "use server";
    const result = await updateSpaTreatmentRoom(formData);
    if (result?.success) redirect("/dashboard/spa/rooms?ok=Treatment%20room%20updated");
    redirect(`/dashboard/spa/rooms?error=${encodeURIComponent(result?.error ?? "Unable to update treatment room")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="page-title">Spa Treatment Rooms</h1>
            <p className="page-subtitle">Create and maintain room inventory used when scheduling spa bookings.</p>
          </div>
          <PageHelpDialog
            className="border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            pageName="Spa treatment rooms"
            summary="This page manages the rooms available for spa appointment allocation and overlap checks."
            responsibilities={[
              "Add treatment rooms for booking operations.",
              "Set room names used by front-office and therapists.",
              "Activate or deactivate rooms without deleting history.",
            ]}
            relatedPages={[
              {
                href: "/dashboard/spa/bookings",
                label: "Spa Bookings",
                description: "Bookings rely on active treatment room options.",
              },
            ]}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Metric title="Total Rooms" value={context.rooms.length} />
          <Metric title="Active" value={context.rooms.filter((room) => room.is_active).length} />
          <Metric title="Inactive" value={context.rooms.filter((room) => !room.is_active).length} />
        </div>

        <Card className="glass-panel mt-8 border-zinc-200/80 bg-linear-to-br from-white via-zinc-50/70 to-white">
          <CardHeader><CardTitle className="text-base">Treatment Room Workflow</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-zinc-900">Add rooms from a guided side panel.</p>
              <p className="text-sm text-zinc-600">Input progress is remembered if you close and reopen.</p>
            </div>
            <WorkflowStepperSheet
              title="New Treatment Room"
              description="Create room records in one lightweight flow."
              triggerLabel="Add treatment room"
              memoryKey="spa-treatment-rooms"
              steps={[
                { title: "Name room", description: "Set the room label visible in bookings." },
                { title: "Create room", description: "Save and make it active for scheduling." },
              ]}
            >
              <form action={createAction} className="grid gap-6">
                <input type="hidden" name="propertyId" value={propertyId} />

                <section data-workflow-step="1" className="space-y-3 rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">1</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Name room</h2>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="roomName">Treatment Room</Label>
                    <Input id="roomName" name="name" placeholder="Room A" required />
                  </div>
                </section>

                <section data-workflow-step="2" className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">2</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Create room</h2>
                  </div>
                  <FormSubmitButton idleText="Create treatment room" pendingText="Saving..." className="w-full sm:w-auto" />
                </section>
              </form>
            </WorkflowStepperSheet>
          </CardContent>
        </Card>

        <Card className="glass-panel mt-6">
          <CardHeader><CardTitle className="text-base">Room Inventory</CardTitle></CardHeader>
          <CardContent>
            {context.rooms.length === 0 ? (
              <p className="text-sm text-zinc-500">No treatment rooms yet.</p>
            ) : (
              <div className="space-y-3">
                {context.rooms.map((room) => (
                  <form key={room.id} action={updateAction} className="rounded-xl border border-zinc-200 p-3">
                    <input type="hidden" name="propertyId" value={propertyId} />
                    <input type="hidden" name="roomId" value={room.id} />
                    <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                      <div className="grid gap-2">
                        <Label htmlFor={`name-${room.id}`}>Room Name</Label>
                        <Input id={`name-${room.id}`} name="name" defaultValue={room.name} required />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-zinc-700">
                        <input name="isActive" type="checkbox" value="true" defaultChecked={room.is_active} className="h-4 w-4" />
                        Active
                      </label>
                      <FormSubmitButton idleText="Save" pendingText="..." size="sm" variant="outline" />
                    </div>
                  </form>
                ))}
              </div>
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
      <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-600">{title}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight text-zinc-900">{value}</p>
      </CardContent>
    </Card>
  );
}
