"use client";

import { Input } from "@/components/ui/input";

export interface DateRangeValue {
  startDate: string;
  endDate: string;
}

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <Input
        type="date"
        value={value.startDate}
        onChange={(event) => onChange({ ...value, startDate: event.target.value })}
        aria-label="Start date"
      />
      <Input
        type="date"
        value={value.endDate}
        onChange={(event) => onChange({ ...value, endDate: event.target.value })}
        aria-label="End date"
      />
    </div>
  );
}
