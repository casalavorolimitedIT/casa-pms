import { createAdminClient } from "@/lib/supabase/admin";
import { submitGuestFeedback } from "@/app/dashboard/feedback/actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Label } from "@/components/ui/label";

type Params = { token: string };

function getGuestName(guestRaw: unknown) {
  const guest = Array.isArray(guestRaw)
    ? (guestRaw[0] as { first_name?: string; last_name?: string } | undefined)
    : (guestRaw as { first_name?: string; last_name?: string } | null);
  return `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Guest";
}

function ScoreInput({ name, label }: { name: string; label: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name} className="text-sm">
        {label}
      </Label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="flex cursor-pointer flex-col items-center gap-1">
            <input
              type="radio"
              name={name}
              value={n}
              className="sr-only peer"
            />
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-500 peer-checked:border-[#ff6900] peer-checked:bg-[#ff6900] peer-checked:text-white hover:border-zinc-400 transition-colors">
              {n}
            </span>
          </label>
        ))}
      </div>
      <p className="flex justify-between text-[10px] text-zinc-400">
        <span>Poor</span>
        <span>Excellent</span>
      </p>
    </div>
  );
}

export default async function FeedbackGuestPage({ params }: { params: Promise<Params> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: tokenRecord } = await admin
    .from("feedback_tokens")
    .select(
      "id, reservation_id, responded_at, expires_at, reservations(check_in, check_out, guests(first_name,last_name))"
    )
    .eq("token", token)
    .maybeSingle();

  if (!tokenRecord) {
    return (
      <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-zinc-900">Link not found</p>
        <p className="mt-2 text-sm text-zinc-500">
          This link is invalid or may have expired. Please contact the hotel directly.
        </p>
      </div>
    );
  }

  if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
    return (
      <div className="rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-zinc-900">Link expired</p>
        <p className="mt-2 text-sm text-zinc-500">Thank you for your stay. This survey link has expired.</p>
      </div>
    );
  }

  if (tokenRecord.responded_at) {
    return (
      <div className="rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
        <p className="text-2xl">🙏</p>
        <p className="mt-2 text-lg font-semibold text-zinc-900">Thank you!</p>
        <p className="mt-1 text-sm text-zinc-500">
          Your feedback has been received. We really appreciate you taking the time.
        </p>
      </div>
    );
  }

  const reservation = Array.isArray(tokenRecord.reservations)
    ? tokenRecord.reservations[0]
    : tokenRecord.reservations;
  const guestName = getGuestName((reservation as { guests?: unknown } | null)?.guests);

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold text-zinc-900">How was your stay, {guestName}?</h1>
        <p className="text-sm text-zinc-500">
          Your feedback helps us improve for every future guest. It takes less than two minutes.
          {(reservation as { check_out?: string } | null)?.check_out ? (
            <> Check-out: <strong>{(reservation as { check_out?: string }).check_out}</strong></>
          ) : null}
        </p>
      </div>

      <form action={submitGuestFeedback} className="grid gap-6">
        <input type="hidden" name="token" value={token} />

        <ScoreInput name="overallScore" label="Overall experience *" />
        <ScoreInput name="cleanlinessScore" label="Cleanliness" />
        <ScoreInput name="serviceScore" label="Service" />
        <ScoreInput name="foodScore" label="Food & beverage" />

        <div className="grid gap-2">
          <Label htmlFor="comment">Tell us more (optional)</Label>
          <textarea
            id="comment"
            name="comment"
            rows={4}
            placeholder="What stood out? Is there anything we could do better?"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <FormSubmitButton
          idleText="Submit feedback"
          pendingText="Submitting..."
          className="bg-[#ff6900] text-white hover:bg-[#e55f00]"
        />
      </form>
    </div>
  );
}
