import { FormSelectField } from "@/components/ui/form-select-field";
import { FormDateTimeField } from "@/components/ui/form-date-time-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

type RestrictionInitialValues = {
  roomTypeId?: string;
  dateFrom?: string;
  dateTo?: string;
  rateMinor?: number;
  minStay?: number | null;
  maxStay?: number | null;
  closedToArrival?: boolean;
  closedToDeparture?: boolean;
};

interface RestrictionFormProps {
  ratePlanId: string;
  roomTypes: Array<{ id: string; name: string }>;
  action: (formData: FormData) => void | Promise<void>;
  restrictionId?: string;
  initialValues?: RestrictionInitialValues;
  idleText?: string;
  pendingText?: string;
  submitSize?: React.ComponentProps<typeof FormSubmitButton>["size"];
  submitClassName?: string;
}

export function RestrictionForm({
  ratePlanId,
  roomTypes,
  action,
  restrictionId,
  initialValues,
  idleText = "Add Restriction",
  pendingText = "Saving...",
  submitSize = "lg",
  submitClassName = "w-full text-center",
}: RestrictionFormProps) {
  return (
    <form action={action} className="grid gap-4 bg-white">
      <input type="hidden" name="ratePlanId" value={ratePlanId} />
      {restrictionId ? <input type="hidden" name="restrictionId" value={restrictionId} /> : null}

      <div className="grid gap-2">
        <Label htmlFor="roomTypeId">Room Type</Label>
        <FormSelectField
          name="roomTypeId"
          defaultValue={initialValues?.roomTypeId}
          options={roomTypes.map((rt) => ({ value: rt.id, label: rt.name }))}
          placeholder="Select room type"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="dateFrom">From</Label>
          <FormDateTimeField
            name="dateFrom"
            defaultValue={initialValues?.dateFrom}
            placeholder="Select start date"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dateTo">To</Label>
          <FormDateTimeField
            name="dateTo"
            defaultValue={initialValues?.dateTo}
            placeholder="Select end date"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="rateMinor">Nightly rate (minor)</Label>
          <Input
            id="rateMinor"
            name="rateMinor"
            type="number"
            min={0}
            defaultValue={initialValues?.rateMinor ?? ""}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="minStay">Min stay</Label>
          <Input
            id="minStay"
            name="minStay"
            type="number"
            min={1}
            defaultValue={initialValues?.minStay ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="maxStay">Max stay</Label>
          <Input
            id="maxStay"
            name="maxStay"
            type="number"
            min={1}
            defaultValue={initialValues?.maxStay ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="closedToArrival"
            className="h-4 w-4"
            defaultChecked={Boolean(initialValues?.closedToArrival)}
          />
          Closed to arrival
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="closedToDeparture"
            className="h-4 w-4"
            defaultChecked={Boolean(initialValues?.closedToDeparture)}
          />
          Closed to departure
        </label>
      </div>

      <FormSubmitButton
        idleText={idleText}
        pendingText={pendingText}
        size={submitSize}
        className={submitClassName}
      />
    </form>
  );
}
