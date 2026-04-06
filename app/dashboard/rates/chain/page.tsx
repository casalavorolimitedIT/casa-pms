import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import {
  createChainRatePlan,
  getChainRateContext,
  overridePropertyRate,
  pushChainRateToProperties,
} from "./actions/chain-rate-actions";

type PageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ChainRatesPage({ searchParams }: PageProps) {
  await redirectIfNotAuthenticated();

  const activePropertyId = await getActivePropertyId();
  if (!activePropertyId) return <div className="p-6 text-sm text-muted-foreground">Select an active property first.</div>;

  const canManage = await hasPermission(activePropertyId, "rates.manage");
  if (!canManage) {
    redirect("/dashboard?error=You%20do%20not%20have%20access%20to%20chain%20rates");
  }

  const query = (await searchParams) ?? {};
  const ok = first(query.ok);
  const error = first(query.error);

  const context = await getChainRateContext();

  const planOptions = context.plans.map((plan) => ({ value: plan.id, label: plan.name }));
  const assignmentOptions = context.assignments.map((assignment) => {
    const propertyRaw = assignment.properties as { name?: string } | Array<{ name?: string }> | null;
    const property = Array.isArray(propertyRaw) ? propertyRaw[0] : propertyRaw;
    const planRaw = assignment.chain_rate_plans as { name?: string } | Array<{ name?: string }> | null;
    const plan = Array.isArray(planRaw) ? planRaw[0] : planRaw;
    return {
      value: assignment.id,
      label: `${plan?.name ?? "Plan"} · ${property?.name ?? assignment.property_id.slice(0, 8)}`,
    };
  });
  const roomTypeOptions = context.roomTypes.map((roomType) => {
    const property = context.properties.find((p) => p.id === roomType.property_id);
    return { value: roomType.id, label: `${roomType.name} · ${property?.name ?? roomType.property_id.slice(0, 8)}` };
  });

  const createAction = async (formData: FormData) => {
    "use server";
    const result = await createChainRatePlan(formData);
    if ("error" in result) {
      redirect(`/dashboard/rates/chain?error=${encodeURIComponent(result.error || "Unable to create chain rate plan")}`);
    }
    redirect("/dashboard/rates/chain?ok=Chain%20rate%20plan%20created");
  };

  const pushAction = async (formData: FormData) => {
    "use server";
    const result = await pushChainRateToProperties(formData);
    if ("error" in result) {
      redirect(`/dashboard/rates/chain?error=${encodeURIComponent(result.error || "Unable to push chain plan")}`);
    }
    redirect("/dashboard/rates/chain?ok=Chain%20plan%20pushed%20to%20selected%20properties");
  };

  const overrideAction = async (formData: FormData) => {
    "use server";
    const result = await overridePropertyRate(formData);
    if ("error" in result) {
      redirect(`/dashboard/rates/chain?error=${encodeURIComponent(result.error || "Unable to save override")}`);
    }
    redirect("/dashboard/rates/chain?ok=Property%20override%20saved");
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">Chain Rate Plans</h1>
          <p className="page-subtitle">Create once, push to selected properties, and apply controlled property-level overrides.</p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="glass-panel">
            <CardHeader><CardTitle className="text-base">Create Chain Plan</CardTitle></CardHeader>
            <CardContent>
              <form action={createAction} className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="name">Plan Name</Label>
                  <Input id="name" name="name" placeholder="Chain BAR 2026" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input id="description" name="description" placeholder="Standard chain benchmark rate" />
                </div>
                <FormSubmitButton idleText="Create chain plan" pendingText="Creating..." className="w-full sm:w-auto" />
              </form>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader><CardTitle className="text-base">Push Plan To Properties</CardTitle></CardHeader>
            <CardContent>
              <form action={pushAction} className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="chainRatePlanId">Chain Plan</Label>
                  <FormSelectField name="chainRatePlanId" options={planOptions} placeholder="Select chain plan" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm">Target Properties</Label>
                  <div className="rounded-lg border border-zinc-200 p-3 space-y-2 max-h-44 overflow-auto">
                    {context.properties.length === 0 ? (
                      <p className="text-xs text-zinc-500">No properties available.</p>
                    ) : (
                      context.properties.map((property) => (
                        <label key={property.id} className="flex items-center gap-2 text-sm text-zinc-700">
                          <input type="checkbox" name="propertyIds" value={property.id} className="h-4 w-4" />
                          {property.name}
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <FormSubmitButton idleText="Push to selected properties" pendingText="Pushing..." className="w-full sm:w-auto" />
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel mt-6">
          <CardHeader><CardTitle className="text-base">Override Property Rate</CardTitle></CardHeader>
          <CardContent>
            <form action={overrideAction} className="grid gap-3 md:grid-cols-5 md:items-end">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="assignmentId">Assignment</Label>
                <FormSelectField name="assignmentId" options={assignmentOptions} placeholder="Select assignment" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="roomTypeId">Room Type</Label>
                <FormSelectField name="roomTypeId" options={roomTypeOptions} placeholder="Room type" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dateFrom">From</Label>
                <Input id="dateFrom" name="dateFrom" type="date" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dateTo">To</Label>
                <Input id="dateTo" name="dateTo" type="date" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rateMinor">Rate (minor)</Label>
                <Input id="rateMinor" name="rateMinor" type="number" min={0} required />
              </div>
              <FormSubmitButton idleText="Apply override" pendingText="Saving..." className="w-full md:w-auto" />
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
