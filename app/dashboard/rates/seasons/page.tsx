import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getSeasonView } from "../actions/rate-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RateCalendar, type RateCalendarRow } from "@/components/rates/rate-calendar";
import { getActivePropertyId } from "@/lib/pms/property-context";

export default async function RateSeasonsPage() {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  if (!activePropertyId) return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or add/select an active property in the header.</div>;

  const { rows } = await getSeasonView(activePropertyId);

  return (
    <div className="min-h-full bg-zinc-50/60 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Seasonal Calendar</h1>
          <p className="text-sm text-zinc-500">Consolidated view of date-range restrictions and overrides.</p>
        </div>

        <Card className="border-zinc-200 bg-white shadow-sm">
          <CardHeader><CardTitle className="text-base">Season Rules</CardTitle></CardHeader>
          <CardContent>
            <RateCalendar rows={rows as RateCalendarRow[]} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
