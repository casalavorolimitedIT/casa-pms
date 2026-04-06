"use client";

import type { HkAttendantRow } from "@/lib/pms/reports/housekeeping";
import { ExportControls } from "@/components/reports/export-controls";

interface HousekeepingProductivityTableProps {
  rows: HkAttendantRow[];
  totalCompleted: number;
  totalPending: number;
}

export function HousekeepingProductivityTable({
  rows,
  totalCompleted,
  totalPending,
}: HousekeepingProductivityTableProps) {
  const exportRows = rows.map((r) => ({
    Attendant: r.attendantName,
    Completed: r.completed,
    "In Progress": r.inProgress,
    Pending: r.pending,
    Total: r.total,
  }));

  if (rows.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-zinc-400">
        No housekeeping assignments found for this period.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {rows.length} attendant{rows.length !== 1 ? "s" : ""} ·{" "}
          <span className="font-semibold text-zinc-900">{totalCompleted} completed</span>
          {totalPending > 0 && (
            <span className="ml-2 text-amber-600">{totalPending} pending</span>
          )}
        </p>
        <ExportControls rows={exportRows} filename="housekeeping-productivity.csv" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80">
              <th className="px-4 py-3 text-left font-semibold text-zinc-600">Attendant</th>
              <th className="px-4 py-3 text-center font-semibold text-zinc-600">Completed</th>
              <th className="px-4 py-3 text-center font-semibold text-zinc-600">In Progress</th>
              <th className="px-4 py-3 text-center font-semibold text-zinc-600">Pending</th>
              <th className="px-4 py-3 text-center font-semibold text-zinc-600">Total</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-600">Completion %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const completionPct =
                row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0;
              return (
                <tr
                  key={row.attendantId ?? "unassigned"}
                  className="border-b border-zinc-50 transition-colors hover:bg-zinc-50/60"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">{row.attendantName}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      {row.completed}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-zinc-600">
                    {row.inProgress}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.pending > 0 ? (
                      <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        {row.pending}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums font-medium text-zinc-700">
                    {row.total}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all [width:var(--pct)]"
                          style={{ "--pct": `${completionPct}%` } as React.CSSProperties}
                        />
                      </div>
                      <span className="w-10 text-right tabular-nums text-sm text-zinc-700">
                        {completionPct}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
