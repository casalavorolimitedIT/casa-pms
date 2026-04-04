import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LostFoundMediaPanel } from "@/components/custom/lost-found-media-panel";
import { createLostFoundItem, getLostFoundContext, updateLostFoundItem } from "./actions";

type LostFoundPageProps = {
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
  logged: "bg-zinc-100 text-zinc-700",
  in_storage: "bg-blue-100 text-blue-700",
  claimed: "bg-emerald-100 text-emerald-700",
  discarded: "bg-red-100 text-red-700",
};

export default async function LostFoundPage({ searchParams }: LostFoundPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const context = await getLostFoundContext(activePropertyId);

  const createAction = async (formData: FormData) => {
    "use server";
    const result = await createLostFoundItem(formData);
    if (result?.success) redirect(`/dashboard/lost-found?ok=${encodeURIComponent("Item logged.")}`);
    redirect(`/dashboard/lost-found?error=${encodeURIComponent(result?.error ?? "Unable to log item.")}`);
  };

  const updateAction = async (formData: FormData) => {
    "use server";
    const result = await updateLostFoundItem(formData);
    if (result?.success) redirect(`/dashboard/lost-found?ok=${encodeURIComponent("Item updated.")}`);
    redirect(`/dashboard/lost-found?error=${encodeURIComponent(result?.error ?? "Unable to update item.")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">Lost and Found</h1>
          <p className="page-subtitle">Log found items, attach image evidence, and manage claim workflow.</p>
        </div>

        <div className="max-w-4xl mt-8">
          <form action={createAction} className="flex flex-col gap-8">
            <input type="hidden" name="propertyId" value={activePropertyId} />

            <div className="grid gap-6 md:grid-cols-12">
              <div className="md:col-span-4 space-y-1.5 pt-1">
                <h3 className="text-sm font-medium text-foreground">Item Snapshot</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Capture the item identity and condition clearly for claim matching.</p>
              </div>

              <div className="md:col-span-8 grid gap-4 bg-card border border-border shadow-sm rounded-xl p-5">
                <div className="grid gap-2">
                  <Label className="text-zinc-700">Item Name</Label>
                  <Input name="itemName" placeholder="Wallet, Phone, Charger" required className="bg-white" />
                </div>

                <div className="grid gap-2">
                  <Label className="text-zinc-700">Description</Label>
                  <Textarea name="description" rows={3} placeholder="Describe condition, color, location found" className="bg-white resize-none" />
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-border/60" />

            <div className="grid gap-6 md:grid-cols-12">
              <div className="md:col-span-4 space-y-1.5 pt-1">
                <h3 className="text-sm font-medium text-foreground">Source Context</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Link the item to a room or reservation to speed up return flow.</p>
              </div>

              <div className="md:col-span-8 grid gap-5 bg-card border border-border shadow-sm rounded-xl p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-zinc-700">Room</Label>
                    <FormSelectField
                      name="roomId"
                      placeholder="Optional"
                      options={context.rooms.map((room) => ({ value: room.id, label: room.room_number }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-zinc-700">Reservation</Label>
                    <FormSelectField
                      name="reservationId"
                      placeholder="Optional"
                      options={context.reservations.map((reservation) => ({
                        value: reservation.id,
                        label: `${getGuestName(reservation.guests)} · ${reservation.check_in}`,
                      }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 mb-8">
              <FormSubmitButton idleText="Log Item" pendingText="Saving..." className="w-full sm:w-auto px-8" />
            </div>
          </form>
        </div>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <CardContent>
            {context.items.length === 0 ? (
              <p className="text-sm text-zinc-500">No lost-and-found items yet.</p>
            ) : (
              <ul className="space-y-3">
                {context.items.map((item) => {
                  const roomRaw = item.rooms as { room_number?: string } | Array<{ room_number?: string }> | null;
                  const room = Array.isArray(roomRaw) ? roomRaw[0] : roomRaw;

                  return (
                    <li key={item.id} className="rounded-xl border border-zinc-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-zinc-900">{item.item_name}</p>
                          <p className="text-xs text-zinc-500">
                            {room?.room_number ? `Room ${room.room_number}` : "No room"} · Found {new Date(item.found_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge className={STATUS_TONE[item.status] ?? STATUS_TONE.logged}>{item.status.replaceAll("_", " ")}</Badge>
                      </div>

                      {item.description ? <p className="mt-2 text-sm text-zinc-600">{item.description}</p> : null}

                      <LostFoundMediaPanel
                        propertyId={activePropertyId}
                        itemId={item.id}
                        itemName={item.item_name}
                      />

                      <form action={updateAction} className="mt-3 grid gap-2 lg:grid-cols-6">
                        <input type="hidden" name="itemId" value={item.id} />

                        <div className="lg:col-span-2">
                          <FormSelectField
                            name="status"
                            defaultValue={item.status}
                            options={[
                              { value: "logged", label: "Logged" },
                              { value: "in_storage", label: "In Storage" },
                              { value: "claimed", label: "Claimed" },
                              { value: "discarded", label: "Discarded" },
                            ]}
                          />
                        </div>
                        <Input name="claimedByName" placeholder="Claimed by" defaultValue={item.claimed_by_name ?? ""} className="lg:col-span-1" />
                        <Input name="claimedContact" placeholder="Contact" defaultValue={item.claimed_contact ?? ""} className="lg:col-span-1" />
                        <Input name="notes" placeholder="Notes" defaultValue={item.notes ?? ""} className="lg:col-span-1" />
                        <FormSubmitButton idleText="Update" pendingText="..." size="sm" variant="outline" className="lg:col-span-1" />
                      </form>
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
