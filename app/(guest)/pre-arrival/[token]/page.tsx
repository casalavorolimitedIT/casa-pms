import { createAdminClient } from "@/lib/supabase/admin";
import { recordPreArrivalResponse } from "@/app/dashboard/pre-arrival/actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Params = { token: string };

function getGuestName(guestRaw: unknown) {
  const guest = Array.isArray(guestRaw)
    ? (guestRaw[0] as { first_name?: string; last_name?: string } | undefined)
    : (guestRaw as { first_name?: string; last_name?: string } | null);
  return `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Guest";
}

export default async function PreArrivalGuestPage({ params }: { params: Promise<Params> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: tokenRecord } = await admin
    .from("pre_arrival_tokens")
    .select("id, reservation_id, responded_at, expires_at, reservations(check_in, check_out, guests(first_name,last_name))")
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
        <p className="mt-2 text-sm text-zinc-500">
          This survey link has expired. Please contact the hotel to receive a new one.
        </p>
      </div>
    );
  }

  if (tokenRecord.responded_at) {
    return (
      <div className="rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-zinc-900">All set!</p>
        <p className="mt-2 text-sm text-zinc-500">
          Your pre-arrival preferences have already been submitted. We look forward to welcoming you.
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
        <h1 className="text-2xl font-semibold text-zinc-900">Welcome, {guestName}</h1>
        <p className="text-sm text-zinc-500">
          Please take a moment to share your preferences so we can make your stay as comfortable as possible.
          {(reservation as { check_in?: string } | null)?.check_in ? (
            <span> Check-in: <strong>{(reservation as { check_in?: string }).check_in}</strong></span>
          ) : null}
        </p>
      </div>

      <form action={recordPreArrivalResponse} className="grid gap-5">
        <input type="hidden" name="token" value={token} />

        <div className="grid gap-2">
          <Label htmlFor="arrivalTime">Expected arrival time</Label>
          <Input id="arrivalTime" name="arrivalTime" type="time" placeholder="e.g. 14:30" />
          <p className="text-xs text-zinc-400">Helps us prepare your room on time.</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="transportType">How are you arriving?</Label>
          <select
            id="transportType"
            name="transportType"
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">Select transport type</option>
            <option value="own_car">Own car</option>
            <option value="taxi">Taxi</option>
            <option value="airport_transfer">Airport transfer (we can arrange)</option>
            <option value="train">Train</option>
            <option value="other">Other</option>
          </select>
        </div>

        <fieldset className="grid gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4">
          <legend className="px-1 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Room preferences</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="pillowPreference">Pillow preference</Label>
              <Input id="pillowPreference" name="pillowPreference" placeholder="e.g. Firm, Feather, Extra" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="floorPreference">Preferred floor</Label>
              <Input id="floorPreference" name="floorPreference" placeholder="e.g. High floor, Quiet side" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dietaryRequirements">Dietary requirements</Label>
            <Input id="dietaryRequirements" name="dietaryRequirements" placeholder="e.g. Vegetarian, Gluten-free, Nut allergy" />
          </div>
        </fieldset>

        <div className="grid gap-2">
          <Label htmlFor="specialRequests">Special requests</Label>
          <textarea
            id="specialRequests"
            name="specialRequests"
            rows={4}
            placeholder="Let us know anything else you need – baby cot, anniversary bottle, connecting rooms, early check-in…"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <FormSubmitButton
          idleText="Submit preferences"
          pendingText="Submitting..."
          className="bg-[#ff6900] text-white hover:bg-[#e55f00]"
        />
      </form>
    </div>
  );
}
