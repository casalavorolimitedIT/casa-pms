import { getGuest } from "../actions/guest-actions";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { GuestDocumentsSection } from "./guest-documents-section";

interface GuestDetailPageProps {
  params: Promise<{ id: string }>;
}

const VIP_COLORS: Record<string, string> = {
  bronze: "bg-amber-700 text-white",
  silver: "bg-slate-400 text-white",
  gold: "bg-amber-400 text-amber-900",
  platinum: "bg-slate-200 text-slate-800",
  vip: "bg-purple-600 text-white",
};

export default async function GuestDetailPage({ params }: GuestDetailPageProps) {
  await redirectIfNotAuthenticated();

  const { id } = await params;
  const result = await getGuest(id);

  if ("error" in result || !result.guest) {
    notFound();
  }

  const { guest, preferences, vipFlag } = result;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      {/* Back */}
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/guests">← All Guests</Link>
        </Button>
      </div>

      {/* Guest header */}
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-xl font-semibold text-muted-foreground select-none">
          {guest.first_name[0]}
          {guest.last_name[0]}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold">
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
      <Card>
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
        <Card>
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
