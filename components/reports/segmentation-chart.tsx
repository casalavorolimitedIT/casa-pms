"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SegmentDatum } from "@/lib/pms/reports/segmentation";
import { ExportControls } from "@/components/reports/export-controls";

const SEGMENT_COLORS = [
  "#ff6900", "#ff9f5a", "#3b82f6", "#10b981", "#a78bfa",
  "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6", "#f97316",
];

function formatMinor(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value / 100);
}

interface SegmentationChartProps {
  segments: SegmentDatum[];
  totalReservations: number;
  totalRevenueMinor: number;
  currencyCode: string;
}

export function SegmentationChart({
  segments,
  totalReservations,
  totalRevenueMinor,
  currencyCode,
}: SegmentationChartProps) {
  const exportRows = segments.map((s) => ({
    Source: s.source,
    Reservations: s.reservations,
    "Revenue": (s.revenueMinor / 100).toFixed(2),
    "Share %": s.sharePct,
  }));

  if (segments.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-zinc-400">
        No reservation data for this period.
      </div>
    );
  }

  const pieData = segments.map((s) => ({
    name: s.source,
    value: s.reservations,
  }));

  const barData = segments.map((s) => ({
    source: s.source,
    reservations: s.reservations,
    revenue: s.revenueMinor / 100,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {totalReservations} reservations ·{" "}
          <span className="font-semibold text-zinc-900">
            {formatMinor(totalRevenueMinor, currencyCode)} total revenue
          </span>
        </p>
        <ExportControls rows={exportRows} filename="segmentation.csv" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie chart — reservation share */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Reservation Share
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {pieData.map((_, index) => (
                  <Cell key={index} fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number | string | readonly (number | string)[] | undefined) =>
                  `${typeof v === "number" ? v : 0} reservations`
                }
                contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart — revenue by source */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Revenue by Source
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} layout="vertical" margin={{ left: 16, right: 16 }}>
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#71717a" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  new Intl.NumberFormat("en-US", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(v)
                }
              />
              <YAxis
                type="category"
                dataKey="source"
                tick={{ fontSize: 11, fill: "#71717a" }}
                tickLine={false}
                axisLine={false}
                width={72}
              />
              <Tooltip
                formatter={(v: number | string | readonly (number | string)[] | undefined) =>
                  formatMinor((typeof v === "number" ? v : 0) * 100, currencyCode)
                }
                contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }}
              />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                {barData.map((_, index) => (
                  <Cell key={index} fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Source breakdown table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80">
              <th className="px-4 py-3 text-left font-semibold text-zinc-600">Source</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-600">Reservations</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-600">Share</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-600">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((row, i) => (
              <tr
                key={row.source}
                className="border-b border-zinc-50 transition-colors hover:bg-zinc-50/60"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full segment-color-${i % 10}`}
                    />
                    <span className="font-medium capitalize text-zinc-900">{row.source}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                  {row.reservations}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                  {row.sharePct}%
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-zinc-900">
                  {formatMinor(row.revenueMinor, currencyCode)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
