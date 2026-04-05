"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";

interface FilterOption {
  value: string;
  label: string;
}

interface RoomsFiltersProps {
  initialQuery: string;
  initialStatus: string;
  initialFloor: string;
  statusOptions: FilterOption[];
  floorOptions: FilterOption[];
}

export function RoomsFilters({
  initialQuery,
  initialStatus,
  initialFloor,
  statusOptions,
  floorOptions,
}: RoomsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();
  const [query, setQuery] = React.useState(initialQuery);
  const [status, setStatus] = React.useState(initialStatus);
  const [floor, setFloor] = React.useState(initialFloor);

  React.useEffect(() => {
    setQuery(initialQuery);
    setStatus(initialStatus);
    setFloor(initialFloor);
  }, [initialFloor, initialQuery, initialStatus]);

  const selectedFloor = React.useMemo(
    () => floorOptions.find((option) => option.value === floor) ?? null,
    [floor, floorOptions]
  );

  function updateUrl(nextQuery: string, nextStatus: string, nextFloor: string) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextStatus) params.set("status", nextStatus);
    if (nextFloor) params.set("floor", nextFloor);
    const href = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  function handleApply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateUrl(query, status, floor);
  }

  function handleReset() {
    setQuery("");
    setStatus("");
    setFloor("");
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  return (
    <form onSubmit={handleApply} className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] md:items-end">
      <div className="grid gap-2">
        <label htmlFor="rooms-q" className="text-sm font-medium text-zinc-900">Search</label>
        <Input
          id="rooms-q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Room number, type, status, or floor"
          className="border-zinc-200 bg-white"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="rooms-status" className="text-sm font-medium text-zinc-900">Status</label>
        <Select value={status} onValueChange={(value) => setStatus(value ?? "")}>
          <SelectTrigger id="rooms-status" className="h-9 w-full border-zinc-200 bg-white">
            <span className={status ? "text-sm" : "text-sm text-muted-foreground"}>
              {statusOptions.find((option) => option.value === status)?.label ?? "All statuses"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">All statuses</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <label htmlFor="rooms-floor" className="text-sm font-medium text-zinc-900">Floor</label>
        <Combobox
          items={floorOptions}
          
          value={selectedFloor}
          onValueChange={(value) => setFloor(value?.value ?? "")}
        >
          <ComboboxInput
            id="rooms-floor"
            placeholder="All floors"
            showClear
            className="w-full"
          />
          <ComboboxContent>
            <ComboboxEmpty className="block px-3 py-3 text-left text-sm text-zinc-600">
              No floors match your search.
            </ComboboxEmpty>
            <ComboboxList>
              {(item: FilterOption) => (
                <ComboboxItem key={item.value} value={item}>
                  {item.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row md:justify-end">
        <Button type="submit" size="sm" disabled={isPending} className="bg-[#ff6900] text-white hover:bg-[#e55f00]">
          {isPending ? "Applying..." : "Apply"}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={isPending} className="border-zinc-200 bg-white hover:bg-zinc-50" onClick={handleReset}>
          Reset
        </Button>
      </div>
    </form>
  );
}