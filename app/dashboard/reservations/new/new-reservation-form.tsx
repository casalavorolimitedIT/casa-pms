"use client";

import { useEffect, useState } from "react";
import { FormComboboxField, type FormComboboxOption } from "@/components/ui/form-combobox-field";
import { FormDateTimeField } from "@/components/ui/form-date-time-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NEW_RESERVATION_DRAFT_KEY } from "@/lib/reservations/draft";

interface NewReservationDraft {
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
}

interface NewReservationFormProps {
  activePropertyId: string;
  error?: string;
  guestOptions: FormComboboxOption[];
  roomTypeOptions: FormComboboxOption[];
  roomOptions: FormComboboxOption[];
  ratePlanOptions: FormComboboxOption[];
  action: (formData: FormData) => void | Promise<void>;
}

const EMPTY_DRAFT: NewReservationDraft = {
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

function normalizeDraft(raw: unknown): NewReservationDraft {
  if (!raw || typeof raw !== "object") return EMPTY_DRAFT;
  const value = raw as Partial<Record<keyof NewReservationDraft, unknown>>;

  return {
    guestId: typeof value.guestId === "string" ? value.guestId : "",
    checkIn: typeof value.checkIn === "string" ? value.checkIn : "",
    checkOut: typeof value.checkOut === "string" ? value.checkOut : "",
    roomTypeId: typeof value.roomTypeId === "string" ? value.roomTypeId : "",
    roomId: typeof value.roomId === "string" ? value.roomId : "",
    adults: typeof value.adults === "string" && value.adults ? value.adults : "1",
    children: typeof value.children === "string" && value.children ? value.children : "0",
    source: typeof value.source === "string" ? value.source : "",
    ratePlanId: typeof value.ratePlanId === "string" ? value.ratePlanId : "",
    notes: typeof value.notes === "string" ? value.notes : "",
  };
}

export function NewReservationForm({
  activePropertyId,
  error,
  guestOptions,
  roomTypeOptions,
  roomOptions,
  ratePlanOptions,
  action,
}: NewReservationFormProps) {
  const [draft, setDraft] = useState<NewReservationDraft>(EMPTY_DRAFT);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  useEffect(() => {
    try {
      const savedDraft = window.localStorage.getItem(NEW_RESERVATION_DRAFT_KEY);
      if (savedDraft) {
        setDraft(normalizeDraft(JSON.parse(savedDraft)));
      }
    } catch {
      window.localStorage.removeItem(NEW_RESERVATION_DRAFT_KEY);
    } finally {
      setHasLoadedDraft(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedDraft) return;
    window.localStorage.setItem(NEW_RESERVATION_DRAFT_KEY, JSON.stringify(draft));
  }, [draft, hasLoadedDraft]);

  function updateField<Key extends keyof NewReservationDraft>(key: Key, value: NewReservationDraft[Key]) {
    setDraft((current) => {
      if (current[key] === value) return current;
      return { ...current, [key]: value };
    });
  }

  return (
    <>
      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form action={action} className="grid gap-4">
        <input type="hidden" name="propertyId" value={activePropertyId} />

        <div className="grid gap-2">
          <Label htmlFor="guestId">Guest</Label>
          <FormComboboxField
            id="guestId"
            name="guestId"
            defaultValue={draft.guestId}
            onValueChange={(value) => updateField("guestId", value)}
            options={guestOptions}
            placeholder="Select guest"
            emptyStateText="No guests available for this organization."
            emptyStateLinkHref="/dashboard/guests/new"
            emptyStateLinkLabel="Create guest"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="checkIn">Check-in</Label>
            <FormDateTimeField
              name="checkIn"
              defaultValue={draft.checkIn}
              includeTime={false}
              onValueChange={(value) => updateField("checkIn", value)}
              placeholder="Select check-in date"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="checkOut">Check-out</Label>
            <FormDateTimeField
              name="checkOut"
              defaultValue={draft.checkOut}
              includeTime={false}
              onValueChange={(value) => updateField("checkOut", value)}
              placeholder="Select check-out date"
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="roomTypeId">Room type</Label>
            <FormComboboxField
              id="roomTypeId"
              name="roomTypeId"
              defaultValue={draft.roomTypeId}
              onValueChange={(value) => updateField("roomTypeId", value)}
              options={roomTypeOptions}
              placeholder="Select room type"
              emptyStateText="No room types available for this property."
              emptyStateLinkHref="/dashboard/rooms/types"
              emptyStateLinkLabel="Create room type"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="roomId">Room (optional)</Label>
            <FormComboboxField
              id="roomId"
              name="roomId"
              defaultValue={draft.roomId}
              onValueChange={(value) => updateField("roomId", value)}
              allowClear
              options={roomOptions}
              placeholder="Auto-assign later"
              emptyStateText="No vacant rooms available right now."
              emptyStateLinkHref="/dashboard/rooms/new"
              emptyStateLinkLabel="Create room"
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="adults">Adults</Label>
            <Input id="adults" name="adults" type="number" min={1} max={20} value={draft.adults} onChange={(event) => updateField("adults", event.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="children">Children</Label>
            <Input id="children" name="children" type="number" min={0} max={20} value={draft.children} onChange={(event) => updateField("children", event.target.value)} required />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="source">Booking source (optional)</Label>
            <Input id="source" name="source" value={draft.source} onChange={(event) => updateField("source", event.target.value)} placeholder="Direct, OTA, Agent, Corporate..." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ratePlanId">Rate plan (optional)</Label>
            <FormComboboxField
              id="ratePlanId"
              name="ratePlanId"
              defaultValue={draft.ratePlanId}
              onValueChange={(value) => updateField("ratePlanId", value)}
              allowClear
              options={ratePlanOptions}
              placeholder="No rate plan"
              emptyStateText="No rate plans configured for this property."
              emptyStateLinkHref="/dashboard/rates"
              emptyStateLinkLabel="Manage rates"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea id="notes" name="notes" rows={4} value={draft.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Arrival details, requests, billing notes, etc." />
        </div>

        <FormSubmitButton idleText="Create reservation" pendingText="Creating..." className="bg-[#ff6900] text-white hover:bg-[#e55f00]" />
      </form>
    </>
  );
}