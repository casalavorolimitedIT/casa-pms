import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { updateRoomType } from "@/app/dashboard/rooms/actions/room-actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormStatusToast } from "@/components/custom/form-status-toast";

type EditRoomTypePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
};

export default async function EditRoomTypePage({ params, searchParams }: EditRoomTypePageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();

  if (!activePropertyId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Set DEMO_PROPERTY_ID in .env.local or select an active property in the header.
      </div>
    );
  }

  const { id } = await params;
  const { error, ok } = await searchParams;

  const supabase = await createClient();
  const { data: roomType } = await supabase
    .from("room_types")
    .select("id, name, description, base_rate_minor, max_occupancy")
    .eq("id", id)
    .eq("property_id", activePropertyId)
    .maybeSingle();

  if (!roomType) {
    notFound();
  }

  async function updateTypeAndRedirect(formData: FormData) {
    "use server";

    const payload = new FormData();
    payload.set("name", String(formData.get("name") ?? ""));
    payload.set("description", String(formData.get("description") ?? ""));
    payload.set("baseRateMinor", String(formData.get("baseRateMinor") ?? "0"));
    payload.set("maxOccupancy", String(formData.get("maxOccupancy") ?? "1"));
    payload.set("propertyId", activePropertyId);

    const result = await updateRoomType(id, payload);

    if (result?.success) {
      redirect("/dashboard/rooms/types?ok=room-type-updated");
    }

    const message = result?.error ?? "Failed to update room type";
    redirect(`/dashboard/rooms/types/${id}/edit?error=${encodeURIComponent(message)}`);
  }

  return (
    <div className="page-shell">
      <div className="page-container max-w-2xl">
        <FormStatusToast error={error} ok={ok} successTitle="Room type updated" />

        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Edit Room Type</h1>
            <p className="page-subtitle">Update room category details, occupancy, and base rate.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/rooms/types">Back to Room Types</Link>
          </Button>
        </div>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Type Details</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <form action={updateTypeAndRedirect} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Type name</Label>
                <Input id="name" name="name" defaultValue={roomType.name} required />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="maxOccupancy">Max occupancy</Label>
                  <Input
                    id="maxOccupancy"
                    name="maxOccupancy"
                    type="number"
                    min={1}
                    max={20}
                    defaultValue={roomType.max_occupancy}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="baseRateMinor">Base rate (minor units)</Label>
                  <Input
                    id="baseRateMinor"
                    name="baseRateMinor"
                    type="number"
                    min={0}
                    defaultValue={roomType.base_rate_minor}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={roomType.description ?? ""}
                  placeholder="Bed type, view, amenities, size, etc."
                />
              </div>

              <FormSubmitButton
                idleText="Save changes"
                pendingText="Saving..."
                className="bg-[#ff6900] text-white hover:bg-[#e55f00]"
              />
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
