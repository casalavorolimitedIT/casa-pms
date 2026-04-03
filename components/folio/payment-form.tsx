import { Button } from "@/components/ui/button";
import { FormSelectField } from "@/components/ui/form-select-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PaymentFormProps {
  folioId: string;
  action: (formData: FormData) => void | Promise<void>;
}

export function PaymentForm({ folioId, action }: PaymentFormProps) {
  return (
    <form action={action} className="grid gap-3 rounded-lg border border-zinc-200 p-4">
      <input type="hidden" name="folioId" value={folioId} />
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="amountMinor">Amount (minor)</Label>
          <Input id="amountMinor" name="amountMinor" type="number" min={0} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="method">Method</Label>
          <FormSelectField
            name="method"
            defaultValue="card"
            options={[
              { value: "card", label: "Card" },
              { value: "cash", label: "Cash" },
              { value: "bank_transfer", label: "Bank transfer" },
            ]}
          />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="provider">Provider</Label>
          <Input id="provider" name="provider" placeholder="stripe / paystack / manual" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="providerReference">Reference</Label>
          <Input id="providerReference" name="providerReference" placeholder="txn_123" />
        </div>
      </div>
      <Button type="submit" size="sm" className="w-fit">Post Payment</Button>
    </form>
  );
}
