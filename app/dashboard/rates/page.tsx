import Link from "next/link";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { createRatePlan, getRatePlans } from "./actions/rate-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RatePlanForm } from "@/components/rates/rate-plan-form";
import { getActivePropertyId } from "@/lib/pms/property-context";

export default async function RatesPage() {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  if (!activePropertyId) return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or add/select an active property in the header.</div>;

  const { plans } = await getRatePlans(activePropertyId);
  const submitCreateRatePlan = async (formData: FormData) => {
    "use server";
    await createRatePlan(formData);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Rate Management</h1>
            <p className="page-subtitle">Manage plans, restrictions, and seasonal overrides.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm"><Link href="/dashboard/rates/packages">Packages</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href="/dashboard/rates/seasons">Seasons</Link></Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card className="glass-panel">
            <CardHeader><CardTitle className="text-base">Rate Plans</CardTitle></CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <p className="page-subtitle">No plans yet.</p>
              ) : (
                <div className="space-y-2">
                  {plans.map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
                      <div>
                        <p className="font-medium text-zinc-900">{plan.name}</p>
                        <p className="text-xs text-zinc-500">{plan.currency_code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={plan.is_active ? "outline" : "secondary"}>{plan.is_active ? "Active" : "Inactive"}</Badge>
                        <Button asChild size="sm" variant="outline"><Link href={`/dashboard/rates/${plan.id}`}>Open</Link></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader><CardTitle className="text-base">Create New Plan</CardTitle></CardHeader>
            <CardContent>
              <RatePlanForm propertyId={activePropertyId} action={submitCreateRatePlan} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
