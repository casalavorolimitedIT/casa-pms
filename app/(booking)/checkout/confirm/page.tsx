import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ConfirmPageProps = {
  searchParams?: Promise<{ intentId?: string; reference?: string; currency?: string }>;
};

export default async function BookingConfirmPage({ searchParams }: ConfirmPageProps) {
  const params = (await searchParams) ?? {};
  const intentId = params.intentId;
  const reference = params.reference;
  const currency = params.currency ?? "USD";

  if (!intentId || !reference) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-10">
        <div className="mx-auto max-w-xl rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Invalid confirmation callback.
        </div>
      </div>
    );
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/payments/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currency, reference, bookingIntentId: intentId }),
    cache: "no-store",
  });

  const result = (await response.json()) as { reservationId?: string; status?: string; error?: string };

  if (!response.ok || result.error) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-10">
        <div className="mx-auto max-w-xl rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {result.error ?? "Payment verification failed."}
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: intent } = await admin
    .from("booking_intents")
    .select("reservation_id, guest_first_name, guest_last_name, check_in, check_out")
    .eq("id", intentId)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Card className="border-emerald-200">
          <CardHeader>
            <CardTitle className="text-base text-emerald-700">Booking Confirmed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-700">
            <p>Reservation ID: <span className="font-medium">{intent?.reservation_id ?? result.reservationId}</span></p>
            <p>Guest: {intent?.guest_first_name} {intent?.guest_last_name}</p>
            <p>Stay: {intent?.check_in} to {intent?.check_out}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
