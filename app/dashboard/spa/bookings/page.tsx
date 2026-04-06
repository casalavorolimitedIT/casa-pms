import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import {
  assignTherapist,
  createSpaBooking,
  getSpaBookingsContext,
  postSpaCharge,
  settleSpaSeparately,
  transferSpaToHotelFolio,
} from "../actions";

type SpaBookingsPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SpaBookingsPage({ searchParams }: SpaBookingsPageProps) {
  await redirectIfNotAuthenticated();
  const propertyId = await getActivePropertyId();

  if (!propertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Select an active property to manage spa bookings.</div>;
  }

  const canManage = await hasPermission(propertyId, "spa.manage");
  if (!canManage) {
    redirect("/dashboard?error=You%20do%20not%20have%20access%20to%20spa%20bookings");
  }

  const query = (await searchParams) ?? {};
  const ok = first(query.ok);
  const error = first(query.error);

  const context = await getSpaBookingsContext(propertyId);

  const serviceOptions = context.services.map((service) => ({
    value: service.id,
    label: `${service.name} · ${service.duration_min} min`,
  }));

  const therapistOptions = context.therapists.map((therapist) => ({
    value: therapist.id,
    label: therapist.display_name,
  }));

  const roomOptions = context.rooms.map((room) => ({
    value: room.id,
    label: room.name,
  }));

  const reservationOptions = (context.reservations as Array<{ id: string; guests: { first_name?: string; last_name?: string } | Array<{ first_name?: string; last_name?: string }> | null }>).map((reservation) => {
    const guestRaw = reservation.guests;
    const guest = Array.isArray(guestRaw) ? guestRaw[0] : guestRaw;
    const guestName = `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Guest";
    return {
      value: reservation.id,
      label: `${guestName} · ${reservation.id.slice(0, 8)}`,
    };
  });

  const guestOptions = context.guests.map((guest) => ({
    value: guest.id,
    label: `${guest.first_name ?? ""} ${guest.last_name ?? ""}`.trim() || guest.id.slice(0, 8),
  }));

  const createAction = async (formData: FormData) => {
    "use server";
    const result = await createSpaBooking(formData);
    if (result?.success) redirect("/dashboard/spa/bookings?ok=Spa%20booking%20created");
    redirect(`/dashboard/spa/bookings?error=${encodeURIComponent(result?.error ?? "Unable to create spa booking")}`);
  };

  const assignAction = async (formData: FormData) => {
    "use server";
    const result = await assignTherapist(formData);
    if (result?.success) redirect("/dashboard/spa/bookings?ok=Therapist%20assigned");
    redirect(`/dashboard/spa/bookings?error=${encodeURIComponent(result?.error ?? "Unable to assign therapist")}`);
  };

  const postFolioAction = async (formData: FormData) => {
    "use server";
    const result = await postSpaCharge(formData);
    if (result && "success" in result && result.success) {
      redirect("/dashboard/spa/bookings?ok=Posted%20to%20hotel%20folio");
    }
    const message = result && "error" in result ? result.error ?? "Unable to post to folio" : "Unable to post to folio";
    redirect(`/dashboard/spa/bookings?error=${encodeURIComponent(message)}`);
  };

  const settleAction = async (formData: FormData) => {
    "use server";
    const result = await settleSpaSeparately(formData);
    if (result?.success) redirect("/dashboard/spa/bookings?ok=Spa%20booking%20settled%20separately");
    redirect(`/dashboard/spa/bookings?error=${encodeURIComponent(result?.error ?? "Unable to settle separately")}`);
  };

  const transferAction = async (formData: FormData) => {
    "use server";
    const result = await transferSpaToHotelFolio(formData);
    if (result && "success" in result && result.success) {
      redirect("/dashboard/spa/bookings?ok=Settlement%20transferred%20to%20hotel%20folio");
    }
    const message = result && "error" in result ? result.error ?? "Unable to transfer to folio" : "Unable to transfer to folio";
    redirect(`/dashboard/spa/bookings?error=${encodeURIComponent(message)}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">Spa Bookings</h1>
          <p className="page-subtitle">Book services with therapist and room capacity checks, then settle to folio or standalone.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Metric title="Services" value={context.services.length} />
          <Metric title="Therapists" value={context.therapists.length} />
          <Metric title="Treatment Rooms" value={context.rooms.length} />
          <Metric title="Bookings" value={context.bookings.length} />
        </div>

        <Card className="glass-panel mt-8">
          <CardHeader><CardTitle className="text-base">Create Spa Booking</CardTitle></CardHeader>
          <CardContent>
            <form action={createAction} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="propertyId" value={propertyId} />

              <div className="grid gap-2">
                <Label htmlFor="serviceId">Service</Label>
                <FormSelectField name="serviceId" options={serviceOptions} placeholder="Select service" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="therapistId">Therapist</Label>
                <FormSelectField name="therapistId" options={therapistOptions} placeholder="Select therapist" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="roomId">Treatment Room</Label>
                <FormSelectField name="roomId" options={roomOptions} placeholder="Select room" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="startsAt">Start Date & Time</Label>
                <Input id="startsAt" name="startsAt" type="datetime-local" required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reservationId">Reservation (optional)</Label>
                <FormSelectField name="reservationId" options={reservationOptions} placeholder="No reservation link" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="guestId">Guest (optional)</Label>
                <FormSelectField name="guestId" options={guestOptions} placeholder="No guest link" />
              </div>

              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={2} placeholder="Preferences, special handling, contraindications" />
              </div>

              <div className="md:col-span-2">
                <FormSubmitButton idleText="Create booking" pendingText="Saving..." className="w-full sm:w-auto" />
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-panel mt-6">
          <CardHeader><CardTitle className="text-base">Upcoming and Recent Spa Bookings</CardTitle></CardHeader>
          <CardContent>
            {context.bookings.length === 0 ? (
              <p className="text-sm text-zinc-500">No spa bookings yet.</p>
            ) : (
              <ul className="space-y-3">
                {context.bookings.map((booking) => {
                  const serviceRaw = booking.spa_services as { name?: string; price_minor?: number } | Array<{ name?: string; price_minor?: number }> | null;
                  const service = Array.isArray(serviceRaw) ? serviceRaw[0] : serviceRaw;
                  const therapistRaw = booking.spa_therapists as { display_name?: string } | Array<{ display_name?: string }> | null;
                  const therapist = Array.isArray(therapistRaw) ? therapistRaw[0] : therapistRaw;
                  const roomRaw = booking.spa_treatment_rooms as { name?: string } | Array<{ name?: string }> | null;
                  const room = Array.isArray(roomRaw) ? roomRaw[0] : roomRaw;
                  const guestRaw = booking.guests as { first_name?: string; last_name?: string } | Array<{ first_name?: string; last_name?: string }> | null;
                  const guest = Array.isArray(guestRaw) ? guestRaw[0] : guestRaw;
                  const guestName = `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Guest";
                  const priceMinor = Number(service?.price_minor ?? 0);

                  return (
                    <li key={booking.id} className="rounded-xl border border-zinc-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-zinc-900">{service?.name ?? "Service"} · {guestName}</p>
                          <p className="text-xs text-zinc-500">
                            {new Date(booking.starts_at).toLocaleString("en-GB")} to {new Date(booking.ends_at).toLocaleTimeString("en-GB")}
                          </p>
                          <p className="text-xs text-zinc-500">Therapist: {therapist?.display_name ?? "Unassigned"} · Room: {room?.name ?? "N/A"}</p>
                        </div>
                        <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">{booking.status}</span>
                      </div>

                      <div className="mt-3 grid gap-2 lg:grid-cols-3">
                        <form action={assignAction} className="flex items-center gap-2">
                          <input type="hidden" name="bookingId" value={booking.id} />
                          <FormSelectField name="therapistId" options={therapistOptions} placeholder="Reassign therapist" className="flex-1" />
                          <FormSubmitButton idleText="Assign" pendingText="..." size="sm" variant="outline" />
                        </form>

                        <form action={postFolioAction} className="flex items-center gap-2">
                          <input type="hidden" name="bookingId" value={booking.id} />
                          <input type="hidden" name="reservationId" value={booking.reservation_id ?? ""} />
                          <FormSubmitButton idleText="Post to hotel folio" pendingText="..." size="sm" variant="outline" />
                        </form>

                        <form action={settleAction} className="flex items-center gap-2">
                          <input type="hidden" name="bookingId" value={booking.id} />
                          <input type="hidden" name="amountMinor" value={priceMinor} />
                          <input type="hidden" name="method" value="card" />
                          <input type="hidden" name="reference" value={`SPA-${booking.id.slice(0, 8)}`} />
                          <FormSubmitButton idleText="Settle spa-only" pendingText="..." size="sm" variant="outline" />
                        </form>
                      </div>

                      <form action={transferAction} className="mt-2">
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="reservationId" value={booking.reservation_id ?? ""} />
                        <FormSubmitButton idleText="Transfer spa settlement to hotel folio" pendingText="..." size="sm" />
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-600">{title}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight text-zinc-900">{value}</p>
      </CardContent>
    </Card>
  );
}
