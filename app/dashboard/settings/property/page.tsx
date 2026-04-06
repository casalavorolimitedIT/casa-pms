import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import {
  getPropertiesWithSettings,
  updatePropertySettings,
} from "@/app/dashboard/settings/actions/settings-actions";
import { currentUserCanManageStaffAccess } from "@/app/dashboard/staff/actions/staff-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

// Common timezone list for hotel operations
const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Europe/Istanbul", label: "Turkey Time (TRT)" },
  { value: "Africa/Lagos", label: "West Africa Time (WAT)" },
  { value: "Africa/Nairobi", label: "East Africa Time (EAT)" },
  { value: "Africa/Johannesburg", label: "South Africa Time (SAST)" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (GST)" },
  { value: "Asia/Karachi", label: "Pakistan Standard Time (PKT)" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST)" },
  { value: "Asia/Bangkok", label: "Indochina Time (ICT)" },
  { value: "Asia/Singapore", label: "Singapore Time (SGT)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Asia/Seoul", label: "Korea Standard Time (KST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AEST)" },
  { value: "Pacific/Auckland", label: "New Zealand Time (NZST)" },
];

const CURRENCIES = [
  { value: "USD", label: "USD – US Dollar" },
  { value: "EUR", label: "EUR – Euro" },
  { value: "GBP", label: "GBP – British Pound" },
  { value: "NGN", label: "NGN – Nigerian Naira" },
  { value: "GHS", label: "GHS – Ghanaian Cedi" },
  { value: "KES", label: "KES – Kenyan Shilling" },
  { value: "ZAR", label: "ZAR – South African Rand" },
  { value: "AED", label: "AED – UAE Dirham" },
  { value: "INR", label: "INR – Indian Rupee" },
  { value: "SGD", label: "SGD – Singapore Dollar" },
  { value: "CAD", label: "CAD – Canadian Dollar" },
  { value: "AUD", label: "AUD – Australian Dollar" },
  { value: "JPY", label: "JPY – Japanese Yen" },
  { value: "CHF", label: "CHF – Swiss Franc" },
  { value: "MXN", label: "MXN – Mexican Peso" },
  { value: "BRL", label: "BRL – Brazilian Real" },
  { value: "EGP", label: "EGP – Egyptian Pound" },
  { value: "MAD", label: "MAD – Moroccan Dirham" },
  { value: "TZS", label: "TZS – Tanzanian Shilling" },
  { value: "UGX", label: "UGX – Ugandan Shilling" },
];

interface Props {
  searchParams: Promise<{ success?: string; error?: string }>;
}

export default async function PropertySettingsPage({ searchParams }: Props) {
  await redirectIfNotAuthenticated();

  const [propertiesResult, canManage, params] = await Promise.all([
    getPropertiesWithSettings(),
    currentUserCanManageStaffAccess(),
    searchParams,
  ]);

  const successMessage = params.success ? decodeURIComponent(params.success) : null;
  const errorMessage = params.error ? decodeURIComponent(params.error) : null;
  const properties = propertiesResult.properties ?? [];

  async function handleUpdateProperty(formData: FormData) {
    "use server";
    const result = await updatePropertySettings(formData);
    if (result?.error) {
      redirect(`/dashboard/settings/property?error=${encodeURIComponent(result.error)}`);
    }
    redirect("/dashboard/settings/property?success=Property+settings+saved");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Properties</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Configure check-in and check-out times, early/late fee policies, currency, and timezone for each property.
        </p>
      </div>

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {propertiesResult.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {propertiesResult.error}
        </div>
      ) : null}

      {!canManage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have read-only access. Only owners and general managers can update property settings.
        </div>
      ) : null}

      {properties.length === 0 ? (
        <Card className="border-zinc-200/80">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No properties found. Add a property from the setup screen.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {properties.map((property) => (
            <Card key={property.id} className="border-zinc-200/80">
              <CardHeader>
                <CardTitle className="text-base">{property.name}</CardTitle>
                <CardDescription className="font-mono text-xs">{property.id}</CardDescription>
              </CardHeader>
              <CardContent>
                {canManage ? (
                  <form action={handleUpdateProperty} className="grid gap-4 sm:grid-cols-2">
                    <input type="hidden" name="propertyId" value={property.id} />

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor={`name-${property.id}`}>Property name</Label>
                      <Input
                        id={`name-${property.id}`}
                        name="name"
                        type="text"
                        defaultValue={property.name}
                        required
                        maxLength={120}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Currency</Label>
                      <select
                        name="currencyCode"
                        aria-label="Currency"
                        defaultValue={property.currencyCode}
                        className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none ring-0 transition-colors focus:border-[#ff6900]"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Timezone</Label>
                      <select
                        name="timezone"
                        aria-label="Timezone"
                        defaultValue={property.timezone}
                        className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none ring-0 transition-colors focus:border-[#ff6900]"
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`checkin-${property.id}`}>Check-in time</Label>
                      <Input
                        id={`checkin-${property.id}`}
                        name="checkInTime"
                        type="time"
                        defaultValue={property.checkInTime}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`checkout-${property.id}`}>Check-out time</Label>
                      <Input
                        id={`checkout-${property.id}`}
                        name="checkOutTime"
                        type="time"
                        defaultValue={property.checkOutTime}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`earlyFee-${property.id}`}>Early check-in fee (minor units)</Label>
                      <Input
                        id={`earlyFee-${property.id}`}
                        name="earlyCheckinFeeMinor"
                        type="number"
                        min={0}
                        defaultValue={property.earlyCheckinFeeMinor}
                      />
                      <p className="text-xs text-zinc-500">Set to 0 to disable. Posted to folio when staff confirm at check-in.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`lateFee-${property.id}`}>Late check-out fee (minor units)</Label>
                      <Input
                        id={`lateFee-${property.id}`}
                        name="lateCheckoutFeeMinor"
                        type="number"
                        min={0}
                        defaultValue={property.lateCheckoutFeeMinor}
                      />
                      <p className="text-xs text-zinc-500">Set to 0 to disable. Posted to folio when staff confirm at check-out.</p>
                    </div>

                    <div className="sm:col-span-2">
                      <FormSubmitButton
                        idleText="Save property"
                        pendingText="Saving..."
                        className="bg-[#ff6900] text-white hover:bg-[#e55f00]"
                      />
                    </div>
                  </form>
                ) : (
                  <dl className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {[
                      { label: "Currency", value: property.currencyCode },
                      { label: "Timezone", value: property.timezone },
                      { label: "Check-in", value: property.checkInTime },
                      { label: "Check-out", value: property.checkOutTime },
                      { label: "Early check-in fee", value: property.earlyCheckinFeeMinor > 0 ? `${property.earlyCheckinFeeMinor} (minor)` : "Disabled" },
                      { label: "Late check-out fee", value: property.lateCheckoutFeeMinor > 0 ? `${property.lateCheckoutFeeMinor} (minor)` : "Disabled" },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1">
                        <dt className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                          {item.label}
                        </dt>
                        <dd className="text-sm font-medium text-zinc-800">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
