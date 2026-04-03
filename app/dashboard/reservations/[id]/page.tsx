import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { getReservation, updateReservationStatus } from "@/app/dashboard/reservations/actions/reservation-actions";
import { ClearLocalStorageOnMount } from "@/components/custom/clear-local-storage-on-mount";
import { PageHelpDialog } from "@/components/custom/page-help-dialog";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { FormSelectField } from "@/components/ui/form-select-field";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { NEW_RESERVATION_DRAFT_KEY } from "@/lib/reservations/draft";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

const STATUS_TONE: Record<string, string> = {
  tentative: "bg-slate-100 text-slate-700",
  confirmed: "bg-blue-100 text-blue-700",
  checked_in: "bg-emerald-100 text-emerald-700",
  checked_out: "bg-muted text-muted-foreground",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-amber-100 text-amber-700",
};

const STATUS_OPTIONS = [
  "tentative",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
] as const;

const STATUS_SELECT_OPTIONS = STATUS_OPTIONS.map((status) => ({
  value: status,
  label: status.replace("_", " "),
}));

interface ReservationDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string; clearDraft?: string }>;
}

function first<T>(raw: T | T[] | null | undefined): T | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

export default async function ReservationDetailPage({ params, searchParams }: ReservationDetailPageProps) {
  await redirectIfNotAuthenticated();
  const { id } = await params;
  const { error, ok, clearDraft } = await searchParams;

  const result = await getReservation(id);
  if ("error" in result || !result.reservation) {
    notFound();
  }

  const reservation = result.reservation;
  const guest = first(reservation.guests);
  const assignment = first(reservation.reservation_rooms as Array<{
    rooms: { room_number?: string; floor?: number | null; status?: string } | Array<{ room_number?: string; floor?: number | null; status?: string }> | null;
    room_types: { name?: string; base_rate_minor?: number } | Array<{ name?: string; base_rate_minor?: number }> | null;
  }>);
  const room = first(assignment?.rooms);
  const roomType = first(assignment?.room_types);

  const nights = differenceInCalendarDays(new Date(reservation.check_out), new Date(reservation.check_in));

  async function updateStatusAndRedirect(formData: FormData) {
    "use server";

    const outcome = await updateReservationStatus(formData);
    if (outcome?.success) {
      redirect(`/dashboard/reservations/${id}?ok=1`);
    }

    const message = outcome?.error ?? "Failed to update reservation status";
    redirect(`/dashboard/reservations/${id}?error=${encodeURIComponent(message)}`);
  }

  return (
    <div className="page-shell">
      <div className="page-container max-w-4xl">
        <ClearLocalStorageOnMount enabled={clearDraft === "new-reservation"} storageKey={NEW_RESERVATION_DRAFT_KEY} searchParamToRemove="clearDraft" />
        <FormStatusToast error={error} ok={ok} successTitle="Reservation updated" />

        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/dashboard/reservations">← All Reservations</Link>
          </Button>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger render={<Button variant="outline" size="sm" />}>
                Update Status
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl">
                <DialogHeader className="gap-2 border-b border-zinc-100 px-6 py-5">
                  <DialogTitle className="text-base font-semibold">Update reservation status</DialogTitle>
                  <DialogDescription className="text-sm leading-6 text-zinc-600">
                    Change the lifecycle state for this reservation. This updates how the reservation appears on the main reservations page.
                  </DialogDescription>
                </DialogHeader>
                <form action={updateStatusAndRedirect} className="grid gap-4 px-6 py-5">
                  <input type="hidden" name="reservationId" value={reservation.id} />
                  <FormSelectField
                    name="status"
                    defaultValue={reservation.status}
                    options={STATUS_SELECT_OPTIONS}
                    placeholder="Select a status"
                  />
                  <DialogFooter className="px-0 pb-0" showCloseButton>
                    <FormSubmitButton
                      idleText="Save status"
                      pendingText="Saving..."
                      className="bg-[#ff6900] text-white hover:bg-[#e55f00]"
                    />
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/reservations/new">New Reservation</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <PageHelpDialog
              className="mt-1 border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              pageName="Reservation detail"
              summary="This page shows the stay details for one reservation and lets the front desk update its operational status without leaving the record."
              responsibilities={[
                "Review the guest, room assignment, occupancy, source, and reservation notes.",
                "Confirm the stay dates and length before check-in or check-out actions.",
                "Update the reservation status from a modal so the main reservations list stays in sync.",
              ]}
              relatedPages={[
                {
                  href: "/dashboard/reservations",
                  label: "Reservations",
                  description: "This detail page depends on the Reservations page for selecting which reservation record to open.",
                },
              ]}
            />
            <div>
              <h1 className="page-title">Reservation</h1>
              <p className="page-subtitle">
                {new Date(reservation.check_in).toLocaleDateString()} → {new Date(reservation.check_out).toLocaleDateString()} · {nights} night{nights !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Badge className={`text-xs font-medium ${STATUS_TONE[reservation.status] ?? "bg-muted text-muted-foreground"}`}>
            {reservation.status.replace("_", " ")}
          </Badge>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-base">Stay Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white/80">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-zinc-100">
                  <tr>
                    <th className="w-44 bg-zinc-50 px-4 py-3 text-left font-medium text-zinc-600">Guest</th>
                    <td className="px-4 py-3 font-medium text-zinc-900">{guest?.first_name ?? ""} {guest?.last_name ?? ""}</td>
                  </tr>
                  <tr>
                    <th className="bg-zinc-50 px-4 py-3 text-left font-medium text-zinc-600">Email</th>
                    <td className="px-4 py-3 text-zinc-700">{guest?.email ?? "—"}</td>
                  </tr>
                  <tr>
                    <th className="bg-zinc-50 px-4 py-3 text-left font-medium text-zinc-600">Stay dates</th>
                    <td className="px-4 py-3 text-zinc-700">
                      {new Date(reservation.check_in).toLocaleDateString()} to {new Date(reservation.check_out).toLocaleDateString()} · {nights} night{nights !== 1 ? "s" : ""}
                    </td>
                  </tr>
                  <tr>
                    <th className="bg-zinc-50 px-4 py-3 text-left font-medium text-zinc-600">Room</th>
                    <td className="px-4 py-3 text-zinc-700">{room?.room_number ?? "Not assigned"}</td>
                  </tr>
                  <tr>
                    <th className="bg-zinc-50 px-4 py-3 text-left font-medium text-zinc-600">Room type</th>
                    <td className="px-4 py-3 text-zinc-700">{roomType?.name ?? "—"}</td>
                  </tr>
                  <tr>
                    <th className="bg-zinc-50 px-4 py-3 text-left font-medium text-zinc-600">Occupancy</th>
                    <td className="px-4 py-3 text-zinc-700">{reservation.adults} adult{reservation.adults !== 1 ? "s" : ""} / {reservation.children} child{reservation.children !== 1 ? "ren" : ""}</td>
                  </tr>
                  <tr>
                    <th className="bg-zinc-50 px-4 py-3 text-left font-medium text-zinc-600">Source</th>
                    <td className="px-4 py-3 text-zinc-700">{reservation.source ?? "—"}</td>
                  </tr>
                  <tr>
                    <th className="bg-zinc-50 px-4 py-3 text-left font-medium text-zinc-600">Notes</th>
                    <td className="px-4 py-3 text-zinc-700">{reservation.notes ?? "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
