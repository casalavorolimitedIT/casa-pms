import { formatCurrencyMinor } from "@/lib/pms/formatting";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  tone?: "orange" | "blue" | "emerald" | "violet";
}

const toneClasses = {
  orange: "border-orange-200/80 bg-orange-50/60",
  blue: "border-blue-200/80 bg-blue-50/60",
  emerald: "border-emerald-200/80 bg-emerald-50/60",
  violet: "border-violet-200/80 bg-violet-50/60",
};

const valueToneClasses = {
  orange: "text-orange-900",
  blue: "text-blue-900",
  emerald: "text-emerald-900",
  violet: "text-violet-900",
};

export function KpiCard({ label, value, sub, tone = "orange" }: KpiCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 backdrop-blur-sm ${toneClasses[tone]}`}
    >
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${valueToneClasses[tone]}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

interface KpiCardsRow {
  occupancyPct: number;
  adrMinor: number;
  revparMinor: number;
  totalRooms: number;
  currencyCode: string;
}

export function KpiCardsRow({ occupancyPct, adrMinor, revparMinor, totalRooms, currencyCode }: KpiCardsRow) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Avg Occupancy"
        value={`${occupancyPct.toFixed(1)}%`}
        sub="Period average"
        tone="orange"
      />
      <KpiCard
        label="ADR"
        value={formatCurrencyMinor(adrMinor, currencyCode)}
        sub="Average Daily Rate"
        tone="blue"
      />
      <KpiCard
        label="RevPAR"
        value={formatCurrencyMinor(revparMinor, currencyCode)}
        sub="Revenue per Available Room"
        tone="emerald"
      />
      <KpiCard
        label="Total Rooms"
        value={String(totalRooms)}
        sub="Available inventory"
        tone="violet"
      />
    </div>
  );
}
