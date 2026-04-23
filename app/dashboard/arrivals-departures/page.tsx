import { LegacyRouteAliasBanner } from "@/components/custom/legacy-route-alias-banner";

// Arrivals & Departures merged into canonical Stay View page.
export default function ArrivalsDeparturesPage() {
  return (
    <LegacyRouteAliasBanner
      aliasPath="/dashboard/arrivals-departures"
      canonicalPath="/dashboard/stay-view"
      title="Arrivals & Departures moved to Stay View"
      description="This legacy board is now an alias. Stay View is the single operations board for arrival and departure execution."
    />
  );
}
