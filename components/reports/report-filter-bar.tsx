"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ReportFilterBarProps {
  defaultFrom: string;
  defaultTo: string;
}

export function ReportFilterBar({ defaultFrom, defaultTo }: ReportFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentFrom = searchParams.get("from") ?? defaultFrom;
  const currentTo = searchParams.get("to") ?? defaultTo;

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      const params = new URLSearchParams(searchParams.toString());
      params.set("from", form.get("from") as string);
      params.set("to", form.get("to") as string);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="filterFrom" className="text-xs font-medium text-zinc-600">
          From
        </Label>
        <Input
          id="filterFrom"
          name="from"
          type="date"
          defaultValue={currentFrom}
          className="h-9 w-40 text-sm"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="filterTo" className="text-xs font-medium text-zinc-600">
          To
        </Label>
        <Input
          id="filterTo"
          name="to"
          type="date"
          defaultValue={currentTo}
          className="h-9 w-40 text-sm"
        />
      </div>
      <Button type="submit" size="sm" className="h-9">
        Apply
      </Button>
    </form>
  );
}
