import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyMinor } from "@/lib/pms/formatting";
import { getMinibarContext, postMinibarCharge } from "./actions";

type MinibarPageProps = {
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

export default async function MinibarPage({ searchParams }: MinibarPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const context = await getMinibarContext(activePropertyId);

  const reservationOptions = context.reservations
    .map((reservation) => {
      const rrRaw = reservation.reservation_rooms as
        | { room_id?: string | null; rooms?: unknown }
        | Array<{ room_id?: string | null; rooms?: unknown }>
        | null;
      const rr = Array.isArray(rrRaw) ? rrRaw[0] ?? null : rrRaw;
      const roomRaw = rr?.rooms as { id?: string; room_number?: string } | Array<{ id?: string; room_number?: string }> | null;
      const room = Array.isArray(roomRaw) ? roomRaw[0] : roomRaw;
      if (!rr?.room_id || !room?.id) return null;

      return {
        value: `${reservation.id}::${room.id}`,
        label: `${getGuestName(reservation.guests)} · Room ${room.room_number ?? "-"} · ${reservation.check_in}`,
      };
    })
    .filter((item): item is { value: string; label: string } => Boolean(item));

  const submitAction = async (formData: FormData) => {
    "use server";
    const encoded = String(formData.get("reservationRoomPair") ?? "");
    const [reservationId, roomId] = encoded.split("::");
    if (!reservationId || !roomId) {
      redirect(`/dashboard/minibar?error=${encodeURIComponent("Reservation and room are required.")}`);
    }

    const payload = new FormData();
    payload.set("propertyId", activePropertyId);
    payload.set("reservationId", reservationId);
    payload.set("roomId", roomId);
    payload.set("itemName", String(formData.get("itemName") ?? ""));
    payload.set("quantity", String(formData.get("quantity") ?? "1"));
    payload.set("amountMinor", String(formData.get("amountMinor") ?? "0"));

    const result = await postMinibarCharge(payload);
    if (result?.success) redirect(`/dashboard/minibar?ok=${encodeURIComponent("Minibar posted to folio.")}`);
    redirect(`/dashboard/minibar?error=${encodeURIComponent(result?.error ?? "Unable to post minibar item.")}`);
  };

  const totalMinor = context.postings.reduce((sum, row) => sum + row.amount_minor, 0);

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">Minibar Tracking</h1>
          <p className="page-subtitle">Capture minibar consumption and post directly to folios for checkout reconciliation.</p>
        </div>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Post Minibar Item</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={submitAction} className="grid gap-3 lg:grid-cols-5">
              <div className="grid gap-1.5 lg:col-span-2">
                <Label>Reservation + Room</Label>
                <FormSelectField
                  name="reservationRoomPair"
                  options={reservationOptions}
                  placeholder="Select checked-in reservation"
                  emptyStateText="No eligible reservation with room assignment."
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Item</Label>
                <Input name="itemName" placeholder="Soda can" required />
              </div>

              <div className="grid gap-1.5">
                <Label>Qty</Label>
                <Input name="quantity" type="number" min={1} defaultValue={1} required />
              </div>

              <div className="grid gap-1.5">
                <Label>Unit Amount (minor)</Label>
                <Input name="amountMinor" type="number" min={0} defaultValue={0} required />
              </div>

              <div className="lg:col-span-5">
                <FormSubmitButton idleText="Post to Folio" pendingText="Posting..." />
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Posted Items</span>
              <Badge variant="outline">{formatCurrencyMinor(totalMinor, "USD")}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {context.postings.length === 0 ? (
              <p className="text-sm text-zinc-500">No minibar postings yet.</p>
            ) : (
              <ul className="space-y-2">
                {context.postings.map((row) => {
                  const roomRaw = row.rooms as { room_number?: string } | Array<{ room_number?: string }> | null;
                  const room = Array.isArray(roomRaw) ? roomRaw[0] : roomRaw;
                  return (
                    <li key={row.id} className="rounded-lg border border-zinc-200 p-3 text-sm">
                      <p className="font-medium text-zinc-900">{row.item_name}</p>
                      <p className="text-zinc-600">
                        {getGuestName(((row.reservations as any)?.[0]?.guests) ?? ((row.reservations as any)?.guests))}
                        {room?.room_number ? ` · Room ${room.room_number}` : ""}
                      </p>
                      <p className="text-zinc-600">{formatCurrencyMinor(row.amount_minor, "USD")}</p>
                      <p className="text-xs text-zinc-500">{new Date(row.posted_at).toLocaleString("en-GB")}</p>
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
