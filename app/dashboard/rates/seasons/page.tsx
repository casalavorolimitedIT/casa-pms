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
    <div className="page-shell">
      <div className="page-container">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900 md:text-4xl">Seasonal Calendar</h1>
          <p className="page-subtitle">Consolidated view of date-range restrictions and overrides.</p>
        </div>

        <Card className="glass-panel">
          <CardHeader><CardTitle className="text-base">Season Rules</CardTitle></CardHeader>
          <CardContent>
            <RateCalendar rows={rows as RateCalendarRow[]} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
