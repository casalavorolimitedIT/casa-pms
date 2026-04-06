"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { KpiDatum } from "@/lib/pms/reports/kpis";

interface KpiTrendChartProps {
  series: KpiDatum[];
  currencyCode: string;
  activeMetric?: "occupancy" | "adr" | "revpar";
}

export function KpiTrendChart({ series, currencyCode, activeMetric = "occupancy" }: KpiTrendChartProps) {
  if (series.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-400">
        No KPI data for this period.
      </div>
    );
  }

  const data = series.map((d) => ({
    date: d.date.slice(5),
    "Occupancy %": d.occupancyPct,
    "ADR": d.adrMinor / 100,
    "RevPAR": d.revparMinor / 100,
  }));

  const metrics =
    activeMetric === "occupancy"
      ? [{ key: "Occupancy %", color: "#ff6900", suffix: "%" }]
      : activeMetric === "adr"
        ? [{ key: "ADR", color: "#3b82f6", suffix: "" }]
        : [{ key: "RevPAR", color: "#10b981", suffix: "" }];

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            activeMetric === "occupancy" ? `${v}%` : `${currencyCode} ${v.toFixed(0)}`
          }
          width={70}
        />
        <Tooltip
          formatter={(value: number | string | readonly (number | string)[] | undefined, name) => {
            const n = typeof value === "number" ? value : 0;
            const label = String(name ?? "");
            return [label === "Occupancy %" ? `${n.toFixed(1)}%` : `${currencyCode} ${n.toFixed(2)}`, label];
          }}
          contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {metrics.map((m) => (
          <Line
            key={m.key}
            type="monotone"
            dataKey={m.key}
            stroke={m.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

interface KpiAllTrendsChartProps {
  series: KpiDatum[];
  currencyCode?: string;
}

export function KpiAllTrendsChart({ series }: KpiAllTrendsChartProps) {
  if (series.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-400">
        No KPI data for this period.
      </div>
    );
  }

  const data = series.map((d) => ({
    date: d.date.slice(5),
    "Occupancy %": d.occupancyPct,
    "Rooms Sold": d.roomsSold,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}%`}
          width={50}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="Occupancy %"
          stroke="#ff6900"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="Rooms Sold"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
