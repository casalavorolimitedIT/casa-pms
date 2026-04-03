import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getInHouseReservations, getVacantRooms, moveRoom } from "../actions/checkin-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Label } from "@/components/ui/label";
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
  const submitRoomMove = async (formData: FormData) => {
    "use server";
    await moveRoom(formData);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <h1 className="page-title">Room Reallocation</h1>

        <Card className="glass-panel">
          <CardHeader><CardTitle className="text-base">Move Guest Room</CardTitle></CardHeader>
          <CardContent>
            <form action={submitRoomMove} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="reservationId">In-house reservation</Label>
                <FormSelectField
                  name="reservationId"
                  options={inHouse.map((res) => {
                      const guestRaw = res.guests as
                        | { first_name?: string; last_name?: string }
                        | Array<{ first_name?: string; last_name?: string }>
                        | null;
                      const guest = Array.isArray(guestRaw) ? guestRaw[0] ?? null : guestRaw;
                    const rr = (res.reservation_rooms as Array<{ rooms: { room_number?: string } | Array<{ room_number?: string }> | null }>)[0];
                    const roomRaw = rr?.rooms;
                    const room = Array.isArray(roomRaw) ? roomRaw[0]?.room_number : roomRaw?.room_number;
                    return {
                      value: res.id,
                      label: `${guest?.first_name ?? ""} ${guest?.last_name ?? ""} (${room ?? "Unassigned"})`.trim(),
                    };
                  })}
                  placeholder="Select reservation"
                  emptyStateText="No in-house reservation is currently available."
                  emptyStateLinkHref="/dashboard/reservations"
                  emptyStateLinkLabel="Create a reservation"
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
                  emptyStateText="No vacant room is currently available."
                  emptyStateLinkHref="/dashboard/rooms/new"
                  emptyStateLinkLabel="Add a room"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="note">Reason (optional)</Label>
                <Textarea id="note" name="note" placeholder="Maintenance, preference, noise complaint..." />
              </div>

              <FormSubmitButton idleText="Confirm Room Move" pendingText="Moving room..." />
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
