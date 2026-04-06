import Link from "next/link";
import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormDateTimeField } from "@/components/ui/form-date-time-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { createOrderQrCode, getQrManagementContext } from "../actions";

type QrPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function FnbQrPage({ searchParams }: QrPageProps) {
  await redirectIfNotAuthenticated();
  const propertyId = await getActivePropertyId();

  if (!propertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Select an active property to manage F and B QR codes.</div>;
  }

  const canManage = await hasPermission(propertyId, "minibar.manage");
  if (!canManage) {
    redirect("/dashboard?error=You%20do%20not%20have%20access%20to%20manage%20QR%20orders");
  }

  const query = (await searchParams) ?? {};
  const ok = first(query.ok);
  const error = first(query.error);

  const context = await getQrManagementContext(propertyId);
  const outletOptions = context.outlets.map((outlet) => ({ value: outlet.id, label: outlet.name }));

  const reservationOptions = (context.reservations as Array<{ id: string; guests: { first_name?: string; last_name?: string } | Array<{ first_name?: string; last_name?: string }> | null; check_in: string; status: string }>).map((res) => {
    const guestRaw = res.guests;
    const guest = Array.isArray(guestRaw) ? guestRaw[0] : guestRaw;
    const guestName = `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Guest";
    return {
      value: res.id,
      label: `${guestName} · ${res.status} · ${new Date(res.check_in).toLocaleDateString("en-GB")}`,
    };
  });

  const createQrAction = async (formData: FormData) => {
    "use server";
    const result = await createOrderQrCode(formData);
    if (result?.success) {
      redirect(`/dashboard/fnb/qr?ok=${encodeURIComponent(`QR created: ${result.code}`)}`);
    }
    redirect(`/dashboard/fnb/qr?error=${encodeURIComponent(result?.error ?? "Unable to create QR")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">F and B QR Ordering</h1>
          <p className="page-subtitle">Generate QR codes for rooms/tables and hand off guest orders into the kitchen queue.</p>
        </div>

        <Card className="glass-panel mt-8">
          <CardHeader><CardTitle className="text-base">Generate QR Code</CardTitle></CardHeader>
          <CardContent>
            <form action={createQrAction} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="propertyId" value={propertyId} />

              <div className="grid gap-2">
                <Label htmlFor="outletId">Outlet</Label>
                <FormSelectField name="outletId" options={outletOptions} placeholder="Select outlet" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reservationId">Reservation (optional)</Label>
                <FormSelectField name="reservationId" options={reservationOptions} placeholder="No reservation link" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="label">Label</Label>
                <Input id="label" name="label" placeholder="Room 204 minibar" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expiresAt">Expires At (optional)</Label>
                <FormDateTimeField name="expiresAt" placeholder="Select date and time" />
              </div>

              <div className="md:col-span-2">
                <FormSubmitButton idleText="Create QR" pendingText="Creating..." className="w-full sm:w-auto" />
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-panel mt-6">
          <CardHeader><CardTitle className="text-base">Recent QR Codes</CardTitle></CardHeader>
          <CardContent>
            {context.qrCodes.length === 0 ? (
              <p className="text-sm text-zinc-500">No QR codes created yet.</p>
            ) : (
              <div className="space-y-2">
                {context.qrCodes.map((qr) => {
                  const outlet = context.outlets.find((outlet) => outlet.id === qr.outlet_id);
                  const guestPath = `/order/${qr.code}`;
                  return (
                    <div key={qr.id} className="rounded-lg border border-zinc-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-zinc-900">{qr.label || `QR ${qr.code}`}</p>
                          <p className="text-xs text-zinc-500">
                            {outlet?.name ?? "Outlet"}
                            {qr.expires_at ? ` · expires ${new Date(qr.expires_at).toLocaleString("en-GB")}` : ""}
                          </p>
                        </div>
                        <Link href={guestPath} className="text-sm font-medium text-[#ff6900] underline underline-offset-2">
                          Open guest page
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
