import Link from "next/link";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getFolios } from "./actions/folio-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getActivePropertyId } from "@/lib/pms/property-context";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function FoliosPage({ searchParams }: PageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const { q = "" } = await searchParams;

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or add/select an active property in the header.</div>;
  }

  const { folios } = await getFolios(activePropertyId, q);

  return (
    <div className="min-h-full bg-zinc-50/60 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Folios</h1>
            <p className="text-sm text-zinc-500">Search and manage billing ledgers for active and historical stays.</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link href="/dashboard/folios/company">Company Ledger</Link></Button>
        </div>

        <Card className="border-zinc-200 bg-white shadow-sm">
          <CardContent className="pt-6">
            <form className="flex gap-2" method="GET">
              <Input name="q" defaultValue={q} placeholder="Search by folio id..." className="max-w-sm" />
              <Button type="submit" variant="outline" size="sm">Search</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Results ({folios.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {folios.length === 0 ? (
              <p className="text-sm text-zinc-500">No folios found.</p>
            ) : (
              <div className="overflow-auto rounded-lg border border-zinc-200">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-zinc-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Folio</th>
                      <th className="px-4 py-3 text-left font-medium">Guest</th>
                      <th className="px-4 py-3 text-left font-medium">Stay</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {folios.map((folio) => {
                      const reservation = folio.reservations as { check_in: string; check_out: string; guests: { first_name: string; last_name: string } | null } | null;
                      return (
                        <tr key={folio.id}>
                          <td className="px-4 py-3 font-medium text-zinc-900">{folio.id.slice(0, 8).toUpperCase()}</td>
                          <td className="px-4 py-3 text-zinc-700">{reservation?.guests?.first_name} {reservation?.guests?.last_name}</td>
                          <td className="px-4 py-3 text-zinc-600">
                            {reservation ? `${new Date(reservation.check_in).toLocaleDateString()} - ${new Date(reservation.check_out).toLocaleDateString()}` : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={folio.status === "closed" ? "secondary" : "outline"}>{folio.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button asChild size="sm" variant="outline"><Link href={`/dashboard/folios/${folio.id}`}>Open</Link></Button>
                          </td>
                        </tr>
                      );
                    })}
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
