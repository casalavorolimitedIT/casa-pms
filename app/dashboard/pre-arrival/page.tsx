import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import {
  getPreArrivalContext,
  getPreArrivalResponses,
  sendPreArrivalSurvey,
} from "./actions";

function getGuestName(guestRaw: unknown) {
  if (!guestRaw) return "Unknown guest";
  const guest = Array.isArray(guestRaw)
    ? (guestRaw[0] as { first_name?: string; last_name?: string } | undefined)
    : (guestRaw as { first_name?: string; last_name?: string } | null);
  return `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Unknown guest";
}

const TRANSPORT_LABELS: Record<string, string> = {
  own_car: "Own car",
  taxi: "Taxi",
  airport_transfer: "Airport transfer",
  train: "Train",
  other: "Other",
};

interface PreArrivalPageProps {
  searchParams: Promise<{ error?: string; ok?: string }>;
}

export default async function PreArrivalPage({ searchParams }: PreArrivalPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const { error, ok } = await searchParams;

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const [context, responses] = await Promise.all([
    getPreArrivalContext(activePropertyId),
    getPreArrivalResponses(activePropertyId),
  ]);

  const sentCount = context.tokens.filter((token) => token.sent_at).length;
  const respondedCount = context.tokens.filter((token) => token.responded_at).length;

  async function sendSurveyAndRedirect(formData: FormData) {
    "use server";

    try {
      await sendPreArrivalSurvey(formData);
      redirect("/dashboard/pre-arrival?ok=survey-sent");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send pre-arrival survey";
      redirect(`/dashboard/pre-arrival?error=${encodeURIComponent(message)}`);
    }
  }

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast error={error} ok={ok} successTitle="Pre-arrival survey sent" />
        <div className="space-y-1">
          <h1 className="page-title text-balance tracking-tight">Pre-arrival Profiles</h1>
          <p className="page-subtitle">
            Send personalised survey links to arriving guests so the team can prepare room setup, transport, and service before check-in.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card className="border-zinc-200">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Upcoming Arrivals</p>
              <p className="text-3xl font-semibold text-zinc-900">{context.reservations.length}</p>
              <p className="text-sm text-zinc-500">Confirmed or tentative reservations eligible for pre-arrival.</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-200">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Surveys Sent</p>
              <p className="text-3xl font-semibold text-zinc-900">{sentCount}</p>
              <p className="text-sm text-zinc-500">Survey links dispatched to guests.</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-200">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Responded</p>
              <p className="text-3xl font-semibold text-zinc-900">{respondedCount}</p>
              <p className="text-sm text-zinc-500">Complete pre-arrival responses ready for ops.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Send Survey</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={sendSurveyAndRedirect} className="grid gap-4">
                <input type="hidden" name="propertyId" value={activePropertyId} />

                <div className="grid gap-2">
                  <Label>Reservation</Label>
                  <FormSelectField
                    name="reservationId"
                    placeholder="Select reservation"
                    options={context.reservations.map((reservation) => ({
                      value: reservation.id,
                      label: `${getGuestName(reservation.guests)} – ${reservation.check_in}`,
                    }))}
                    emptyStateText="No upcoming reservations found."
                    emptyStateLinkHref="/dashboard/reservations"
                    emptyStateLinkLabel="Create reservation"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="expiresInDays">Link expires in (days)</Label>
                  <Input id="expiresInDays" name="expiresInDays" type="number" min={1} max={30} defaultValue={7} />
                </div>

                <p className="text-xs text-zinc-500">
                  If the guest has a phone number on file, the survey link will also be dispatched via SMS automatically.
                </p>

                <FormSubmitButton idleText="Send Survey Link" pendingText="Creating link..." />
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="text-base">Sent Surveys</CardTitle>
              </CardHeader>
              <CardContent>
                {context.tokens.length === 0 ? (
                  <p className="text-sm text-zinc-500">No surveys dispatched yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {context.tokens.map((tokenRow) => {
                      const reservation = Array.isArray(tokenRow.reservations)
                        ? tokenRow.reservations[0]
                        : tokenRow.reservations;
                      const guestRaw = (reservation as { guests?: unknown } | null)?.guests;
                      const guestName = getGuestName(guestRaw);
                      const surveyUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/pre-arrival/${tokenRow.token}`;

                      return (
                        <li key={tokenRow.id} className="rounded-2xl border border-zinc-200 bg-white p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-medium text-zinc-900">{guestName}</p>
                              <p className="text-xs text-zinc-500">
                                Check-in {(reservation as { check_in?: string } | null)?.check_in ?? "–"}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {tokenRow.responded_at ? (
                                <Badge className="bg-emerald-100 text-emerald-700">Responded</Badge>
                              ) : tokenRow.sent_at ? (
                                <Badge className="bg-orange-100 text-orange-700">Awaiting</Badge>
                              ) : (
                                <Badge className="bg-zinc-100 text-zinc-700">Draft</Badge>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2">
                            <p className="flex-1 truncate text-[11px] font-mono text-zinc-500">{surveyUrl}</p>
                            <Link
                              href={surveyUrl}
                              target="_blank"
                              className="shrink-0 text-xs font-medium text-orange-600 hover:underline"
                            >
                              Preview
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="text-base">Responses</CardTitle>
              </CardHeader>
              <CardContent>
                {responses.length === 0 ? (
                  <p className="text-sm text-zinc-500">No pre-arrival responses received yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {responses.map((response) => {
                      const reservation = Array.isArray(response.reservations)
                        ? response.reservations[0]
                        : response.reservations;
                      const guestName = getGuestName((reservation as { guests?: unknown } | null)?.guests);
                      const prefs = response.room_preferences as Record<string, string> | null;

                      return (
                        <li key={response.id} className="rounded-2xl border border-zinc-200 bg-white p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-medium text-zinc-900">{guestName}</p>
                              <p className="text-xs text-zinc-500">{new Date(response.created_at).toLocaleString("en-GB")}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {response.arrival_time ? (
                                <Badge className="bg-sky-100 text-sky-700">ETA {response.arrival_time}</Badge>
                              ) : null}
                              {response.transport_type ? (
                                <Badge className="bg-violet-100 text-violet-700">
                                  {TRANSPORT_LABELS[response.transport_type] ?? response.transport_type}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          {prefs && Object.keys(prefs).length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-50 p-2 text-xs text-zinc-600">
                              {prefs.pillow ? <span>Pillow: {prefs.pillow}</span> : null}
                              {prefs.floor ? <span>Floor: {prefs.floor}</span> : null}
                              {prefs.dietary ? <span className="col-span-2">Dietary: {prefs.dietary}</span> : null}
                            </div>
                          ) : null}
                          {response.special_requests ? (
                            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                              <strong>Special requests:</strong> {response.special_requests}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
