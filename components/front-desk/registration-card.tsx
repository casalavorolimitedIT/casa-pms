import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RegistrationCardProps {
  guestName: string;
  reservationId: string;
  checkIn: string;
  checkOut: string;
  roomNumber?: string | null;
}

export function RegistrationCard({
  guestName,
  reservationId,
  checkIn,
  checkOut,
  roomNumber,
}: RegistrationCardProps) {
  return (
    <Card className="border-zinc-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold tracking-tight">Registration Card</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-zinc-500">Guest</p>
          <p className="font-medium text-zinc-900">{guestName}</p>
        </div>
        <div>
          <p className="text-zinc-500">Reservation</p>
          <p className="font-medium text-zinc-900">{reservationId.slice(0, 8).toUpperCase()}</p>
        </div>
        <div>
          <p className="text-zinc-500">Check-in</p>
          <p className="font-medium text-zinc-900">{new Date(checkIn).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-zinc-500">Check-out</p>
          <p className="font-medium text-zinc-900">{new Date(checkOut).toLocaleDateString()}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-zinc-500">Assigned room</p>
          <p className="font-medium text-zinc-900">{roomNumber ?? "To be assigned"}</p>
        </div>
      </CardContent>
    </Card>
  );
}
