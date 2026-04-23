"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  createReservation,
  createWalkInReservation,
} from "@/app/dashboard/reservations/actions/reservation-actions";
import { appToast } from "@/components/custom/toast-ui";
import { FormComboboxField, type FormComboboxOption } from "@/components/ui/form-combobox-field";
import { FormDateTimeField } from "@/components/ui/form-date-time-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { QuickAddGuestDialog } from "@/components/custom/quick-add-guest-dialog";
import { cn } from "@/lib/utils";

type RoomOption = FormComboboxOption & {
  status: string;
};

interface ReservationCalendarBookingModalProps {
  activePropertyId: string;
  defaultCheckIn: string;
  defaultCheckOut: string;
  defaultRoomId: string;
  defaultRoomTypeId: string;
  guestOptions: FormComboboxOption[];
  roomTypeOptions: FormComboboxOption[];
  roomOptions: RoomOption[];
  ratePlanOptions: FormComboboxOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

type Draft = {
  guestId: string;
  checkIn: string;
  checkOut: string;
  roomTypeId: string;
  roomId: string;
  adults: string;
  children: string;
  source: string;
  ratePlanId: string;
  notes: string;
};

const EMPTY_DRAFT: Draft = {
  guestId: "",
  checkIn: "",
  checkOut: "",
  roomTypeId: "",
  roomId: "",
  adults: "1",
  children: "0",
  source: "",
  ratePlanId: "",
  notes: "",
};

function buildInitialDraft(
  defaultCheckIn: string,
  defaultCheckOut: string,
  defaultRoomId: string,
  defaultRoomTypeId: string,
): Draft {
  return {
    ...EMPTY_DRAFT,
    checkIn: defaultCheckIn,
    checkOut: defaultCheckOut,
    roomId: defaultRoomId,
    roomTypeId: defaultRoomTypeId,
  };
}

export function ReservationCalendarBookingModal({
  activePropertyId,
  defaultCheckIn,
  defaultCheckOut,
  defaultRoomId,
  defaultRoomTypeId,
  guestOptions,
  roomTypeOptions,
  roomOptions,
  ratePlanOptions,
  open,
  onOpenChange,
  onCreated,
}: ReservationCalendarBookingModalProps) {
  const [mode, setMode] = useState<"advance" | "walkin">("advance");
  const [draft, setDraft] = useState<Draft>(() =>
    buildInitialDraft(defaultCheckIn, defaultCheckOut, defaultRoomId, defaultRoomTypeId),
  );
  const [idVerified, setIdVerified] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState(0);
  const [localGuestOptions, setLocalGuestOptions] = useState<FormComboboxOption[]>(() => guestOptions);
  const walkInStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open || mode !== "walkin") {
      walkInStartRef.current = null;
      return;
    }

    walkInStartRef.current = Date.now();
    const interval = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - (walkInStartRef.current ?? Date.now())) / 1000));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [mode, open]);

  const filteredRoomOptions = useMemo(() => {
    if (mode !== "walkin") return roomOptions;
    return roomOptions.filter((room) => ["vacant", "inspection"].includes(room.status));
  }, [mode, roomOptions]);

  function formatElapsed(totalSeconds: number) {
    return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
  }

  function activateWalkInMode() {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setMode("walkin");
    setIdVerified(false);
    setElapsed(0);
    setDraft((current) => ({
      ...current,
      checkIn: today,
      checkOut: current.checkOut && current.checkOut > today ? current.checkOut : tomorrow.toISOString().slice(0, 10),
      source: "Walk-in",
    }));
  }

  function activateAdvanceMode() {
    setMode("advance");
    setElapsed(0);
    setDraft((current) => ({
      ...current,
      source: current.source === "Walk-in" ? "" : current.source,
    }));
  }

  function updateField<Key extends keyof Draft>(key: Key, value: Draft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("propertyId", activePropertyId);

    startTransition(async () => {
      const result = mode === "walkin"
        ? await createWalkInReservation(formData)
        : await createReservation(formData);

      if (result?.error) {
        appToast.error("Unable to create reservation", { description: result.error });
        return;
      }

      appToast.success(mode === "walkin" ? "Walk-in checked in." : "Reservation created.");
      onOpenChange(false);
      onCreated();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh]! max-w-xl! overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-0 shadow-2xl">
        <DialogHeader className="border-b border-zinc-200 px-6 py-5">
          <DialogTitle className="text-xl font-semibold text-zinc-900">Create Reservation From Calendar</DialogTitle>
          <DialogDescription>
            Clicked date is prefilled. Switch between advance booking and walk-in without leaving the calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5">
          <div className="mb-5 flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 gap-1">
            <button
              type="button"
              onClick={activateAdvanceMode}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                mode === "advance" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700",
              )}
            >
              Advance Booking
            </button>
            <button
              type="button"
              onClick={activateWalkInMode}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                mode === "walkin" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700",
              )}
            >
              Walk-in
            </button>
          </div>

          {mode === "walkin" ? (
            <div className="mb-5 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                <span className="text-sm font-medium text-amber-800">Guest is at the desk — timer started</span>
              </div>
              <span className="font-mono text-sm font-semibold tabular-nums text-amber-700">{formatElapsed(elapsed)}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="grid gap-4">
            <input type="hidden" name="propertyId" value={activePropertyId} />
            {mode === "walkin" ? <input type="hidden" name="source" value="Walk-in" /> : null}

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="calendar-guestId">Guest</Label>
                <QuickAddGuestDialog
                  organizationId=""
                  onGuestCreated={({ id, label }) => {
                    setLocalGuestOptions((prev) => [...prev, { value: id, label }]);
                    updateField("guestId", id);
                  }}
                />
              </div>
              <FormComboboxField
                id="calendar-guestId"
                name="guestId"
                defaultValue={draft.guestId}
                onValueChange={(value) => updateField("guestId", value)}
                options={localGuestOptions}
                placeholder="Search guest..."
                emptyStateText="No guests found. Use 'New guest' above to add one."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Check-in</Label>
                <FormDateTimeField
                  name="checkIn"
                  disablePastDates={true}
                  defaultValue={draft.checkIn}
                  includeTime={false}
                  onValueChange={(value) => updateField("checkIn", value)}
                  placeholder="Select check-in date"
                />
              </div>
              <div className="grid gap-2">
                <Label>Check-out</Label>
                <FormDateTimeField
                  name="checkOut"
                  defaultValue={draft.checkOut}
                  includeTime={false}
                  onValueChange={(value) => updateField("checkOut", value)}
                  placeholder="Select check-out date"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Room Type</Label>
                <FormComboboxField
                  name="roomTypeId"
                  defaultValue={draft.roomTypeId}
                  onValueChange={(value) => updateField("roomTypeId", value)}
                  options={roomTypeOptions}
                  placeholder="Select room type"
                />
              </div>
              <div className="grid gap-2">
                <Label>{mode === "walkin" ? "Room" : "Room (optional)"}</Label>
                <FormComboboxField
                  name="roomId"
                  defaultValue={draft.roomId}
                  onValueChange={(value) => updateField("roomId", value)}
                  allowClear={mode !== "walkin"}
                  options={filteredRoomOptions}
                  placeholder={mode === "walkin" ? "Assign room now" : "Assign room later"}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="calendar-adults">Adults</Label>
                <Input id="calendar-adults" name="adults" min={1} max={20} type="number" value={draft.adults} onChange={(event) => updateField("adults", event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="calendar-children">Children</Label>
                <Input id="calendar-children" name="children" min={0} max={20} type="number" value={draft.children} onChange={(event) => updateField("children", event.target.value)} required />
              </div>
            </div>

            {mode === "advance" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="calendar-source">Booking Source</Label>
                  <Input id="calendar-source" name="source" value={draft.source} onChange={(event) => updateField("source", event.target.value)} placeholder="Direct, OTA, Agent..." />
                </div>
                <div className="grid gap-2">
                  <Label>Rate Plan</Label>
                  <FormComboboxField
                    name="ratePlanId"
                    defaultValue={draft.ratePlanId}
                    onValueChange={(value) => updateField("ratePlanId", value)}
                    allowClear
                    options={ratePlanOptions}
                    placeholder="No rate plan"
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Rate Plan</Label>
                <FormComboboxField
                  name="ratePlanId"
                  defaultValue={draft.ratePlanId}
                  onValueChange={(value) => updateField("ratePlanId", value)}
                  allowClear
                  options={ratePlanOptions}
                  placeholder="No rate plan"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="calendar-notes">Notes</Label>
              <Textarea id="calendar-notes" name="notes" rows={mode === "walkin" ? 2 : 4} value={draft.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Arrival details, requests, billing notes..." />
            </div>

            {mode === "walkin" ? (
              <label className={cn(
                "flex items-start gap-3 rounded-xl border px-4 py-3",
                idVerified ? "border-emerald-300 bg-emerald-50" : "border-zinc-200 bg-zinc-50",
              )}>
                <input
                  checked={idVerified}
                  className="mt-1 h-4 w-4 accent-[#ff6900]"
                  id="calendar-idVerified"
                  name="idVerified"
                  onChange={(event) => setIdVerified(event.target.checked)}
                  type="checkbox"
                />
                <div>
                  <p className="text-sm font-medium text-zinc-800">ID verified at the desk</p>
                  <p className="text-xs text-zinc-500">Required before immediate check-in.</p>
                </div>
              </label>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                className={mode === "walkin" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-[#ff6900] text-white hover:bg-[#e55f00]"}
                disabled={isPending || (mode === "walkin" && !idVerified)}
              >
                {isPending ? "Saving..." : mode === "walkin" ? "Check In Now" : "Create Reservation"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}