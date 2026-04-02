import { formatCurrencyMinor } from "@/lib/pms/formatting";

interface FolioLineItemProps {
  title: string;
  subtitle?: string | null;
  amountMinor: number;
  currency: string;
  kind: "charge" | "payment";
}

export function FolioLineItem({ title, subtitle, amountMinor, currency, kind }: FolioLineItemProps) {
  const amount = kind === "payment" ? -Math.abs(amountMinor) : Math.abs(amountMinor);
  const color = kind === "payment" ? "text-emerald-700" : "text-zinc-900";

  return (
    <div className="flex items-start justify-between rounded-md border border-zinc-200 px-3 py-2">
      <div>
        <p className="text-sm font-medium text-zinc-900">{title}</p>
        {subtitle ? <p className="text-xs text-zinc-500">{subtitle}</p> : null}
      </div>
      <p className={`text-sm font-semibold ${color}`}>{formatCurrencyMinor(amount, currency)}</p>
    </div>
  );
}
