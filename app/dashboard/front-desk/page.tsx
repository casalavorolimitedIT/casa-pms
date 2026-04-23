import { LegacyRouteAliasBanner } from "@/components/custom/legacy-route-alias-banner";

type FrontDeskPageProps = {
  searchParams?: Promise<{
    ok?: string | string[];
    error?: string | string[];
  }>;
};

export default async function FrontDeskPage({ searchParams }: FrontDeskPageProps) {
  await searchParams;
  return (
    <LegacyRouteAliasBanner
      aliasPath="/dashboard/front-desk"
      canonicalPath="/dashboard/stay-view"
      title="Front Desk moved to Stay View"
      description="This legacy entry is now an alias. Stay View is the canonical workflow for arrivals, departures, in-house operations, and room board actions."
    />
  );
}
