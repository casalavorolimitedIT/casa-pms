import { formatCurrencyMinor } from "@/lib/pms/formatting";

export interface RateCalendarRow {
  id: string;
  date_from: string;
  date_to: string;
  rate_minor: number;
  room_types: { name: string } | null;
  rate_plans: { name: string } | null;
}

interface RateCalendarProps {
  rows: RateCalendarRow[];
  currency?: string;
}

export function RateCalendar({ rows, currency = "USD" }: RateCalendarProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">No seasonal rates configured.</p>;
  }

  return (
    <div className="overflow-auto rounded-lg border border-zinc-200">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Plan</th>
            <th className="px-4 py-3 text-left font-medium">Room Type</th>
            <th className="px-4 py-3 text-left font-medium">Range</th>
            <th className="px-4 py-3 text-right font-medium">Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium text-zinc-900">{row.rate_plans?.name ?? "-"}</td>
              <td className="px-4 py-3 text-zinc-700">{row.room_types?.name ?? "-"}</td>
              <td className="px-4 py-3 text-zinc-600">
                {new Date(row.date_from).toLocaleDateString()} - {new Date(row.date_to).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right font-medium text-zinc-900">{formatCurrencyMinor(row.rate_minor, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
