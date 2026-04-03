import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RatePlanFormProps {
  propertyId: string;
  action: (formData: FormData) => void | Promise<void>;
}

export function RatePlanForm({ propertyId, action }: RatePlanFormProps) {
  return (
    <form action={action} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4">
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="grid gap-2">
        <Label htmlFor="name">Plan Name</Label>
        <Input id="name" name="name" placeholder="Best Available Rate" required />
      </div>
      <div className="grid gap-2 sm:max-w-xs">
        <Label htmlFor="currencyCode">Currency</Label>
        <Input id="currencyCode" name="currencyCode" defaultValue="USD" required />
      </div>
      <div className="flex items-center gap-2">
        <input id="isActive" name="isActive" type="checkbox" defaultChecked className="h-4 w-4" />
        <Label htmlFor="isActive">Active</Label>
      </div>
      <Button type="submit" className="w-fit" size="sm">Create Rate Plan</Button>
    </form>
  );
}
