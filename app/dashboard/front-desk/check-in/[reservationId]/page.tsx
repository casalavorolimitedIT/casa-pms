import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { redirect } from "next/navigation";
import { confirmCheckIn, getCheckInReservationContext } from "../../actions/checkin-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RegistrationCard } from "@/components/front-desk/registration-card";
import { KeyCardForm } from "@/components/front-desk/key-card-form";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import Link from "next/link";

interface PageProps {
  params: Promise<{ reservationId: string }>;
  searchParams?: Promise<{
    ok?: string | string[];
    error?: string | string[];
    folioId?: string | string[];
  }>;
}

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CheckInPage({ params, searchParams }: PageProps) {
  await redirectIfNotAuthenticated();
  const { reservationId } = await params;
  const query = (await searchParams) ?? {};
  const ok = readSearchValue(query.ok);
  const error = readSearchValue(query.error);
  const folioId = readSearchValue(query.folioId);
  const ctx = await getCheckInReservationContext(reservationId);

  if (!ctx.reservation) {
    return <div className="p-6 text-sm text-muted-foreground">Reservation not found.</div>;
  }

  // Determine if this is an early arrival
  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const stdCheckInTime = ctx.propertySettings?.checkInTime ?? "15:00";
  const earlyFeeMinor = ctx.propertySettings?.earlyCheckinFeeMinor ?? 0;
  const isEarlyArrival = currentTimeStr < stdCheckInTime && earlyFeeMinor > 0;

  const guestRaw = ctx.reservation.guests as
    | { first_name?: string; last_name?: string }
    | Array<{ first_name?: string; last_name?: string }>
    | null;
  const guest = Array.isArray(guestRaw) ? guestRaw[0] ?? null : guestRaw;
  const rr = (ctx.reservation.reservation_rooms as Array<{ room_id: string | null }>)[0];
  const assignedRoomId = rr?.room_id ?? undefined;
  const submitCheckIn = async (formData: FormData) => {
    "use server";
    try {
      const result = await confirmCheckIn(formData);
      if (result?.error) throw new Error(result.error);
      const folioPart = result.folioId ? `&folioId=${result.folioId}` : "";
      redirect(`/dashboard/front-desk/check-in/${reservationId}?ok=${encodeURIComponent("Check-in completed successfully.")}${folioPart}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to complete check-in.";
      redirect(`/dashboard/front-desk/check-in/${reservationId}?error=${encodeURIComponent(message)}`);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />
        <div className="flex items-center justify-between">
          <h1 className="page-title">Guest Check-in</h1>
          <Button asChild variant="outline" size="sm"><Link href="/dashboard/front-desk">Back</Link></Button>
        </div>

        <RegistrationCard
          guestName={`${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim()}
          reservationId={ctx.reservation.id}
          checkIn={ctx.reservation.check_in}
          checkOut={ctx.reservation.check_out}
        />

        {ok && folioId && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="pt-5">
              <p className="font-semibold text-emerald-900">Check-in complete</p>
              <p className="mt-1 text-sm text-emerald-800">The folio is open and ready for charges.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={`/dashboard/folios/${folioId}`}>Open Folio →</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/front-desk">Back to Front Desk</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="glass-panel">
          <CardHeader><CardTitle className="text-base">Arrival Workflow</CardTitle></CardHeader>
          <CardContent>
            <form action={submitCheckIn} className="grid gap-4">
              <input type="hidden" name="reservationId" value={reservationId} />

              <div className="grid gap-2">
                <Label htmlFor="roomId">Assign Room</Label>
                <FormSelectField
                  name="roomId"
                  defaultValue={assignedRoomId ?? ""}
                  options={ctx.availableRooms.map((room) => ({
                    value: room.id,
                    label: room.room_number,
                  }))}
                  placeholder="Select vacant room"
                  emptyStateText="No vacant room is available for this room type yet."
                  emptyStateLinkHref="/dashboard/rooms/new"
                  emptyStateLinkLabel="Add a room"
                />
              </div>

              <div className="flex items-center gap-2">
                <input id="idVerified" aria-label="ID verified at desk" name="idVerified" type="checkbox" className="h-4 w-4" />
                <Label htmlFor="idVerified">ID verified at desk</Label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="paymentEmail">Card hold email (optional)</Label>
                  <Input id="paymentEmail" name="paymentEmail" type="email" placeholder="guest@email.com" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="setupAmountMinor">Card hold amount (minor)</Label>
                  <Input id="setupAmountMinor" name="setupAmountMinor" type="number" min={0} defaultValue={0} />
                </div>
              </div>

              <div className="grid gap-2 sm:max-w-xs">
                <Label htmlFor="paymentCurrency">Currency</Label>
                <Input id="paymentCurrency" name="paymentCurrency" defaultValue="USD" />
              </div>

              {isEarlyArrival && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                  <p className="font-semibold text-amber-900">Early arrival — standard check-in is {stdCheckInTime}</p>
                  <p className="mt-0.5 text-amber-800">An early check-in fee ({earlyFeeMinor} minor units) is configured. Check the box below to post it to the folio.</p>
                </div>
              )}

              {isEarlyArrival && (
                <div className="flex items-center gap-2">
                  <input id="postEarlyFee" name="postEarlyFee" type="checkbox" className="h-4 w-4" aria-label="Post early check-in fee to folio" defaultChecked />
                  <Label htmlFor="postEarlyFee">Post early check-in fee to folio</Label>
                </div>
              )}

              <div className="flex gap-2">
                <FormSubmitButton idleText="Confirm Check-in" pendingText="Checking in…" />
                <Button type="reset" variant="outline">Reset</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {assignedRoomId && <KeyCardForm reservationId={reservationId} roomId={assignedRoomId} />}
      </div>
    </div>
  );
}
