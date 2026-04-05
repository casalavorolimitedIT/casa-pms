"use client";

import { useEffect, useRef, useState } from "react";
import { FormComboboxField, type FormComboboxOption } from "@/components/ui/form-combobox-field";
import { QuickAddGuestDialog } from "@/components/custom/quick-add-guest-dialog";
import { FormDateTimeField } from "@/components/ui/form-date-time-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NEW_RESERVATION_DRAFT_KEY } from "@/lib/reservations/draft";
import { cn } from "@/lib/utils";

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
  organizationId: string;
  error?: string;
  guestOptions: FormComboboxOption[];
  roomTypeOptions: FormComboboxOption[];
  roomOptions: FormComboboxOption[];
  ratePlanOptions: FormComboboxOption[];
  action: (formData: FormData) => void | Promise<void>;
  walkInAction: (formData: FormData) => void | Promise<void>;
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

function formatElapsed(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function NewReservationForm({
  activePropertyId,
  organizationId,
  error,
  guestOptions: initialGuestOptions,
  roomTypeOptions,
  roomOptions,
  ratePlanOptions,
  action,
  walkInAction,
}: NewReservationFormProps) {
  const [mode, setMode] = useState<"advance" | "walkin">("advance");
  const [draft, setDraft] = useState<NewReservationDraft>(EMPTY_DRAFT);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [guestOptions, setGuestOptions] = useState<FormComboboxOption[]>(initialGuestOptions);
  const [idVerified, setIdVerified] = useState(false);

  // Walk-in timer
  const walkinStartRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (mode !== "walkin") {
      walkinStartRef.current = null;
      setElapsed(0);
      return;
    }
    walkinStartRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - (walkinStartRef.current ?? Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [mode]);

  // Auto-set check-in to today + source when entering walk-in mode
  useEffect(() => {
    if (mode === "walkin") {
      const today = new Date().toISOString().split("T")[0] ?? "";
      setDraft((prev) => ({ ...prev, checkIn: today, source: "Walk-in" }));
      setIdVerified(false);
    }
  }, [mode]);

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

  const isWalkIn = mode === "walkin";

  return (
    <>
      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* ── Mode toggle ─────────────────────────────────────────────── */}
      <div className="flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 gap-1">
        <button
          type="button"
          onClick={() => setMode("advance")}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all",
            !isWalkIn
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700",
          )}
        >
          Advance Booking
        </button>
        <button
          type="button"
          onClick={() => setMode("walkin")}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all",
            isWalkIn
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700",
          )}
        >
          Walk-in
        </button>
      </div>

      {/* ── Walk-in timer banner ─────────────────────────────────────── */}
      {isWalkIn && (
        <div className="flex mt-2 items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            <span className="text-sm font-medium text-amber-800">Guest is at the desk — timer started</span>
          </div>
          <span className="font-mono text-sm font-semibold tabular-nums text-amber-700">{formatElapsed(elapsed)}</span>
        </div>
      )}

      <form action={isWalkIn ? walkInAction : action} className="grid gap-4">
        <input type="hidden" name="propertyId" value={activePropertyId} />

        {/* ── Guest ─────────────────────────────────────────────────── */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="guestId">Guest</Label>
            <QuickAddGuestDialog
              organizationId={organizationId}
              onGuestCreated={({ id, label }) => {
                setGuestOptions((prev) => [...prev, { value: id, label }]);
                updateField("guestId", id);
              }}
            />
          </div>
          <FormComboboxField
            id="guestId"
            name="guestId"
            defaultValue={draft.guestId}
            onValueChange={(value) => updateField("guestId", value)}
            options={guestOptions}
            placeholder="Search by name or email…"
            emptyStateText="No guests found. Use 'New guest' above to add a walk-in."
          />
        </div>

        {/* ── Stay dates ────────────────────────────────────────────── */}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="checkIn">
              Check-in{isWalkIn && <span className="ml-1.5 text-xs font-normal text-zinc-400">(today)</span>}
            </Label>
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

        {/* ── Room type + Room ──────────────────────────────────────── */}
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
            <Label htmlFor="roomId">
              {isWalkIn ? (
                <>Room <span className="ml-1 text-xs font-normal text-red-500">required</span></>
              ) : (
                "Room (optional)"
              )}
            </Label>
            <FormComboboxField
              id="roomId"
              name="roomId"
              defaultValue={draft.roomId}
              onValueChange={(value) => updateField("roomId", value)}
              allowClear={!isWalkIn}
              options={roomOptions}
              placeholder={isWalkIn ? "Select room to assign now" : "Auto-assign later"}
              emptyStateText="No vacant rooms available right now."
              emptyStateLinkHref="/dashboard/rooms/new"
              emptyStateLinkLabel="Create room"
            />
          </div>
        </div>

        {/* ── Occupancy ─────────────────────────────────────────────── */}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="adults">Adults</Label>
            <Input id="adults" name="adults" type="number" min={1} max={20} value={draft.adults} onChange={(e) => updateField("adults", e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="children">Children</Label>
            <Input id="children" name="children" type="number" min={0} max={20} value={draft.children} onChange={(e) => updateField("children", e.target.value)} required />
          </div>
        </div>

        {/* ── Source + Rate plan (advance booking only shown in full; walk-in keeps rate) */}
        {!isWalkIn && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="source">Booking source (optional)</Label>
              <Input id="source" name="source" value={draft.source} onChange={(e) => updateField("source", e.target.value)} placeholder="Direct, OTA, Agent, Corporate…" />
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
        )}

        {isWalkIn && (
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
        )}

        {/* ── Source hidden for walk-in (auto "Walk-in") */}
        {isWalkIn && <input type="hidden" name="source" value="Walk-in" />}

        {/* ── Notes ─────────────────────────────────────────────────── */}
        <div className="grid gap-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea id="notes" name="notes" rows={isWalkIn ? 2 : 4} value={draft.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Arrival details, requests, billing notes, etc." />
        </div>

        {/* ── ID verification (walk-in only) ────────────────────────── */}
        {isWalkIn && (
          <label
            htmlFor="idVerified"
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
              idVerified
                ? "border-emerald-300 bg-emerald-50"
                : "border-zinc-200 bg-zinc-50 hover:border-zinc-300",
            )}
          >
            <input
              type="checkbox"
              id="idVerified"
              name="idVerified"
              checked={idVerified}
              onChange={(e) => setIdVerified(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#ff6900]"
            />
            <div>
              <p className={cn("text-sm font-medium", idVerified ? "text-emerald-800" : "text-zinc-700")}>
                ID verified at desk
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Required. Check passport, national ID, or driver&apos;s licence before checking in.
              </p>
            </div>
          </label>
        )}

        {/* ── Submit ────────────────────────────────────────────────── */}
        {isWalkIn ? (
          <FormSubmitButton
            idleText="Check In Now"
            pendingText="Checking in…"
            disabled={!idVerified}
            className={cn(
              "h-12 text-white transition-colors",
              idVerified
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "cursor-not-allowed bg-zinc-300",
            )}
          />
        ) : (
          <FormSubmitButton
            idleText="Create reservation"
            pendingText="Creating…"
            className="h-12 bg-[#ff6900] text-white hover:bg-[#e55f00]"
          />
        )}
      </form>
    </>
  );
}