"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("mx-auto", className)}
      classNames={{
        months: "flex flex-col",
        month: "space-y-3",
        month_caption: "relative flex h-8 items-center justify-center",
        caption_label: "text-sm font-semibold text-zinc-900",
        nav: "absolute inset-x-0 top-0 flex h-8 items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "size-8 ml-2 relative top-2 z-50 rounded-md border-zinc-200 bg-white text-zinc-600 shadow-none hover:bg-zinc-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "size-8 mr-2 relative top-2 z-50 rounded-md border-zinc-200 bg-white text-zinc-600 shadow-none hover:bg-zinc-100"
        ),
        chevron: "size-4 fill-current",
        month_grid: "border-collapse",
        weekdays: "grid grid-cols-7 gap-1",
        weekday: "h-8 w-9 text-center text-[11px] font-medium text-zinc-500",
        weeks: "space-y-1",
        week: "grid grid-cols-7 gap-1",
        day: "h-9 w-9 p-0 text-center",
        day_button: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "h-9 w-9 rounded-md border border-transparent p-0 font-normal text-zinc-700 shadow-none hover:bg-zinc-100"
        ),
        today: "[&>button]:border-[#ff6900] [&>button]:text-[#ff6900]",
        selected: "[&>button]:border-transparent [&>button]:bg-[#ff6900] [&>button]:text-white [&>button:hover]:bg-[#e55f00]",
        outside: "text-zinc-300",
        disabled: "text-zinc-300 opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}