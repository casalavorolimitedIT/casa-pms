import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import {
  escalateFeedback,
  getFeedbackContext,
  resolveFeedbackIssue,
  sendFeedbackSurvey,
} from "./actions";

const STATUS_TONE: Record<string, string> = {
  received: "bg-blue-100 text-blue-700",
  escalated: "bg-red-100 text-red-700",
  resolved: "bg-emerald-100 text-emerald-800",
};

function ScoreBar({ score }: { score: number | null | undefined }) {
  if (!score) return <span className="text-xs text-zinc-400">—</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-sm font-semibold text-zinc-900">{score}</span>
      <span className="text-xs text-zinc-400">/ 5</span>
    </span>
  );
}

function getGuestName(guestRaw: unknown) {
  if (!guestRaw) return "Unknown guest";
  const guest = Array.isArray(guestRaw)
    ? (guestRaw[0] as { first_name?: string; last_name?: string } | undefined)
    : (guestRaw as { first_name?: string; last_name?: string } | null);
  return `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Unknown guest";
}

interface FeedbackPageProps {
  searchParams: Promise<{ error?: string; ok?: string }>;
}

export default async function FeedbackPage({ searchParams }: FeedbackPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const { error, ok } = await searchParams;

  if (!activePropertyId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.
      </div>
    );
  }

  const context = await getFeedbackContext(activePropertyId);

  const received = context.entries.filter((e) => e.status === "received").length;
  const escalated = context.entries.filter((e) => e.status === "escalated").length;
  const resolved = context.entries.filter((e) => e.status === "resolved").length;
  const avgScore =
    context.entries.length > 0
      ? (
          context.entries.reduce((sum, e) => sum + (e.overall_score ?? 0), 0) /
          context.entries.length
        ).toFixed(1)
      : "—";

  async function sendSurveyAndRedirect(formData: FormData) {
    "use server";
    try {
      await sendFeedbackSurvey(formData);
      redirect("/dashboard/feedback?ok=survey-sent");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send feedback survey";
      redirect(`/dashboard/feedback?error=${encodeURIComponent(message)}`);
    }
  }

  async function escalateAndRedirect(formData: FormData) {
    "use server";
    try {
      await escalateFeedback(formData);
      redirect("/dashboard/feedback?ok=feedback-escalated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to escalate feedback";
      redirect(`/dashboard/feedback?error=${encodeURIComponent(message)}`);
    }
  }

  async function resolveAndRedirect(formData: FormData) {
    "use server";
    try {
      await resolveFeedbackIssue(formData);
      redirect("/dashboard/feedback?ok=feedback-resolved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resolve feedback";
      redirect(`/dashboard/feedback?error=${encodeURIComponent(message)}`);
    }
  }

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast error={error} ok={ok} successTitle="Feedback action completed" />
        <div className="space-y-1">
          <h1 className="page-title text-balance tracking-tight">Guest Feedback</h1>
          <p className="page-subtitle">
            Send post-stay surveys, track satisfaction scores, manage escalations, and resolve guest complaints.
          </p>
        </div>

        {/* ── Stats ── */}
        <div className="grid gap-3 sm:grid-cols-4">
          <Card className="border-zinc-200">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Received</p>
              <p className="text-3xl font-semibold tabular-nums text-zinc-900">{received}</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-200">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Escalated</p>
              <p className="text-3xl font-semibold tabular-nums text-red-600">{escalated}</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-200">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Resolved</p>
              <p className="text-3xl font-semibold tabular-nums text-emerald-600">{resolved}</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-200">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Avg. Score</p>
              <p className="text-3xl font-semibold tabular-nums text-zinc-900">{avgScore}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          {/* ── Send survey form ── */}
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Send Feedback Survey</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={sendSurveyAndRedirect} className="grid gap-4">
                <input type="hidden" name="propertyId" value={activePropertyId} />

                <div className="grid gap-2">
                  <Label>Reservation</Label>
                  <FormSelectField
                    name="reservationId"
                    options={context.reservations.map((r) => ({
                      value: r.id,
                      label: `${getGuestName(r.guests)} — check-out ${r.check_out}`,
                    }))}
                    placeholder="Select reservation"
                    emptyStateText="No recent departures found."
                    emptyStateLinkHref="/dashboard/reservations"
                    emptyStateLinkLabel="View reservations"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="expiresInDays">Link expires in (days)</Label>
                  <Input
                    id="expiresInDays"
                    name="expiresInDays"
                    type="number"
                    min={1}
                    max={30}
                    defaultValue={14}
                  />
                </div>

                <FormSubmitButton
                  idleText="Send Survey"
                  pendingText="Sending..."
                  className="bg-[#ff6900] text-white hover:bg-[#e55f00]"
                />
              </form>
            </CardContent>
          </Card>

          {/* ── Sent survey tokens ── */}
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Sent Surveys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {context.tokens.length === 0 ? (
                <p className="text-sm text-zinc-400">No surveys sent yet.</p>
              ) : (
                context.tokens.slice(0, 10).map((tk) => {
                  const res = Array.isArray(tk.reservations)
                    ? tk.reservations[0]
                    : tk.reservations;
                  return (
                    <div
                      key={tk.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50/70 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {getGuestName((res as { guests?: unknown } | null)?.guests)}
                        </p>
                        <p className="text-xs text-zinc-400">
                          Sent {tk.sent_at ? new Date(tk.sent_at).toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tk.responded_at ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}
                      >
                        {tk.responded_at ? "Responded" : "Pending"}
                      </span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Feedback entries ── */}
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Feedback Responses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {context.entries.length === 0 ? (
              <p className="text-sm text-zinc-400">No feedback responses yet.</p>
            ) : (
              context.entries.map((entry) => {
                const res = Array.isArray(entry.reservations)
                  ? entry.reservations[0]
                  : entry.reservations;

                return (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {getGuestName((res as { guests?: unknown } | null)?.guests)}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[entry.status] ?? "bg-zinc-100 text-zinc-700"}`}
                      >
                        {entry.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 rounded-xl bg-white p-3 text-center">
                      <div>
                        <p className="text-xs text-zinc-400">Overall</p>
                        <ScoreBar score={entry.overall_score} />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400">Cleanliness</p>
                        <ScoreBar score={entry.cleanliness_score} />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400">Service</p>
                        <ScoreBar score={entry.service_score} />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400">Food</p>
                        <ScoreBar score={entry.food_score} />
                      </div>
                    </div>

                    {entry.comment && (
                      <blockquote className="border-l-2 border-zinc-200 pl-3 text-xs italic text-zinc-500">
                        {entry.comment}
                      </blockquote>
                    )}

                    {entry.escalation_reason && (
                      <p className="text-xs text-red-600">
                        Escalation: {entry.escalation_reason}
                        {entry.escalation_note ? ` — ${entry.escalation_note}` : ""}
                      </p>
                    )}

                    {entry.status !== "resolved" && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {entry.status === "received" && (
                          <form action={escalateAndRedirect}>
                            <input type="hidden" name="entryId" value={entry.id} />
                            <input type="hidden" name="reason" value="Manually escalated by staff" />
                            <FormSubmitButton
                              idleText="Escalate"
                              pendingText="..."
                              className="h-7 rounded-md border border-red-200 bg-red-50 px-3 text-xs text-red-700 hover:bg-red-100"
                            />
                          </form>
                        )}
                        <form action={resolveAndRedirect}>
                          <input type="hidden" name="entryId" value={entry.id} />
                          <FormSubmitButton
                            idleText="Mark resolved"
                            pendingText="..."
                            className="h-7 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs text-emerald-700 hover:bg-emerald-100"
                          />
                        </form>
                      </div>
                    )}

                    {entry.status === "resolved" && entry.resolved_at && (
                      <p className="text-xs text-emerald-600">
                        Resolved on {new Date(entry.resolved_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
