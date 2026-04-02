import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { confirmCheckIn, getCheckInReservationContext } from "../../actions/checkin-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RegistrationCard } from "@/components/front-desk/registration-card";
import { KeyCardForm } from "@/components/front-desk/key-card-form";
import { FormSelectField } from "@/components/ui/form-select-field";
import Link from "next/link";

interface PageProps {
  params: Promise<{ reservationId: string }>;
}

export default async function CheckInPage({ params }: PageProps) {
  await redirectIfNotAuthenticated();
  const { reservationId } = await params;
  const ctx = await getCheckInReservationContext(reservationId);

  if (!ctx.reservation) {
    return <div className="p-6 text-sm text-muted-foreground">Reservation not found.</div>;
  }

  const guest = ctx.reservation.guests as { first_name: string; last_name: string } | null;
  const rr = (ctx.reservation.reservation_rooms as Array<{ room_id: string | null }>)[0];
  const assignedRoomId = rr?.room_id ?? undefined;

  return (
    <div className="min-h-full bg-zinc-50/60 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Guest Check-in</h1>
          <Button asChild variant="outline" size="sm"><Link href="/dashboard/front-desk">Back</Link></Button>
        </div>

        <RegistrationCard
          guestName={`${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim()}
          reservationId={ctx.reservation.id}
          checkIn={ctx.reservation.check_in}
          checkOut={ctx.reservation.check_out}
        />

        <Card className="border-zinc-200 bg-white shadow-sm">
          <CardHeader><CardTitle className="text-base">Arrival Workflow</CardTitle></CardHeader>
          <CardContent>
            <form action={confirmCheckIn} className="grid gap-4">
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
                />
              </div>

              <div className="flex items-center gap-2">
                <input id="idVerified" name="idVerified" type="checkbox" className="h-4 w-4" />
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

              <div className="flex gap-2">
                <Button type="submit">Confirm Check-in</Button>
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
