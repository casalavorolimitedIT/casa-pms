import Link from "next/link";
import {

  addMonths,
  format,
  parse,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  getReservationFormOptions,
  getReservationCalendarRooms,
  getReservations,
} from "@/app/dashboard/reservations/actions/reservation-actions";
import { getRoomBlocks } from "@/app/dashboard/reservations/actions/room-block-actions";
import { Button } from "@/components/ui/button";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { ReservationCalendarDnd } from "./reservation-calendar-dnd";

interface ReservationCalendarPageProps {
  searchParams: Promise<{ month?: string; status?: string }>;
}

function getGuestName(guestRaw: unknown) {
  const guest = Array.isArray(guestRaw)
    ? (guestRaw[0] as { first_name?: string; last_name?: string } | undefined)
    : (guestRaw as { first_name?: string; last_name?: string } | null);
  return `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Unknown guest";
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

  const rangeStart = format(focusedMonth, "yyyy-MM-01");
  const rangeEnd = format(addMonths(focusedMonth, 1), "yyyy-MM-01");

  const [{ reservations }, { rooms }, formOptions, calendarBlocks] = await Promise.all([
    getReservations(activePropertyId, status ? { status } : undefined),
    getReservationCalendarRooms(activePropertyId),
    getReservationFormOptions(activePropertyId),
    getRoomBlocks(activePropertyId, rangeStart, rangeEnd),
  ]);

  const calendarRooms = rooms.map((room) => {
    const roomTypeRaw = room.room_types as { name?: string } | Array<{ name?: string }> | null;
    const roomType = Array.isArray(roomTypeRaw) ? roomTypeRaw[0] : roomTypeRaw;
    return {
      id: room.id,
      roomNumber: room.room_number,
      status: room.status,
      roomTypeId: room.room_type_id,
      roomTypeName: roomType?.name ?? "Room",
    };
  });

  const guestOptions = formOptions.guests.map((guest) => ({
    value: guest.id,
    label: `${guest.first_name} ${guest.last_name}${guest.email ? ` · ${guest.email}` : ""}`,
  }));

  const roomTypeOptions = formOptions.roomTypes.map((roomType) => ({
    value: roomType.id,
    label: `${roomType.name} · max ${roomType.max_occupancy}`,
  }));

  const roomOptions = formOptions.rooms.map((room) => ({
    value: room.id,
    label: `${room.room_number} · ${room.status}`,
    status: room.status,
  }));

  const ratePlanOptions = formOptions.ratePlans.map((plan) => ({
    value: plan.id,
    label: plan.name,
  }));

  const calendarReservations = reservations.map((reservation) => {
    const assignmentRaw = reservation.reservation_rooms as
      | { room_id?: string | null; room_type_id?: string | null; rooms?: { room_number?: string } | Array<{ room_number?: string }> | null; room_types?: { name?: string } | Array<{ name?: string }> | null }
      | Array<{ room_id?: string | null; room_type_id?: string | null; rooms?: { room_number?: string } | Array<{ room_number?: string }> | null; room_types?: { name?: string } | Array<{ name?: string }> | null }>
      | null;
    const assignment = Array.isArray(assignmentRaw) ? assignmentRaw[0] : assignmentRaw;
    const roomRaw = assignment?.rooms;
    const room = Array.isArray(roomRaw) ? roomRaw[0] : roomRaw;
    const roomTypeRaw = assignment?.room_types;
    const roomType = Array.isArray(roomTypeRaw) ? roomTypeRaw[0] : roomTypeRaw;

    return {
    id: reservation.id,
    status: reservation.status,
    check_in: reservation.check_in,
    check_out: reservation.check_out,
    guestName: getGuestName(reservation.guests),
    roomId: assignment?.room_id ?? null,
    roomTypeId: assignment?.room_type_id ?? null,
    roomNumber: room?.room_number ?? null,
    roomTypeName: roomType?.name ?? null,
  };
  });

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
    <div className="page-">
      <div className="page-container min-w-0 overflow-x-hidden">
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

        <div className="min-w-0 overflow-hidden">
          <ReservationCalendarDnd
            activePropertyId={activePropertyId}
            reservations={calendarReservations}
            monthIso={format(focusedMonth, "yyyy-MM")}
            guestOptions={guestOptions}
            ratePlanOptions={ratePlanOptions}
            roomOptions={roomOptions}
            rooms={calendarRooms}
            roomTypeOptions={roomTypeOptions}
            blocks={calendarBlocks}
          />
        </div>
      </div>
    </div>
  );
}
