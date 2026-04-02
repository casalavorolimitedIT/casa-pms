import Link from "next/link";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { addFolioCharge, addFolioPayment, closeFolio, getFolioById } from "../actions/folio-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolioLineItem } from "@/components/folio/folio-line-item";
import { PaymentForm } from "@/components/folio/payment-form";
import { FolioPdfPlaceholder } from "@/components/folio/folio-pdf";
import { calculateFolioBalance } from "@/lib/pms/folio";
import { formatCurrencyMinor } from "@/lib/pms/formatting";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FolioDetailPage({ params }: PageProps) {
  await redirectIfNotAuthenticated();
  const { id } = await params;
  const result = await getFolioById(id);

  if ("error" in result || !result.folio) {
    return <div className="p-6 text-sm text-muted-foreground">Folio not found.</div>;
  }

  const { folio, charges, payments } = result;
  const reservation = folio.reservations as { guests: { first_name: string; last_name: string } | null } | null;
  const chargeTotal = charges.reduce((sum, item) => sum + item.amount_minor, 0);
  const paymentTotal = payments.reduce((sum, item) => sum + item.amount_minor, 0);
  const balance = calculateFolioBalance({ chargeTotalMinor: chargeTotal, paymentTotalMinor: paymentTotal });

  const closeAction = closeFolio.bind(null, folio.id);

  return (
    <div className="min-h-full bg-zinc-50/60 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Folio {folio.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-sm text-zinc-500">{reservation?.guests?.first_name} {reservation?.guests?.last_name}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline"><Link href="/dashboard/folios">Back</Link></Button>
            <form action={closeAction}><Button type="submit" size="sm">Close Folio</Button></form>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Summary title="Charges" value={formatCurrencyMinor(chargeTotal, folio.currency_code)} />
          <Summary title="Payments" value={formatCurrencyMinor(paymentTotal, folio.currency_code)} />
          <Summary title="Balance" value={formatCurrencyMinor(balance, folio.currency_code)} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-zinc-200 bg-white shadow-sm">
            <CardHeader><CardTitle className="text-base">Charges</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <form action={addFolioCharge} className="grid gap-3 rounded-lg border border-zinc-200 p-4">
                <input type="hidden" name="folioId" value={folio.id} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" name="category" placeholder="room, minibar, spa" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="amountMinor">Amount (minor)</Label>
                    <Input id="amountMinor" name="amountMinor" type="number" min={0} required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" placeholder="Charge details" />
                </div>
                <Button type="submit" size="sm" className="w-fit">Post Charge</Button>
              </form>

              {charges.map((charge) => (
                <FolioLineItem
                  key={charge.id}
                  title={charge.category}
                  subtitle={charge.description}
                  amountMinor={charge.amount_minor}
                  currency={folio.currency_code}
                  kind="charge"
                />
              ))}
            </CardContent>
          </Card>

          <Card className="border-zinc-200 bg-white shadow-sm">
            <CardHeader><CardTitle className="text-base">Payments</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <PaymentForm folioId={folio.id} action={addFolioPayment} />
              {payments.map((payment) => (
                <FolioLineItem
                  key={payment.id}
                  title={payment.method}
                  subtitle={payment.provider_reference ?? payment.provider}
                  amountMinor={payment.amount_minor}
                  currency={folio.currency_code}
                  kind="payment"
                />
              ))}
            </CardContent>
          </Card>
        </div>

        <FolioPdfPlaceholder />
      </div>
    </div>
  );
}

function Summary({ title, value }: { title: string; value: string }) {
  return (
    <Card className="border-zinc-200 bg-white shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-600">{title}</CardTitle></CardHeader>
      <CardContent><p className="text-xl font-semibold text-zinc-900">{value}</p></CardContent>
    </Card>
  );
}
