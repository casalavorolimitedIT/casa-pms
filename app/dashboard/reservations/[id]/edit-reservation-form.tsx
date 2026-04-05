"use client";

import { useState } from "react";
import { FormComboboxField, type FormComboboxOption } from "@/components/ui/form-combobox-field";
import { QuickAddGuestDialog } from "@/components/custom/quick-add-guest-dialog";
import { FormDateTimeField } from "@/components/ui/form-date-time-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EditReservationFormProps {
  reservationId: string;
  organizationId: string;
  error?: string;
  defaultValues: {
    guestId: string;
    checkIn: string;
    checkOut: string;
    roomTypeId: string;
    roomId: string;
    adults: number;
    children: number;
    source: string;
    ratePlanId: string;
    notes: string;
  };
  guestOptions: FormComboboxOption[];
  roomTypeOptions: FormComboboxOption[];
  roomOptions: FormComboboxOption[];
  ratePlanOptions: FormComboboxOption[];
  action: (formData: FormData) => void | Promise<void>;
}

export function EditReservationForm({
  reservationId,
  organizationId,
  error,
  defaultValues,
  guestOptions: initialGuestOptions,
  roomTypeOptions,
  roomOptions,
  ratePlanOptions,
  action,
}: EditReservationFormProps) {
  const [guestOptions, setGuestOptions] = useState<FormComboboxOption[]>(initialGuestOptions);
  const [selectedGuestId, setSelectedGuestId] = useState(defaultValues.guestId);

  return (
    <>
      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form action={action} className="grid gap-4">
        <input type="hidden" name="reservationId" value={reservationId} />

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="guestId">Guest</Label>
            <QuickAddGuestDialog
              organizationId={organizationId}
              onGuestCreated={({ id, label }) => {
                setGuestOptions((prev) => [...prev, { value: id, label }]);
                setSelectedGuestId(id);
              }}
            />
          </div>
          <FormComboboxField
            id="guestId"
            name="guestId"
            defaultValue={selectedGuestId}
            options={guestOptions}
            placeholder="Search by name or email…"
            emptyStateText="No guests found. Use 'New guest' above to add a walk-in."
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="checkIn">Check-in</Label>
            <FormDateTimeField
              name="checkIn"
              defaultValue={defaultValues.checkIn}
              includeTime={false}
              placeholder="Select check-in date"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="checkOut">Check-out</Label>
            <FormDateTimeField
              name="checkOut"
              defaultValue={defaultValues.checkOut}
              includeTime={false}
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
              defaultValue={defaultValues.roomTypeId}
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
              defaultValue={defaultValues.roomId}
              allowClear
              options={roomOptions}
              placeholder="Auto-assign later"
              emptyStateText="No rooms available for this property."
              emptyStateLinkHref="/dashboard/rooms/new"
              emptyStateLinkLabel="Create room"
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="adults">Adults</Label>
            <Input
              id="adults"
              name="adults"
              type="number"
              min={1}
              max={20}
              defaultValue={defaultValues.adults}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="children">Children</Label>
            <Input
              id="children"
              name="children"
              type="number"
              min={0}
              max={20}
              defaultValue={defaultValues.children}
              required
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="source">Booking source (optional)</Label>
            <Input
              id="source"
              name="source"
              defaultValue={defaultValues.source}
              placeholder="Direct, OTA, Agent, Corporate..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ratePlanId">Rate plan (optional)</Label>
            <FormComboboxField
              id="ratePlanId"
              name="ratePlanId"
              defaultValue={defaultValues.ratePlanId}
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
          <Textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={defaultValues.notes}
            placeholder="Arrival details, requests, billing notes, etc."
          />
        </div>

        <FormSubmitButton
          idleText="Save changes"
          pendingText="Saving..."
          className="bg-[#ff6900] text-white hover:bg-[#e55f00] h-12"
        />
      </form>
    </>
  );
}
