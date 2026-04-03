import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const items = [
  { label: "Tentative", className: "bg-zinc-100 text-zinc-700 border-zinc-200" },
  { label: "Confirmed", className: "bg-blue-50 text-blue-700 border-blue-200" },
  { label: "Checked In", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "Drop Target", className: "bg-orange-50 text-orange-700 border-orange-200" },
];

export function BoardLegend() {
  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-zinc-700">Legend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          {items.map((item) => (
            <span
              key={item.label}
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${item.className}`}
            >
              {item.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
