"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export interface FormComboboxOption {
  value: string;
  label: string;
}

interface FormComboboxFieldProps {
  id?: string;
  name: string;
  options: FormComboboxOption[];
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
  emptyStateText?: string;
  emptyStateLinkHref?: string;
  emptyStateLinkLabel?: string;
  noResultsText?: string;
  onValueChange?: (value: string) => void;
}

export function FormComboboxField({
  id,
  name,
  options,
  placeholder = "Search and select",
  defaultValue = "",
  disabled,
  className,
  allowClear = false,
  emptyStateText = "No options available.",
  emptyStateLinkHref,
  emptyStateLinkLabel = "Add one",
  noResultsText = "No matching results.",
  onValueChange,
}: FormComboboxFieldProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);

  // Sync internal state when defaultValue changes (e.g. draft hydration)
  useEffect(() => {
    setInternalValue(defaultValue);
  }, [defaultValue]);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === internalValue) ?? null,
    [options, internalValue]
  );

  const showSourceEmptyState = options.length === 0;

  return (
    <div className={className}>
      <input type="hidden" name={name} value={internalValue} />
      <Combobox
        items={options}
        value={selectedOption}
        onValueChange={(nextOption: FormComboboxOption | null) => {
          const next = nextOption?.value ?? "";
          setInternalValue(next);
          onValueChange?.(next);
        }}
        isItemEqualToValue={(item: FormComboboxOption, val: FormComboboxOption) => item.value === val.value}
      >
        <ComboboxInput
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          showClear={allowClear}
          className="w-full h-12!"
        />
        <ComboboxContent>
          <ComboboxEmpty className="block px-3 py-3 text-left text-sm leading-6 text-zinc-600">
            <div>
              <p>{showSourceEmptyState ? emptyStateText : noResultsText}</p>
              {showSourceEmptyState && emptyStateLinkHref ? (
                <Link
                  href={emptyStateLinkHref}
                  className="mt-1 inline-block font-medium text-[#ff6900] underline underline-offset-4"
                >
                  {emptyStateLinkLabel}
                </Link>
              ) : null}
            </div>
          </ComboboxEmpty>
          <ComboboxList>
            {(item: FormComboboxOption) => (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}