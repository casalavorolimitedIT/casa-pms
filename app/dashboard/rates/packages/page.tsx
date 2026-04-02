import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RatePackagesPage() {
  await redirectIfNotAuthenticated();

  return (
    <div className="min-h-full bg-zinc-50/60 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Rate Packages</h1>
          <p className="text-sm text-zinc-500">Package builder scaffold for bundled room + services pricing.</p>
        </div>

        <Card className="border-zinc-200 bg-white shadow-sm">
          <CardHeader><CardTitle className="text-base">Coming Next</CardTitle></CardHeader>
          <CardContent className="text-sm text-zinc-600">
            Package composition (room + breakfast + airport transfer) is prepared as an M02 continuation task.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
