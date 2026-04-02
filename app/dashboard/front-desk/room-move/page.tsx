import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getInHouseReservations, getVacantRooms, moveRoom } from "../actions/checkin-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelectField } from "@/components/ui/form-select-field";
import { getActivePropertyId } from "@/lib/pms/property-context";

export default async function RoomMovePage() {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  if (!activePropertyId) return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or add/select an active property in the header.</div>;

  const [inHouse, vacant] = await Promise.all([
    getInHouseReservations(activePropertyId),
    getVacantRooms(activePropertyId),
  ]);

  return (
    <div className="min-h-full bg-zinc-50/60 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Room Reallocation</h1>

        <Card className="border-zinc-200 bg-white shadow-sm">
          <CardHeader><CardTitle className="text-base">Move Guest Room</CardTitle></CardHeader>
          <CardContent>
            <form action={moveRoom} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="reservationId">In-house reservation</Label>
                <FormSelectField
                  name="reservationId"
                  options={inHouse.map((res) => {
                    const guest = res.guests as { first_name: string; last_name: string } | null;
                    const room = (res.reservation_rooms as Array<{ rooms: { room_number: string } | null }>)[0]?.rooms?.room_number;
                    return {
                      value: res.id,
                      label: `${guest?.first_name ?? ""} ${guest?.last_name ?? ""} (${room ?? "Unassigned"})`.trim(),
                    };
                  })}
                  placeholder="Select reservation"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="toRoomId">Destination vacant room</Label>
                <FormSelectField
                  name="toRoomId"
                  options={vacant.map((room) => ({
                    value: room.id,
                    label: `Room ${room.room_number}${room.floor != null ? ` · Floor ${room.floor}` : ""}`,
                  }))}
                  placeholder="Select room"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="note">Reason (optional)</Label>
                <Textarea id="note" name="note" placeholder="Maintenance, preference, noise complaint..." />
              </div>

              <Button type="submit">Confirm Room Move</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
