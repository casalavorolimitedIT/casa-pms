import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FolioPdfPlaceholder() {
  return (
    <Card className="border-dashed border-zinc-300 bg-zinc-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Invoice / PDF Export</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-zinc-600">
          PDF rendering hook is prepared. Connect @react-pdf/renderer template here for branded folio invoices.
        </p>
      </CardContent>
    </Card>
  );
}
