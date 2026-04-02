import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface KeyCardFormProps {
  reservationId: string;
  roomId: string;
}

export function KeyCardForm({ reservationId, roomId }: KeyCardFormProps) {
  return (
    <Card className="border-zinc-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Key Card Encoding</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3">
          <input type="hidden" name="reservationId" value={reservationId} />
          <input type="hidden" name="roomId" value={roomId} />
          <div className="grid gap-2">
            <Label htmlFor="keyCardCount">Cards</Label>
            <Input id="keyCardCount" name="keyCardCount" type="number" min={1} max={5} defaultValue={2} />
          </div>
          <Button type="button" variant="outline">Encode Key Cards</Button>
        </form>
      </CardContent>
    </Card>
  );
}
