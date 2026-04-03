import Link from "next/link";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { getFrontDeskSnapshot } from "@/app/dashboard/front-desk/actions/checkin-actions";
import { getConciergeContext } from "@/app/dashboard/concierge/actions";
import { getNightAuditHistory } from "@/app/dashboard/night-audit/actions";
import { getCashierContext } from "@/app/dashboard/cashier/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const periods = [
  { value: "today", label: "Today" },
  { value: "previous", label: "Previous" },
  { value: "upcoming", label: "Upcoming" },
  { value: "all", label: "All" },
] as const;

type OperationPeriod = (typeof periods)[number]["value"];

type OperationItem = {
  time: string;
  title: string;
  zone: string;
  period: OperationPeriod;
  status: string;
  tone: string;
  date: Date;
};

function getGuestName(guestRaw: unknown) {
  if (!guestRaw) return "Unknown guest";
  if (Array.isArray(guestRaw)) {
    const guest = guestRaw[0] as { first_name?: string; last_name?: string } | undefined;
    return `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Unknown guest";
  }
  const guest = guestRaw as { first_name?: string; last_name?: string };
  return `${guest.first_name ?? ""} ${guest.last_name ?? ""}`.trim() || "Unknown guest";
}

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toTimeLabel(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toStartOfDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getOperationPeriod(date: Date, status: string): OperationPeriod {
  const now = new Date();
  const targetDay = toStartOfDay(date).getTime();
  const today = toStartOfDay(now).getTime();

  if (targetDay < today) return "previous";
  if (targetDay > today) return "upcoming";
  if (["completed", "closed", "posted"].includes(status)) return "previous";
  if (date.getTime() > now.getTime()) return "upcoming";
  return "today";
}

function getTone(zone: string, status: string) {
  if (status === "completed" || status === "closed" || status === "posted") {
    return "bg-zinc-50 border-zinc-200";
  }

  switch (zone) {
    case "Arrivals":
      return "bg-emerald-50 border-emerald-200";
    case "Departures":
      return "bg-sky-50 border-sky-200";
    case "Guest Services":
      return "bg-amber-50 border-amber-200";
    case "Cashier":
      return "bg-violet-50 border-violet-200";
    default:
      return "bg-orange-50 border-orange-200";
  }
}

function createTimedDate(baseDate: Date, hour: number, minute: number) {
  const value = new Date(baseDate);
  value.setHours(hour, minute, 0, 0);
  return value;
}

function createCalendarMarks(operations: OperationItem[], monthDate: Date) {
  const marks = new Map<number, Array<{ label: string; tone: string }>>();

  for (const item of operations) {
    if (item.date.getMonth() !== monthDate.getMonth() || item.date.getFullYear() !== monthDate.getFullYear()) {
      continue;
    }

    const day = item.date.getDate();
    const nextMark = {
      label: item.zone === "Guest Services" ? "Guest svc" : item.zone,
      tone: item.tone,
    };

    const existing = marks.get(day) ?? [];
    if (existing.length < 2 && !existing.some((entry) => entry.label === nextMark.label)) {
      marks.set(day, [...existing, nextMark]);
    }
  }

  return marks;
}

type DashboardPageProps = {
  searchParams?: Promise<{
    period?: string;
    zone?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const [frontDesk, concierge, nightAudit, cashier] = await Promise.all([
    getFrontDeskSnapshot(activePropertyId),
    getConciergeContext(activePropertyId),
    getNightAuditHistory(activePropertyId),
    getCashierContext(activePropertyId),
  ]);

  const today = new Date();
  const monthLabel = today.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const activeDate = today.getDate();
  const params = (await searchParams) ?? {};
  const activePeriod = readSearchValue(params.period) ?? "today";
  const activeZone = readSearchValue(params.zone) ?? "all";

  const arrivalsConfirmed = frontDesk.arrivals.filter((reservation) => reservation.status === "confirmed").length;
  const departuresPending = frontDesk.departures.length;
  const openRequests = concierge.requests.filter((request) => ["open", "assigned", "in_progress"].includes(request.status)).length;
  const highPriorityRequests = concierge.requests.filter((request) => ["high", "urgent"].includes(request.priority)).length;
  const latestAuditRun = nightAudit.runs[0] ?? null;
  const activeDrawerTotal = cashier.entries.reduce((total, entry) => {
    return total + (entry.entry_type === "cash_in" ? entry.amount_minor : -entry.amount_minor);
  }, 0);

  const focusLanes = [
    {
      label: "Arrivals Today",
      value: String(frontDesk.arrivals.length),
      hint: arrivalsConfirmed > 0 ? `${arrivalsConfirmed} confirmed arrivals` : "No confirmed arrivals yet",
    },
    {
      label: "Departures Today",
      value: String(frontDesk.departures.length),
      hint: departuresPending > 0 ? `${departuresPending} folios to settle` : "No departures queued",
    },
    {
      label: "In-House",
      value: String(frontDesk.inHouse.length),
      hint: frontDesk.inHouse.length > 0 ? `${frontDesk.inHouse.length} active stays` : "No checked-in guests",
    },
    {
      label: "Open Requests",
      value: String(openRequests),
      hint: highPriorityRequests > 0 ? `${highPriorityRequests} high priority` : "No urgent requests",
    },
  ];

  const operations: OperationItem[] = [
    ...frontDesk.arrivals.slice(0, 6).map((reservation, index) => {
      const scheduledAt = createTimedDate(today, 15 + Math.floor(index / 3), (index % 3) * 15);
      return {
        time: toTimeLabel(scheduledAt),
        title: `${getGuestName(reservation.guests)} arriving today`,
        zone: "Arrivals",
        period: getOperationPeriod(scheduledAt, "planned"),
        status: reservation.status === "tentative" ? "watch" : "planned",
        tone: getTone("Arrivals", reservation.status),
        date: scheduledAt,
      };
    }),
    ...frontDesk.departures.slice(0, 6).map((reservation, index) => {
      const scheduledAt = createTimedDate(today, 10 + Math.floor(index / 3), 15 + (index % 3) * 10);
      return {
        time: toTimeLabel(scheduledAt),
        title: `${getGuestName(reservation.guests)} departing today`,
        zone: "Departures",
        period: getOperationPeriod(scheduledAt, "planned"),
        status: "planned",
        tone: getTone("Departures", "planned"),
        date: scheduledAt,
      };
    }),
    ...concierge.requests.slice(0, 8).map((request) => {
      const createdAt = new Date(request.created_at);
      const status = request.status === "in_progress" ? "live" : request.status;
      return {
        time: toTimeLabel(createdAt),
        title: request.description,
        zone: "Guest Services",
        period: getOperationPeriod(createdAt, request.status),
        status,
        tone: getTone("Guest Services", request.status),
        date: createdAt,
      };
    }),
    ...nightAudit.runs.slice(0, 4).map((run) => {
      const createdAt = new Date(run.created_at);
      return {
        time: toTimeLabel(createdAt),
        title: `Night audit ${run.status} for ${run.business_date}`,
        zone: "Ops",
        period: getOperationPeriod(createdAt, run.status),
        status: run.status,
        tone: getTone("Ops", run.status),
        date: createdAt,
      };
    }),
    ...(cashier.activeShift
      ? [
          {
            time: toTimeLabel(new Date(cashier.activeShift.opened_at)),
            title: `Cashier shift live with ${cashier.entries.length} drawer movements`,
            zone: "Cashier",
            period: getOperationPeriod(new Date(cashier.activeShift.opened_at), "live"),
            status: "live",
            tone: getTone("Cashier", "live"),
            date: new Date(cashier.activeShift.opened_at),
          },
        ]
      : []),
    ...cashier.recentShifts.slice(0, 3).flatMap((shift) => {
      if (!shift.closed_at) return [];
      const closedAt = new Date(shift.closed_at);
      return [
        {
          time: toTimeLabel(closedAt),
          title: `Shift closed with ${(shift.closing_count_minor ?? 0) / 100} cash counted`,
          zone: "Cashier",
          period: getOperationPeriod(closedAt, "closed"),
          status: "closed",
          tone: getTone("Cashier", "closed"),
          date: closedAt,
        },
      ];
    }),
  ].sort((left, right) => right.date.getTime() - left.date.getTime());

  const calendarMarks = createCalendarMarks(operations, today);

  const zones = ["all", ...new Set(operations.map((item) => item.zone))];
  const filteredOperations = operations.filter((item) => {
    const periodMatch = activePeriod === "all" || item.period === activePeriod;
    const zoneMatch = activeZone === "all" || item.zone === activeZone;
    return periodMatch && zoneMatch;
  });

  return (
    <div className="page-shell">
      <div className="page-container">
        <section className="relative overflow-hidden rounded-3xl border border-orange-100 bg-white/80 p-6 shadow-sm backdrop-blur-sm md:p-8">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_15%,rgba(255,105,0,0.16),transparent_38%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-3">
              <Badge className="w-fit bg-[#fff1e6] text-[#c74f00]">Live Operations</Badge>
              <h1 data-display="true" className="text-4xl font-semibold leading-tight text-zinc-900 md:text-5xl">
                Calendar-first control for your entire property.
              </h1>
              <p className="max-w-2xl text-sm text-zinc-600 md:text-base">
                A unified view of arrivals, departures, room readiness, cashier flow, and guest service activity so each shift runs with fewer surprises.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm" className="bg-[#ff6900] text-white hover:bg-[#e55f00]">
                  <Link href="/dashboard/arrivals-departures">Open Arrivals Board</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="border-zinc-200 bg-white/80">
                  <Link href="/dashboard/messaging">Open Guest Inbox</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Shift Pulse</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">{monthLabel}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {latestAuditRun ? `Last audit ${latestAuditRun.status} on ${latestAuditRun.business_date}` : "No recent audit runs yet"}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
                {focusLanes.map((item) => (
                  <div key={item.label} className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-2">
                    <p className="text-xl font-semibold text-zinc-900">{item.value}</p>
                    <p className="text-[11px] leading-tight text-zinc-500">{item.label}</p>
                    <p className="mt-1 text-[10px] text-zinc-400">{item.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <Card className="overflow-hidden border-zinc-200/80 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base text-zinc-900">
                <span>Operations Calendar</span>
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{monthLabel}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                {days.map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, idx) => {
                  const dateValue = idx - 1;
                  const isCurrentMonth = dateValue > 0 && dateValue <= 31;
                  const isActive = dateValue === activeDate;
                  const dayMarks = isCurrentMonth ? calendarMarks.get(dateValue) ?? [] : [];

                  return (
                    <div
                      key={idx}
                      className={[
                        "min-h-20 rounded-xl border p-2 transition-colors",
                        isCurrentMonth ? "border-zinc-200 bg-white" : "border-zinc-100 bg-zinc-50/70",
                        isActive ? "border-[#ff6900] bg-[#fff4ec]" : "",
                      ].join(" ")}
                    >
                      <p className={isCurrentMonth ? "text-xs font-semibold text-zinc-700" : "text-xs text-zinc-400"}>
                        {isCurrentMonth ? dateValue : ""}
                      </p>
                      {dayMarks.map((mark) => (
                        <div key={`${dateValue}-${mark.label}`} className={`mt-1 rounded-md px-1.5 py-1 text-[10px] font-medium ${mark.tone}`}>
                          {mark.label}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-zinc-200/90 bg-[#fffaf6] p-4 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Today&apos;s Agenda</p>
                    <p className="mt-1 max-w-xl text-sm text-zinc-600">
                      Review live work, inspect previous operations, or scan what comes next without leaving the calendar view.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm" className="border-zinc-200 bg-white">
                      <Link href="/dashboard/concierge">Review concierge queue</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="border-zinc-200 bg-white">
                      <Link href="/dashboard/cashier">Inspect cashier activity</Link>
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-zinc-200/90 bg-white/70 p-3">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {periods.map((period) => {
                        const href = `/dashboard?period=${period.value}&zone=${encodeURIComponent(activeZone)}`;
                        const isActive = activePeriod === period.value;
                        return (
                          <Button
                            key={period.value}
                            asChild
                            size="sm"
                            variant={isActive ? "default" : "outline"}
                            className={isActive ? "bg-[#ff6900] text-white hover:bg-[#e55f00]" : "border-zinc-200 bg-white"}
                          >
                            <Link href={href}>{period.label}</Link>
                          </Button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {zones.map((zone) => {
                        const href = `/dashboard?period=${encodeURIComponent(activePeriod)}&zone=${encodeURIComponent(zone)}`;
                        const isActive = activeZone === zone;
                        return (
                          <Button
                            key={zone}
                            asChild
                            size="sm"
                            variant={isActive ? "secondary" : "ghost"}
                            className={isActive ? "bg-[#fff1e6] text-[#c74f00]" : "text-zinc-600 hover:bg-zinc-100"}
                          >
                            <Link href={href}>{zone === "all" ? "All Zones" : zone}</Link>
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {filteredOperations.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-sm text-zinc-500">
                      No operations match the selected filters.
                    </div>
                  ) : (
                    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {filteredOperations.map((item) => (
                        <li key={`${item.period}-${item.time}-${item.title}`} className={`rounded-2xl border p-3 ${item.tone}`}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold tracking-[0.12em] text-zinc-500">{item.time}</p>
                            <Badge variant="outline" className="border-zinc-300 bg-white/80 text-zinc-700">{item.zone}</Badge>
                          </div>
                          <p className="mt-3 text-sm font-medium leading-snug text-zinc-900">{item.title}</p>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">{item.period}</span>
                            <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                              {item.status}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white/80 px-4 py-3 text-sm text-zinc-600">
                    <span>{cashier.activeShift ? `Active drawer movement: ${(activeDrawerTotal / 100).toFixed(2)}` : "No active cashier shift"}</span>
                    <span>{latestAuditRun ? `Audit status: ${latestAuditRun.status}` : "Audit status unavailable"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
