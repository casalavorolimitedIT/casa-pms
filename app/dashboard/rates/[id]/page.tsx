import Link from "next/link";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { addRateRestriction, getRatePlanDetail } from "../actions/rate-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RestrictionForm } from "@/components/rates/restriction-form";
import { formatCurrencyMinor } from "@/lib/pms/formatting";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RatePlanDetailPage({ params }: PageProps) {
  await redirectIfNotAuthenticated();
  const { id } = await params;
  const result = await getRatePlanDetail(id);

  if ("error" in result || !result.plan) {
    return <div className="p-6 text-sm text-muted-foreground">Rate plan not found.</div>;
  }

  const { plan, roomTypes, restrictions } = result;

  return (
    <div className="min-h-full bg-zinc-50/60 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{plan.name}</h1>
            <p className="text-sm text-zinc-500">Currency: {plan.currency_code}</p>
          </div>
          <Button asChild size="sm" variant="outline"><Link href="/dashboard/rates">Back</Link></Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card className="border-zinc-200 bg-white shadow-sm">
            <CardHeader><CardTitle className="text-base">Seasonal Restrictions</CardTitle></CardHeader>
            <CardContent>
              {restrictions.length === 0 ? (
                <p className="text-sm text-zinc-500">No restrictions added yet.</p>
              ) : (
                <div className="space-y-2">
                  {restrictions.map((r) => {
                    const roomType = roomTypes.find((rt) => rt.id === r.room_type_id);
                    return (
                      <div key={r.id} className="rounded-lg border border-zinc-200 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-zinc-900">{roomType?.name ?? "Room Type"}</p>
                          <p className="font-semibold text-zinc-900">{formatCurrencyMinor(r.rate_minor, plan.currency_code)}</p>
                        </div>
                        <p className="text-zinc-500">
                          {new Date(r.date_from).toLocaleDateString()} - {new Date(r.date_to).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Min stay: {r.min_stay ?? "-"} | Max stay: {r.max_stay ?? "-"} | CTA: {r.closed_to_arrival ? "Yes" : "No"} | CTD: {r.closed_to_departure ? "Yes" : "No"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-200 bg-white shadow-sm">
            <CardHeader><CardTitle className="text-base">Add Restriction</CardTitle></CardHeader>
            <CardContent>
              <RestrictionForm
                ratePlanId={plan.id}
                roomTypes={roomTypes.map((r) => ({ id: r.id, name: r.name }))}
                action={addRateRestriction}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
