import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RatePackagesPage() {
  await redirectIfNotAuthenticated();

  return (
    <div className="page-shell">
      <div className="page-container">
        <div>
          <h1 className="page-title">Rate Packages</h1>
          <p className="page-subtitle">Package builder scaffold for bundled room + services pricing.</p>
        </div>

        <Card className="glass-panel">
          <CardHeader><CardTitle className="text-base">Coming Next</CardTitle></CardHeader>
          <CardContent className="text-sm text-zinc-600">
            Package composition (room + breakfast + airport transfer) is prepared as an M02 continuation task.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
