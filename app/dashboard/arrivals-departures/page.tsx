import Link from "next/link";
import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { getFrontDeskSnapshot } from "@/app/dashboard/front-desk/actions/checkin-actions";
import { preCheckInReservation, markReservationNoShow } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormStatusToast } from "@/components/custom/form-status-toast";

type ArrivalsDeparturesPageProps = {
  searchParams?: Promise<{
    ok?: string | string[];
    error?: string | string[];
  }>;
};

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getGuestName(
  guests:
    | { first_name?: string; last_name?: string }
    | Array<{ first_name?: string; last_name?: string }>
    | null,
) {
  const guest = Array.isArray(guests) ? guests[0] ?? null : guests;
  if (!guest) return "Unknown guest";
  return `${guest.first_name ?? ""} ${guest.last_name ?? ""}`.trim() || "Unknown guest";
}

export default async function ArrivalsDeparturesPage({ searchParams }: ArrivalsDeparturesPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const snapshot = await getFrontDeskSnapshot(activePropertyId);

  const preCheckInAction = async (reservationId: string) => {
    "use server";
    try {
      await preCheckInReservation(reservationId);
      redirect(`/dashboard/arrivals-departures?ok=${encodeURIComponent("Pre-check-in completed.")}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to complete pre-check-in.";
      redirect(`/dashboard/arrivals-departures?error=${encodeURIComponent(message)}`);
    }
  };

  const noShowAction = async (reservationId: string) => {
    "use server";
    try {
      await markReservationNoShow(reservationId);
      redirect(`/dashboard/arrivals-departures?ok=${encodeURIComponent("Reservation marked as no-show.")}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to mark reservation as no-show.";
      redirect(`/dashboard/arrivals-departures?error=${encodeURIComponent(message)}`);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-container">
      <FormStatusToast ok={ok} error={error} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Arrivals & Departures</h1>
          <p className="page-subtitle">Operational triage for today: pre-check-ins, check-ins, check-outs, and no-show handling.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/front-desk">Open Front Desk</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-600">Arrivals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-zinc-900">{snapshot.arrivals.length}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-600">Departures</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-zinc-900">{snapshot.departures.length}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-600">In House</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-zinc-900">{snapshot.inHouse.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base text-zinc-900">Arrivals Today</CardTitle>
          </CardHeader>
          <CardContent>
            {snapshot.arrivals.length === 0 ? (
              <p className="page-subtitle">No arrivals due today.</p>
            ) : (
              <ul className="space-y-3">
                {snapshot.arrivals.map((item) => (
                  <li key={item.id} className="rounded-lg border border-zinc-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-900">{getGuestName(item.guests)}</p>
                        <p className="text-xs text-zinc-500">Check-in: {new Date(item.check_in).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-700">{item.status.replace("_", " ")}</Badge>
                        <form action={preCheckInAction.bind(null, item.id)}>
                          <FormSubmitButton idleText="Pre-check-in" pendingText="Processing…" variant="outline" size="sm" />
                        </form>
                        <form action={noShowAction.bind(null, item.id)}>
                          <FormSubmitButton idleText="No-show" pendingText="Marking…" variant="destructive" size="sm" />
                        </form>
                        <Button asChild size="sm">
                          <Link href={`/dashboard/front-desk/check-in/${item.id}`}>Check in</Link>
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base text-zinc-900">Departures Today</CardTitle>
          </CardHeader>
          <CardContent>
            {snapshot.departures.length === 0 ? (
              <p className="page-subtitle">No departures due today.</p>
            ) : (
              <ul className="space-y-3">
                {snapshot.departures.map((item) => (
                  <li key={item.id} className="rounded-lg border border-zinc-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-900">{getGuestName(item.guests)}</p>
                        <p className="text-xs text-zinc-500">Check-out: {new Date(item.check_out).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-100 text-amber-800">{item.status.replace("_", " ")}</Badge>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/front-desk/check-out/${item.id}`}>Check out</Link>
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
