import { redirect, unstable_rethrow } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDndContext, toggleRoomDnd } from "./actions";

type DndPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DndLogPage({ searchParams }: DndPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const context = await getDndContext(activePropertyId);

  const toggleAction = async (formData: FormData) => {
    "use server";
    try {
      const result = await toggleRoomDnd(formData);
      if (result?.success) redirect(`/dashboard/dnd-log?ok=${encodeURIComponent("DND status updated.")}`);
      redirect(`/dashboard/dnd-log?error=${encodeURIComponent(result?.error ?? "Unable to update DND.")}`);
    } catch (err) {
      unstable_rethrow(err);
      redirect(`/dashboard/dnd-log?error=${encodeURIComponent("Unable to update DND.")}`);
    }
  };

  const activeCount = Object.keys(context.activeByRoom).length;

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">Do Not Disturb Log</h1>
          <p className="page-subtitle">Track DND windows by room and avoid service-window misses.</p>
        </div>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Active DND Rooms</span>
              <Badge variant="outline">{activeCount}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {context.rooms.length === 0 ? (
              <p className="text-sm text-zinc-500">No rooms found for this property.</p>
            ) : (
              <ul className="space-y-3">
                {context.rooms.map((room) => {
                  const active = (context.activeByRoom as Record<string, { starts_at: string; note: string | null }>)[room.id];
                  return (
                    <li key={room.id} className="rounded-xl border border-zinc-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-zinc-900">Room {room.room_number}</p>
                          <p className="text-xs text-zinc-500">{room.floor != null ? `Floor ${room.floor}` : "No floor"}</p>
                        </div>
                        <Badge className={active ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}>
                          {active ? "DND Active" : "Service Allowed"}
                        </Badge>
                      </div>

                      <form action={toggleAction} className="mt-3 grid gap-2 lg:grid-cols-4">
                        <input type="hidden" name="propertyId" value={activePropertyId} />
                        <input type="hidden" name="roomId" value={room.id} />
                        <input type="hidden" name="isDnd" value={active ? "false" : "true"} />

                        <div className="lg:col-span-3 grid gap-1.5">
                          <Label>Note</Label>
                          <Input name="note" defaultValue={active?.note ?? ""} placeholder="Optional reason" disabled={Boolean(active)} />
                        </div>

                        <div className="lg:col-span-1 flex items-end">
                          <FormSubmitButton
                            idleText={active ? "Clear DND" : "Set DND"}
                            pendingText="Saving..."
                            variant={active ? "outline" : "default"}
                            className="w-full h-12!"
                          />
                        </div>
                      </form>

                      {active ? (
                        <p className="mt-2 text-xs text-zinc-500">Active since {new Date(active.starts_at).toLocaleString("en-GB")}</p>
                      ) : null}
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
