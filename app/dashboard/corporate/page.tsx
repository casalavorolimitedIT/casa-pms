import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { formatCurrencyMinor } from "@/lib/pms/formatting";
import { PageHelpDialog } from "@/components/custom/page-help-dialog";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { WorkflowStepperSheet } from "@/components/custom/workflow-stepper-sheet";
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

        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="page-title">Corporate Accounts</h1>
            <p className="page-subtitle">Manage account profiles, negotiated rates, invoice cycles, and posted payments.</p>
          </div>
          <PageHelpDialog
            className="border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            pageName="Corporate accounts"
            summary="This page handles negotiated corporate sales flow from account setup to billing and collections."
            responsibilities={[
              "Create corporate profiles with credit boundaries.",
              "Assign negotiated discounts to rate plans.",
              "Generate invoice cycles and post payments to open balances.",
            ]}
            relatedPages={[
              {
                href: "/dashboard/rates",
                label: "Rates",
                description: "Rate plans are used when assigning corporate discounts.",
              },
              {
                href: "/dashboard/folios",
                label: "Folios",
                description: "Invoice settlements may map to folio-level accounting workflows.",
              },
            ]}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Metric title="Accounts" value={context.summary.accounts} />
          <Metric title="Open Invoices" value={context.summary.openInvoices} />
          <Metric title="Receivable" value={formatCurrencyMinor(context.summary.receivableMinor, "USD")} />
        </div>

        <Card className="glass-panel border-zinc-200/80 bg-linear-to-br from-white via-zinc-50/70 to-white">
          <CardHeader>
            <CardTitle className="text-base">Corporate Workflow</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-zinc-900">Run the corporate lifecycle from one guided side panel.</p>
              <p className="text-sm text-zinc-600">Create account, assign rates, and generate invoices in one numbered flow.</p>
            </div>
            <WorkflowStepperSheet
              title="Corporate Lifecycle"
              description="Complete key corporate setup and billing actions from a single modal workflow."
              triggerLabel="Open corporate workflow"
              steps={[
                { title: "Create account", description: "Register corporate profile and credit limit." },
                { title: "Assign negotiated rate", description: "Attach discount to a rate plan." },
                { title: "Generate monthly invoice", description: "Create bill for selected period." },
              ]}
            >
              <div className="grid gap-6">
                <section className="space-y-3 rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">1</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Create account</h2>
                  </div>
                  <form action={createAccountAction} className="grid gap-3">
                    <input type="hidden" name="propertyId" value={activePropertyId} />
                    <div className="grid gap-1.5">
                      <Label htmlFor="wf-name">Company Name</Label>
                      <Input id="wf-name" name="name" placeholder="Acme Corporate Travel" required />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="wf-creditLimitMinor">Credit Limit (minor)</Label>
                      <Input id="wf-creditLimitMinor" type="number" name="creditLimitMinor" min="0" defaultValue="0" required />
                    </div>
                    <FormSubmitButton idleText="Create" pendingText="Saving..." />
                  </form>
                </section>

                <section className="space-y-3 rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">2</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Assign negotiated rate</h2>
                  </div>
                  <form action={assignRateAction} className="grid gap-3">
                    <input type="hidden" name="propertyId" value={activePropertyId} />
                    <div className="grid gap-1.5">
                      <Label htmlFor="wf-corporateAccountId">Corporate Account</Label>
                      <FormSelectField
                        name="corporateAccountId"
                        options={context.accounts.map((account) => ({ value: account.id, label: account.name }))}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="wf-ratePlanId">Rate Plan</Label>
                      <FormSelectField
                        name="ratePlanId"
                        options={context.ratePlans.map((plan) => ({ value: plan.id, label: plan.name }))}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="wf-discountPercent">Discount %</Label>
                      <Input id="wf-discountPercent" name="discountPercent" type="number" min="0" max="100" step="0.01" required />
                    </div>
                    <FormSubmitButton idleText="Assign" pendingText="Saving..." variant="outline" />
                  </form>
                </section>

                <section className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">3</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Generate monthly invoice</h2>
                  </div>
                  <form action={generateInvoiceAction} className="grid gap-3">
                    <input type="hidden" name="propertyId" value={activePropertyId} />
                    <div className="grid gap-1.5">
                      <Label htmlFor="wf-generateCorporateAccountId">Corporate Account</Label>
                      <FormSelectField
                        name="corporateAccountId"
                        options={context.accounts.map((account) => ({ value: account.id, label: account.name }))}
                      />
                    </div>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label htmlFor="wf-periodStart">Period Start</Label>
                        <Input id="wf-periodStart" type="date" name="periodStart" required />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="wf-periodEnd">Period End</Label>
                        <Input id="wf-periodEnd" type="date" name="periodEnd" required />
                      </div>
                    </div>
                    <FormSubmitButton idleText="Generate" pendingText="Generating..." variant="outline" />
                  </form>
                </section>
              </div>
            </WorkflowStepperSheet>
          </CardContent>
        </Card>

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
            <Card className="border-zinc-200 bg-zinc-50/60">
              <CardHeader>
                <CardTitle className="text-base">Workflow Note</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-zinc-600">
                  Core setup and invoice generation are now available in the guided workflow. Invoice-level payment posting remains inline beside each invoice record for faster collections processing.
                </p>
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
