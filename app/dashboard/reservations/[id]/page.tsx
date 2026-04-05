import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import {
  deleteReservation,
  getReservation,
  getReservationFormOptions,
  updateFullReservation,
  updateReservationStatus,
} from "@/app/dashboard/reservations/actions/reservation-actions";
import { EditReservationForm } from "@/app/dashboard/reservations/[id]/edit-reservation-form";
import { ClearLocalStorageOnMount } from "@/components/custom/clear-local-storage-on-mount";
import { PageHelpDialog } from "@/components/custom/page-help-dialog";
import { ServerActionDeleteModal } from "@/components/custom/server-action-delete-modal";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { FormSelectField } from "@/components/ui/form-select-field";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { NEW_RESERVATION_DRAFT_KEY } from "@/lib/reservations/draft";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/staff/server-permissions";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { WalkInCompleteBanner } from "@/components/custom/walk-in-complete-banner";

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
  searchParams: Promise<{ error?: string; ok?: string; clearDraft?: string; walkin?: string }>;
}

function first<T>(raw: T | T[] | null | undefined): T | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

export default async function ReservationDetailPage({ params, searchParams }: ReservationDetailPageProps) {
  await redirectIfNotAuthenticated();
  const { id } = await params;
  const { error, ok, clearDraft, walkin } = await searchParams;

  const result = await getReservation(id);
  if ("error" in result || !result.reservation) {
    notFound();
  }

  const activePropertyId = await getActivePropertyId();
  if (!activePropertyId) return null;

  const [canUpdateStatus, canDelete, canCreate, formOptions, propertyRow] = await Promise.all([
    hasPermission(activePropertyId, "reservations.update"),
    hasPermission(activePropertyId, "reservations.cancel"),
    hasPermission(activePropertyId, "reservations.create"),
    getReservationFormOptions(activePropertyId),
    (await createClient()).from("properties").select("organization_id, name").eq("id", activePropertyId).maybeSingle().then((r) => r.data),
  ]);

  const reservation = result.reservation;
  const guest = first(reservation.guests);
  const assignmentRaw = first(reservation.reservation_rooms as Array<{
    id: string;
    room_id: string | null;
    room_type_id: string;
    rooms: { id: string; room_number?: string; floor?: number | null; status?: string } | Array<{ id: string; room_number?: string; floor?: number | null; status?: string }> | null;
    room_types: { id: string; name?: string; base_rate_minor?: number } | Array<{ id: string; name?: string; base_rate_minor?: number }> | null;
  }>);
  const room = first(assignmentRaw?.rooms);
  const roomType = first(assignmentRaw?.room_types);

  const nights = differenceInCalendarDays(new Date(reservation.check_out), new Date(reservation.check_in));

  const guestOptions = (formOptions?.guests ?? []).map((g) => ({
    value: g.id,
    label: `${g.first_name} ${g.last_name}${g.email ? ` · ${g.email}` : ""}`,
  }));
  const roomTypeOptions = (formOptions?.roomTypes ?? []).map((rt) => ({
    value: rt.id,
    label: `${rt.name} · max ${rt.max_occupancy}`,
  }));
  const roomOptions = (formOptions?.rooms ?? []).map((r) => ({
    value: r.id,
    label: `${r.room_number} · ${r.status}`,
  }));
  const ratePlanOptions = (formOptions?.ratePlans ?? []).map((rp) => ({ value: rp.id, label: rp.name }));

  const ratePlan = first(reservation.rate_plans as Array<{ id: string; name: string }> | { id: string; name: string } | null);

  async function updateStatusAndRedirect(formData: FormData) {
    "use server";

    const outcome = await updateReservationStatus(formData);
    if (outcome?.success) {
      redirect(`/dashboard/reservations/${id}?ok=1`);
    }

    const message = outcome?.error ?? "Failed to update reservation status";
    redirect(`/dashboard/reservations/${id}?error=${encodeURIComponent(message)}`);
  }

  async function updateFullReservationAndRedirect(formData: FormData) {
    "use server";

    const outcome = await updateFullReservation(formData);
    if (outcome?.success) {
      redirect(`/dashboard/reservations/${id}?ok=${encodeURIComponent("Reservation updated")}`);
    }

    const message = outcome?.error ?? "Failed to update reservation";
    redirect(`/dashboard/reservations/${id}?error=${encodeURIComponent(message)}`);
  }

  async function deleteReservationAndRedirect(formData: FormData) {
    "use server";

    const outcome = await deleteReservation(formData);
    if (outcome?.success) {
      redirect(`/dashboard/reservations?ok=${encodeURIComponent("Reservation deleted")}`);
    }

    const message = outcome?.error ?? "Failed to delete reservation";
    redirect(`/dashboard/reservations/${id}?error=${encodeURIComponent(message)}`);
  }

  return (
    <div className="page-shell">
      <div className="page-container max-w-4xl">
        <ClearLocalStorageOnMount enabled={clearDraft === "new-reservation"} storageKey={NEW_RESERVATION_DRAFT_KEY} searchParamToRemove="clearDraft" />
        <FormStatusToast error={error} ok={ok} successTitle="Reservation updated" />

        {walkin === "1" && (
          <WalkInCompleteBanner
            guestName={`${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Guest"}
            roomNumber={room?.room_number ?? null}
            roomTypeName={roomType?.name ?? null}
            checkIn={reservation.check_in}
            checkOut={reservation.check_out}
            nights={nights}
            adults={reservation.adults}
            numChildren={reservation.children}
            ratePlanName={ratePlan?.name ?? null}
            reservationId={reservation.id}
            propertyName={propertyRow?.name ?? null}
          />
        )}

        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/dashboard/reservations">← All Reservations</Link>
          </Button>
          <div className="flex items-center gap-2">
            {canUpdateStatus && (
              <Dialog>
                <DialogTrigger render={<Button variant="outline" size="sm" />}>
                  Edit Reservation
                </DialogTrigger>
                <DialogContent className="max-w-2xl! rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl">
                  <DialogHeader className="gap-2 border-b border-zinc-100 px-6 py-5">
                    <DialogTitle className="text-base font-semibold">Edit reservation</DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-zinc-600">
                      Update guest, room, stay dates, occupancy, rate plan, and notes.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-120px)]">
                    <EditReservationForm
                      reservationId={reservation.id}
                      organizationId={propertyRow?.organization_id ?? ""}
                      action={updateFullReservationAndRedirect}
                      defaultValues={{
                        guestId: first(reservation.guests as { id: string } | Array<{ id: string }> | null)?.id ?? "",
                        checkIn: reservation.check_in,
                        checkOut: reservation.check_out,
                        roomTypeId: assignmentRaw?.room_type_id ?? "",
                        roomId: assignmentRaw?.room_id ?? "",
                        adults: reservation.adults,
                        children: reservation.children,
                        source: reservation.source ?? "",
                        ratePlanId: ratePlan?.id ?? "",
                        notes: reservation.notes ?? "",
                      }}
                      guestOptions={guestOptions}
                      roomTypeOptions={roomTypeOptions}
                      roomOptions={roomOptions}
                      ratePlanOptions={ratePlanOptions}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {canUpdateStatus && (
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
            )}
            {canDelete && (
              <ServerActionDeleteModal
                action={deleteReservationAndRedirect}
                fields={{ reservationId: reservation.id }}
                triggerLabel="Delete"
                triggerVariant="outline"
                triggerSize="sm"
                triggerClassName="text-red-600 hover:text-red-700"
                title="Delete reservation"
                itemName={`${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "this reservation"}
                description="This permanently removes the reservation and all linked records (room assignments, concierge requests without posted charges)."
                confirmText="Delete reservation"
                loadingText="Deleting reservation..."
              />
            )}
            {canCreate && (
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/reservations/new">New Reservation</Link>
              </Button>
            )}
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
                {new Date(reservation.check_in).toLocaleDateString("en-GB")} → {new Date(reservation.check_out).toLocaleDateString("en-GB")} · {nights} night{nights !== 1 ? "s" : ""}
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
                      {new Date(reservation.check_in).toLocaleDateString("en-GB")} to {new Date(reservation.check_out).toLocaleDateString("en-GB")} · {nights} night{nights !== 1 ? "s" : ""}
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
                    <th className="bg-zinc-50 px-4 py-3 text-left font-medium text-zinc-600">Rate plan</th>
                    <td className="px-4 py-3 text-zinc-700">{ratePlan?.name ?? "—"}</td>
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
