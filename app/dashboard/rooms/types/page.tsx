import { getRoomTypes } from "../actions/room-actions";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrencyMinor } from "@/lib/pms/formatting";
import Link from "next/link";
import { getActivePropertyId } from "@/lib/pms/property-context";

export default async function RoomTypesPage() {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();

  if (!activePropertyId) {
    return (
      <div className="p-6 text-muted-foreground text-sm">
        Set <code>DEMO_PROPERTY_ID</code> in .env.local or add/select an active property in the header.
      </div>
    );
  }

  const { roomTypes } = await getRoomTypes(activePropertyId);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Room Types</h1>
          <p className="text-sm text-muted-foreground">
            {roomTypes.length} type{roomTypes.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/rooms/types/new">Add Type</Link>
        </Button>
      </div>

      {roomTypes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-muted-foreground">No room types yet.</p>
            <Button asChild size="sm">
              <Link href="/dashboard/rooms/types/new">Add first type</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roomTypes.map((rt) => (
            <Card key={rt.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{rt.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                {rt.description && (
                  <p className="text-muted-foreground line-clamp-2">
                    {rt.description}
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Base rate: </span>
                  {formatCurrencyMinor(rt.base_rate_minor, "USD")} / night
                </p>
                <p>
                  <span className="text-muted-foreground">Max occupancy: </span>
                  {rt.max_occupancy} guest{rt.max_occupancy !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
