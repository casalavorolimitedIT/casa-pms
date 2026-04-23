import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { redirect } from "next/navigation";
import { confirmCheckOut, getCheckOutReservationContext } from "../../actions/checkin-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelectField } from "@/components/ui/form-select-field";
import { formatCurrencyMinor } from "@/lib/pms/formatting";
import { calculateFolioBalance } from "@/lib/pms/folio";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import Link from "next/link";

interface PageProps {
  params: Promise<{ reservationId: string }>;
  searchParams?: Promise<{
    ok?: string | string[];
    error?: string | string[];
  }>;
}

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CheckOutPage({ params, searchParams }: PageProps) {
  await redirectIfNotAuthenticated();
  const { reservationId } = await params;
  const query = (await searchParams) ?? {};
  const ok = readSearchValue(query.ok);
  const error = readSearchValue(query.error);
  const ctx = await getCheckOutReservationContext(reservationId);

  if (!ctx.reservation || !ctx.folio) {
    return <div className="p-6 text-sm text-muted-foreground">Reservation or folio not found.</div>;
  }

  const chargeTotal = ctx.charges.reduce((sum, c) => sum + c.amount_minor, 0);
  const paymentTotal = ctx.payments.reduce((sum, p) => sum + p.amount_minor, 0);
  const balance = calculateFolioBalance({ chargeTotalMinor: chargeTotal, paymentTotalMinor: paymentTotal });

  // Determine if this is a late departure
  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const stdCheckOutTime = ctx.propertySettings?.checkOutTime ?? "11:00";
  const lateFeeMinor = ctx.propertySettings?.lateCheckoutFeeMinor ?? 0;
  const isLateDeparture = currentTimeStr > stdCheckOutTime && lateFeeMinor > 0;
  const guestRaw = ctx.reservation.guests as
    | { first_name?: string; last_name?: string }
    | Array<{ first_name?: string; last_name?: string }>
    | null;
  const guest = Array.isArray(guestRaw) ? guestRaw[0] ?? null : guestRaw;
  const submitCheckOut = async (formData: FormData) => {
    "use server";
    try {
      const result = await confirmCheckOut(formData);
      if (result?.error) throw new Error(result.error);
      redirect(`/dashboard/front-desk/check-out/${reservationId}?ok=${encodeURIComponent("Check-out completed successfully.")}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to complete check-out.";
      redirect(`/dashboard/front-desk/check-out/${reservationId}?error=${encodeURIComponent(message)}`);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />
        <div className="flex items-center justify-between">
          <h1 className="page-title">Guest Check-out</h1>
          <Button asChild variant="outline" size="sm"><Link href="/dashboard/stay-view">Back</Link></Button>
        </div>

        <Card className="glass-panel">
          <CardHeader><CardTitle className="text-base">Stay Summary</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Summary label="Guest" value={`${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim()} />
            <Summary label="Charges" value={formatCurrencyMinor(chargeTotal, ctx.folio.currency_code)} />
            <Summary label="Payments" value={formatCurrencyMinor(paymentTotal, ctx.folio.currency_code)} />
            <Summary label="Balance" value={formatCurrencyMinor(balance, ctx.folio.currency_code)} />
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader><CardTitle className="text-base">Settle Balance</CardTitle></CardHeader>
          <CardContent>
            {isLateDeparture && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                <p className="font-semibold text-amber-900">Late departure — standard check-out is {stdCheckOutTime}</p>
                <p className="mt-0.5 text-amber-800">A late check-out fee ({lateFeeMinor} minor units) is configured. Check the box below to post it to the folio.</p>
              </div>
            )}
            {balance <= 0 ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Folio is fully settled — no outstanding balance.
                </div>
                <form action={submitCheckOut}>
                  <input type="hidden" name="reservationId" value={reservationId} />
                  <input type="hidden" name="folioId" value={ctx.folio.id} />
                  <input type="hidden" name="amountMinor" value="0" />
                  <input type="hidden" name="currency" value={ctx.folio.currency_code} />
                  <input type="hidden" name="paymentMethod" value="cash" />
                  {isLateDeparture && (
                    <div className="mb-3 flex items-center gap-2">
                      <input id="postLateFeeSettled" name="postLateFee" type="checkbox" className="h-4 w-4" aria-label="Post late check-out fee to folio" defaultChecked />
                      <Label htmlFor="postLateFeeSettled">Post late check-out fee to folio</Label>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <FormSubmitButton idleText="Complete Check-out" pendingText="Checking out…" />
                    <Button type="button" variant="outline" asChild>
                      <Link href={`/dashboard/folios/${ctx.folio.id}`}>View Folio</Link>
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <form action={submitCheckOut} className="grid gap-4">
                <input type="hidden" name="reservationId" value={reservationId} />
                <input type="hidden" name="folioId" value={ctx.folio.id} />

                {isLateDeparture && (
                  <div className="flex items-center gap-2">
                    <input id="postLateFeePending" name="postLateFee" type="checkbox" className="h-4 w-4" aria-label="Post late check-out fee to folio" defaultChecked />
                    <Label htmlFor="postLateFeePending">Post late check-out fee to folio</Label>
                  </div>
                )}

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
                  <FormSubmitButton idleText="Complete Check-out" pendingText="Checking out…" />
                  <Button type="button" variant="outline" asChild><Link href={`/dashboard/folios/${ctx.folio.id}`}>Open Folio</Link></Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="page-subtitle">{label}</p>
      <p className="text-lg font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
