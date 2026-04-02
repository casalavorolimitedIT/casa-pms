"use client";

import { Input } from "@/components/ui/input";

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  currency?: string;
  placeholder?: string;
}

export function CurrencyInput({
  value,
  onChange,
  currency = "USD",
  placeholder = "0.00",
}: CurrencyInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        {currency}
      </span>
      <Input
        inputMode="decimal"
        className="pl-14"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
