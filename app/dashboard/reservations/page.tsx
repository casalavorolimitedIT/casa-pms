import {
  deleteReservation,
  getReservations,
  updateReservationDetails,
} from "./actions/reservation-actions";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { ServerActionDeleteModal } from "@/components/custom/server-action-delete-modal";
import { FormDateTimeField } from "@/components/ui/form-date-time-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { redirect } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";

const STATUS_TONE: Record<string, string> = {
  tentative: "bg-slate-100 text-slate-700",
  confirmed: "bg-blue-100 text-blue-700",
  checked_in: "bg-emerald-100 text-emerald-700",
  checked_out: "bg-muted text-muted-foreground",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-amber-100 text-amber-700",
};

interface ReservationsPageProps {
  searchParams: Promise<{ status?: string; ok?: string; error?: string }>;
}

export default async function ReservationsPage({
  searchParams,
}: ReservationsPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();

  const { status = "", ok, error } = await searchParams;

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

  const canCreate = await hasPermission(activePropertyId, "reservations.create");
  const canUpdate = await hasPermission(activePropertyId, "reservations.update");
  const canDelete = await hasPermission(activePropertyId, "reservations.cancel");

  async function deleteReservationAndRedirect(formData: FormData) {
    "use server";

    const result = await deleteReservation(formData);
    if (result?.success) {
      redirect(`/dashboard/reservations?ok=${encodeURIComponent("Reservation deleted")}`);
    }

    const message = result?.error ?? "Failed to delete reservation";
    redirect(`/dashboard/reservations?error=${encodeURIComponent(message)}`);
  }

  async function updateReservationDetailsAndRedirect(formData: FormData) {
    "use server";

    const result = await updateReservationDetails(formData);
    if (result?.success) {
      redirect(`/dashboard/reservations?ok=${encodeURIComponent("Reservation updated")}`);
    }

    const message = result?.error ?? "Failed to update reservation";
    redirect(`/dashboard/reservations?error=${encodeURIComponent(message)}`);
  }

  const STATUS_TABS = [
    { label: "All", value: "" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Checked In", value: "checked_in" },
    { label: "Tentative", value: "tentative" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <div className="page-shell">
      <div className="page-container">
      <FormStatusToast ok={ok} error={error} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">
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
          {canCreate && (
            <Button asChild size="sm">
              <Link href="/dashboard/reservations/new">New Reservation</Link>
            </Button>
          )}
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
        <Card className="glass-panel">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-muted-foreground">No reservations found.</p>
            {canCreate && (
              <Button asChild size="sm">
                <Link href="/dashboard/reservations/new">
                  Create first reservation
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="glass-panel overflow-hidden rounded-lg border">
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
                const guestRaw = res.guests as
                  | { first_name?: string; last_name?: string; email?: string | null }
                  | Array<{ first_name?: string; last_name?: string; email?: string | null }>
                  | null;
                const guest = Array.isArray(guestRaw) ? guestRaw[0] ?? null : guestRaw;
                const roomAssignment = (
                  res.reservation_rooms as Array<{
                    rooms: { room_number?: string } | Array<{ room_number?: string }> | null;
                    room_types: { name?: string } | Array<{ name?: string }> | null;
                  }>
                )[0];
                const roomRaw = roomAssignment?.rooms;
                const roomTypeRaw = roomAssignment?.room_types;
                const roomNumber = Array.isArray(roomRaw) ? roomRaw[0]?.room_number : roomRaw?.room_number;
                const roomTypeName = Array.isArray(roomTypeRaw) ? roomTypeRaw[0]?.name : roomTypeRaw?.name;
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
                      <p>{new Date(res.check_in).toLocaleDateString("en-GB")}</p>
                      <p className="text-xs text-muted-foreground">
                        → {new Date(res.check_out).toLocaleDateString("en-GB")}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {roomNumber ? (
                        <span className="font-medium">
                          {roomNumber}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {roomTypeName ?? "—"}
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
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/reservations/${res.id}`}>View</Link>
                        </Button>
                        {/* {canUpdate ? (
                          <Dialog>
                            <DialogTrigger render={<Button variant="ghost" size="sm" />}>
                              Edit
                            </DialogTrigger>
                            <DialogContent className="max-w-xl rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl">
                              <DialogHeader className="gap-2 border-b border-zinc-100 px-6 py-5">
                                <DialogTitle className="text-base font-semibold">Edit reservation</DialogTitle>
                                <DialogDescription className="text-sm leading-6 text-zinc-600">
                                  Update dates, occupancy, source, and notes without leaving this list.
                                </DialogDescription>
                              </DialogHeader>
                              <form action={updateReservationDetailsAndRedirect} className="grid gap-4 px-6 py-5">
                                <input type="hidden" name="reservationId" value={res.id} />
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="grid gap-2">
                                    <Label htmlFor={`checkIn-${res.id}`}>Check-in</Label>
                                    <FormDateTimeField
                                      name="checkIn"
                                      includeTime={false}
                                      defaultValue={res.check_in}
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor={`checkOut-${res.id}`}>Check-out</Label>
                                    <FormDateTimeField
                                      name="checkOut"
                                      includeTime={false}
                                      defaultValue={res.check_out}
                                    />
                                  </div>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="grid gap-2">
                                    <Label htmlFor={`adults-${res.id}`}>Adults</Label>
                                    <Input
                                      id={`adults-${res.id}`}
                                      name="adults"
                                      type="number"
                                      min={1}
                                      max={20}
                                      defaultValue={res.adults}
                                      required
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor={`children-${res.id}`}>Children</Label>
                                    <Input
                                      id={`children-${res.id}`}
                                      name="children"
                                      type="number"
                                      min={0}
                                      max={20}
                                      defaultValue={res.children}
                                      required
                                    />
                                  </div>
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor={`source-${res.id}`}>Source (optional)</Label>
                                  <Input id={`source-${res.id}`} name="source" defaultValue={res.source ?? ""} />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor={`notes-${res.id}`}>Notes (optional)</Label>
                                  <Textarea id={`notes-${res.id}`} name="notes" defaultValue={res.notes ?? ""} rows={4} />
                                </div>
                                <DialogFooter className="px-0 pb-0" showCloseButton>
                                  <FormSubmitButton
                                    idleText="Save details"
                                    pendingText="Saving..."
                                    className="bg-[#ff6900] text-white hover:bg-[#e55f00]"
                                  />
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                        ) : null} */}
                        {canDelete ? (
                          <ServerActionDeleteModal
                            action={deleteReservationAndRedirect}
                            fields={{ reservationId: res.id }}
                            triggerLabel="Delete"
                            triggerVariant="ghost"
                            triggerSize="sm"
                            triggerClassName="text-red-600 hover:text-red-700"
                            title="Delete reservation"
                            itemName={`${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "this reservation"}
                            description="This permanently removes the reservation and room assignment records tied to it."
                            confirmText="Delete reservation"
                            loadingText="Deleting reservation..."
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
