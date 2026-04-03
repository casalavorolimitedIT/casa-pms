import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { setupOrganization } from "./actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function SetupPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Already set up → send to dashboard.
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const errorMessage = params.error ? decodeURIComponent(params.error) : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4">
      {/* Ambient bloom */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-150 w-150 rounded-full bg-[#ff6900] opacity-[0.04] blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        <div className="page-hero space-y-1 text-center">
          <h1 data-display="true" className="text-4xl font-semibold tracking-tight text-zinc-900">Welcome to Casa PMS</h1>
          <p className="page-subtitle">
            Set up your organization and first property to get started.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <form action={setupOrganization} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Your name <span className="text-zinc-400">(optional)</span></Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Jane Smith"
              autoComplete="name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="organizationName">Organization name</Label>
            <Input
              id="organizationName"
              name="organizationName"
              type="text"
              placeholder="Acme Hospitality Ltd."
              required
              autoComplete="organization"
            />
            <p className="text-xs text-zinc-400">The company or group that owns the properties.</p>
          </div>

          <hr className="border-zinc-100" />

          <div className="space-y-1.5">
            <Label htmlFor="propertyName">First property name</Label>
            <Input
              id="propertyName"
              name="propertyName"
              type="text"
              placeholder="The Grand Hotel"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="currencyCode">Currency</Label>
              <select
                id="currencyCode"
                name="currencyCode"
                aria-label="Currency"
                defaultValue="USD"
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="NGN">NGN — Nigerian Naira</option>
                <option value="GHS">GHS — Ghanaian Cedi</option>
                <option value="ZAR">ZAR — South African Rand</option>
                <option value="KES">KES — Kenyan Shilling</option>
                <option value="AED">AED — UAE Dirham</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                name="timezone"
                type="text"
                placeholder="UTC"
                defaultValue="UTC"
              />
            </div>
          </div>

          <FormSubmitButton idleText="Create account & get started" pendingText="Setting up…" className="w-full" />
        </form>

        <p className="text-center text-xs text-zinc-400">
          Logged in as <span className="font-medium text-zinc-600">{user.email}</span>.{" "}
          <Link href="/login" className="underline underline-offset-2 hover:text-zinc-700">
            Wrong account?
          </Link>
        </p>
      </div>
    </main>
  );
}
