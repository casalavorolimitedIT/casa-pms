"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyRevenue } from "@/lib/pms/reports/revenue";

interface RevenueBreakdownChartProps {
  series: DailyRevenue[];
  categories: string[];
  currencyCode: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  room_charge: "#ff6900",
  early_checkin: "#ff9f5a",
  late_checkout: "#e55f00",
  fnb: "#fbbf24",
  spa: "#a78bfa",
  minibar: "#34d399",
  other: "#94a3b8",
};

function colorForCategory(cat: string, index: number): string {
  if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];
  const extras = ["#60a5fa", "#f472b6", "#4ade80", "#fb923c", "#38bdf8"];
  return extras[index % extras.length];
}

function formatMinor(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value / 100);
}

export function RevenueBreakdownChart({
  series,
  categories,
  currencyCode,
}: RevenueBreakdownChartProps) {
  if (series.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-400">
        No revenue data for this period.
      </div>
    );
  }

  // Flatten for recharts
  const data = series.map((d) => ({
    date: d.date.slice(5), // MM-DD
    total: d.totalMinor,
    ...d.byCategory,
  }));

  const barCategories = categories.length > 0 ? categories : ["total"];

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => formatMinor(v, currencyCode)}
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Tooltip
          formatter={(value: number | string | readonly (number | string)[] | undefined, name) => {
            const n = typeof value === "number" ? value : 0;
            return [formatMinor(n, currencyCode), String(name ?? "").replace(/_/g, " ")];
          }}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e4e4e7",
            fontSize: 12,
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => value.replace(/_/g, " ")}
          wrapperStyle={{ fontSize: 11 }}
        />
        {barCategories.map((cat, i) => (
          <Bar
            key={cat}
            dataKey={cat}
            stackId="revenue"
            fill={colorForCategory(cat, i)}
            radius={i === barCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
