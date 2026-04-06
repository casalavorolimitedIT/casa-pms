import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { submitGuestOrder, getGuestOrderingContext } from "@/app/dashboard/fnb/actions";

interface GuestOrderPageProps {
  params: Promise<{ qrCode: string }>;
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function GuestOrderPage({ params, searchParams }: GuestOrderPageProps) {
  const { qrCode } = await params;
  const query = (await searchParams) ?? {};
  const ok = first(query.ok);
  const error = first(query.error);

  const context = await getGuestOrderingContext(qrCode);
  if (context.error || !context.qr) {
    return (
      <Card>
        <CardHeader><CardTitle>Order unavailable</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-600">{context.error ?? "This ordering link is unavailable."}</p>
        </CardContent>
      </Card>
    );
  }

  const outletRaw = context.qr.outlets as { name?: string } | Array<{ name?: string }> | null;
  const outlet = Array.isArray(outletRaw) ? outletRaw[0] : outletRaw;
  const itemOptions = (context.items ?? []).map((item) => ({
    value: item.id,
    label: `${item.name} · ${item.base_price_minor}`,
  }));

  const submitAction = async (formData: FormData) => {
    "use server";
    const result = await submitGuestOrder(formData);
    if (result?.success) {
      redirect(`/order/${qrCode}?ok=${encodeURIComponent(`Order sent (${result.ticketNumber})`)}`);
    }
    redirect(`/order/${qrCode}?error=${encodeURIComponent(result?.error ?? "Unable to submit order")}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{outlet?.name ?? "Outlet"} Ordering</CardTitle>
          <p className="text-sm text-zinc-500">{context.qr.label ?? "Place your order and we will send it to the kitchen."}</p>
        </CardHeader>
        <CardContent>
          {ok ? <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</p> : null}
          {error ? <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <form action={submitAction} className="grid gap-3">
            <input type="hidden" name="qrCode" value={qrCode} />

            <div className="grid gap-2">
              <Label htmlFor="menuItemId">Menu Item</Label>
              <FormSelectField name="menuItemId" options={itemOptions} placeholder="Choose an item" />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" name="quantity" type="number" min={1} max={20} defaultValue={1} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="guestName">Name (optional)</Label>
                <Input id="guestName" name="guestName" placeholder="Guest name" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">Notes (optional)</Label>
              <Input id="note" name="note" placeholder="No onion, extra spicy, etc." />
            </div>

            <FormSubmitButton idleText="Submit order" pendingText="Submitting..." className="w-full sm:w-auto" />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
        <CardContent>
          {(context.recentOrders ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500">No orders yet from this QR.</p>
          ) : (
            <ul className="space-y-2">
              {context.recentOrders.map((order) => (
                <li key={order.id} className="rounded-lg border border-zinc-200 px-3 py-2">
                  <p className="text-sm font-medium text-zinc-900">{order.ticket_number || order.id.slice(0, 8)}</p>
                  <p className="text-xs text-zinc-500">{order.status} · {new Date(order.created_at).toLocaleString("en-GB")}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
