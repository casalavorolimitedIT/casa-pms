"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { RegistrationCard } from "@/components/front-desk/registration-card";
import { KeyCardForm } from "@/components/front-desk/key-card-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrencyMinor } from "@/lib/pms/formatting";

// ---------------------------------------------------------------------------
// Prop types — all serializable, computed in the parent RSC
// ---------------------------------------------------------------------------

export type CheckInSheetData = {
  availableRooms: Array<{ id: string; room_number: string }>;
  assignedRoomId?: string | null;
  isEarlyArrival: boolean;
  stdCheckInTime: string;
  earlyFeeMinor: number;
  folioId?: string | null;
  propertyCurrencyCode: string;
};

export type CheckOutSheetData = {
  folioId: string;
  currencyCode: string;
  chargeTotal: number;
  paymentTotal: number;
  balance: number;
  isLateDeparture: boolean;
  stdCheckOutTime: string;
  lateFeeMinor: number;
};

type ReservationSideSheetProps = {
  open: boolean;
  mode: "checkin" | "checkout";
  reservationId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  checkInData?: CheckInSheetData;
  checkOutData?: CheckOutSheetData;
  // Server actions passed as props from the parent RSC
  checkInAction?: (formData: FormData) => Promise<void>;
  checkOutAction?: (formData: FormData) => Promise<void>;
  ok?: string;
  error?: string;
};

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function ReservationSideSheet({
  open,
  mode,
  reservationId,
  guestName,
  checkIn,
  checkOut,
  checkInData,
  checkOutData,
  checkInAction,
  checkOutAction,
  ok,
  error,
}: ReservationSideSheetProps) {
  const router = useRouter();

  function handleClose() {
    router.push("/dashboard/stay-view");
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        {/* ── Sticky header ────────────────────────────────────────── */}
        <SheetHeader className="sticky top-0 z-10 border-b border-zinc-100 bg-white px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate text-base font-semibold leading-tight text-zinc-900">
                {guestName}
              </SheetTitle>
              <p className="mt-0.5 text-xs text-zinc-500">
                {new Date(checkIn).toLocaleDateString("en-GB")} →{" "}
                {new Date(checkOut).toLocaleDateString("en-GB")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {mode === "checkin" ? (
                <Badge className="border-blue-200 bg-blue-100 text-blue-700 text-xs">
                  Arrival
                </Badge>
              ) : (
                <Badge className="border-amber-200 bg-amber-100 text-amber-800 text-xs">
                  Departure
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleClose}
                aria-label="Close"
                className="text-zinc-400 hover:text-zinc-700"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* ── Scrollable content ───────────────────────────────────── */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Toast messages */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {mode === "checkin" && checkInData && checkInAction && (
            <CheckInContent
              reservationId={reservationId}
              guestName={guestName}
              checkIn={checkIn}
              checkOut={checkOut}
              data={checkInData}
              action={checkInAction}
              ok={ok}
            />
          )}

          {mode === "checkout" && checkOutData && checkOutAction && (
            <CheckOutContent
              reservationId={reservationId}
              guestName={guestName}
              data={checkOutData}
              action={checkOutAction}
            />
          )}
        </div>

        {/* ── Quick-action footer ──────────────────────────────────── */}
        <div className="flex gap-4 border-t border-zinc-100 bg-zinc-50 px-5 py-3 text-xs text-zinc-500">
          <Link
            href="/dashboard/reservations"
            className="transition-colors hover:text-zinc-800"
          >
            All reservations
          </Link>
          {mode === "checkin" && checkInData?.folioId && ok && (
            <Link
              href={`/dashboard/folios/${checkInData.folioId}`}
              className="transition-colors hover:text-zinc-800"
            >
              Open folio
            </Link>
          )}
          {mode === "checkout" && checkOutData?.folioId && (
            <Link
              href={`/dashboard/folios/${checkOutData.folioId}`}
              className="transition-colors hover:text-zinc-800"
            >
              Open folio
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Check-in panel
// ---------------------------------------------------------------------------

function CheckInContent({
  reservationId,
  guestName,
  checkIn,
  checkOut,
  data,
  action,
  ok,
}: {
  reservationId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  data: CheckInSheetData;
  action: (formData: FormData) => Promise<void>;
  ok?: string;
}) {
  // After a successful check-in, show confirmation + key card + folio link
  if (ok && data.folioId) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
          <p className="font-semibold text-emerald-900">Check-in complete</p>
          <p className="mt-1 text-emerald-800">
            The folio is open and ready for charges.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={`/dashboard/folios/${data.folioId}`}>Open Folio →</Link>
            </Button>
          </div>
        </div>
        {data.assignedRoomId && (
          <KeyCardForm reservationId={reservationId} roomId={data.assignedRoomId} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Registration card */}
      <RegistrationCard
        guestName={guestName}
        reservationId={reservationId}
        checkIn={checkIn}
        checkOut={checkOut}
        roomNumber={
          data.assignedRoomId
            ? (data.availableRooms.find((r) => r.id === data.assignedRoomId)
                ?.room_number ?? null)
            : null
        }
      />

      {/* Key card (only if room is already pre-assigned) */}
      {data.assignedRoomId && (
        <KeyCardForm reservationId={reservationId} roomId={data.assignedRoomId} />
      )}

      {/* Arrival form */}
      <form action={action} className="space-y-4">
        <input type="hidden" name="reservationId" value={reservationId} />

        <div className="space-y-1.5">
          <Label>Assign Room</Label>
          <FormSelectField
            name="roomId"
            defaultValue={data.assignedRoomId ?? ""}
            options={data.availableRooms.map((r) => ({
              value: r.id,
              label: r.room_number,
            }))}
            placeholder="Select vacant room"
            emptyStateText="No vacant rooms available for this room type."
            emptyStateLinkHref="/dashboard/rooms/new"
            emptyStateLinkLabel="Add a room"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="ci-idVerified"
            name="idVerified"
            type="checkbox"
            className="h-4 w-4"
            aria-label="ID verified at desk"
          />
          <Label htmlFor="ci-idVerified" className="cursor-pointer text-sm font-normal">
            ID verified at desk
          </Label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ci-paymentEmail">Card hold email</Label>
            <Input
              id="ci-paymentEmail"
              name="paymentEmail"
              type="email"
              placeholder="guest@email.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ci-setupAmountMinor">Hold amount (minor)</Label>
            <Input
              id="ci-setupAmountMinor"
              name="setupAmountMinor"
              type="number"
              min={0}
              defaultValue={0}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ci-paymentCurrency">Currency</Label>
            <Input
              id="ci-paymentCurrency"
              name="paymentCurrency"
              defaultValue={data.propertyCurrencyCode}
            />
          </div>
        </div>

        {data.isEarlyArrival && (
          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <p className="font-semibold text-amber-900">
              Early arrival — standard check-in is {data.stdCheckInTime}
            </p>
            <p className="text-amber-800">
              Fee: {data.earlyFeeMinor} minor units configured.
            </p>
            <div className="flex items-center gap-2">
              <input
                id="ci-postEarlyFee"
                name="postEarlyFee"
                type="checkbox"
                className="h-4 w-4"
                aria-label="Post early check-in fee"
                defaultChecked
              />
              <Label
                htmlFor="ci-postEarlyFee"
                className="cursor-pointer text-sm font-normal"
              >
                Post early check-in fee to folio
              </Label>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <FormSubmitButton
            idleText="Confirm Check-in"
            pendingText="Checking in…"
            className="flex-1"
          />
          <Button type="reset" variant="outline" size="sm">
            Reset
          </Button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Check-out panel
// ---------------------------------------------------------------------------

function CheckOutContent({
  reservationId,
  guestName,
  data,
  action,
}: {
  reservationId: string;
  guestName: string;
  data: CheckOutSheetData;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="space-y-5">
      {/* Stay summary */}
      <div className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200">
        <div className="bg-zinc-50 px-4 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Stay Summary
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm">
          <SummaryItem label="Guest" value={guestName} />
          <SummaryItem
            label="Charges"
            value={formatCurrencyMinor(data.chargeTotal, data.currencyCode)}
          />
          <SummaryItem
            label="Payments"
            value={formatCurrencyMinor(data.paymentTotal, data.currencyCode)}
          />
          <SummaryItem
            label="Balance"
            value={formatCurrencyMinor(data.balance, data.currencyCode)}
            highlight={data.balance > 0}
          />
        </div>
      </div>

      {data.isLateDeparture && (
        <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <p className="font-semibold text-amber-900">
            Late departure — standard check-out was {data.stdCheckOutTime}
          </p>
          <p className="text-amber-800">
            Late fee: {data.lateFeeMinor} minor units configured.
          </p>
        </div>
      )}

      <form action={action} className="space-y-4">
        <input type="hidden" name="reservationId" value={reservationId} />
        <input type="hidden" name="folioId" value={data.folioId} />

        {data.isLateDeparture && (
          <div className="flex items-center gap-2">
            <input
              id="co-postLateFee"
              name="postLateFee"
              type="checkbox"
              className="h-4 w-4"
              aria-label="Post late check-out fee"
              defaultChecked
            />
            <Label
              htmlFor="co-postLateFee"
              className="cursor-pointer text-sm font-normal"
            >
              Post late check-out fee to folio
            </Label>
          </div>
        )}

        {data.balance <= 0 ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Folio is fully settled — no outstanding balance.
            </div>
            <input type="hidden" name="amountMinor" value="0" />
            <input type="hidden" name="currency" value={data.currencyCode} />
            <input type="hidden" name="paymentMethod" value="cash" />
            <div className="flex gap-2">
              <FormSubmitButton
                idleText="Complete Check-out"
                pendingText="Checking out…"
                className="flex-1"
              />
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/folios/${data.folioId}`}>Folio</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="co-amountMinor">Amount (minor units)</Label>
                <Input
                  id="co-amountMinor"
                  name="amountMinor"
                  type="number"
                  min={0}
                  defaultValue={Math.max(0, data.balance)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="co-currency">Currency</Label>
                <Input
                  id="co-currency"
                  name="currency"
                  defaultValue={data.currencyCode}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="co-paymentMethod">Payment method</Label>
                <FormSelectField
                  name="paymentMethod"
                  defaultValue="card"
                  options={[
                    { value: "card", label: "Card" },
                    { value: "cash", label: "Cash" },
                    { value: "bank_transfer", label: "Bank transfer" },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="co-email">Email (card gateway)</Label>
                <Input
                  id="co-email"
                  name="email"
                  type="email"
                  placeholder="guest@email.com"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <FormSubmitButton
                idleText="Complete Check-out"
                pendingText="Checking out…"
                className="flex-1"
              />
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/folios/${data.folioId}`}>Folio</Link>
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function SummaryItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p
        className={`text-sm font-semibold ${highlight ? "text-red-600" : "text-zinc-900"}`}
      >
        {value}
      </p>
    </div>
  );
}
