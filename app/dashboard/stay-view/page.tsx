import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { PageHelpDialog } from "@/components/custom/page-help-dialog";
import { EarlyLateModal } from "@/components/front-desk/early-late-modal";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { DataTable } from "@/components/ui/data-table";
import { BoardGrid } from "@/components/room-board/board-grid";
import { BoardLegend } from "@/components/room-board/board-legend";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { calculateFolioBalance } from "@/lib/pms/folio";
import {
  getFrontDeskSnapshot,
  getCheckInReservationContext,
  confirmCheckIn,
  getCheckOutReservationContext,
  confirmCheckOut,
} from "../front-desk/actions/checkin-actions";
import { getRoomBoardSnapshot } from "../room-board/actions";
import { markReservationNoShow, preCheckInReservation } from "../arrivals-departures/actions";
import { ReservationSideSheet } from "@/components/front-desk/reservation-side-sheet";

type StayViewPageProps = {
  searchParams?: Promise<{
    ok?: string | string[];
    error?: string | string[];
    sheet?: string | string[];
    reservationId?: string | string[];
    folioId?: string | string[];
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB");
}

function remainingNights(checkOutIso: string) {
  return Math.ceil((new Date(checkOutIso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function StayViewPage({ searchParams }: StayViewPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);
  const sheetMode = readSearchValue(params.sheet) as "checkin" | "checkout" | undefined;
  const sheetReservationId = readSearchValue(params.reservationId);
  const sheetFolioId = readSearchValue(params.folioId);

  if (!activePropertyId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Set DEMO_PROPERTY_ID in .env.local or add/select an active property in the header.
      </div>
    );
  }

  const [frontDeskSnapshot, roomBoardSnapshot, checkInCtxRaw, checkOutCtxRaw] = await Promise.all([
    getFrontDeskSnapshot(activePropertyId),
    getRoomBoardSnapshot(activePropertyId),
    sheetMode === "checkin" && sheetReservationId
      ? getCheckInReservationContext(sheetReservationId)
      : null,
    sheetMode === "checkout" && sheetReservationId
      ? getCheckOutReservationContext(sheetReservationId)
      : null,
  ]);

  const preCheckInAction = async (reservationId: string) => {
    "use server";
    try {
      await preCheckInReservation(reservationId);
      redirect(`/dashboard/stay-view?ok=${encodeURIComponent("Pre-check-in completed.")}`);
    } catch (err) {
      unstable_rethrow(err);
      const message = err instanceof Error ? err.message : "Unable to complete pre-check-in.";
      redirect(`/dashboard/stay-view?error=${encodeURIComponent(message)}`);
    }
  };

  const noShowAction = async (reservationId: string) => {
    "use server";
    try {
      await markReservationNoShow(reservationId);
      redirect(`/dashboard/stay-view?ok=${encodeURIComponent("Reservation marked as no-show.")}`);
    } catch (err) {
      unstable_rethrow(err);
      const message = err instanceof Error ? err.message : "Unable to mark as no-show.";
      redirect(`/dashboard/stay-view?error=${encodeURIComponent(message)}`);
    }
  };

  // ── Sheet server actions ────────────────────────────────────────────────
  const submitCheckInViaSheet = async (formData: FormData) => {
    "use server";
    if (!sheetReservationId) return;
    try {
      const result = await confirmCheckIn(formData);
      if (result?.error) throw new Error(result.error);
      const folioPart = result?.folioId ? `&folioId=${result.folioId}` : "";
      redirect(
        `/dashboard/stay-view?sheet=checkin&reservationId=${sheetReservationId}&ok=${encodeURIComponent("Check-in completed.")}${folioPart}`,
      );
    } catch (err) {
      unstable_rethrow(err);
      const message = err instanceof Error ? err.message : "Unable to complete check-in.";
      redirect(
        `/dashboard/stay-view?sheet=checkin&reservationId=${sheetReservationId}&error=${encodeURIComponent(message)}`,
      );
    }
  };

  const submitCheckOutViaSheet = async (formData: FormData) => {
    "use server";
    if (!sheetReservationId) return;
    try {
      const result = await confirmCheckOut(formData);
      if (result?.error) throw new Error(result.error);
      redirect(`/dashboard/stay-view?ok=${encodeURIComponent("Check-out completed.")}`);
    } catch (err) {
      unstable_rethrow(err);
      const message = err instanceof Error ? err.message : "Unable to complete check-out.";
      redirect(
        `/dashboard/stay-view?sheet=checkout&reservationId=${sheetReservationId}&error=${encodeURIComponent(message)}`,
      );
    }
  };

  // ── Compute sheet data props ────────────────────────────────────────────
  const checkInData = (() => {
    const ctx = checkInCtxRaw;
    if (!ctx?.reservation) return undefined;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const stdTime = ctx.propertySettings?.checkInTime ?? "15:00";
    const earlyFee = ctx.propertySettings?.earlyCheckinFeeMinor ?? 0;
    const rr = (ctx.reservation.reservation_rooms as Array<{ room_id: string | null }>)?.[0];
    return {
      availableRooms: ctx.availableRooms as Array<{ id: string; room_number: string }>,
      assignedRoomId: rr?.room_id ?? null,
      isEarlyArrival: currentTime < stdTime && earlyFee > 0,
      stdCheckInTime: stdTime,
      earlyFeeMinor: earlyFee,
      folioId: sheetFolioId ?? null,
      propertyCurrencyCode: ctx.propertyCurrencyCode ?? "USD",
    };
  })();

  const checkInGuestName = (() => {
    const ctx = checkInCtxRaw;
    if (!ctx?.reservation) return "";
    return getGuestName(ctx.reservation.guests as { first_name?: string; last_name?: string } | null);
  })();

  const checkOutData = (() => {
    const ctx = checkOutCtxRaw;
    if (!ctx?.reservation || !ctx?.folio) return undefined;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const stdTime = ctx.propertySettings?.checkOutTime ?? "11:00";
    const lateFee = ctx.propertySettings?.lateCheckoutFeeMinor ?? 0;
    const chargeTotal = (ctx.charges as Array<{ amount_minor: number }>).reduce(
      (sum, c) => sum + c.amount_minor,
      0,
    );
    const paymentTotal = (ctx.payments as Array<{ amount_minor: number }>).reduce(
      (sum, p) => sum + p.amount_minor,
      0,
    );
    const balance = calculateFolioBalance({
      chargeTotalMinor: chargeTotal,
      paymentTotalMinor: paymentTotal,
    });
    return {
      folioId: ctx.folio.id as string,
      currencyCode: ctx.folio.currency_code as string,
      chargeTotal,
      paymentTotal,
      balance,
      isLateDeparture: currentTime > stdTime && lateFee > 0,
      stdCheckOutTime: stdTime,
      lateFeeMinor: lateFee,
    };
  })();

  const checkOutGuestName = (() => {
    const ctx = checkOutCtxRaw;
    if (!ctx?.reservation) return "";
    return getGuestName(ctx.reservation.guests as { first_name?: string; last_name?: string } | null);
  })();

  const sheetOpen = !!(
    sheetMode &&
    sheetReservationId &&
    (checkInData || checkOutData)
  );

  const operations = [
    ...frontDeskSnapshot.arrivals.map((item) => ({
      id: item.id,
      guestName: getGuestName(item.guests),
      checkIn: item.check_in,
      checkOut: item.check_out,
      stage: "Arrival",
      statusLabel: item.status.replace("_", " "),
      statusTone: "bg-blue-100 text-blue-700",
      canPreCheckIn: true,
      canNoShow: true,
      canCheckIn: true,
      canCheckOut: false,
    })),
    ...frontDeskSnapshot.departures.map((item) => ({
      id: item.id,
      guestName: getGuestName(item.guests),
      checkIn: item.check_in,
      checkOut: item.check_out,
      stage: "Departure",
      statusLabel: item.status.replace("_", " "),
      statusTone: "bg-amber-100 text-amber-800",
      canPreCheckIn: false,
      canNoShow: false,
      canCheckIn: false,
      canCheckOut: true,
    })),
    ...frontDeskSnapshot.inHouse.map((item) => ({
      id: item.id,
      guestName: getGuestName(item.guests),
      checkIn: item.check_in,
      checkOut: item.check_out,
      stage: "In House",
      statusLabel: remainingNights(item.check_out) > 0 ? `${remainingNights(item.check_out)}n remaining` : "Due today",
      statusTone: "bg-emerald-100 text-emerald-800",
      canPreCheckIn: false,
      canNoShow: false,
      canCheckIn: false,
      canCheckOut: true,
    })),
  ];

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="page-title">Stay View</h1>
            <p className="page-subtitle">Live operations board for arrivals, departures, in-house stays, and room moves.</p>
          </div>
          <div className="flex items-center gap-2">
            <EarlyLateModal />
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/dnd-log">DND Log</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard/front-desk/room-move">Room Move</Link>
            </Button>
            <PageHelpDialog
              className="border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              pageName="Stay view"
              summary="This is the canonical operations workspace that merges live front-desk actions and room board operations into one flow."
              responsibilities={[
                "Process arrivals, departures, and in-house actions from one page.",
                "Complete pre-check-in and no-show decisions without changing modules.",
                "Drag and reassign reservations between rooms on the live room grid.",
              ]}
              relatedPages={[
                {
                  href: "/dashboard/reservations/calendar",
                  label: "Reservations",
                  description: "Reservation creation and timeline planning feed this live operations board.",
                },
                {
                  href: "/dashboard/front-desk/room-move",
                  label: "Room move",
                  description: "Use the guided room move flow for manual reassignment with notes.",
                },
              ]}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard title="Arrivals Today" value={frontDeskSnapshot.arrivals.length} tone="blue" />
          <MetricCard title="Departures Today" value={frontDeskSnapshot.departures.length} tone="amber" />
          <MetricCard title="In House" value={frontDeskSnapshot.inHouse.length} tone="emerald" />
        </div>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-base">Stay Operations Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DataTable caption="Table-first queue for arrivals, departures, and in-house operations.">
              <thead className="bg-zinc-50 text-xs uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Guest</th>
                  <th className="px-3 py-2 text-left font-semibold">Stay</th>
                  <th className="px-3 py-2 text-left font-semibold">Stage</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {operations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-zinc-500">
                      No stay operations available.
                    </td>
                  </tr>
                ) : (
                  operations.map((row) => (
                    <tr key={`${row.stage}-${row.id}`} className="border-t border-zinc-100 align-top">
                      <td className="px-3 py-3">
                        <p className="font-medium text-zinc-900">{row.guestName}</p>
                      </td>
                      <td className="px-3 py-3 text-sm text-zinc-600">
                        {formatDate(row.checkIn)} - {formatDate(row.checkOut)}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-700">{row.stage}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge className={row.statusTone}>{row.statusLabel}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {row.canPreCheckIn ? (
                            <form action={preCheckInAction.bind(null, row.id)}>
                              <FormSubmitButton idleText="Pre-check-in" pendingText="..." variant="outline" size="sm" />
                            </form>
                          ) : null}
                          {row.canNoShow ? (
                            <form action={noShowAction.bind(null, row.id)}>
                              <FormSubmitButton idleText="No-show" pendingText="..." variant="destructive" size="sm" />
                            </form>
                          ) : null}
                          {row.canCheckIn ? (
                            <Button asChild size="sm">
                              <Link href={`/dashboard/stay-view?sheet=checkin&reservationId=${row.id}`}>
                                Check in
                              </Link>
                            </Button>
                          ) : null}
                          {row.canCheckOut ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/dashboard/stay-view?sheet=checkout&reservationId=${row.id}`}>
                                Check out
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </DataTable>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
            <p>{roomBoardSnapshot.activeDndRoomIds.length} room(s) currently on do-not-disturb.</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/dnd-log">Open DND Log</Link>
            </Button>
          </div>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-base">Room Assignment Table</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable caption="Current room assignments and stay windows.">
                <thead className="bg-zinc-50 text-xs uppercase tracking-[0.12em] text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Guest</th>
                    <th className="px-3 py-2 text-left font-semibold">Room</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-3 py-2 text-left font-semibold">Check-in</th>
                    <th className="px-3 py-2 text-left font-semibold">Check-out</th>
                    <th className="px-3 py-2 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {roomBoardSnapshot.reservations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-sm text-zinc-500">
                        No room assignments found.
                      </td>
                    </tr>
                  ) : (
                    roomBoardSnapshot.reservations.map((reservation) => (
                      <tr key={reservation.id} className="border-t border-zinc-100">
                        <td className="px-3 py-3 font-medium text-zinc-900">{reservation.guestName}</td>
                        <td className="px-3 py-3 text-sm text-zinc-700">{reservation.roomNumber ?? "Unassigned"}</td>
                        <td className="px-3 py-3">
                          <Badge variant="outline" className="capitalize">{reservation.status.replace("_", " ")}</Badge>
                        </td>
                        <td className="px-3 py-3 text-sm text-zinc-600">{formatDate(reservation.checkIn)}</td>
                        <td className="px-3 py-3 text-sm text-zinc-600">{formatDate(reservation.checkOut)}</td>
                        <td className="px-3 py-3 text-right">
                          {reservation.status === "checked_in" ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/dashboard/stay-view?sheet=checkout&reservationId=${reservation.id}`}>
                                Check out
                              </Link>
                            </Button>
                          ) : (
                            <Button asChild size="sm">
                              <Link href={`/dashboard/stay-view?sheet=checkin&reservationId=${reservation.id}`}>
                                Check in
                              </Link>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </DataTable>
            </CardContent>
          </Card>

          <details className="rounded-lg border border-zinc-200 bg-white p-3">
            <summary className="cursor-pointer text-sm font-medium text-zinc-800">Advanced drag board</summary>
            <p className="mt-2 text-xs text-zinc-500">
              Use this only when you need drag-and-drop reassignment; table workflows above are the default.
            </p>
            <div className="mt-3 space-y-3">
              <BoardLegend />
              <BoardGrid rooms={roomBoardSnapshot.rooms} reservations={roomBoardSnapshot.reservations} />
            </div>
          </details>
        </div>
      </div>

      {/* Inline action sheet — no page navigation needed */}
      <ReservationSideSheet
        open={sheetOpen}
        mode={sheetMode ?? "checkin"}
        reservationId={sheetReservationId ?? ""}
        guestName={sheetMode === "checkin" ? checkInGuestName : checkOutGuestName}
        checkIn={
          sheetMode === "checkin"
            ? (checkInCtxRaw?.reservation?.check_in as string | undefined) ?? ""
            : (checkOutCtxRaw?.reservation?.check_in as string | undefined) ?? ""
        }
        checkOut={
          sheetMode === "checkin"
            ? (checkInCtxRaw?.reservation?.check_out as string | undefined) ?? ""
            : (checkOutCtxRaw?.reservation?.check_out as string | undefined) ?? ""
        }
        checkInData={checkInData}
        checkOutData={checkOutData}
        checkInAction={submitCheckInViaSheet}
        checkOutAction={submitCheckOutViaSheet}
        ok={ok}
        error={error}
      />
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