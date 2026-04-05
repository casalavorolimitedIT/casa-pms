"use client";

import * as React from "react";
import { format } from "date-fns";
import type { MonthCaptionProps } from "react-day-picker";
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
const YEARS_PER_GRID = 12; // 3 rows × 4 columns

export function FormDateTimeField({
  name,
  defaultValue,
  placeholder = "Pick date and time",
  className,
  includeTime = true,
  editableYear = true,
  onValueChange,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  includeTime?: boolean;
  /** Allow clicking the year in the calendar header to jump to any year */
  editableYear?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const initial = React.useMemo(() => parseLocalDateTime(defaultValue), [defaultValue]);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(initial);
  const [hour, setHour] = React.useState(initial ? pad2(initial.getHours()) : "09");
  const [minute, setMinute] = React.useState(initial ? pad2(initial.getMinutes()) : "00");

  // Controlled calendar navigation (required for year jumping)
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(() => initial ?? new Date());
  // Year grid overlay state
  const [yearGridOpen, setYearGridOpen] = React.useState(false);
  const [gridStartYear, setGridStartYear] = React.useState(() => {
    const y = (initial ?? new Date()).getFullYear();
    return Math.floor(y / YEARS_PER_GRID) * YEARS_PER_GRID;
  });

  React.useEffect(() => {
    const next = parseLocalDateTime(defaultValue);
    setSelectedDate(next);
    setHour(next ? pad2(next.getHours()) : "09");
    setMinute(next ? pad2(next.getMinutes()) : "00");
    if (next) setCalendarMonth(next);
  }, [defaultValue]);

  const serialized = toSerializedValue(selectedDate, hour, minute, includeTime);
  const display = selectedDate
    ? includeTime
      ? `${format(selectedDate, "EEE, MMM d")}, ${hour}:${minute}`
      : format(selectedDate, "EEE, MMM d")
    : placeholder;

  function handleDateChange(value: Date | null) {
    setSelectedDate(value);
    if (value) setCalendarMonth(value);
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

  function handleYearSelect(year: number) {
    const newMonth = new Date(calendarMonth);
    newMonth.setFullYear(year);
    setCalendarMonth(newMonth);
    setYearGridOpen(false);
  }

  // Stable custom caption component — useMemo so React sees the same reference across renders
  // (avoids unnecessary Calendar remounts). State setters are stable by React guarantee.
  const MonthCaption = React.useMemo(
    () =>
      function YearClickableCaption({ calendarMonth: cm }: MonthCaptionProps) {
        return (
          <div className="relative flex h-8 items-center justify-center">
            <span className="text-sm font-semibold text-zinc-900">
              {format(cm.date, "MMMM")}{" "}
              <button
                type="button"
                onClick={() => {
                  setGridStartYear(Math.floor(cm.date.getFullYear() / YEARS_PER_GRID) * YEARS_PER_GRID);
                  setYearGridOpen(true);
                }}
                className="rounded px-0.5 text-[#ff6900] underline decoration-dotted underline-offset-2 transition-colors hover:bg-orange-50"
              >
                {format(cm.date, "yyyy")}
              </button>
            </span>
          </div>
        );
      },
    [], // setGridStartYear / setYearGridOpen are stable React setters — safe empty dep array
  );

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: YEARS_PER_GRID }, (_, i) => gridStartYear + i);

  return (
    <div className={cn("grid gap-2", className)}>
      <input type="hidden" name={name} value={serialized} />
      <DropdownMenu onOpenChange={(open) => { if (!open) setYearGridOpen(false); }}>
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
            {/* Year grid overlay — replaces calendar while picking a year */}
            {editableYear && yearGridOpen ? (
              <div className="w-63 space-y-3">
                {/* Decade navigation */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setGridStartYear((y) => y - YEARS_PER_GRID)}
                    className="flex size-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-lg text-zinc-600 hover:bg-zinc-100"
                  >
                    ‹
                  </button>
                  <span className="text-sm font-semibold text-zinc-900">
                    {gridStartYear}–{gridStartYear + YEARS_PER_GRID - 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGridStartYear((y) => y + YEARS_PER_GRID)}
                    className="flex size-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-lg text-zinc-600 hover:bg-zinc-100"
                  >
                    ›
                  </button>
                </div>

                {/* 4 × 3 year grid */}
                <div className="grid grid-cols-4 gap-1.5">
                  {years.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => handleYearSelect(year)}
                      className={cn(
                        "h-9 w-full rounded-md text-sm font-medium transition-colors",
                        year === calendarMonth.getFullYear()
                          ? "bg-[#ff6900] text-white"
                          : year === currentYear
                            ? "border border-[#ff6900] text-[#ff6900] hover:bg-orange-50"
                            : "text-zinc-700 hover:bg-zinc-100",
                      )}
                    >
                      {year}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-xs text-zinc-600"
                    onClick={() => setYearGridOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={selectedDate ?? undefined}
                onSelect={(value) => handleDateChange(value ?? null)}
                className="mx-auto"
                {...(editableYear
                  ? {
                      month: calendarMonth,
                      onMonthChange: setCalendarMonth,
                      components: { MonthCaption },
                    }
                  : {})}
              />
            )}

            {/* Time + Clear — hidden while year grid is open */}
            {(!editableYear || !yearGridOpen) &&
              (includeTime ? (
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
              ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}