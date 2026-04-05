import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { connectChannel, getChannelsContext, processOTABooking, syncAvailability, syncRates } from "./actions";

type ChannelsPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ChannelsPage({ searchParams }: ChannelsPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const context = await getChannelsContext(activePropertyId);

  const connectAction = async (formData: FormData) => {
    "use server";
    const result = await connectChannel(formData);
    if (result?.success) redirect(`/dashboard/channels?ok=${encodeURIComponent("Channel connected.")}`);
    redirect(`/dashboard/channels?error=${encodeURIComponent(result?.error ?? "Unable to connect channel.")}`);
  };

  const syncAvailabilityAction = async (formData: FormData) => {
    "use server";
    const result = await syncAvailability(formData);
    if (result?.success) redirect(`/dashboard/channels?ok=${encodeURIComponent("Availability sync sent.")}`);
    redirect(`/dashboard/channels?error=${encodeURIComponent(result?.error ?? "Unable to sync availability.")}`);
  };

  const syncRatesAction = async (formData: FormData) => {
    "use server";
    const result = await syncRates(formData);
    if (result?.success) redirect(`/dashboard/channels?ok=${encodeURIComponent("Rate sync sent.")}`);
    redirect(`/dashboard/channels?error=${encodeURIComponent(result?.error ?? "Unable to sync rates.")}`);
  };

  const processOtaAction = async (formData: FormData) => {
    "use server";
    const result = await processOTABooking(formData);
    if (result?.success) redirect(`/dashboard/channels?ok=${encodeURIComponent("OTA booking mapped to reservation.")}`);
    redirect(`/dashboard/channels?error=${encodeURIComponent(result?.error ?? "Unable to process OTA booking.")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">Channel Manager</h1>
          <p className="page-subtitle">Connect OTAs, push rates and availability, and map inbound external bookings.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Metric title="Connected" value={context.summary.connectedChannels} />
          <Metric title="Configured" value={context.summary.totalChannels} />
          <Metric title="Mapped Bookings" value={context.summary.mappedBookings} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Connections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={connectAction} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input type="hidden" name="propertyId" value={activePropertyId} />
                <div className="grid gap-1.5">
                  <Label>Channel Name</Label>
                  <Input name="channelName" placeholder="booking-com, expedia, airbnb" required />
                </div>
                <div className="flex items-end">
                  <FormSubmitButton idleText="Connect" pendingText="Connecting..." />
                </div>
              </form>

              {context.connections.length === 0 ? (
                <p className="text-sm text-zinc-500">No channel connections yet.</p>
              ) : (
                <ul className="space-y-3">
                  {context.connections.map((connection) => (
                    <li key={connection.id} className="rounded-lg border border-zinc-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-zinc-900">{connection.channel_name}</p>
                          <p className="text-xs text-zinc-500">
                            Last sync: {connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString("en-GB") : "Never"}
                          </p>
                        </div>
                        <Badge variant={connection.status === "connected" ? "outline" : "secondary"}>{connection.status}</Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <form action={syncAvailabilityAction}>
                          <input type="hidden" name="channelConnectionId" value={connection.id} />
                          <FormSubmitButton idleText="Sync Availability" pendingText="Syncing..." size="sm" variant="outline" />
                        </form>
                        <form action={syncRatesAction}>
                          <input type="hidden" name="channelConnectionId" value={connection.id} />
                          <FormSubmitButton idleText="Sync Rates" pendingText="Syncing..." size="sm" variant="outline" />
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Inbound OTA Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={processOtaAction} className="grid gap-3">
                <input type="hidden" name="propertyId" value={activePropertyId} />

                <div className="grid gap-1.5">
                  <Label>Channel</Label>
                  <Input name="channelName" placeholder="booking-com" required />
                </div>
                <div className="grid gap-1.5">
                  <Label>External Booking ID</Label>
                  <Input name="externalBookingId" required />
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label>Guest First Name</Label>
                    <Input name="guestFirstName" required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Guest Last Name</Label>
                    <Input name="guestLastName" required />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Guest Email</Label>
                  <Input type="email" name="guestEmail" required />
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label>Check-in</Label>
                    <Input type="date" name="checkIn" required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Check-out</Label>
                    <Input type="date" name="checkOut" required />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Room Type</Label>
                  <FormSelectField
                    name="roomTypeId"
                    options={context.roomTypes.map((type) => ({ value: type.id, label: type.name }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Total Rate (minor)</Label>
                  <Input type="number" name="totalRateMinor" min="0" defaultValue="0" required />
                </div>

                <FormSubmitButton idleText="Process Booking" pendingText="Processing..." />
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-zinc-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight text-zinc-900">{value}</p>
      </CardContent>
    </Card>
  );
}
