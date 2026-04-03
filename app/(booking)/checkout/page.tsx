import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startCheckout } from "./actions";

type CheckoutPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const supabase = await createClient();
  const params = (await searchParams) ?? {};

  const [propertiesRes, roomTypesRes] = await Promise.all([
    supabase.from("properties").select("id, name, currency_code").order("name", { ascending: true }).limit(10),
    supabase.from("room_types").select("id, name, property_id").order("name", { ascending: true }).limit(200),
  ]);

  const properties = propertiesRes.data ?? [];
  const roomTypes = roomTypesRes.data ?? [];

  const defaultProperty = properties[0];

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Direct Booking</h1>
          <p className="text-sm text-zinc-600">Search availability, enter guest details, and pay securely to confirm reservation.</p>
        </div>

        {params.error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</div>
        ) : null}

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Checkout</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={startCheckout} className="grid gap-4">
              <div className="grid gap-2">
                <Label>Property</Label>
                <FormSelectField
                  name="propertyId"
                  defaultValue={defaultProperty?.id}
                  options={properties.map((property) => ({ value: property.id, label: `${property.name} (${property.currency_code})` }))}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Check-in</Label>
                  <Input type="date" name="checkIn" required />
                </div>
                <div className="grid gap-2">
                  <Label>Check-out</Label>
                  <Input type="date" name="checkOut" required />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Adults</Label>
                  <Input name="adults" type="number" min="1" defaultValue="1" required />
                </div>
                <div className="grid gap-2">
                  <Label>Children</Label>
                  <Input name="children" type="number" min="0" defaultValue="0" required />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Room Type</Label>
                <FormSelectField
                  name="roomTypeId"
                  options={roomTypes.map((roomType) => ({ value: roomType.id, label: roomType.name }))}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>First Name</Label>
                  <Input name="firstName" required />
                </div>
                <div className="grid gap-2">
                  <Label>Last Name</Label>
                  <Input name="lastName" required />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" name="email" required />
              </div>

              <div className="grid gap-2">
                <Label>Currency</Label>
                <Input name="currencyCode" defaultValue={defaultProperty?.currency_code ?? "USD"} required />
              </div>

              <FormSubmitButton idleText="Continue to Payment" pendingText="Preparing payment..." />
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
