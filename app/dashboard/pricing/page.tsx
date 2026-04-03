import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { formatCurrencyMinor } from "@/lib/pms/formatting";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { createPricingRule, getPricingContext, previewPricingImpact, toggleDynamicPricing, updatePricingRule } from "./actions";

type PricingPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[]; preview?: string | string[] }>;
};

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);
  const preview = readSearchValue(params.preview);

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const context = await getPricingContext(activePropertyId);

  const createRuleAction = async (formData: FormData) => {
    "use server";
    const result = await createPricingRule(formData);
    if (result?.success) redirect(`/dashboard/pricing?ok=${encodeURIComponent("Pricing rule created.")}`);
    redirect(`/dashboard/pricing?error=${encodeURIComponent(result?.error ?? "Unable to create rule.")}`);
  };

  const previewAction = async (formData: FormData) => {
    "use server";
    const result = await previewPricingImpact(formData);
    if (result?.success) {
      const currency = result.currency ?? "USD";
      const previewText = `${formatCurrencyMinor(result.baseMinor, currency)} -> ${formatCurrencyMinor(result.adjustedMinor, currency)}`;
      redirect(`/dashboard/pricing?preview=${encodeURIComponent(previewText)}&ok=${encodeURIComponent("Pricing preview generated.")}`);
    }
    redirect(`/dashboard/pricing?error=${encodeURIComponent(result?.error ?? "Unable to preview impact.")}`);
  };

  const toggleAction = async (formData: FormData) => {
    "use server";
    const result = await toggleDynamicPricing(formData);
    if (result?.success) redirect(`/dashboard/pricing?ok=${encodeURIComponent("Rule state updated.")}`);
    redirect(`/dashboard/pricing?error=${encodeURIComponent(result?.error ?? "Unable to update rule.")}`);
  };

  const updateRuleAction = async (formData: FormData) => {
    "use server";
    const result = await updatePricingRule(formData);
    if (result?.success) redirect(`/dashboard/pricing?ok=${encodeURIComponent("Rule updated.")}`);
    redirect(`/dashboard/pricing?error=${encodeURIComponent(result?.error ?? "Unable to update rule.")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">Dynamic Pricing</h1>
          <p className="page-subtitle">Define occupancy and lead-time rules, lock overrides, and preview impact before activation.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Metric title="Active Rules" value={context.summary.activeRules} />
          <Metric title="Locked Rules" value={context.summary.lockedRules} />
          <Metric title="Total Rules" value={context.summary.totalRules} />
        </div>

        {preview ? (
          <Card className="border-zinc-200">
            <CardContent className="pt-6">
              <p className="text-sm text-zinc-700">Preview result: <span className="font-semibold">{preview}</span></p>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Pricing Rules</CardTitle>
            </CardHeader>
            <CardContent>
              {context.rules.length === 0 ? (
                <p className="text-sm text-zinc-500">No dynamic pricing rules yet.</p>
              ) : (
                <ul className="space-y-3">
                  {context.rules.map((rule) => (
                    <li key={rule.id} className="rounded-lg border border-zinc-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-zinc-900">{rule.name}</p>
                          <p className="text-xs text-zinc-500">Adj: {rule.adjustment_percent}% · Min Occ: {rule.min_occupancy_percent ?? "-"}% · Lead Days: {rule.min_lead_days ?? "-"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={rule.is_active ? "outline" : "secondary"}>{rule.is_active ? "Active" : "Inactive"}</Badge>
                          <Badge variant={rule.is_locked ? "secondary" : "outline"}>{rule.is_locked ? "Locked" : "Editable"}</Badge>
                        </div>
                      </div>
                      <div className="mt-3">
                        <form action={toggleAction}>
                          <input type="hidden" name="ruleId" value={rule.id} />
                          <input type="hidden" name="isActive" value={String(rule.is_active)} />
                          <FormSubmitButton
                            idleText={rule.is_active ? "Disable" : "Enable"}
                            pendingText="Saving..."
                            size="sm"
                            variant="outline"
                            disabled={rule.is_locked}
                          />
                        </form>
                      </div>
                      <details className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-2">
                        <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.12em] text-zinc-600">Edit Rule</summary>
                        <form action={updateRuleAction} className="mt-3 grid gap-2">
                          <input type="hidden" name="ruleId" value={rule.id} />
                          <div className="grid gap-1.5">
                            <FieldLabel label="Name" tip="Internal rule name shown in the pricing list." />
                            <Input name="name" defaultValue={rule.name} required />
                          </div>
                          <div className="grid gap-1.5">
                            <FieldLabel label="Room Type (optional)" tip="If set, this rule applies only to that room type. Leave empty for all room types." />
                            <FormSelectField
                              name="roomTypeId"
                              defaultValue={rule.room_type_id ?? ""}
                              placeholder="All room types"
                              options={context.roomTypes.map((type) => ({ value: type.id, label: type.name }))}
                            />
                          </div>
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                              <FieldLabel label="Min Occupancy %" tip="Rule triggers only when occupancy reaches this percent or higher." />
                              <Input type="number" name="minOccupancyPercent" min="0" max="100" defaultValue={rule.min_occupancy_percent ?? ""} />
                            </div>
                            <div className="grid gap-1.5">
                              <FieldLabel label="Min Lead Days" tip="Rule triggers when booking lead time is at least this many days before check-in." />
                              <Input type="number" name="minLeadDays" min="0" defaultValue={rule.min_lead_days ?? ""} />
                            </div>
                          </div>
                          <div className="grid gap-1.5">
                            <FieldLabel label="Adjustment %" tip="Percentage to adjust base price. Positive raises price, negative discounts." />
                            <Input type="number" name="adjustmentPercent" min="-100" max="300" step="0.01" defaultValue={rule.adjustment_percent} required />
                          </div>
                          <label className="flex items-center gap-2 text-sm text-zinc-700" title="Locked rules cannot be enabled or disabled from quick toggle.">
                            <input type="checkbox" name="isLocked" className="h-4 w-4" defaultChecked={rule.is_locked} />
                            Lock this rule from direct toggles
                          </label>
                          <FormSubmitButton idleText="Save Rule" pendingText="Saving..." size="sm" variant="outline" />
                        </form>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="text-base">Create Rule</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createRuleAction} className="grid gap-3">
                  <input type="hidden" name="propertyId" value={activePropertyId} />

                  <div className="grid gap-1.5">
                    <FieldLabel label="Name" tip="Internal rule name shown in the pricing list." />
                    <Input name="name" placeholder="High occupancy uplift" required />
                  </div>
                  <div className="grid gap-1.5">
                    <FieldLabel label="Room Type (optional)" tip="If set, this rule applies only to that room type. Leave empty for all room types." />
                    <FormSelectField
                      name="roomTypeId"
                      placeholder="All room types"
                      options={context.roomTypes.map((type) => ({ value: type.id, label: type.name }))}
                    />
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <FieldLabel label="Min Occupancy %" tip="Rule triggers only when occupancy reaches this percent or higher." />
                      <Input type="number" name="minOccupancyPercent" min="0" max="100" />
                    </div>
                    <div className="grid gap-1.5">
                      <FieldLabel label="Min Lead Days" tip="Rule triggers when booking lead time is at least this many days before check-in." />
                      <Input type="number" name="minLeadDays" min="0" />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <FieldLabel label="Adjustment %" tip="Percentage to adjust base price. Positive raises price, negative discounts." />
                    <Input type="number" name="adjustmentPercent" min="-100" max="300" step="0.01" required />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-zinc-700" title="Locked rules cannot be enabled or disabled from quick toggle.">
                    <input type="checkbox" name="isLocked" className="h-4 w-4" />
                    Lock this rule from direct toggles
                  </label>

                  <FormSubmitButton idleText="Create Rule" pendingText="Saving..." />
                </form>
              </CardContent>
            </Card>

            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="text-base">Simulation Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={previewAction} className="grid gap-3">
                  <input type="hidden" name="propertyId" value={activePropertyId} />

                  <div className="grid gap-1.5">
                    <FieldLabel label="Room Type" tip="Room type used as the pricing base for this simulation." />
                    <FormSelectField
                      name="roomTypeId"
                      options={context.roomTypes.map((type) => ({ value: type.id, label: type.name }))}
                    />
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <FieldLabel label="Check-in" tip="Simulation start date. This night is included in the price." />
                      <Input type="date" name="checkIn" required />
                    </div>
                    <div className="grid gap-1.5">
                      <FieldLabel label="Check-out" tip="Simulation end date. This date is excluded from nightly pricing." />
                      <Input type="date" name="checkOut" required />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <FieldLabel label="Adjustment %" tip="Percentage applied to simulated base total to estimate impact." />
                    <Input type="number" name="adjustmentPercent" step="0.01" required />
                  </div>

                  <FormSubmitButton idleText="Preview" pendingText="Calculating..." variant="outline" />
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ label, tip }: { label: string; tip: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label>{label}</Label>
      <Tooltip>
        <TooltipTrigger>
          <span className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-zinc-300 text-[10px] font-semibold text-zinc-500">
            ?
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-64">
          {tip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
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
