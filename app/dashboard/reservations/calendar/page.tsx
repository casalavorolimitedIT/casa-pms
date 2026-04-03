import Link from "next/link";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { getReservations } from "@/app/dashboard/reservations/actions/reservation-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";

const STATUS_TONE: Record<string, string> = {
  tentative: "bg-slate-100 text-slate-700",
  confirmed: "bg-blue-100 text-blue-700",
  checked_in: "bg-emerald-100 text-emerald-700",
  checked_out: "bg-muted text-muted-foreground",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-amber-100 text-amber-700",
};

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ReservationCalendarPageProps {
  searchParams: Promise<{ month?: string; status?: string }>;
}

function getGuestName(guestRaw: unknown) {
  const guest = Array.isArray(guestRaw)
    ? (guestRaw[0] as { first_name?: string; last_name?: string } | undefined)
    : (guestRaw as { first_name?: string; last_name?: string } | null);
  return `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Unknown guest";
}

function stayOverlapsDate(checkIn: string, checkOut: string, day: Date) {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);

  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  // A reservation is active on dates >= check-in and < check-out
  return inDate <= dayEnd && outDate > dayStart;
}

export default async function ReservationCalendarPage({ searchParams }: ReservationCalendarPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();

  const { month = "", status = "" } = await searchParams;

  if (!activePropertyId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Set DEMO_PROPERTY_ID in .env.local or add/select an active property in the header.
      </div>
    );
  }

  const focusedMonth = month
    ? parse(month, "yyyy-MM", new Date())
    : startOfMonth(new Date());
  const monthStart = startOfMonth(focusedMonth);
  const monthEnd = endOfMonth(focusedMonth);

  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);

  const { reservations } = await getReservations(
    activePropertyId,
    status ? { status } : undefined,
  );

  const days: Date[] = [];
  for (let day = gridStart; day <= gridEnd; day = addDays(day, 1)) {
    days.push(day);
  }

  const prevMonth = format(subMonths(focusedMonth, 1), "yyyy-MM");
  const nextMonth = format(addMonths(focusedMonth, 1), "yyyy-MM");

  const statusParams = status ? `&status=${encodeURIComponent(status)}` : "";

  const statusTabs = [
    { label: "All", value: "" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Checked In", value: "checked_in" },
    { label: "Tentative", value: "tentative" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Reservation Calendar</h1>
            <p className="page-subtitle">
              Visual occupancy view for {format(focusedMonth, "MMMM yyyy")}.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/reservations">List View</Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-3">
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/reservations/calendar?month=${prevMonth}${statusParams}`}>Previous</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/reservations/calendar?month=${format(new Date(), "yyyy-MM")}${statusParams}`}>Today</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/reservations/calendar?month=${nextMonth}${statusParams}`}>Next</Link>
            </Button>
          </div>
          <p className="text-sm font-medium text-zinc-700">{format(focusedMonth, "MMMM yyyy")}</p>
        </div>

        <div className="flex gap-1 flex-wrap">
          {statusTabs.map((tab) => (
            <Button
              key={tab.value}
              asChild
              variant={status === tab.value ? "default" : "outline"}
              size="sm"
            >
              <Link
                href={
                  tab.value
                    ? `/dashboard/reservations/calendar?month=${format(focusedMonth, "yyyy-MM")}&status=${tab.value}`
                    : `/dashboard/reservations/calendar?month=${format(focusedMonth, "yyyy-MM")}`
                }
              >
                {tab.label}
              </Link>
            </Button>
          ))}
        </div>

        <Card className="glass-panel overflow-hidden border-zinc-200">
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day) => {
                const inMonth = isSameMonth(day, focusedMonth);

                const dayReservations = reservations.filter((reservation) =>
                  stayOverlapsDate(reservation.check_in, reservation.check_out, day),
                );

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-32 border-b border-r border-zinc-100 p-2 align-top ${inMonth ? "bg-white" : "bg-zinc-50/70"}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                          isToday(day)
                            ? "bg-[#ff6900] text-white"
                            : inMonth
                              ? "text-zinc-700"
                              : "text-zinc-400"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      {dayReservations.length > 0 ? (
                        <Badge variant="outline" className="text-[10px] font-medium">
                          {dayReservations.length}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      {dayReservations.slice(0, 3).map((reservation) => {
                        const guestName = getGuestName(reservation.guests);
                        return (
                          <Link
                            key={`${day.toISOString()}-${reservation.id}`}
                            href={`/dashboard/reservations/${reservation.id}`}
                            className={`block truncate rounded px-2 py-1 text-xs font-medium ${STATUS_TONE[reservation.status] ?? "bg-zinc-100 text-zinc-700"}`}
                            title={`${guestName} (${reservation.status.replace("_", " ")})`}
                          >
                            {guestName}
                          </Link>
                        );
                      })}

                      {dayReservations.length > 3 ? (
                        <p className="px-1 text-[11px] text-zinc-500">
                          +{dayReservations.length - 3} more
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
