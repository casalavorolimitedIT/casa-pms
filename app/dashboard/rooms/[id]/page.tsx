import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { updateRoomStatus } from "@/app/dashboard/rooms/actions/room-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormStatusToast } from "@/components/custom/form-status-toast";

const STATUS_TONE: Record<string, string> = {
  vacant: "bg-emerald-100 text-emerald-800",
  occupied: "bg-blue-100 text-blue-800",
  dirty: "bg-amber-100 text-amber-800",
  inspection: "bg-purple-100 text-purple-800",
  maintenance: "bg-orange-100 text-orange-800",
  out_of_order: "bg-red-100 text-red-800",
};

const STATUS_OPTIONS = [
  "vacant",
  "occupied",
  "dirty",
  "inspection",
  "maintenance",
  "out_of_order",
] as const;

interface RoomDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}

export default async function RoomDetailPage({ params, searchParams }: RoomDetailPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();

  if (!activePropertyId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Set DEMO_PROPERTY_ID in .env.local or add/select an active property in the header.
      </div>
    );
  }

  const { id } = await params;
  const { error, ok } = await searchParams;
  const supabase = await createClient();

  const { data: room } = await supabase
    .from("rooms")
    .select(
      "id, room_number, floor, status, created_at, room_types(id, name, description, base_rate_minor, max_occupancy)"
    )
    .eq("id", id)
    .eq("property_id", activePropertyId)
    .maybeSingle();

  if (!room) {
    notFound();
  }

  const roomTypeRaw = room.room_types as
    | { name?: string; description?: string | null; base_rate_minor?: number | null; max_occupancy?: number | null }
    | Array<{ name?: string; description?: string | null; base_rate_minor?: number | null; max_occupancy?: number | null }>
    | null;
  const roomType = Array.isArray(roomTypeRaw) ? roomTypeRaw[0] ?? null : roomTypeRaw;

  async function updateStatusAndRedirect(formData: FormData) {
    "use server";

    const result = await updateRoomStatus(formData);

    if (result?.success) {
      redirect(`/dashboard/rooms/${id}?ok=1`);
    }

    const message = result?.error ?? "Failed to update room status";
    redirect(`/dashboard/rooms/${id}?error=${encodeURIComponent(message)}`);
  }

  return (
    <div className="page-shell">
      <div className="page-container max-w-3xl">
        <FormStatusToast error={error} ok={ok} successTitle="Room updated" />
        <div className="flex items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/dashboard/rooms">← All Rooms</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/rooms/new">Add Room</Link>
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Room {room.room_number}</h1>
            <p className="page-subtitle">
              {room.floor != null ? `Floor ${room.floor}` : "No floor assigned"}
              {roomType?.name ? ` · ${roomType.name}` : ""}
            </p>
          </div>
          <Badge className={`text-xs font-medium ${STATUS_TONE[room.status] ?? "bg-muted text-muted-foreground"}`}>
            {room.status.replace("_", " ")}
          </Badge>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        {ok ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Room status updated.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-[1.25fr_1fr]">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-base">Room Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Room Number: </span>
                <span className="font-medium">{room.room_number}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Floor: </span>
                <span className="font-medium">{room.floor ?? "—"}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Room Type: </span>
                <span className="font-medium">{roomType?.name ?? "—"}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Max Occupancy: </span>
                <span className="font-medium">{roomType?.max_occupancy ?? "—"}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Created: </span>
                <span className="font-medium">{new Date(room.created_at).toLocaleDateString("en-GB")}</span>
              </p>
              {roomType?.description ? (
                <p>
                  <span className="text-muted-foreground">Description: </span>
                  <span className="font-medium">{roomType.description}</span>
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-base">Update Status</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateStatusAndRedirect} className="grid gap-3">
                <input type="hidden" name="roomId" value={room.id} />

                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    title="Room status"
                    aria-label="Room status"
                    defaultValue={room.status}
                    className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="note">Note (optional)</Label>
                  <Textarea id="note" name="note" rows={3} placeholder="Add housekeeping or maintenance context" />
                </div>

                <FormSubmitButton
                  idleText="Update status"
                  pendingText="Updating..."
                  className="bg-[#ff6900] text-white hover:bg-[#e55f00]"
                />
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
