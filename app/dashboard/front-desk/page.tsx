import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getFrontDeskSnapshot } from "./actions/checkin-actions";
import { EarlyLateModal } from "@/components/front-desk/early-late-modal";
import { getActivePropertyId } from "@/lib/pms/property-context";

export default async function FrontDeskPage() {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or add/select an active property in the header.</div>;
  }

  const snapshot = await getFrontDeskSnapshot(activePropertyId);

  return (
    <div className="min-h-full bg-zinc-50/60 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Front Desk Command Center</h1>
            <p className="text-sm text-zinc-500">Arrivals, departures, and in-house operations in one view.</p>
          </div>
          <div className="flex items-center gap-2">
            <EarlyLateModal />
            <Button asChild size="sm"><Link href="/dashboard/front-desk/room-move">Room Move</Link></Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard title="Arrivals Today" value={snapshot.arrivals.length} />
          <MetricCard title="Departures Today" value={snapshot.departures.length} />
          <MetricCard title="In House" value={snapshot.inHouse.length} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ReservationList
            title="Arrivals"
            empty="No arrivals due today."
            items={snapshot.arrivals}
            actionLabel="Check in"
            actionHref={(id) => `/dashboard/front-desk/check-in/${id}`}
            tone="blue"
          />
          <ReservationList
            title="Departures"
            empty="No departures due today."
            items={snapshot.departures}
            actionLabel="Check out"
            actionHref={(id) => `/dashboard/front-desk/check-out/${id}`}
            tone="amber"
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Card className="border-zinc-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-zinc-900">{value}</div>
      </CardContent>
    </Card>
  );
}

function ReservationList({
  title,
  empty,
  items,
  actionLabel,
  actionHref,
  tone,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; status: string; check_in: string; check_out: string; guests: { first_name: string; last_name: string } | null }>;
  actionLabel: string;
  actionHref: (id: string) => string;
  tone: "blue" | "amber";
}) {
  const toneClass = tone === "blue" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-800";

  return (
    <Card className="border-zinc-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-zinc-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">{empty}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border border-zinc-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-900">{item.guests?.first_name} {item.guests?.last_name}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(item.check_in).toLocaleDateString()} - {new Date(item.check_out).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={toneClass}>{item.status.replace("_", " ")}</Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link href={actionHref(item.id)}>{actionLabel}</Link>
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
