"use client";

import * as React from "react";
import { format } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function parseLocalDateTime(value?: string) {
  if (!value) return null;
  const [datePart, timePart = "00:00"] = value.split("T");
  if (!datePart) return null;
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day, Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalDateTimeValue(date: Date | null, hour: string, minute: string) {
  if (!date) return "";
  return `${format(date, "yyyy-MM-dd")}T${hour}:${minute}`;
}

function toSerializedValue(date: Date | null, hour: string, minute: string, includeTime: boolean) {
  if (!date) return "";
  return includeTime ? toLocalDateTimeValue(date, hour, minute) : format(date, "yyyy-MM-dd");
}

const HOURS = Array.from({ length: 24 }, (_, value) => pad2(value));
const MINUTES = Array.from({ length: 60 }, (_, value) => pad2(value));

export function FormDateTimeField({
  name,
  defaultValue,
  placeholder = "Pick date and time",
  className,
  includeTime = true,
  onValueChange,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  includeTime?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const initial = React.useMemo(() => parseLocalDateTime(defaultValue), [defaultValue]);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(initial);
  const [hour, setHour] = React.useState(initial ? pad2(initial.getHours()) : "09");
  const [minute, setMinute] = React.useState(initial ? pad2(initial.getMinutes()) : "00");

  React.useEffect(() => {
    const next = parseLocalDateTime(defaultValue);
    setSelectedDate(next);
    setHour(next ? pad2(next.getHours()) : "09");
    setMinute(next ? pad2(next.getMinutes()) : "00");
  }, [defaultValue]);

  const serialized = toSerializedValue(selectedDate, hour, minute, includeTime);
  const display = selectedDate
    ? includeTime
      ? `${format(selectedDate, "EEE, MMM d")}, ${hour}:${minute}`
      : format(selectedDate, "EEE, MMM d")
    : placeholder;

  function handleDateChange(value: Date | null) {
    setSelectedDate(value);
    onValueChange?.(toSerializedValue(value, hour, minute, includeTime));
  }

  function handleHourChange(value: string | null) {
    if (value == null) return;
    setHour(value);
    onValueChange?.(toSerializedValue(selectedDate, value, minute, includeTime));
  }

  function handleMinuteChange(value: string | null) {
    if (value == null) return;
    setMinute(value);
    onValueChange?.(toSerializedValue(selectedDate, hour, value, includeTime));
  }

  function handleClear() {
    setSelectedDate(null);
    onValueChange?.("");
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <input type="hidden" name={name} value={serialized} />
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" className="h-12 w-full justify-between border-zinc-200 bg-white px-3 font-normal text-zinc-700" />}>
          <span className={cn("truncate", !selectedDate && "text-zinc-400")}>{display}</span>
          <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="size-4 text-zinc-500" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className="w-fit min-w-0 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl"
        >
          <div className="space-y-3">
            <Calendar
              mode="single"
              selected={selectedDate ?? undefined}
              onSelect={(value) => handleDateChange(value ?? null)}
              className="mx-auto"
            />

            {includeTime ? (
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2">
                <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-4 text-zinc-500" />
                <Select value={hour} onValueChange={handleHourChange}>
                  <SelectTrigger className="h-8 w-19 border-zinc-200 bg-white px-2 text-sm text-zinc-700 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-56 min-w-19">
                    <SelectGroup>
                      {HOURS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <span className="text-sm text-zinc-500">:</span>
                <Select value={minute} onValueChange={handleMinuteChange}>
                  <SelectTrigger className="h-8 w-19 border-zinc-200 bg-white px-2 text-sm text-zinc-700 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-56 min-w-19">
                    <SelectGroup>
                      {MINUTES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Button type="button" size="sm" variant="ghost" className="ml-auto text-xs text-zinc-600" onClick={handleClear}>
                  Clear
                </Button>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button type="button" size="sm" variant="ghost" className="text-xs text-zinc-600" onClick={handleClear}>
                  Clear
                </Button>
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}