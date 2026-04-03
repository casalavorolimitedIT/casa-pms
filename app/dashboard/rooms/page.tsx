import { getRooms, getRoomTypes } from "./actions/room-actions";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { getActivePropertyId } from "@/lib/pms/property-context";

const STATUS_TONE: Record<string, string> = {
  vacant: "bg-emerald-100 text-emerald-800",
  occupied: "bg-blue-100 text-blue-800",
  dirty: "bg-amber-100 text-amber-800",
  inspection: "bg-purple-100 text-purple-800",
  maintenance: "bg-orange-100 text-orange-800",
  out_of_order: "bg-red-100 text-red-800",
};

export default async function RoomsPage() {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();

  if (!activePropertyId) {
    return (
      <div className="p-6 text-muted-foreground text-sm">
        Set <code>DEMO_PROPERTY_ID</code> in .env.local or add/select an active property in the header.
      </div>
    );
  }

  const [{ rooms }, { roomTypes }] = await Promise.all([
    getRooms(activePropertyId),
    getRoomTypes(activePropertyId),
  ]);

  // Group rooms by floor
  type RoomItem = (typeof rooms)[number];
  const byFloor = rooms.reduce<Record<string, RoomItem[]>>((acc, room) => {
    const key = room.floor != null ? `Floor ${room.floor}` : "No Floor";
    (acc[key] ??= []).push(room);
    return acc;
  }, {});

  return (
    <div className="page-shell">
      <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Rooms</h1>
          <p className="text-sm text-muted-foreground">
            {rooms.length} room{rooms.length !== 1 ? "s" : ""} &middot;{" "}
            {roomTypes.length} type{roomTypes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/rooms/types">Manage Types</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard/rooms/new">Add Room</Link>
          </Button>
        </div>
      </div>

      {/* Room grid by floor */}
      {rooms.length === 0 ? (
        <Card className="glass-panel">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-muted-foreground">No rooms yet.</p>
            <Button asChild size="sm">
              <Link href="/dashboard/rooms/new">Add first room</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(byFloor).map(([floor, floorRooms]) => (
          <Card key={floor} className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">{floor}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {floorRooms.map((room) => (
                  (() => {
                    const roomTypeRaw = room.room_types as { name?: string } | Array<{ name?: string }> | null;
                    const roomTypeName = Array.isArray(roomTypeRaw) ? roomTypeRaw[0]?.name : roomTypeRaw?.name;
                    return (
                  <Link
                    key={room.id}
                    href={`/dashboard/rooms/${room.id}`}
                    className="flex flex-col gap-1 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-lg font-semibold leading-none">
                      {room.room_number}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {roomTypeName ?? "—"}
                    </span>
                    <Badge
                      className={`mt-1 w-fit text-xs font-medium px-1.5 py-0 ${STATUS_TONE[room.status] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {room.status.replace("_", " ")}
                    </Badge>
                  </Link>
                    );
                  })()
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
      </div>
    </div>
  );
}
