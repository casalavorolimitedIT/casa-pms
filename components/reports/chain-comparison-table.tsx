import { formatCurrencyMinor } from "@/lib/pms/formatting";
import type { ChainReportRow } from "@/lib/pms/reports/chain";

export function ChainComparisonTable({ rows, currencyCode }: { rows: ChainReportRow[]; currencyCode: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">No data for selected range.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-zinc-600">Property</th>
            <th className="px-3 py-2 text-right font-medium text-zinc-600">Reservations</th>
            <th className="px-3 py-2 text-right font-medium text-zinc-600">Occupancy</th>
            <th className="px-3 py-2 text-right font-medium text-zinc-600">Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">
          {rows.map((row) => (
            <tr key={row.propertyId}>
              <td className="px-3 py-2 font-medium text-zinc-900">{row.propertyName}</td>
              <td className="px-3 py-2 text-right text-zinc-700">{row.reservations}</td>
              <td className="px-3 py-2 text-right text-zinc-700">{row.occupancyPct.toFixed(1)}%</td>
              <td className="px-3 py-2 text-right text-zinc-700">{formatCurrencyMinor(row.revenueMinor, currencyCode)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
