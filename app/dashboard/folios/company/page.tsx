import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getCompanyBalances } from "../actions/folio-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyMinor } from "@/lib/pms/formatting";

export default async function CompanyLedgerPage() {
  await redirectIfNotAuthenticated();
  const { balances } = await getCompanyBalances();

  return (
    <div className="page-shell">
      <div className="page-container">
        <div>
          <h1 className="page-title">Company Ledger</h1>
          <p className="page-subtitle">Aggregated balances by payment provider/company mapping.</p>
        </div>

        <Card className="glass-panel">
          <CardHeader><CardTitle className="text-base">Balances</CardTitle></CardHeader>
          <CardContent>
            {balances.length === 0 ? (
              <p className="page-subtitle">No company balance data yet.</p>
            ) : (
              <div className="overflow-auto rounded-lg border border-zinc-200">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-zinc-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Company</th>
                      <th className="px-4 py-3 text-right font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {balances.map((row) => (
                      <tr key={row.company}>
                        <td className="px-4 py-3 font-medium text-zinc-900">{row.company}</td>
                        <td className="px-4 py-3 text-right text-zinc-700">{formatCurrencyMinor(row.amountMinor, "USD")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
