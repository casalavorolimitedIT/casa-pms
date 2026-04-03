import Link from "next/link";
import { redirect } from "next/navigation";
import { createRoom, getRoomTypes } from "@/app/dashboard/rooms/actions/room-actions";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { FormStatusToast } from "@/components/custom/form-status-toast";

interface NewRoomPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewRoomPage({ searchParams }: NewRoomPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const { error } = await searchParams;

  if (!activePropertyId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Set DEMO_PROPERTY_ID in .env.local or select an active property in the header.
      </div>
    );
  }

  const { roomTypes } = await getRoomTypes(activePropertyId);

  async function createRoomAndRedirect(formData: FormData) {
    "use server";

    const result = await createRoom(formData);

    if (result?.id) {
      redirect("/dashboard/rooms");
    }

    const message = result?.error ?? "Failed to create room";
    redirect(`/dashboard/rooms/new?error=${encodeURIComponent(message)}`);
  }

  return (
    <div className="page-shell">
      <div className="page-container max-w-2xl">
        <FormStatusToast error={error} ok={undefined} successTitle="Room created" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Add Room</h1>
            <p className="page-subtitle">Register a room and assign its room type for this property.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/rooms">Back to Rooms</Link>
          </Button>
        </div>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Room Details</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <form action={createRoomAndRedirect} className="grid gap-4">
              <input type="hidden" name="propertyId" value={activePropertyId} />

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="roomNumber">Room number</Label>
                  <Input id="roomNumber" name="roomNumber" required placeholder="e.g. 302" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="floor">Floor (optional)</Label>
                  <Input id="floor" name="floor" type="number" min={0} placeholder="e.g. 3" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="roomTypeId">Room type</Label>
                <FormSelectField
                  name="roomTypeId"
                  options={roomTypes.map((type) => ({
                    value: type.id,
                    label: `${type.name} · max ${type.max_occupancy}`,
                  }))}
                  placeholder="Select room type"
                  emptyStateText="No room types found for this property."
                  emptyStateLinkHref="/dashboard/rooms/types"
                  emptyStateLinkLabel="Create room type"
                />
              </div>

              <FormSubmitButton
                idleText="Create room"
                pendingText="Creating..."
                className="bg-[#ff6900] text-white hover:bg-[#e55f00]"
              />
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
