"use client";

import { formatCurrencyMinor } from "@/lib/pms/formatting";
import type { ArAgingRow, AgingBucket } from "@/lib/pms/reports/ar-aging";
import { ExportControls } from "@/components/reports/export-controls";
import Link from "next/link";

const BUCKET_LABELS: Record<AgingBucket, string> = {
  current: "0–30 days",
  "31-60": "31–60 days",
  "61-90": "61–90 days",
  "90+": "90+ days",
};

const BUCKET_CLASSES: Record<AgingBucket, string> = {
  current: "bg-emerald-100 text-emerald-800",
  "31-60": "bg-yellow-100 text-yellow-800",
  "61-90": "bg-orange-100 text-orange-800",
  "90+": "bg-red-100 text-red-800",
};

interface ArAgingTableProps {
  rows: ArAgingRow[];
  bucketTotals: Record<AgingBucket, number>;
  grandTotalMinor: number;
  currencyCode: string;
}

export function ArAgingTable({
  rows,
  bucketTotals,
  grandTotalMinor,
  currencyCode,
}: ArAgingTableProps) {
  const exportRows = rows.map((r) => ({
    "Guest": r.guestName,
    "Folio ID": r.folioId,
    "Charges": (r.chargesMinor / 100).toFixed(2),
    "Payments": (r.paymentsMinor / 100).toFixed(2),
    "Balance": (r.balanceMinor / 100).toFixed(2),
    "Age (days)": r.ageDays,
    "Bucket": BUCKET_LABELS[r.bucket],
    "Currency": r.currency,
  }));

  return (
    <div className="space-y-4">
      {/* Aging summary buckets */}
      <div className="grid gap-3 sm:grid-cols-4">
        {(["current", "31-60", "61-90", "90+"] as AgingBucket[]).map((bucket) => (
          <div
            key={bucket}
            className={`rounded-xl border px-4 py-3 text-center ${BUCKET_CLASSES[bucket]} border-current/20`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
              {BUCKET_LABELS[bucket]}
            </p>
            <p className="mt-1 text-xl font-bold">
              {formatCurrencyMinor(bucketTotals[bucket], currencyCode)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {rows.length} outstanding folio{rows.length !== 1 ? "s" : ""} ·{" "}
          <span className="font-semibold text-zinc-900">
            {formatCurrencyMinor(grandTotalMinor, currencyCode)} total
          </span>
        </p>
        <ExportControls rows={exportRows} filename="ar-aging.csv" />
      </div>

      {rows.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-400">
          No outstanding balances — all folios are settled.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
                <th className="px-4 py-3 text-left font-semibold text-zinc-600">Guest</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-600">Charges</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-600">Payments</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-600">Balance</th>
                <th className="px-4 py-3 text-center font-semibold text-zinc-600">Age</th>
                <th className="px-4 py-3 text-center font-semibold text-zinc-600">Bucket</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-600">Folio</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.folioId}
                  className="border-b border-zinc-50 transition-colors hover:bg-zinc-50/60"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">{row.guestName}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                    {formatCurrencyMinor(row.chargesMinor, row.currency)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                    {formatCurrencyMinor(row.paymentsMinor, row.currency)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-zinc-900">
                    {formatCurrencyMinor(row.balanceMinor, row.currency)}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-zinc-600">
                    {row.ageDays}d
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${BUCKET_CLASSES[row.bucket]}`}
                    >
                      {BUCKET_LABELS[row.bucket]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/folios/${row.folioId}`}
                      className="text-xs font-medium text-orange-600 hover:text-orange-800 hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
