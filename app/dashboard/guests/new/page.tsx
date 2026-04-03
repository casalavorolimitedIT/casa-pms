import Link from "next/link";
import { redirect } from "next/navigation";
import { createGuest } from "@/app/dashboard/guests/actions/guest-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { NewGuestForm } from "./new-guest-form";

interface NewGuestPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewGuestPage({ searchParams }: NewGuestPageProps) {
  await redirectIfNotAuthenticated();
  const { error } = await searchParams;

  async function createGuestAndRedirect(formData: FormData) {
    "use server";

    const result = await createGuest(formData);

    if (result?.id) {
      redirect(`/dashboard/guests/${result.id}?clearDraft=new-guest`);
    }

    const message = result?.error ?? "Failed to create guest";
    redirect(`/dashboard/guests/new?error=${encodeURIComponent(message)}`);
  }

  return (
    <div className="page-shell">
      <div className="page-container max-w-2xl">
        <FormStatusToast error={error} ok={undefined} successTitle="Guest created" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Add Guest</h1>
            <p className="page-subtitle">Create a new guest profile with contact details and optional notes.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/guests">Back to Guests</Link>
          </Button>
        </div>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Guest Information</CardTitle>
          </CardHeader>
          <CardContent>
            <NewGuestForm error={error} action={createGuestAndRedirect} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
