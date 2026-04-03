import Link from "next/link";
import { redirect } from "next/navigation";
import { createRoomType } from "@/app/dashboard/rooms/actions/room-actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { FormStatusToast } from "@/components/custom/form-status-toast";

interface NewRoomTypePageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewRoomTypePage({ searchParams }: NewRoomTypePageProps) {
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

  async function createTypeAndRedirect(formData: FormData) {
    "use server";

    const result = await createRoomType(formData);

    if (result?.id) {
      redirect("/dashboard/rooms/types");
    }

    const message = result?.error ?? "Failed to create room type";
    redirect(`/dashboard/rooms/types/new?error=${encodeURIComponent(message)}`);
  }

  return (
    <div className="page-shell">
      <div className="page-container max-w-2xl">
        <FormStatusToast error={error} ok={undefined} successTitle="Room type created" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Add Room Type</h1>
            <p className="page-subtitle">Define category, occupancy, and base nightly rate.</p>
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

            <form action={createTypeAndRedirect} className="grid gap-4">
              <input type="hidden" name="propertyId" value={activePropertyId} />

              <div className="grid gap-2">
                <Label htmlFor="name">Type name</Label>
                <Input id="name" name="name" required placeholder="e.g. Deluxe King" />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="maxOccupancy">Max occupancy</Label>
                  <Input id="maxOccupancy" name="maxOccupancy" type="number" min={1} max={20} defaultValue={2} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="baseRateMinor">Base rate (minor units)</Label>
                  <Input id="baseRateMinor" name="baseRateMinor" type="number" min={0} defaultValue={0} required />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea id="description" name="description" rows={4} placeholder="Bed type, view, amenities, size, etc." />
              </div>

              <FormSubmitButton
                idleText="Create room type"
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
