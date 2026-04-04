"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export interface FormSelectOption {
  value: string;
  label: string;
}

interface FormSelectFieldProps {
  name: string;
  options: FormSelectOption[];
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  className?: string;
  emptyStateText?: string;
  emptyStateLinkHref?: string;
  emptyStateLinkLabel?: string;
}

/**
 * Base UI select that always displays the option label (not raw value)
 * and submits the selected value through a hidden input for server actions.
 */
export function FormSelectField({
  name,
  options,
  placeholder = "Select an option",
  defaultValue = "",
  disabled,
  className,
  emptyStateText = "No options found.",
  emptyStateLinkHref,
  emptyStateLinkLabel = "Add one",
}: FormSelectFieldProps) {
  const [value, setValue] = useState(defaultValue);
  const handleValueChange = (nextValue: string | null) => {
    if (nextValue == null) return;
    setValue(nextValue);
  };

  const selectedLabel = useMemo(() => {
    const found = options.find((opt) => opt.value === value);
    return found?.label ?? "";
  }, [options, value]);

  return (
    <div className={className}>
      <input type="hidden" name={name} value={value} />
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger disabled={disabled} className="h-12! w-full border-zinc-300 bg-white">
          <span className={selectedLabel ? "text-sm" : "text-sm text-muted-foreground"}>
            {selectedLabel || placeholder}
          </span>
        </SelectTrigger>
        <SelectContent>
          {options.length > 0 ? (
            <SelectGroup>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              <p>{emptyStateText}</p>
              {emptyStateLinkHref ? (
                <Link
                  href={emptyStateLinkHref}
                  className="mt-1 inline-block text-sm font-medium text-[#ff6900] underline underline-offset-2"
                >
                  {emptyStateLinkLabel}
                </Link>
              ) : null}
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
