"use client";

import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  assignBestFitRoomOnCalendar,
  moveReservationOnCalendar,
  updateReservationStatus,
} from "@/app/dashboard/reservations/actions/reservation-actions";
import {
  createRoomBlock,
  deleteRoomBlock,
} from "@/app/dashboard/reservations/actions/room-block-actions";
import { appToast } from "@/components/custom/toast-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { FormComboboxOption } from "@/components/ui/form-combobox-field";
import { ReservationCalendarBookingModal } from "./reservation-calendar-booking-modal";

const STATUS_TONE: Record<string, string> = {
  tentative: "bg-slate-100 text-slate-700",
  confirmed: "bg-blue-100 text-blue-700",
  checked_in: "bg-emerald-100 text-emerald-700",
  checked_out: "bg-muted text-muted-foreground",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-amber-100 text-amber-700",
};

const DAY_WIDTH = 52;
const BAR_HEIGHT = 30;
const BAR_GAP = 6;
const LANE_HEADER_WIDTH = 184;

type CalendarReservation = {
  id: string;
  status: string;
  check_in: string;
  check_out: string;
  guestName: string;
  roomId: string | null;
  roomTypeId: string | null;
  roomNumber: string | null;
  roomTypeName: string | null;
};

type CalendarRoom = {
  id: string;
  roomNumber: string;
  status: string;
  roomTypeId: string;
  roomTypeName: string;
};

type Lane = {
  id: string;
  name: string;
  subtitle: string;
};

type Placement = {
  id: string;
  left: number;
  width: number;
  level: number;
  laneId: string;
};

type ResizeState = {
  reservationId: string;
  edge: "start" | "end";
  startClientX: number;
  originalCheckIn: string;
  originalCheckOut: string;
  roomId: string | null;
};

type DropTarget = {
  laneId: string;
  dayIso: string;
};

type CalendarBlock = {
  id: string;
  roomId: string;
  startDate: string;
  endDate: string;
  reason: string;
};

type BlockDraft = {
  roomId: string;
  anchorDayIso: string;
  startDayIso: string;
  endDayIso: string;
};

type RenderItem =
  | { kind: "type-header"; typeId: string; typeName: string; count: number }
  | { kind: "lane"; lane: Lane; roomStatus?: string };

interface ReservationCalendarDndProps {
  activePropertyId: string;
  reservations: CalendarReservation[];
  monthIso: string;
  guestOptions: FormComboboxOption[];
  ratePlanOptions: FormComboboxOption[];
  roomOptions: Array<FormComboboxOption & { status: string }>;
  rooms: CalendarRoom[];
  roomTypeOptions: FormComboboxOption[];
  blocks: CalendarBlock[];
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && aEnd > bStart;
}

function formatCompact(dateIso: string) {
  return format(parseISO(`${dateIso}T00:00:00Z`), "MMM d");
}

function canDrag(status: string) {
  return !["checked_out", "cancelled", "no_show"].includes(status);
}

export function ReservationCalendarDnd({
  activePropertyId,
  reservations,
  monthIso,
  guestOptions,
  ratePlanOptions,
  roomOptions,
  rooms,
  roomTypeOptions,
  blocks,
}: ReservationCalendarDndProps) {
  const router = useRouter();
  const [items, setItems] = useState(reservations);
  const [draggingReservationId, setDraggingReservationId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [quickActionsReservationId, setQuickActionsReservationId] = useState<string | null>(null);
  const [bookingModal, setBookingModal] = useState<{
    open: boolean;
    checkIn: string;
    checkOut: string;
    roomId: string;
    roomTypeId: string;
  }>({
    open: false,
    checkIn: "",
    checkOut: "",
    roomId: "",
    roomTypeId: "",
  });
  const itemsRef = useRef(items);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const [hoverCard, setHoverCard] = useState<{ id: string; rect: DOMRect } | null>(null);
  const [localBlocks, setLocalBlocks] = useState<CalendarBlock[]>(() => blocks);
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null);
  const [pendingBlock, setPendingBlock] = useState<{ roomId: string; startDate: string; endDate: string } | null>(null);
  const [pendingBlockReason, setPendingBlockReason] = useState("Maintenance");
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    setItems(reservations);
  }, [reservations]);

  const focusedMonth = useMemo(() => startOfMonth(parseISO(`${monthIso}-01`)), [monthIso]);
  const visibleStart = startOfWeek(startOfMonth(focusedMonth));
  const visibleEnd = endOfWeek(endOfMonth(focusedMonth));

  const lanes = useMemo<Lane[]>(() => {
    const roomLanes = rooms.map((room) => ({
      id: room.id,
      name: room.roomNumber,
      subtitle: room.roomTypeName,
    }));
    return [
      {
        id: "unassigned",
        name: "Unassigned",
        subtitle: "No room allocated",
      },
      ...roomLanes,
    ];
  }, [rooms]);

  const days = useMemo(() => {
    const values: Date[] = [];
    for (let day = visibleStart; day <= visibleEnd; day = addDays(day, 1)) {
      values.push(day);
    }
    return values;
  }, [visibleEnd, visibleStart]);

  const totalTimelineWidth = days.length * DAY_WIDTH;

  const timelinePlacements = useMemo(() => {
    const visibleStartIso = format(visibleStart, "yyyy-MM-dd");
    const visibleEndExclusive = addDays(visibleEnd, 1);
    const visibleEndExclusiveIso = format(visibleEndExclusive, "yyyy-MM-dd");

    const byLane = new Map<string, CalendarReservation[]>();
    for (const lane of lanes) {
      byLane.set(lane.id, []);
    }

    for (const reservation of items) {
      if (!overlaps(reservation.check_in, reservation.check_out, visibleStartIso, visibleEndExclusiveIso)) {
        continue;
      }
      const laneId = reservation.roomId ?? "unassigned";
      if (!byLane.has(laneId)) {
        byLane.set("unassigned", [...(byLane.get("unassigned") ?? []), reservation]);
        continue;
      }
      byLane.set(laneId, [...(byLane.get(laneId) ?? []), reservation]);
    }

    const placementByLane = new Map<string, Placement[]>();
    const laneHeights = new Map<string, number>();

    for (const lane of lanes) {
      const laneReservations = (byLane.get(lane.id) ?? []).sort((a, b) => {
        if (a.check_in !== b.check_in) return a.check_in.localeCompare(b.check_in);
        return a.check_out.localeCompare(b.check_out);
      });

      const levelEnds: string[] = [];
      const placements: Placement[] = [];

      for (const reservation of laneReservations) {
        const clampStartIso =
          reservation.check_in < visibleStartIso ? visibleStartIso : reservation.check_in;
        const clampEndIso =
          reservation.check_out > visibleEndExclusiveIso
            ? visibleEndExclusiveIso
            : reservation.check_out;

        const left =
          differenceInCalendarDays(parseISO(clampStartIso), visibleStart) * DAY_WIDTH;
        const nightsVisible = Math.max(
          1,
          differenceInCalendarDays(parseISO(clampEndIso), parseISO(clampStartIso)),
        );
        const width = nightsVisible * DAY_WIDTH;

        let level = 0;
        for (; level < levelEnds.length; level += 1) {
          if (levelEnds[level] <= reservation.check_in) break;
        }

        if (level === levelEnds.length) {
          levelEnds.push(reservation.check_out);
        } else {
          levelEnds[level] = reservation.check_out;
        }

        placements.push({
          id: reservation.id,
          left,
          width,
          level,
          laneId: lane.id,
        });
      }

      placementByLane.set(lane.id, placements);
      laneHeights.set(
        lane.id,
        Math.max(56, placements.reduce((max, p) => Math.max(max, p.level + 1), 1) * (BAR_HEIGHT + BAR_GAP) + 14),
      );
    }

    return { placementByLane, laneHeights };
  }, [items, lanes, visibleEnd, visibleStart]);

  const occupancyByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const day of days) {
      const dayIso = format(day, "yyyy-MM-dd");
      const nextDayIso = format(addDays(day, 1), "yyyy-MM-dd");
      let count = 0;
      for (const item of items) {
        if (
          item.roomId &&
          item.check_in < nextDayIso &&
          item.check_out > dayIso &&
          !["cancelled", "checked_out", "no_show"].includes(item.status)
        ) {
          count++;
        }
      }
      map.set(dayIso, count);
    }
    return { map, totalRooms: rooms.length };
  }, [days, items, rooms.length]);

  const groupedRooms = useMemo(() => {
    const groups = new Map<string, { typeName: string; roomList: CalendarRoom[] }>();
    for (const room of rooms) {
      const entry = groups.get(room.roomTypeId);
      if (entry) { entry.roomList.push(room); }
      else { groups.set(room.roomTypeId, { typeName: room.roomTypeName, roomList: [room] }); }
    }
    return Array.from(groups.entries()).map(([typeId, { typeName, roomList }]) => ({ typeId, typeName, roomList }));
  }, [rooms]);

  const renderItems = useMemo<RenderItem[]>(() => {
    const result: RenderItem[] = [{ kind: "lane", lane: lanes[0] }];
    for (const { typeId, typeName, roomList } of groupedRooms) {
      result.push({ kind: "type-header", typeId, typeName, count: roomList.length });
      if (!collapsedTypes.has(typeId)) {
        for (const room of roomList) {
          const lane = lanes.find((l) => l.id === room.id);
          if (lane) result.push({ kind: "lane", lane, roomStatus: room.status });
        }
      }
    }
    return result;
  }, [lanes, groupedRooms, collapsedTypes]);

  const persistCalendarChange = useCallback(async ({
    reservationId,
    newCheckIn,
    newCheckOut,
    newRoomId,
    rollback,
    successMessage,
  }: {
    reservationId: string;
    newCheckIn: string;
    newCheckOut: string;
    newRoomId?: string | null;
    rollback: () => void;
    successMessage: string;
  }) => {
    const result = await moveReservationOnCalendar({
      reservationId,
      newCheckIn,
      newCheckOut,
      newRoomId,
    });

    if (result?.error) {
      rollback();
      appToast.error("Unable to update reservation", { description: result.error });
      return;
    }

    appToast.success(successMessage);
    router.refresh();
  }, [router]);

  const selectedReservation = useMemo(
    () => items.find((reservation) => reservation.id === selectedReservationId) ?? null,
    [items, selectedReservationId],
  );

  const quickActionsReservation = useMemo(
    () => items.find((reservation) => reservation.id === quickActionsReservationId) ?? null,
    [items, quickActionsReservationId],
  );

  function openBookingModal(dayIso: string, laneId: string) {
    const lane = rooms.find((room) => room.id === laneId);
    const nextDay = format(addDays(parseISO(`${dayIso}T00:00:00Z`), 1), "yyyy-MM-dd");
    setBookingModal({
      open: true,
      checkIn: dayIso,
      checkOut: nextDay,
      roomId: laneId === "unassigned" ? "" : laneId,
      roomTypeId: lane?.roomTypeId ?? "",
    });
  }

  const runQuickMutation = useCallback(async (nextReservation: CalendarReservation, successMessage: string) => {
    const current = itemsRef.current.find((reservation) => reservation.id === nextReservation.id);
    if (!current) return;

    setItems((prev) =>
      prev.map((reservation) => (reservation.id === nextReservation.id ? nextReservation : reservation)),
    );

    await persistCalendarChange({
      reservationId: nextReservation.id,
      newCheckIn: nextReservation.check_in,
      newCheckOut: nextReservation.check_out,
      newRoomId: nextReservation.roomId,
      rollback: () => {
        setItems((prev) =>
          prev.map((reservation) => (reservation.id === current.id ? current : reservation)),
        );
      },
      successMessage,
    });
  }, [persistCalendarChange]);

  const handleAssignBestFit = useCallback(async (reservationId: string) => {
    const current = itemsRef.current.find((reservation) => reservation.id === reservationId);
    if (!current) return;

    const result = await assignBestFitRoomOnCalendar({ reservationId });
    if (result?.error) {
      appToast.error("Unable to auto-assign room", { description: result.error });
      return;
    }

    setItems((prev) =>
      prev.map((reservation) =>
        reservation.id === reservationId
          ? { ...reservation, roomId: result.roomId ?? null, roomNumber: result.roomNumber ?? null }
          : reservation,
      ),
    );
    appToast.success(`Assigned room ${result.roomNumber}.`);
    router.refresh();
  }, [router]);

  const handleStatusChange = useCallback(async (reservationId: string, newStatus: string) => {
    const formData = new FormData();
    formData.set("reservationId", reservationId);
    formData.set("status", newStatus);
    const result = await updateReservationStatus(formData);
    if (result?.error) {
      appToast.error("Unable to update status", { description: result.error });
      return;
    }
    setItems((prev) =>
      prev.map((r) => (r.id === reservationId ? { ...r, status: newStatus } : r)),
    );
    appToast.success(`Status updated to ${newStatus.replace(/_/g, " ")}.`);
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!selectedReservation || bookingModal.open || quickActionsReservationId || resizing || pendingBlock || blockDraft) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        const nextCheckIn = format(addDays(parseISO(`${selectedReservation.check_in}T00:00:00Z`), 1), "yyyy-MM-dd");
        const nextCheckOut = format(addDays(parseISO(`${selectedReservation.check_out}T00:00:00Z`), 1), "yyyy-MM-dd");
        void runQuickMutation({ ...selectedReservation, check_in: nextCheckIn, check_out: nextCheckOut }, "Reservation moved one day.");
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        const nextCheckIn = format(addDays(parseISO(`${selectedReservation.check_in}T00:00:00Z`), -1), "yyyy-MM-dd");
        const nextCheckOut = format(addDays(parseISO(`${selectedReservation.check_out}T00:00:00Z`), -1), "yyyy-MM-dd");
        void runQuickMutation({ ...selectedReservation, check_in: nextCheckIn, check_out: nextCheckOut }, "Reservation moved one day.");
      }

      if (event.key === "]") {
        event.preventDefault();
        const nextCheckOut = format(addDays(parseISO(`${selectedReservation.check_out}T00:00:00Z`), 1), "yyyy-MM-dd");
        void runQuickMutation({ ...selectedReservation, check_out: nextCheckOut }, "Reservation extended by one night.");
      }

      if (event.key === "[") {
        event.preventDefault();
        const stayNights = differenceInCalendarDays(parseISO(selectedReservation.check_out), parseISO(selectedReservation.check_in));
        if (stayNights <= 1) return;
        const nextCheckOut = format(addDays(parseISO(`${selectedReservation.check_out}T00:00:00Z`), -1), "yyyy-MM-dd");
        void runQuickMutation({ ...selectedReservation, check_out: nextCheckOut }, "Reservation shortened by one night.");
      }

      if (event.key.toLowerCase() === "u") {
        event.preventDefault();
        void runQuickMutation({ ...selectedReservation, roomId: null, roomNumber: null }, "Room unassigned.");
      }

      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        void handleAssignBestFit(selectedReservation.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [blockDraft, bookingModal.open, handleAssignBestFit, pendingBlock, quickActionsReservationId, resizing, runQuickMutation, selectedReservation]);

  async function handleDrop(targetLaneId: string, targetDayIso: string) {
    if (!draggingReservationId) return;

    const current = itemsRef.current.find((reservation) => reservation.id === draggingReservationId);
    if (!current) return;

    const stayLength = Math.max(
      1,
      differenceInCalendarDays(parseISO(current.check_out), parseISO(current.check_in)),
    );

    const nextCheckIn = targetDayIso;
    const nextCheckOut = format(addDays(parseISO(`${targetDayIso}T00:00:00Z`), stayLength), "yyyy-MM-dd");
    const nextRoomId = targetLaneId === "unassigned" ? null : targetLaneId;

    const unchanged =
      current.check_in === nextCheckIn &&
      current.check_out === nextCheckOut &&
      (current.roomId ?? null) === nextRoomId;

    if (unchanged) {
      setDraggingReservationId(null);
      setDropTarget(null);
      return;
    }

    setItems((prev) =>
      prev.map((reservation) =>
        reservation.id === current.id
          ? {
              ...reservation,
              check_in: nextCheckIn,
              check_out: nextCheckOut,
              roomId: nextRoomId,
            }
          : reservation,
      ),
    );

    await persistCalendarChange({
      reservationId: current.id,
      newCheckIn: nextCheckIn,
      newCheckOut: nextCheckOut,
      newRoomId: nextRoomId,
      rollback: () => {
        setItems((prev) =>
          prev.map((reservation) =>
            reservation.id === current.id
              ? {
                  ...reservation,
                  check_in: current.check_in,
                  check_out: current.check_out,
                  roomId: current.roomId,
                }
              : reservation,
          ),
        );
      },
      successMessage: "Reservation moved.",
    });

    setDraggingReservationId(null);
    setDropTarget(null);
  }

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      const dayDelta = Math.round((event.clientX - resizing.startClientX) / DAY_WIDTH);
      if (dayDelta === 0) return;

      setItems((prev) =>
        prev.map((reservation) => {
          if (reservation.id !== resizing.reservationId) return reservation;

          const originalStart = parseISO(`${resizing.originalCheckIn}T00:00:00Z`);
          const originalEnd = parseISO(`${resizing.originalCheckOut}T00:00:00Z`);

          if (resizing.edge === "start") {
            const nextStart = addDays(originalStart, dayDelta);
            const maxStart = addDays(originalEnd, -1);
            const clampedStart = isAfter(nextStart, maxStart) ? maxStart : nextStart;
            return {
              ...reservation,
              check_in: format(clampedStart, "yyyy-MM-dd"),
            };
          }

          const nextEnd = addDays(originalEnd, dayDelta);
          const minEnd = addDays(originalStart, 1);
          const clampedEnd = isBefore(nextEnd, minEnd) ? minEnd : nextEnd;
          return {
            ...reservation,
            check_out: format(clampedEnd, "yyyy-MM-dd"),
          };
        }),
      );
    };

    const handleMouseUp = () => {
      const updated = itemsRef.current.find((reservation) => reservation.id === resizing.reservationId);

      if (!updated) {
        setResizing(null);
        return;
      }

      const changed =
        updated.check_in !== resizing.originalCheckIn ||
        updated.check_out !== resizing.originalCheckOut;

      if (!changed) {
        setResizing(null);
        return;
      }

      void persistCalendarChange({
        reservationId: resizing.reservationId,
        newCheckIn: updated.check_in,
        newCheckOut: updated.check_out,
        newRoomId: resizing.roomId,
        rollback: () => {
          setItems((prev) =>
            prev.map((reservation) =>
              reservation.id === resizing.reservationId
                ? {
                    ...reservation,
                    check_in: resizing.originalCheckIn,
                    check_out: resizing.originalCheckOut,
                  }
                : reservation,
            ),
          );
        },
        successMessage: "Reservation stay updated.",
      });

      setResizing(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [persistCalendarChange, resizing]);

  const hoverCardReservation = useMemo(
    () => (hoverCard ? (items.find((r) => r.id === hoverCard.id) ?? null) : null),
    [hoverCard, items],
  );

  useEffect(() => {
    if (!blockDraft) return;
    const handleMouseUp = () => {
      setPendingBlock({
        roomId: blockDraft.roomId,
        startDate: blockDraft.startDayIso,
        endDate: blockDraft.endDayIso,
      });
      setPendingBlockReason("Maintenance");
      setBlockDraft(null);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [blockDraft]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const todayIso = format(new Date(), "yyyy-MM-dd");
    const start = startOfWeek(startOfMonth(parseISO(`${monthIso}-01`)));
    const dayOffset = differenceInCalendarDays(parseISO(`${todayIso}T00:00:00Z`), start);
    if (dayOffset < 0) return;
    const scrollLeft = dayOffset * DAY_WIDTH - scrollRef.current.clientWidth / 2 + DAY_WIDTH / 2;
    scrollRef.current.scrollLeft = Math.max(0, scrollLeft);
  }, [monthIso]);

  return (
    <div className="isolate max-w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
        <p className="text-sm font-medium text-zinc-800">Room Timeline Board</p>
        <p className="text-xs text-zinc-500">Drag bars across dates or rooms. Resize from either edge to shorten or extend stay.</p>
      </div>

      <div ref={scrollRef} className="max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain overscroll-y-none [touch-action:pan-x]">
        <div style={{ width: LANE_HEADER_WIDTH + totalTimelineWidth, minWidth: "100%" }}>
          <div className="sticky top-0 z-20 flex border-b border-zinc-200 bg-zinc-100/90 backdrop-blur-sm">
            <div
              className="sticky left-0 z-30 border-r border-zinc-200 bg-zinc-100 px-3 py-2"
              style={{ width: LANE_HEADER_WIDTH }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Room</p>
            </div>
            <div className="relative flex" style={{ width: totalTimelineWidth }}>
              {days.map((day, idx) => {
                const dayIso = format(day, "yyyy-MM-dd");
                const occ = occupancyByDay.map.get(dayIso) ?? 0;
                const isMonthBoundary = idx > 0 && format(day, "d") === "1";
                return (
                  <div
                    key={`head-${dayIso}`}
                    className={`border-r border-zinc-200 px-1 py-2 text-center ${
                      isToday(day) ? "bg-orange-100/80" : "bg-zinc-50"
                    } ${isMonthBoundary ? "border-l-2 border-l-zinc-400" : ""}`}
                    style={{ width: DAY_WIDTH }}
                  >
                    <p className="text-[10px] uppercase text-zinc-500">
                      {isMonthBoundary ? format(day, "MMM") : format(day, "EEE")}
                    </p>
                    <p className={`text-xs font-semibold ${
                      isMonthBoundary ? "text-zinc-900" : "text-zinc-700"
                    }`}>
                      {format(day, "d")}
                    </p>
                    {occ > 0 ? (
                      <p className={`text-[9px] font-semibold tabular-nums ${
                        occ >= occupancyByDay.totalRooms
                          ? "text-red-500"
                          : occ >= occupancyByDay.totalRooms * 0.8
                            ? "text-amber-500"
                            : "text-emerald-600"
                      }`}>
                        {occ}/{occupancyByDay.totalRooms}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {renderItems.map((item) => {
            if (item.kind === "type-header") {
              return (
                <div
                  key={`type-${item.typeId}`}
                  className="flex border-b border-zinc-300 bg-gradient-to-r from-zinc-100/90 to-zinc-50/80"
                >
                  <button
                    type="button"
                    className="sticky left-0 z-10 flex items-center gap-1.5 border-r border-zinc-300 bg-zinc-100 px-3 text-left"
                    style={{ width: LANE_HEADER_WIDTH, height: 30 }}
                    onClick={() =>
                      setCollapsedTypes((prev) => {
                        const next = new Set(prev);
                        if (next.has(item.typeId)) next.delete(item.typeId);
                        else next.add(item.typeId);
                        return next;
                      })
                    }
                  >
                    <span
                      className={`text-[10px] text-zinc-400 transition-transform duration-150 ${
                        collapsedTypes.has(item.typeId) ? "-rotate-90" : ""
                      }`}
                    >
                      ▾
                    </span>
                    <span className="text-xs font-semibold text-zinc-600">{item.typeName}</span>
                    <span className="ml-0.5 rounded-full bg-zinc-200/80 px-1.5 py-0.5 text-[9px] font-medium text-zinc-500">
                      {item.count}
                    </span>
                  </button>
                  <div style={{ width: totalTimelineWidth, height: 30 }} className="bg-zinc-100/40" />
                </div>
              );
            }

            const { lane, roomStatus } = item;
            const placements = timelinePlacements.placementByLane.get(lane.id) ?? [];
            const laneHeight = timelinePlacements.laneHeights.get(lane.id) ?? 56;
            const visStartIso = format(visibleStart, "yyyy-MM-dd");
            const visEndPlusOneIso = format(addDays(visibleEnd, 1), "yyyy-MM-dd");
            const laneBlocks =
              lane.id !== "unassigned"
                ? localBlocks.filter(
                    (b) => b.roomId === lane.id && overlaps(b.startDate, b.endDate, visStartIso, visEndPlusOneIso),
                  )
                : [];

            return (
              <div key={lane.id} className="flex border-b border-zinc-200">
                <div
                  className="sticky left-0 z-10 border-r border-zinc-200 bg-white px-3 py-3"
                  style={{ width: LANE_HEADER_WIDTH }}
                >
                  <p className="text-sm font-semibold text-zinc-800">{lane.name}</p>
                  <p className="text-xs text-zinc-500">{lane.subtitle}</p>
                </div>

                <div className="relative" style={{ width: totalTimelineWidth, height: laneHeight }}>
                  {days.map((day, idx) => {
                    const dayIso = format(day, "yyyy-MM-dd");
                    const isDropHere =
                      dropTarget?.laneId === lane.id &&
                      dropTarget?.dayIso === dayIso &&
                      !!draggingReservationId;
                    const isDraftHere =
                      blockDraft?.roomId === lane.id &&
                      blockDraft.startDayIso <= dayIso &&
                      dayIso < blockDraft.endDayIso;

                    let cellBg: string;
                    if (isDropHere) {
                      cellBg = "bg-orange-200/70";
                    } else if (isDraftHere) {
                      cellBg = "bg-violet-100";
                    } else if (roomStatus === "dirty") {
                      cellBg = isToday(day) ? "bg-amber-100/90" : "bg-amber-50/70";
                    } else if (roomStatus === "inspection") {
                      cellBg = isToday(day) ? "bg-amber-100/90" : "bg-amber-100/60";
                    } else if (roomStatus === "out_of_order" || roomStatus === "maintenance") {
                      cellBg = "bg-red-50/80";
                    } else {
                      cellBg = isToday(day) ? "bg-orange-50" : idx % 2 === 0 ? "bg-white" : "bg-zinc-50/50";
                    }

                    return (
                      <div
                        key={`${lane.id}-${dayIso}`}
                        className={`absolute inset-y-0 border-r border-zinc-100 ${cellBg} ${
                          isDraftHere ? "ring-1 ring-inset ring-violet-300" : ""
                        }`}
                        style={{ left: idx * DAY_WIDTH, width: DAY_WIDTH }}
                        onClick={() => {
                          if (!draggingReservationId && !resizing && !blockDraft) {
                            openBookingModal(dayIso, lane.id);
                          }
                        }}
                        onMouseDown={(event) => {
                          if (event.shiftKey && lane.id !== "unassigned") {
                            event.preventDefault();
                            const nextDayIso = format(
                              addDays(parseISO(`${dayIso}T00:00:00Z`), 1),
                              "yyyy-MM-dd",
                            );
                            setBlockDraft({
                              roomId: lane.id,
                              anchorDayIso: dayIso,
                              startDayIso: dayIso,
                              endDayIso: nextDayIso,
                            });
                          }
                        }}
                        onMouseEnter={() => {
                          if (blockDraft && blockDraft.roomId === lane.id) {
                            const nextDayIso = format(
                              addDays(parseISO(`${dayIso}T00:00:00Z`), 1),
                              "yyyy-MM-dd",
                            );
                            const anchor = blockDraft.anchorDayIso;
                            const newStart = dayIso <= anchor ? dayIso : anchor;
                            const newEnd =
                              dayIso >= anchor
                                ? nextDayIso
                                : format(addDays(parseISO(`${anchor}T00:00:00Z`), 1), "yyyy-MM-dd");
                            setBlockDraft((prev) =>
                              prev ? { ...prev, startDayIso: newStart, endDayIso: newEnd } : null,
                            );
                          }
                          if (draggingReservationId) {
                            setDropTarget({ laneId: lane.id, dayIso });
                          }
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          if (draggingReservationId) {
                            setDropTarget({ laneId: lane.id, dayIso });
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          void handleDrop(lane.id, dayIso);
                        }}
                      />
                    );
                  })}

                  {/* Persisted room blocks */}
                  {laneBlocks.map((block) => {
                    const clampStart = block.startDate < visStartIso ? visStartIso : block.startDate;
                    const clampEnd = block.endDate > visEndPlusOneIso ? visEndPlusOneIso : block.endDate;
                    const blockLeft =
                      differenceInCalendarDays(parseISO(`${clampStart}T00:00:00Z`), visibleStart) * DAY_WIDTH;
                    const blockNights = Math.max(
                      1,
                      differenceInCalendarDays(parseISO(clampEnd), parseISO(clampStart)),
                    );
                    return (
                      <div
                        key={block.id}
                        className="absolute flex items-center overflow-hidden rounded border border-red-300 px-2 text-xs font-medium text-red-700"
                        style={{
                          left: blockLeft + 1,
                          top: 8,
                          width: blockNights * DAY_WIDTH - 2,
                          height: BAR_HEIGHT,
                          background:
                            "repeating-linear-gradient(45deg, #fee2e2, #fee2e2 4px, #fca5a5 4px, #fca5a5 8px)",
                        }}
                        title={`${block.reason} — click × to remove`}
                      >
                        <span className="truncate">{block.reason}</span>
                        <button
                          type="button"
                          className="ml-auto shrink-0 rounded-full p-0.5 hover:bg-red-200"
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteRoomBlock(block.id).then((result) => {
                              if (result?.error) {
                                appToast.error("Unable to remove block", { description: result.error });
                                return;
                              }
                              setLocalBlocks((prev) => prev.filter((b) => b.id !== block.id));
                              appToast.success("Room block removed.");
                            });
                          }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}

                  {placements.map((placement) => {
                    const reservation = items.find((item) => item.id === placement.id);
                    if (!reservation) return null;

                    const dragEnabled = canDrag(reservation.status);
                    const top = placement.level * (BAR_HEIGHT + BAR_GAP) + 8;
                    const isActivelyResizing = resizing?.reservationId === reservation.id;
                    const stayNights = differenceInCalendarDays(
                      parseISO(reservation.check_out),
                      parseISO(reservation.check_in),
                    );

                    return (
                      <Link
                        key={reservation.id}
                        href={`/dashboard/reservations/${reservation.id}`}
                        className={`absolute flex items-center gap-1 overflow-hidden rounded-md border px-2 text-xs font-medium shadow-sm ${STATUS_TONE[reservation.status] ?? "bg-zinc-100 text-zinc-700"} ${
                          isActivelyResizing ? "ring-2 ring-orange-300" : ""
                        } ${reservation.id === selectedReservationId ? "ring-2 ring-orange-400" : ""}`}
                        style={{
                          left: placement.left + 1,
                          top,
                          width: Math.max(placement.width - 2, DAY_WIDTH * 0.9),
                          height: BAR_HEIGHT,
                        }}
                        title={`${reservation.guestName} (${reservation.status.replace("_", " ")})`}
                        draggable={dragEnabled && !resizing}
                        onDragStart={(event) => {
                          if (!dragEnabled || resizing) return;
                          event.dataTransfer.effectAllowed = "move";
                          setSelectedReservationId(reservation.id);
                          setDraggingReservationId(reservation.id);
                          setHoverCard(null);
                        }}
                        onDragEnd={() => {
                          setDraggingReservationId(null);
                          setDropTarget(null);
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setSelectedReservationId(reservation.id);
                          setQuickActionsReservationId(reservation.id);
                        }}
                        onClick={(event) => {
                          if (draggingReservationId || resizing) {
                            event.preventDefault();
                            return;
                          }
                          setSelectedReservationId(reservation.id);
                        }}
                        onMouseEnter={(event) => {
                          if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
                          const rect = event.currentTarget.getBoundingClientRect();
                          setHoverCard({ id: reservation.id, rect });
                        }}
                        onMouseLeave={() => {
                          hoverTimerRef.current = window.setTimeout(() => setHoverCard(null), 120);
                        }}
                      >
                        <span
                          className="absolute inset-y-0 left-0 w-2 cursor-ew-resize bg-black/10"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setResizing({
                              reservationId: reservation.id,
                              edge: "start",
                              startClientX: event.clientX,
                              originalCheckIn: reservation.check_in,
                              originalCheckOut: reservation.check_out,
                              roomId: reservation.roomId,
                            });
                          }}
                        />
                        <span className="truncate pl-1">{reservation.guestName}</span>
                        {stayNights > 1 && placement.width >= DAY_WIDTH * 2 ? (
                          <span className="ml-auto shrink-0 rounded bg-black/10 px-1 text-[9px] font-bold leading-none">
                            {stayNights}n
                          </span>
                        ) : null}
                        <span
                          className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-black/10"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setResizing({
                              reservationId: reservation.id,
                              edge: "end",
                              startClientX: event.clientX,
                              originalCheckIn: reservation.check_in,
                              originalCheckOut: reservation.check_out,
                              roomId: reservation.roomId,
                            });
                          }}
                        />
                      </Link>
                    );
                  })}

                  {placements.length === 0 && laneBlocks.length === 0 ? (
                    <div className="absolute inset-0 flex items-center px-2">
                      <p className="text-[11px] text-zinc-400">No reservations in view</p>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3">
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Legend</span>
          {([
            { label: "Tentative", dot: "bg-slate-400" },
            { label: "Confirmed", dot: "bg-blue-400" },
            { label: "Checked In", dot: "bg-emerald-400" },
            { label: "Checked Out", dot: "bg-zinc-400" },
            { label: "Cancelled", dot: "bg-red-400" },
          ] as { label: string; dot: string }[]).map(({ label, dot }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-zinc-600">
              <span className={`h-2.5 w-2.5 rounded-sm ${dot}`} />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs text-zinc-600">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{
                background:
                  "repeating-linear-gradient(45deg, #fca5a5, #fca5a5 3px, #fee2e2 3px, #fee2e2 6px)",
              }}
            />
            Room Block
          </span>
          <span className="mx-1 text-zinc-200">|</span>
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-200" /> Dirty
          </span>
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-300" /> Inspection
          </span>
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-200" /> OOO / Maint.
          </span>
        </div>
        <p className="text-xs text-zinc-500">
          Keyboard: <span className="font-medium text-zinc-700">←/→</span> move ·{" "}
          <span className="font-medium text-zinc-700">[ / ]</span> shorten/extend ·{" "}
          <span className="font-medium text-zinc-700">U</span> unassign ·{" "}
          <span className="font-medium text-zinc-700">B</span> best-fit ·{" "}
          <span className="font-medium text-zinc-700">Shift+drag</span> a room row to block dates.
        </p>
      </div>

      <ReservationCalendarBookingModal
        activePropertyId={activePropertyId}
        defaultCheckIn={bookingModal.checkIn}
        defaultCheckOut={bookingModal.checkOut}
        defaultRoomId={bookingModal.roomId}
        defaultRoomTypeId={bookingModal.roomTypeId}
        guestOptions={guestOptions}
        key={`${bookingModal.checkIn}-${bookingModal.roomId}-${bookingModal.roomTypeId}-${bookingModal.open ? "open" : "closed"}`}
        open={bookingModal.open}
        onCreated={() => router.refresh()}
        onOpenChange={(open) => setBookingModal((current) => ({ ...current, open }))}
        ratePlanOptions={ratePlanOptions}
        roomOptions={roomOptions}
        roomTypeOptions={roomTypeOptions}
      />

      <Dialog open={Boolean(quickActionsReservation)} onOpenChange={(open) => !open && setQuickActionsReservationId(null)}>
        <DialogContent className="max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl">
          <DialogHeader>
            <DialogTitle>Quick Actions</DialogTitle>
            <DialogDescription>
              {quickActionsReservation ? `Fast front-desk controls for ${quickActionsReservation.guestName}.` : "Reservation actions"}
            </DialogDescription>
          </DialogHeader>

          {quickActionsReservation ? (
            <div className="grid gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const nextCheckIn = format(addDays(parseISO(`${quickActionsReservation.check_in}T00:00:00Z`), 1), "yyyy-MM-dd");
                  const nextCheckOut = format(addDays(parseISO(`${quickActionsReservation.check_out}T00:00:00Z`), 1), "yyyy-MM-dd");
                  void runQuickMutation({ ...quickActionsReservation, check_in: nextCheckIn, check_out: nextCheckOut }, "Reservation moved one day.");
                  setQuickActionsReservationId(null);
                }}
              >
                Move +1 Day
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const nextCheckOut = format(addDays(parseISO(`${quickActionsReservation.check_out}T00:00:00Z`), 1), "yyyy-MM-dd");
                  void runQuickMutation({ ...quickActionsReservation, check_out: nextCheckOut }, "Reservation extended by one night.");
                  setQuickActionsReservationId(null);
                }}
              >
                Extend 1 Night
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const stayNights = differenceInCalendarDays(parseISO(quickActionsReservation.check_out), parseISO(quickActionsReservation.check_in));
                  if (stayNights <= 1) {
                    appToast.error("Unable to shorten reservation", { description: "Stay must remain at least one night." });
                    return;
                  }
                  const nextCheckOut = format(addDays(parseISO(`${quickActionsReservation.check_out}T00:00:00Z`), -1), "yyyy-MM-dd");
                  void runQuickMutation({ ...quickActionsReservation, check_out: nextCheckOut }, "Reservation shortened by one night.");
                  setQuickActionsReservationId(null);
                }}
              >
                Shorten 1 Night
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void runQuickMutation({ ...quickActionsReservation, roomId: null, roomNumber: null }, "Room unassigned.");
                  setQuickActionsReservationId(null);
                }}
              >
                Unassign Room
              </Button>
              {["tentative", "confirmed"].includes(quickActionsReservation.status) ? (
                <Button
                  type="button"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => {
                    void handleStatusChange(quickActionsReservation.id, "checked_in");
                    setQuickActionsReservationId(null);
                  }}
                >
                  Check In
                </Button>
              ) : null}
              {quickActionsReservation.status === "checked_in" ? (
                <Button
                  type="button"
                  className="bg-zinc-700 text-white hover:bg-zinc-800"
                  onClick={() => {
                    void handleStatusChange(quickActionsReservation.id, "checked_out");
                    setQuickActionsReservationId(null);
                  }}
                >
                  Check Out
                </Button>
              ) : null}
              <Button
                type="button"
                className="bg-[#ff6900] text-white hover:bg-[#e55f00]"
                onClick={() => {
                  void handleAssignBestFit(quickActionsReservation.id);
                  setQuickActionsReservationId(null);
                }}
              >
                Assign Best-Fit Room
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Block-dates confirm dialog */}
      <Dialog open={!!pendingBlock} onOpenChange={(open) => !open && setPendingBlock(null)}>
        <DialogContent className="max-w-sm rounded-xl border border-zinc-200 bg-white shadow-xl">
          <DialogHeader>
            <DialogTitle>Block Room Dates</DialogTitle>
            <DialogDescription>
              {pendingBlock
                ? `${formatCompact(pendingBlock.startDate)} – ${formatCompact(pendingBlock.endDate)} · Prevents new reservations.`
                : "Block room dates"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid gap-1.5">
              <label htmlFor="block-reason" className="text-sm font-medium text-zinc-700">Reason</label>
              <input
                id="block-reason"
                className="h-10 rounded-md border border-zinc-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                value={pendingBlockReason}
                onChange={(event) => setPendingBlockReason(event.target.value)}
                placeholder="Maintenance, OOO, Deep clean..."
                autoFocus
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
            <Button variant="outline" onClick={() => setPendingBlock(null)}>Cancel</Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={!pendingBlockReason.trim()}
              onClick={() => {
                if (!pendingBlock) return;
                void createRoomBlock({
                  propertyId: activePropertyId,
                  roomId: pendingBlock.roomId,
                  startDate: pendingBlock.startDate,
                  endDate: pendingBlock.endDate,
                  reason: pendingBlockReason.trim(),
                }).then((result) => {
                  if (result?.error) {
                    appToast.error("Unable to create block", { description: result.error });
                    return;
                  }
                  setLocalBlocks((prev) => [
                    ...prev,
                    {
                      id: result.id,
                      roomId: pendingBlock.roomId,
                      startDate: pendingBlock.startDate,
                      endDate: pendingBlock.endDate,
                      reason: pendingBlockReason.trim(),
                    },
                  ]);
                  appToast.success("Room dates blocked.");
                });
                setPendingBlock(null);
              }}
            >
              Block Dates
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hover card */}
      {hoverCardReservation && hoverCard ? (
        <div
          style={{
            position: "fixed",
            left: Math.min(
              hoverCard.rect.left + hoverCard.rect.width / 2,
              window.innerWidth - 224,
            ),
            top:
              hoverCard.rect.top > 200
                ? hoverCard.rect.top - 8
                : hoverCard.rect.bottom + 8,
            transform:
              hoverCard.rect.top > 200
                ? "translate(-50%, -100%)"
                : "translateX(-50%)",
            zIndex: 9999,
          }}
          className="w-56 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl"
          onMouseEnter={() => {
            if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
          }}
          onMouseLeave={() => setHoverCard(null)}
        >
          <div className="mb-2">
            <p className="truncate text-sm font-semibold text-zinc-900">{hoverCardReservation.guestName}</p>
            <span
              className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                STATUS_TONE[hoverCardReservation.status] ?? "bg-zinc-100 text-zinc-700"
              }`}
            >
              {{
                tentative: "Tentative",
                confirmed: "Confirmed",
                checked_in: "Checked In",
                checked_out: "Checked Out",
                cancelled: "Cancelled",
                no_show: "No Show",
              }[hoverCardReservation.status] ?? hoverCardReservation.status}
            </span>
          </div>
          <div className="mb-3 space-y-0.5 text-xs text-zinc-500">
            <p>
              {formatCompact(hoverCardReservation.check_in)} → {formatCompact(hoverCardReservation.check_out)}
              {" · "}
              {differenceInCalendarDays(
                parseISO(hoverCardReservation.check_out),
                parseISO(hoverCardReservation.check_in),
              )}n
            </p>
            {hoverCardReservation.roomNumber ? (
              <p>
                Room {hoverCardReservation.roomNumber}
                {hoverCardReservation.roomTypeName ? ` · ${hoverCardReservation.roomTypeName}` : ""}
              </p>
            ) : (
              <p className="text-amber-600">No room assigned</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            {["tentative", "confirmed"].includes(hoverCardReservation.status) ? (
              <Button
                size="sm"
                className="h-7 w-full bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                onClick={() => {
                  setHoverCard(null);
                  void handleStatusChange(hoverCardReservation.id, "checked_in");
                }}
              >
                Check In
              </Button>
            ) : null}
            {hoverCardReservation.status === "checked_in" ? (
              <Button
                size="sm"
                className="h-7 w-full bg-zinc-700 text-xs text-white hover:bg-zinc-800"
                onClick={() => {
                  setHoverCard(null);
                  void handleStatusChange(hoverCardReservation.id, "checked_out");
                }}
              >
                Check Out
              </Button>
            ) : null}
            <Button asChild size="sm" variant="outline" className="h-7 w-full text-xs">
              <Link href={`/dashboard/reservations/${hoverCardReservation.id}`}>View Reservation</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
