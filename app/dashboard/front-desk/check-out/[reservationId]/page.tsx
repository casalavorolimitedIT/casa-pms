import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { confirmCheckOut, getCheckOutReservationContext } from "../../actions/checkin-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelectField } from "@/components/ui/form-select-field";
import { formatCurrencyMinor } from "@/lib/pms/formatting";
import { calculateFolioBalance } from "@/lib/pms/folio";
import Link from "next/link";

interface PageProps {
  params: Promise<{ reservationId: string }>;
}

export default async function CheckOutPage({ params }: PageProps) {
  await redirectIfNotAuthenticated();
  const { reservationId } = await params;
  const ctx = await getCheckOutReservationContext(reservationId);

  if (!ctx.reservation || !ctx.folio) {
    return <div className="p-6 text-sm text-muted-foreground">Reservation or folio not found.</div>;
  }

  const chargeTotal = ctx.charges.reduce((sum, c) => sum + c.amount_minor, 0);
  const paymentTotal = ctx.payments.reduce((sum, p) => sum + p.amount_minor, 0);
  const balance = calculateFolioBalance({ chargeTotalMinor: chargeTotal, paymentTotalMinor: paymentTotal });
  const guest = ctx.reservation.guests as { first_name: string; last_name: string } | null;

  return (
    <div className="min-h-full bg-zinc-50/60 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Guest Check-out</h1>
          <Button asChild variant="outline" size="sm"><Link href="/dashboard/front-desk">Back</Link></Button>
        </div>

        <Card className="border-zinc-200 bg-white shadow-sm">
          <CardHeader><CardTitle className="text-base">Stay Summary</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Summary label="Guest" value={`${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim()} />
            <Summary label="Charges" value={formatCurrencyMinor(chargeTotal, ctx.folio.currency_code)} />
            <Summary label="Payments" value={formatCurrencyMinor(paymentTotal, ctx.folio.currency_code)} />
            <Summary label="Balance" value={formatCurrencyMinor(balance, ctx.folio.currency_code)} />
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white shadow-sm">
          <CardHeader><CardTitle className="text-base">Settle Balance</CardTitle></CardHeader>
          <CardContent>
            <form action={confirmCheckOut} className="grid gap-4">
              <input type="hidden" name="reservationId" value={reservationId} />
              <input type="hidden" name="folioId" value={ctx.folio.id} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="amountMinor">Amount (minor units)</Label>
                  <Input id="amountMinor" name="amountMinor" type="number" min={0} defaultValue={Math.max(0, balance)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" name="currency" defaultValue={ctx.folio.currency_code} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="paymentMethod">Payment method</Label>
                  <FormSelectField
                    name="paymentMethod"
                    defaultValue="card"
                    options={[
                      { value: "card", label: "Card" },
                      { value: "cash", label: "Cash" },
                      { value: "bank_transfer", label: "Bank transfer" },
                    ]}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email (required for card gateway)</Label>
                  <Input id="email" name="email" type="email" placeholder="guest@email.com" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Complete Check-out</Button>
                <Button type="button" variant="outline" asChild><Link href={`/dashboard/folios/${ctx.folio.id}`}>Open Folio</Link></Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="text-lg font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
