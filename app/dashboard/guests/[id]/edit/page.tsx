import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getGuest, updateGuest } from "@/app/dashboard/guests/actions/guest-actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { FormDateTimeField } from "@/components/ui/form-date-time-field";

interface EditGuestPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditGuestPage({ params, searchParams }: EditGuestPageProps) {
  await redirectIfNotAuthenticated();

  const { id } = await params;
  const { error } = await searchParams;

  const result = await getGuest(id);

  if ("error" in result || !result.guest) {
    notFound();
  }

  const { guest } = result;

  async function updateGuestAndRedirect(formData: FormData) {
    "use server";

    const outcome = await updateGuest(id, formData);

    if (outcome?.success) {
      redirect(`/dashboard/guests/${id}`);
    }

    const message = outcome?.error ?? "Failed to update guest";
    redirect(`/dashboard/guests/${id}/edit?error=${encodeURIComponent(message)}`);
  }

  return (
    <div className="page-shell">
      <div className="page-container max-w-2xl">
        <FormStatusToast error={error} ok={undefined} successTitle="Guest updated" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Edit Guest</h1>
            <p className="page-subtitle">Update guest profile and contact information.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/guests/${id}`}>Back to Guest</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/guests">All Guests</Link>
            </Button>
          </div>
        </div>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Guest Details</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <form action={updateGuestAndRedirect} className="grid gap-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" name="firstName" defaultValue={guest.first_name} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" name="lastName" defaultValue={guest.last_name} required />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={guest.email ?? ""} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" defaultValue={guest.phone ?? ""} />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input id="nationality" name="nationality" defaultValue={guest.nationality ?? ""} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dateOfBirth">Date of birth</Label>
                <FormDateTimeField name="dateOfBirth"  includeTime={false} placeholder="Select date of birth" defaultValue={guest.date_of_birth ?? ""} />
                 
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={4} defaultValue={guest.notes ?? ""} />
              </div>

              <FormSubmitButton
                idleText="Save changes"
                pendingText="Saving..."
                className="bg-[#ff6900] text-white hover:bg-[#e55f00] h-12"
              />
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
