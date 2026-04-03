import { getGuest } from "../actions/guest-actions";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { GuestDocumentsSection } from "./guest-documents-section";
import { ClearLocalStorageOnMount } from "@/components/custom/clear-local-storage-on-mount";
import { NEW_GUEST_DRAFT_KEY } from "@/lib/guests/draft";

interface GuestDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ clearDraft?: string }>;
}

const VIP_COLORS: Record<string, string> = {
  bronze: "bg-amber-700 text-white",
  silver: "bg-slate-400 text-white",
  gold: "bg-amber-400 text-amber-900",
  platinum: "bg-slate-200 text-slate-800",
  vip: "bg-purple-600 text-white",
};

export default async function GuestDetailPage({ params, searchParams }: GuestDetailPageProps) {
  await redirectIfNotAuthenticated();

  const { id } = await params;
  const { clearDraft } = await searchParams;
  const result = await getGuest(id);

  if ("error" in result || !result.guest) {
    notFound();
  }

  const { guest, preferences, vipFlag } = result;

  return (
    <>
      <ClearLocalStorageOnMount
        enabled={clearDraft === "new-guest"}
        storageKey={NEW_GUEST_DRAFT_KEY}
        searchParamToRemove="clearDraft"
      />
    <div className="page-shell">
      <div className="page-container max-w-3xl">
      {/* Back */}
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/guests">← All Guests</Link>
        </Button>
      </div>

      {/* Guest header */}
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-2xl font-medium tracking-tight text-muted-foreground select-none">
          {guest.first_name[0]}
          {guest.last_name[0]}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="page-title">
              {guest.first_name} {guest.last_name}
            </h1>
            {vipFlag && (
              <Badge
                className={`text-xs font-medium ${VIP_COLORS[vipFlag.vip_tier] ?? "bg-muted text-foreground"}`}
              >
                {vipFlag.vip_tier.toUpperCase()}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Guest since{" "}
            {new Date(guest.created_at).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/guests/${id}/edit`}>Edit</Link>
        </Button>
      </div>

      <Separator />

      {/* Contact details */}
      <Card className="glass-panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Detail label="Email" value={guest.email} />
          <Detail label="Phone" value={guest.phone} />
          <Detail label="Nationality" value={guest.nationality} />
          <Detail
            label="Date of Birth"
            value={
              guest.date_of_birth
                ? new Date(guest.date_of_birth).toLocaleDateString()
                : null
            }
          />
          {guest.notes && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Notes</span>
              <p className="mt-0.5 whitespace-pre-line">{guest.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      {preferences.length > 0 && (
        <Card className="glass-panel">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {preferences.map((pref) => (
                <div key={pref.id}>
                  <dt className="text-muted-foreground capitalize">
                    {pref.key.replace("_", " ")}
                  </dt>
                  <dd className="font-medium">{pref.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Documents (uses MediaUpload) */}
      <GuestDocumentsSection guestId={id} />
      </div>
    </div>
    </>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <p className="font-medium">{value ?? "—"}</p>
    </div>
  );
}
