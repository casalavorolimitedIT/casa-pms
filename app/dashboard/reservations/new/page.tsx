import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { createReservation } from "@/app/dashboard/reservations/actions/reservation-actions";
import { NewReservationForm } from "@/app/dashboard/reservations/new/new-reservation-form";
import { PageHelpDialog } from "@/components/custom/page-help-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormStatusToast } from "@/components/custom/form-status-toast";

interface NewReservationPageProps {
  searchParams: Promise<{ error?: string; ok?: string }>;
}

export default async function NewReservationPage({ searchParams }: NewReservationPageProps) {
  await redirectIfNotAuthenticated();
  const supabase = await createClient();
  const activePropertyId = await getActivePropertyId();
  const { error, ok } = await searchParams;

  if (!activePropertyId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Set DEMO_PROPERTY_ID in .env.local or select an active property in the header.
      </div>
    );
  }

  const { data: property } = await supabase
    .from("properties")
    .select("organization_id")
    .eq("id", activePropertyId)
    .maybeSingle();

  const organizationId = property?.organization_id;

  const [guestsRes, roomTypesRes, roomsRes, ratePlansRes] = await Promise.all([
    organizationId
      ? supabase
          .from("guests")
          .select("id, first_name, last_name, email")
          .eq("organization_id", organizationId)
          .order("last_name", { ascending: true })
          .limit(200)
      : Promise.resolve({ data: [] as Array<{ id: string; first_name: string; last_name: string; email: string | null }> }),
    supabase
      .from("room_types")
      .select("id, name, max_occupancy")
      .eq("property_id", activePropertyId)
      .order("name", { ascending: true }),
    supabase
      .from("rooms")
      .select("id, room_number, status")
      .eq("property_id", activePropertyId)
      .in("status", ["vacant", "inspection"])
      .order("room_number", { ascending: true }),
    supabase
      .from("rate_plans")
      .select("id, name")
      .eq("property_id", activePropertyId)
      .order("name", { ascending: true }),
  ]);

  const guests = guestsRes.data ?? [];
  const roomTypes = roomTypesRes.data ?? [];
  const rooms = roomsRes.data ?? [];
  const ratePlans = ratePlansRes.data ?? [];
  const guestOptions = guests.map((guest) => ({
    value: guest.id,
    label: `${guest.first_name} ${guest.last_name}${guest.email ? ` · ${guest.email}` : ""}`,
  }));
  const roomTypeOptions = roomTypes.map((type) => ({
    value: type.id,
    label: `${type.name} · max ${type.max_occupancy}`,
  }));
  const roomOptions = rooms.map((room) => ({
    value: room.id,
    label: `${room.room_number} · ${room.status}`,
  }));
  const ratePlanOptions = ratePlans.map((plan) => ({ value: plan.id, label: plan.name }));

  async function createReservationAndRedirect(formData: FormData) {
    "use server";

    const result = await createReservation(formData);

    if (result?.id) {
      redirect(`/dashboard/reservations/${result.id}?ok=1&clearDraft=new-reservation`);
    }

    const message = result?.error ?? "Failed to create reservation";
    redirect(`/dashboard/reservations/new?error=${encodeURIComponent(message)}`);
  }

  return (
    <div className="page-shell">
      <div className="page-container max-w-3xl">
        <FormStatusToast error={error} ok={ok} successTitle="Reservation created" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <PageHelpDialog
              className="mt-1 max-w-xl! border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              pageName="New reservation"
              summary="This page creates a reservation record and lets the front desk search related records like guests, room types, rooms, and rate plans before saving."
              responsibilities={[
                "Search and pick the guest, room type, optional room, and optional rate plan using combobox fields.",
                "Set stay dates, occupancy, source, and internal notes before creating the reservation.",
                "Review empty combobox states when no related records exist and follow the provided action link to create or manage the missing data.",
              ]}
              relatedPages={[
                {
                  href: "/dashboard/reservations",
                  label: "Reservations",
                  description: "The new reservation form returns to the Reservations page after creation and relies on that page as the main reservation list.",
                },
                {
                  href: "/dashboard/guests/new",
                  label: "New Guest",
                  description: "Use this when the guest combobox is empty and you need to create a guest record first.",
                },
              ]}
            />
            <div>
              <h1 className="page-title">New Reservation</h1>
              <p className="page-subtitle">Create a confirmed reservation and assign room type details.</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/reservations">Back to Reservations</Link>
          </Button>
        </div>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Reservation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <NewReservationForm
              activePropertyId={activePropertyId}
              error={error}
              guestOptions={guestOptions}
              roomTypeOptions={roomTypeOptions}
              roomOptions={roomOptions}
              ratePlanOptions={ratePlanOptions}
              action={createReservationAndRedirect}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
