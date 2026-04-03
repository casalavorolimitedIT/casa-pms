import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { formatCurrencyMinor } from "@/lib/pms/formatting";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { assignCorporateRate, createCorporateAccount, generateMonthlyInvoice, getCorporateContext, postCorporatePayment } from "./actions";

type CorporatePageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CorporatePage({ searchParams }: CorporatePageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const context = await getCorporateContext(activePropertyId);

  const createAccountAction = async (formData: FormData) => {
    "use server";
    const result = await createCorporateAccount(formData);
    if (result?.success) redirect(`/dashboard/corporate?ok=${encodeURIComponent("Corporate account created.")}`);
    redirect(`/dashboard/corporate?error=${encodeURIComponent(result?.error ?? "Unable to create account.")}`);
  };

  const assignRateAction = async (formData: FormData) => {
    "use server";
    const result = await assignCorporateRate(formData);
    if (result?.success) redirect(`/dashboard/corporate?ok=${encodeURIComponent("Corporate rate assigned.")}`);
    redirect(`/dashboard/corporate?error=${encodeURIComponent(result?.error ?? "Unable to assign corporate rate.")}`);
  };

  const generateInvoiceAction = async (formData: FormData) => {
    "use server";
    const result = await generateMonthlyInvoice(formData);
    if (result?.success) redirect(`/dashboard/corporate?ok=${encodeURIComponent("Invoice generated.")}`);
    redirect(`/dashboard/corporate?error=${encodeURIComponent(result?.error ?? "Unable to generate invoice.")}`);
  };

  const postPaymentAction = async (formData: FormData) => {
    "use server";
    const result = await postCorporatePayment(formData);
    if (result?.success) redirect(`/dashboard/corporate?ok=${encodeURIComponent("Corporate payment posted.")}`);
    redirect(`/dashboard/corporate?error=${encodeURIComponent(result?.error ?? "Unable to post payment.")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">Corporate Accounts</h1>
          <p className="page-subtitle">Manage account profiles, negotiated rates, invoice cycles, and posted payments.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Metric title="Accounts" value={context.summary.accounts} />
          <Metric title="Open Invoices" value={context.summary.openInvoices} />
          <Metric title="Receivable" value={formatCurrencyMinor(context.summary.receivableMinor, "USD")} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {context.invoices.length === 0 ? (
                <p className="text-sm text-zinc-500">No invoices yet.</p>
              ) : (
                <ul className="space-y-3">
                  {context.invoices.map((invoice) => (
                    <li key={invoice.id} className="rounded-lg border border-zinc-200 p-3">
                      {(() => {
                        const account = Array.isArray(invoice.corporate_accounts)
                          ? invoice.corporate_accounts[0]
                          : invoice.corporate_accounts;
                        const accountName = (account as { name?: string } | null)?.name ?? "Corporate Account";
                        return (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-zinc-900">{accountName}</p>
                          <p className="text-xs text-zinc-500">{invoice.period_start} to {invoice.period_end}</p>
                        </div>
                        <Badge variant={invoice.status === "paid" ? "outline" : "secondary"}>{invoice.status}</Badge>
                      </div>
                        );
                      })()}
                      <p className="mt-2 text-sm font-medium text-zinc-800">{formatCurrencyMinor(invoice.total_minor, "USD")}</p>

                      <form action={postPaymentAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                        <input type="hidden" name="invoiceId" value={invoice.id} />
                        <Input name="amountMinor" type="number" min="1" placeholder="Amount (minor)" required />
                        <Input name="method" placeholder="bank_transfer" required />
                        <FormSubmitButton idleText="Post" pendingText="Posting..." size="sm" variant="outline" />
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="text-base">Create Account</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createAccountAction} className="grid gap-3">
                  <input type="hidden" name="propertyId" value={activePropertyId} />
                  <div className="grid gap-1.5">
                    <Label>Company Name</Label>
                    <Input name="name" placeholder="Acme Corporate Travel" required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Credit Limit (minor)</Label>
                    <Input type="number" name="creditLimitMinor" min="0" defaultValue="0" required />
                  </div>
                  <FormSubmitButton idleText="Create" pendingText="Saving..." />
                </form>
              </CardContent>
            </Card>

            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="text-base">Assign Corporate Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={assignRateAction} className="grid gap-3">
                  <input type="hidden" name="propertyId" value={activePropertyId} />
                  <div className="grid gap-1.5">
                    <Label>Corporate Account</Label>
                    <FormSelectField
                      name="corporateAccountId"
                      options={context.accounts.map((account) => ({ value: account.id, label: account.name }))}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Rate Plan</Label>
                    <FormSelectField
                      name="ratePlanId"
                      options={context.ratePlans.map((plan) => ({ value: plan.id, label: plan.name }))}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Discount %</Label>
                    <Input name="discountPercent" type="number" min="0" max="100" step="0.01" required />
                  </div>
                  <FormSubmitButton idleText="Assign" pendingText="Saving..." variant="outline" />
                </form>
              </CardContent>
            </Card>

            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="text-base">Generate Monthly Invoice</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={generateInvoiceAction} className="grid gap-3">
                  <input type="hidden" name="propertyId" value={activePropertyId} />
                  <div className="grid gap-1.5">
                    <Label>Corporate Account</Label>
                    <FormSelectField
                      name="corporateAccountId"
                      options={context.accounts.map((account) => ({ value: account.id, label: account.name }))}
                    />
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label>Period Start</Label>
                      <Input type="date" name="periodStart" required />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Period End</Label>
                      <Input type="date" name="periodEnd" required />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Invoices include reservations linked via active corporate-assigned rate plans, or reservation source tags
                    containing the company name or <span className="font-medium">corporate:&lt;account-id&gt;</span>.
                  </p>
                  <FormSubmitButton idleText="Generate" pendingText="Generating..." variant="outline" />
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number | string }) {
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
