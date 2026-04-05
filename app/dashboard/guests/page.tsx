import { searchGuests } from "./actions/guest-actions";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, hasPermission } from "@/lib/staff/server-permissions";
import { getActivePropertyId } from "@/lib/pms/property-context";

const DEMO_ORG_ID = process.env.DEMO_ORG_ID ?? "";

interface GuestsPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function GuestsPage({ searchParams }: GuestsPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  if (activePropertyId) {
    await requirePermission("guests.view", activePropertyId);
  } else {
    await requirePermission("guests.view"); // Will throw or use cookie
  }

  const supabase = await createClient();

  const { q = "" } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let organizationId = DEMO_ORG_ID;
  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .maybeSingle();
    organizationId = profile?.organization_id ?? DEMO_ORG_ID;
  }

  if (!organizationId) {
    return (
      <div className="p-6 text-muted-foreground text-sm">
        Set <code>DEMO_ORG_ID</code> in your environment or ensure your profile has an organization.
      </div>
    );
  }

  const { guests } = await searchGuests(organizationId, q);

  const canCreate = activePropertyId ? await hasPermission(activePropertyId, "guests.create") : false;

  return (
    <div className="page-shell">
      <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Guests</h1>
          <p className="text-sm text-muted-foreground">
            {guests.length} result{guests.length !== 1 ? "s" : ""}
            {q ? ` for "${q}"` : ""}
          </p>
        </div>
        {canCreate && (
          <Button asChild size="sm">
            <Link href="/dashboard/guests/new">Add Guest</Link>
          </Button>
        )}
      </div>

      {/* Search form */}
      <form method="GET" className="flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search by name, email or phone…"
          className="max-w-sm"
        />
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
        {q && (
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link href="/dashboard/guests">Clear</Link>
          </Button>
        )}
      </form>

      {/* Guest list */}
      {guests.length === 0 ? (
        <Card className="glass-panel">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-muted-foreground">
              {q ? "No guests match your search." : "No guests yet."}
            </p>
            {canCreate && (
              <Button asChild size="sm">
                <Link href="/dashboard/guests/new">Add first guest</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="glass-panel overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Phone</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Country</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {guests.map((guest) => (
                <tr key={guest.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    {guest.first_name} {guest.last_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {guest.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {guest.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {guest.nationality ? (
                      <Badge variant="outline">{guest.nationality}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/dashboard/guests/${guest.id}`}>View</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
