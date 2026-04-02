import { Button } from "@/components/ui/button";
import { FormSelectField } from "@/components/ui/form-select-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RestrictionFormProps {
  ratePlanId: string;
  roomTypes: Array<{ id: string; name: string }>;
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
}

export function RestrictionForm({ ratePlanId, roomTypes, action }: RestrictionFormProps) {
  return (
    <form action={action} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4">
      <input type="hidden" name="ratePlanId" value={ratePlanId} />

      <div className="grid gap-2">
        <Label htmlFor="roomTypeId">Room Type</Label>
        <FormSelectField
          name="roomTypeId"
          options={roomTypes.map((rt) => ({ value: rt.id, label: rt.name }))}
          placeholder="Select room type"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="dateFrom">From</Label>
          <Input id="dateFrom" name="dateFrom" type="date" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dateTo">To</Label>
          <Input id="dateTo" name="dateTo" type="date" required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="rateMinor">Nightly rate (minor)</Label>
          <Input id="rateMinor" name="rateMinor" type="number" min={0} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="minStay">Min stay</Label>
          <Input id="minStay" name="minStay" type="number" min={1} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="maxStay">Max stay</Label>
          <Input id="maxStay" name="maxStay" type="number" min={1} />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="closedToArrival" className="h-4 w-4" />
          Closed to arrival
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="closedToDeparture" className="h-4 w-4" />
          Closed to departure
        </label>
      </div>

      <Button type="submit" size="sm" className="w-fit">Add Restriction</Button>
    </form>
  );
}
