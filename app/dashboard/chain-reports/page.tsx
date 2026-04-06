import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { createClient } from "@/lib/supabase/server";
import { getScopedPropertiesForCurrentUser } from "@/lib/pms/property-scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChainComparisonTable } from "@/components/reports/chain-comparison-table";
import { ExportControls } from "@/components/reports/export-controls";
import { getChainComparisonReport } from "@/lib/pms/reports/chain";

type PageProps = {
  searchParams?: Promise<{ from?: string | string[]; to?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getDateRangeDefaults() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

export default async function ChainReportsPage({ searchParams }: PageProps) {
  await redirectIfNotAuthenticated();

  const activePropertyId = await getActivePropertyId();
  if (!activePropertyId) return <div className="p-6 text-sm text-muted-foreground">Select an active property first.</div>;

  const canView = await hasPermission(activePropertyId, "reports.view");
  if (!canView) {
    redirect("/dashboard?error=You%20do%20not%20have%20access%20to%20chain%20reports");
  }

  const query = (await searchParams) ?? {};
  const defaults = getDateRangeDefaults();
  const from = first(query.from) ?? defaults.from;
  const to = first(query.to) ?? defaults.to;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <div className="p-6 text-sm text-muted-foreground">Sign in to view chain reports.</div>;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  const organizationId = profile?.organization_id;
  if (!organizationId) {
    return <div className="p-6 text-sm text-muted-foreground">No organization found for this account.</div>;
  }

  const scoped = await getScopedPropertiesForCurrentUser();
  const reportPropertyIds: string[] = [];
  for (const property of scoped.properties) {
    if (await hasPermission(property.id, "reports.view")) {
      reportPropertyIds.push(property.id);
    }
  }

  if (reportPropertyIds.length === 0) {
    return <div className="p-6 text-sm text-muted-foreground">No properties available for chain report visibility.</div>;
  }

  const { rows } = await getChainComparisonReport({
    organizationId,
    dateFrom: from,
    dateTo: to,
    propertyIds: reportPropertyIds,
  });

  const exportRows = rows.map((row) => ({
    property: row.propertyName,
    reservations: row.reservations,
    occupancy_pct: Number(row.occupancyPct.toFixed(2)),
    revenue_minor: row.revenueMinor,
  }));

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="space-y-1">
          <h1 className="page-title">Chain Reports</h1>
          <p className="page-subtitle">Consolidated occupancy and revenue comparison across properties.</p>
        </div>

        <Card className="glass-panel mt-6">
          <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
          <CardContent>
            <form method="GET" className="grid gap-3 md:grid-cols-3 md:items-end">
              <div className="grid gap-2">
                <Label htmlFor="from">From</Label>
                <Input id="from" name="from" type="date" defaultValue={from} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="to">To</Label>
                <Input id="to" name="to" type="date" defaultValue={to} />
              </div>
              <button type="submit" className="h-10 rounded-md bg-[#ff6900] px-4 text-sm font-medium text-white hover:bg-[#e55f00]">
                Apply
              </button>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-panel mt-6">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Property Comparison</CardTitle>
            <ExportControls rows={exportRows} filename={`chain-reports-${from}-to-${to}.csv`} />
          </CardHeader>
          <CardContent>
            <ChainComparisonTable rows={rows} currencyCode="USD" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
