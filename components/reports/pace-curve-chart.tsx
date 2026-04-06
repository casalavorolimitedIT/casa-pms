"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PaceDatum } from "@/lib/pms/reports/pace";

interface PaceCurveChartProps {
  series: PaceDatum[];
}

export function PaceCurveChart({ series }: PaceCurveChartProps) {
  if (series.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-400">
        No pace data for this period.
      </div>
    );
  }

  const data = series.map((d) => ({
    date: d.arrivalDate.slice(5),
    "This Period": d.currentBookings,
    "Prior Year": d.priorYearBookings,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="paceCurrent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ff6900" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#ff6900" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="pacePrior" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
          </linearGradient>
        </defs>
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
          allowDecimals={false}
          width={36}
        />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area
          type="monotone"
          dataKey="Prior Year"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          fill="url(#pacePrior)"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="This Period"
          stroke="#ff6900"
          strokeWidth={2.5}
          fill="url(#paceCurrent)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
