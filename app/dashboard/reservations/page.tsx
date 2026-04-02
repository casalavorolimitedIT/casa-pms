import { getReservations } from "./actions/reservation-actions";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { getActivePropertyId } from "@/lib/pms/property-context";

const STATUS_TONE: Record<string, string> = {
  tentative: "bg-slate-100 text-slate-700",
  confirmed: "bg-blue-100 text-blue-700",
  checked_in: "bg-emerald-100 text-emerald-700",
  checked_out: "bg-muted text-muted-foreground",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-amber-100 text-amber-700",
};

interface ReservationsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function ReservationsPage({
  searchParams,
}: ReservationsPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();

  const { status = "" } = await searchParams;

  if (!activePropertyId) {
    return (
      <div className="p-6 text-muted-foreground text-sm">
        Set <code>DEMO_PROPERTY_ID</code> in .env.local or add/select an active property in the header.
      </div>
    );
  }

  const { reservations } = await getReservations(
    activePropertyId,
    status ? { status } : undefined,
  );

  const STATUS_TABS = [
    { label: "All", value: "" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Checked In", value: "checked_in" },
    { label: "Tentative", value: "tentative" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Reservations
          </h1>
          <p className="text-sm text-muted-foreground">
            {reservations.length} reservation
            {reservations.length !== 1 ? "s" : ""}
            {status ? ` · ${status}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/reservations/calendar">Calendar View</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard/reservations/new">New Reservation</Link>
          </Button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            asChild
            variant={status === tab.value ? "default" : "outline"}
            size="sm"
          >
            <Link
              href={
                tab.value
                  ? `/dashboard/reservations?status=${tab.value}`
                  : "/dashboard/reservations"
              }
            >
              {tab.label}
            </Link>
          </Button>
        ))}
      </div>

      {/* Reservations list */}
      {reservations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-muted-foreground">No reservations found.</p>
            <Button asChild size="sm">
              <Link href="/dashboard/reservations/new">
                Create first reservation
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Guest</th>
                <th className="px-4 py-3 text-left font-medium">Dates</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">
                  Room
                </th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">
                  Nights
                </th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reservations.map((res) => {
                const guest = res.guests as {
                  first_name: string;
                  last_name: string;
                  email: string | null;
                } | null;
                const rooms = (
                  res.reservation_rooms as Array<{
                    rooms: { room_number: string } | null;
                    room_types: { name: string } | null;
                  }>
                )[0];
                const nights = differenceInCalendarDays(
                  new Date(res.check_out),
                  new Date(res.check_in),
                );

                return (
                  <tr
                    key={res.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {guest?.first_name} {guest?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        {guest?.email ?? ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{new Date(res.check_in).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">
                        → {new Date(res.check_out).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {rooms?.rooms?.room_number ? (
                        <span className="font-medium">
                          {rooms.rooms.room_number}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {rooms?.room_types?.name ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {nights} night{nights !== 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={`text-xs font-medium px-1.5 py-0 ${STATUS_TONE[res.status] ?? ""}`}
                      >
                        {res.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/reservations/${res.id}`}>
                          View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
