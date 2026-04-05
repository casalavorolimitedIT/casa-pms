"use client";

import { Button } from "@/components/ui/button";

interface WalkInCompleteBannerProps {
  guestName: string;
  roomNumber: string | null;
  roomTypeName: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  numChildren: number;
  ratePlanName: string | null;
  reservationId: string;
  propertyName?: string | null;
}

export function WalkInCompleteBanner({
  guestName,
  roomNumber,
  roomTypeName,
  checkIn,
  checkOut,
  nights,
  adults,
  numChildren,
  ratePlanName,
  reservationId,
  propertyName,
}: WalkInCompleteBannerProps) {
  const shortId = `#${reservationId.slice(0, 8).toUpperCase()}`;
  const checkInFormatted = new Date(checkIn).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const checkOutFormatted = new Date(checkOut).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function handlePrint() {
    window.print();
  }

  const regRows: [string, string][] = [
    ["Guest Name", guestName],
    ["Reservation", shortId],
    ["Check-in", checkInFormatted],
    ["Check-out", checkOutFormatted],
    ["Length of Stay", `${nights} night${nights !== 1 ? "s" : ""}`],
    ["Room", roomNumber ?? "Not assigned"],
    ["Room Type", roomTypeName ?? "\u2014"],
    [
      "Occupancy",
      `${adults} adult${adults !== 1 ? "s" : ""}${
        numChildren > 0 ? `, ${numChildren} child${numChildren !== 1 ? "ren" : ""}` : ""
      }`,
    ],
    ["Rate Plan", ratePlanName ?? "Standard"],
  ];

  return (
    <>
      {/* ── Screen banner ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 print:hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <svg
                className="h-5 w-5 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-emerald-900">
                Walk-in complete &mdash; {guestName} is checked in
              </p>
              <p className="mt-0.5 text-sm text-emerald-700">
                {roomNumber ? `Room ${roomNumber}` : "Room not assigned"} &middot;{" "}
                {nights} night{nights !== 1 ? "s" : ""} &middot; Check-out {checkOutFormatted}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
          >
            Print reg card
          </Button>
        </div>
      </div>

      {/* ── Registration card (hidden on screen, shown when printing) ─── */}
      <div id="reg-card-print" className="hidden print:fixed print:inset-0 print:block print:overflow-auto print:bg-white">
        <div className="font-serif mx-auto max-w-2xl px-10 py-12">

          {/* Header */}
          <div className="border-b-2 border-black pb-5 mb-7 text-center">
            {propertyName ? (
              <p className="text-[11px] tracking-widest uppercase text-gray-500 mb-2">
                {propertyName}
              </p>
            ) : null}
            <h1 className="text-[22px] font-bold mb-1.5">Guest Registration Card</h1>
            <p className="text-xs text-gray-500">{shortId}</p>
          </div>

          {/* Details table */}
          <table className="w-full text-[13px] border-collapse mb-9">
            <tbody>
              {regRows.map(([label, value]) => (
                <tr key={label} className="border-b border-gray-200">
                  <td className="py-2.5 font-semibold text-gray-700 w-[38%]">{label}</td>
                  <td className="py-2.5 text-gray-900">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Terms */}
          <p className="text-[11px] text-gray-500 leading-relaxed mb-12">
            By signing below, the guest confirms that the details above are correct and agrees to
            the property&apos;s terms and conditions, including check-out time, quiet-hours policy,
            and payment of any outstanding charges at check-out.
          </p>

          {/* Signature lines */}
          <div className="flex gap-12">
            <div className="flex-1 border-t border-black pt-2">
              <p className="text-[11px] text-gray-500">Guest signature &amp; date</p>
            </div>
            <div className="flex-1 border-t border-black pt-2">
              <p className="text-[11px] text-gray-500">Receptionist signature &amp; date</p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Print styles — hide everything except the reg card ─────────── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden !important; }
              #reg-card-print, #reg-card-print * { visibility: visible !important; }
            }
          `,
        }}
      />
    </>
  );
}

