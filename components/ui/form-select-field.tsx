"use client";

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
}: FormSelectFieldProps) {
  const [value, setValue] = useState(defaultValue);

  const selectedLabel = useMemo(() => {
    const found = options.find((opt) => opt.value === value);
    return found?.label ?? "";
  }, [options, value]);

  return (
    <div className={className}>
      <input type="hidden" name={name} value={value} />
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger disabled={disabled} className="h-10 w-full border-zinc-300 bg-white">
          <span className={selectedLabel ? "text-sm" : "text-sm text-muted-foreground"}>
            {selectedLabel || placeholder}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
