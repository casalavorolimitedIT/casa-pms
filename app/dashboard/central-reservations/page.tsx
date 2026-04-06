import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import {
  createCentralReservation,
  getCentralReservationsContext,
  searchAcrossPropertiesByRange,
  transferGuestBetweenProperties,
} from "./actions/central-res-actions";

type PageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[]; checkIn?: string | string[]; checkOut?: string | string[] }>;
};

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CentralReservationsPage({ searchParams }: PageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Select an active property to use central reservations.</div>;
  }

  const canView = await hasPermission(activePropertyId, "reservations.view");
  if (!canView) {
    redirect("/dashboard?error=You%20do%20not%20have%20access%20to%20central%20reservations");
  }

  const query = (await searchParams) ?? {};
  const ok = first(query.ok);
  const error = first(query.error);
  const checkIn = first(query.checkIn) ?? "";
  const checkOut = first(query.checkOut) ?? "";

  const context = await getCentralReservationsContext();
  const availability = checkIn && checkOut ? await searchAcrossPropertiesByRange({ checkIn, checkOut }) : { rows: [] as Array<Record<string, unknown>> };

  const creatablePropertyOptions = context.properties
    .filter((property) => property.canCreate)
    .map((property) => ({ value: property.id, label: property.name }));
  const transferTargetPropertyOptions = context.properties
    .filter((property) => property.canCreate)
    .map((property) => ({ value: property.id, label: property.name }));
  const guestOptions = context.guests.map((guest) => ({
    value: guest.id,
    label: `${guest.first_name ?? ""} ${guest.last_name ?? ""}`.trim() || guest.id.slice(0, 8),
  }));
  const roomTypeOptions = context.roomTypes.map((roomType) => {
    const property = context.properties.find((p) => p.id === roomType.property_id);
    return { value: roomType.id, label: `${roomType.name} · ${property?.name ?? roomType.property_id.slice(0, 8)}` };
  });
  const reservationOptions = context.reservations.map((reservation) => {
    const guestRaw = reservation.guests as { first_name?: string; last_name?: string } | Array<{ first_name?: string; last_name?: string }> | null;
    const guest = Array.isArray(guestRaw) ? guestRaw[0] : guestRaw;
    const propertyRaw = reservation.properties as { name?: string } | Array<{ name?: string }> | null;
    const property = Array.isArray(propertyRaw) ? propertyRaw[0] : propertyRaw;
    const guestName = `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Guest";
    return {
      value: reservation.id,
      label: `${guestName} · ${property?.name ?? reservation.property_id.slice(0, 8)} · ${reservation.status}`,
    };
  });

  const createAction = async (formData: FormData) => {
    "use server";
    const result = await createCentralReservation(formData);
    if (result?.success) {
      redirect("/dashboard/central-reservations?ok=Central%20reservation%20created");
    }
    redirect(`/dashboard/central-reservations?error=${encodeURIComponent(result?.error ?? "Unable to create central reservation")}`);
  };

  const transferAction = async (formData: FormData) => {
    "use server";
    const result = await transferGuestBetweenProperties(formData);
    if (result?.success) {
      redirect("/dashboard/central-reservations?ok=Reservation%20transferred%20across%20properties");
    }
    redirect(`/dashboard/central-reservations?error=${encodeURIComponent(result?.error ?? "Unable to transfer reservation")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">Central Reservations</h1>
          <p className="page-subtitle">Search multi-property availability, book at any property, and transfer bookings between properties.</p>
        </div>

        <Card className="glass-panel mt-6">
          <CardHeader><CardTitle className="text-base">Cross-Property Availability Search</CardTitle></CardHeader>
          <CardContent>
            <form method="GET" className="grid gap-3 md:grid-cols-3 md:items-end">
              <div className="grid gap-2">
                <Label htmlFor="checkIn">Check-in</Label>
                <Input id="checkIn" name="checkIn" type="date" defaultValue={checkIn} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="checkOut">Check-out</Label>
                <Input id="checkOut" name="checkOut" type="date" defaultValue={checkOut} required />
              </div>
              <FormSubmitButton idleText="Search" pendingText="Searching..." className="w-full md:w-auto" />
            </form>

            {availability.rows.length > 0 ? (
              <div className="mt-4 space-y-2">
                {availability.rows.map((row) => {
                  const item = row as {
                    propertyId: string;
                    propertyName: string;
                    roomTypeName: string;
                    availableCount: number;
                    totalRooms: number;
                  };
                  return (
                    <div key={`${item.propertyId}-${item.roomTypeName}`} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                      <p className="font-medium text-zinc-900">{item.propertyName} · {item.roomTypeName}</p>
                      <p className="text-xs text-zinc-600">Available {item.availableCount} of {item.totalRooms}</p>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="glass-panel">
            <CardHeader><CardTitle className="text-base">Create Reservation At Property</CardTitle></CardHeader>
            <CardContent>
              <form action={createAction} className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="targetPropertyId">Target Property</Label>
                  <FormSelectField name="targetPropertyId" options={creatablePropertyOptions} placeholder="Select property" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="guestId">Guest</Label>
                  <FormSelectField name="guestId" options={guestOptions} placeholder="Select guest" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="roomTypeId">Room Type</Label>
                  <FormSelectField name="roomTypeId" options={roomTypeOptions} placeholder="Select room type" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="createCheckIn">Check-in</Label>
                    <Input id="createCheckIn" name="checkIn" type="date" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="createCheckOut">Check-out</Label>
                    <Input id="createCheckOut" name="checkOut" type="date" required />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="adults">Adults</Label>
                    <Input id="adults" name="adults" type="number" min={1} defaultValue={1} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="children">Children</Label>
                    <Input id="children" name="children" type="number" min={0} defaultValue={0} />
                  </div>
                </div>
                <FormSubmitButton idleText="Create central reservation" pendingText="Creating..." className="w-full sm:w-auto" />
              </form>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader><CardTitle className="text-base">Transfer Reservation Between Properties</CardTitle></CardHeader>
            <CardContent>
              <form action={transferAction} className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="sourceReservationId">Source Reservation</Label>
                  <FormSelectField name="sourceReservationId" options={reservationOptions} placeholder="Select reservation" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="transferPropertyId">Target Property</Label>
                  <FormSelectField name="targetPropertyId" options={transferTargetPropertyOptions} placeholder="Select property" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="transferRoomTypeId">Target Room Type</Label>
                  <FormSelectField name="targetRoomTypeId" options={roomTypeOptions} placeholder="Select room type" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="transferCheckIn">Check-in</Label>
                    <Input id="transferCheckIn" name="checkIn" type="date" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="transferCheckOut">Check-out</Label>
                    <Input id="transferCheckOut" name="checkOut" type="date" required />
                  </div>
                </div>
                <FormSubmitButton idleText="Transfer reservation" pendingText="Transferring..." className="w-full sm:w-auto" />
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
