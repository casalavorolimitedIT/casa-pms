import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getFrontDeskSnapshot } from "./actions/checkin-actions";
import { EarlyLateModal } from "@/components/front-desk/early-late-modal";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { preCheckInReservation, markReservationNoShow } from "../arrivals-departures/actions";

type FrontDeskPageProps = {
  searchParams?: Promise<{
    ok?: string | string[];
    error?: string | string[];
  }>;
};

function readSearchValue(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function getGuestName(
  guests:
    | { first_name?: string; last_name?: string }
    | Array<{ first_name?: string; last_name?: string }>
    | null,
) {
  const g = Array.isArray(guests) ? guests[0] ?? null : guests;
  return `${g?.first_name ?? ""} ${g?.last_name ?? ""}`.trim() || "Unknown guest";
}

export default async function FrontDeskPage({ searchParams }: FrontDeskPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);

  if (!activePropertyId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Set DEMO_PROPERTY_ID in .env.local or add/select an active property in the header.
      </div>
    );
  }

  const snapshot = await getFrontDeskSnapshot(activePropertyId);

  const preCheckInAction = async (reservationId: string) => {
    "use server";
    try {
      await preCheckInReservation(reservationId);
      redirect(`/dashboard/front-desk?ok=${encodeURIComponent("Pre-check-in completed.")}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to complete pre-check-in.";
      redirect(`/dashboard/front-desk?error=${encodeURIComponent(message)}`);
    }
  };

  const noShowAction = async (reservationId: string) => {
    "use server";
    try {
      await markReservationNoShow(reservationId);
      redirect(`/dashboard/front-desk?ok=${encodeURIComponent("Reservation marked as no-show.")}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to mark as no-show.";
      redirect(`/dashboard/front-desk?error=${encodeURIComponent(message)}`);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="page-title">Front Desk</h1>
            <p className="page-subtitle">Arrivals, departures, and in-house — all operations in one place.</p>
          </div>
          <div className="flex items-center gap-2">
            <EarlyLateModal />
            <Button asChild size="sm">
              <Link href="/dashboard/front-desk/room-move">Room Move</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard title="Arrivals Today" value={snapshot.arrivals.length} tone="blue" />
          <MetricCard title="Departures Today" value={snapshot.departures.length} tone="amber" />
          <MetricCard title="In House" value={snapshot.inHouse.length} tone="emerald" />
        </div>

        {/* Arrivals */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-base">Arrivals Today</CardTitle>
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
                        <p className="text-xs text-zinc-500">
                          {new Date(item.check_in).toLocaleDateString("en-GB")} →{" "}
                          {new Date(item.check_out).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-700">{item.status.replace("_", " ")}</Badge>
                        <form action={preCheckInAction.bind(null, item.id)}>
                          <FormSubmitButton idleText="Pre-check-in" pendingText="…" variant="outline" size="sm" />
                        </form>
                        <form action={noShowAction.bind(null, item.id)}>
                          <FormSubmitButton idleText="No-show" pendingText="…" variant="destructive" size="sm" />
                        </form>
                        <Button asChild size="sm">
                          <Link href={`/dashboard/front-desk/check-in/${item.id}`}>Check in →</Link>
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Departures */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-base">Departures Today</CardTitle>
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
                        <p className="text-xs text-zinc-500">
                          Check-out: {new Date(item.check_out).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-100 text-amber-800">{item.status.replace("_", " ")}</Badge>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/front-desk/check-out/${item.id}`}>Check out →</Link>
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* In House */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-base">In House</CardTitle>
          </CardHeader>
          <CardContent>
            {snapshot.inHouse.length === 0 ? (
              <p className="page-subtitle">No guests currently in house.</p>
            ) : (
              <ul className="space-y-3">
                {snapshot.inHouse.map((item) => {
                  const nights = Math.ceil(
                    (new Date(item.check_out).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                  );
                  return (
                    <li key={item.id} className="rounded-lg border border-zinc-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-zinc-900">{getGuestName(item.guests)}</p>
                          <p className="text-xs text-zinc-500">
                            Checking out {new Date(item.check_out).toLocaleDateString("en-GB")} ·{" "}
                            {nights > 0 ? `${nights}n remaining` : "Due today"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-100 text-emerald-800">In house</Badge>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/front-desk/check-out/${item.id}`}>Check out</Link>
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "blue" | "amber" | "emerald";
}) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
  };
  return (
    <Card className={tones[tone]}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium opacity-80">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}
