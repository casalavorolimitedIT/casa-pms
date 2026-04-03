import Link from "next/link";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import {
  addFolioCharge,
  addFolioPayment,
  closeFolio,
  getFolioById,
  splitFolioCharge,
  transferFolioCharge,
} from "../actions/folio-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FolioLineItem } from "@/components/folio/folio-line-item";
import { PaymentForm } from "@/components/folio/payment-form";
import { FolioPdfCard } from "@/components/folio/folio-pdf";
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
  const reservationRaw = folio.reservations as
    | { guests?: { first_name?: string; last_name?: string } | Array<{ first_name?: string; last_name?: string }> | null }
    | Array<{ guests?: { first_name?: string; last_name?: string } | Array<{ first_name?: string; last_name?: string }> | null }>
    | null;

  const reservation = Array.isArray(reservationRaw)
    ? reservationRaw[0] ?? null
    : reservationRaw;

  const guestRaw = reservation?.guests;
  const guest = Array.isArray(guestRaw) ? guestRaw[0] ?? null : guestRaw ?? null;
  const chargeTotal = charges.reduce((sum, item) => sum + item.amount_minor, 0);
  const paymentTotal = payments.reduce((sum, item) => sum + item.amount_minor, 0);
  const balance = calculateFolioBalance({ chargeTotalMinor: chargeTotal, paymentTotalMinor: paymentTotal });

  const closeAction = async () => {
    await closeFolio(folio.id);
  };

  const addChargeAction = async (formData: FormData) => {
    await addFolioCharge(formData);
  };

  const splitChargeAction = async (formData: FormData) => {
    await splitFolioCharge(formData);
  };

  const transferChargeAction = async (formData: FormData) => {
    await transferFolioCharge(formData);
  };

  const addPaymentAction = async (formData: FormData) => {
    await addFolioPayment(formData);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Folio {folio.id.slice(0, 8).toUpperCase()}</h1>
            <p className="page-subtitle">{guest?.first_name ?? ""} {guest?.last_name ?? ""}</p>
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
          <Card className="glass-panel">
            <CardHeader><CardTitle className="text-base">Charges</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <form action={addChargeAction} className="grid gap-3 rounded-lg border border-zinc-200 p-4">
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

              {charges.length > 0 && (
                <form action={splitChargeAction} className="grid gap-3 rounded-lg border border-zinc-200 p-4">
                  <input type="hidden" name="folioId" value={folio.id} />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="chargeId">Split charge</Label>
                      <FormSelectField
                        name="chargeId"
                        placeholder="Select charge"
                        options={charges.map((c) => ({
                          value: c.id,
                          label: `${c.category} · ${formatCurrencyMinor(c.amount_minor, folio.currency_code)}`,
                        }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="splitAmountMinor">Split amount</Label>
                      <Input id="splitAmountMinor" name="splitAmountMinor" type="number" min={1} required />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="splitLabel">Split label</Label>
                    <Input id="splitLabel" name="splitLabel" placeholder="company_share" defaultValue="split" />
                  </div>
                  <Button type="submit" size="sm" variant="outline" className="w-fit">Split Charge</Button>
                </form>
              )}

              {charges.length > 0 && (
                <form action={transferChargeAction} className="grid gap-3 rounded-lg border border-zinc-200 p-4">
                  <input type="hidden" name="fromFolioId" value={folio.id} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="transferChargeId">Transfer charge</Label>
                      <FormSelectField
                        name="chargeId"
                        placeholder="Select charge"
                        options={charges.map((c) => ({
                          value: c.id,
                          label: `${c.category} · ${formatCurrencyMinor(c.amount_minor, folio.currency_code)}`,
                        }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="toFolioId">Destination folio ID</Label>
                      <Input id="toFolioId" name="toFolioId" placeholder="UUID" required />
                    </div>
                  </div>
                  <Button type="submit" size="sm" variant="outline" className="w-fit">Transfer Charge</Button>
                </form>
              )}

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

          <Card className="glass-panel">
            <CardHeader><CardTitle className="text-base">Payments</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <PaymentForm folioId={folio.id} action={addPaymentAction} />
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

        <FolioPdfCard
          folioId={folio.id}
          guestName={`${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim()}
          currencyCode={folio.currency_code}
          charges={charges}
          payments={payments}
        />
      </div>
    </div>
  );
}

function Summary({ title, value }: { title: string; value: string }) {
  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-600">{title}</CardTitle></CardHeader>
      <CardContent><p className="text-2xl font-medium tracking-tight text-zinc-900">{value}</p></CardContent>
    </Card>
  );
}
