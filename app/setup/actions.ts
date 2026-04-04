"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getSetupStatus as getCurrentSetupStatus } from "@/lib/setup/get-setup-status";

const SetupSchema = z.object({
  organizationName: z.string().min(2, "Organization name must be at least 2 characters").max(120),
  propertyName: z.string().min(2, "Property name must be at least 2 characters").max(120),
  currencyCode: z.string().length(3, "Currency code must be 3 characters").default("USD"),
  timezone: z.string().min(2).max(80).default("UTC"),
  fullName: z.string().max(120).optional(),
});

export async function setupOrganization(formData: FormData) {
  const parsed = SetupSchema.safeParse({
    organizationName: formData.get("organizationName"),
    propertyName: formData.get("propertyName"),
    currencyCode: formData.get("currencyCode"),
    timezone: formData.get("timezone"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    redirect(`/setup?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();

  const setupStatus = await getCurrentSetupStatus();
  const user = setupStatus.user;

  if (!user) {
    redirect("/login?error=Session+expired.+Please+log+in+again.");
  }

  // Guard: if profile already exists, skip straight to dashboard.
  if (setupStatus.organizationId) {
    redirect("/dashboard");
  }

  // 1. Create organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: parsed.data.organizationName })
    .select("id")
    .single();

  if (orgError || !org) {
    redirect(`/setup?error=${encodeURIComponent(orgError?.message ?? "Failed to create organization.")}`);
  }

  // 2. Create profile linking user → org
  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    organization_id: org.id,
    email: user.email ?? "",
    full_name: parsed.data.fullName ?? null,
  });

  if (profileError) {
    // Clean up the org we just created so we don't leave orphans.
    await supabase.from("organizations").delete().eq("id", org.id);
    redirect(`/setup?error=${encodeURIComponent(profileError.message)}`);
  }

  // 3. Create first property
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .insert({
      organization_id: org.id,
      name: parsed.data.propertyName,
      currency_code: parsed.data.currencyCode.toUpperCase(),
      timezone: parsed.data.timezone,
    })
    .select("id")
    .single();

  if (propertyError || !property) {
    redirect(`/setup?error=${encodeURIComponent(propertyError?.message ?? "Failed to create property.")}`);
  }

  // 4. Seed default property settings
  await supabase.from("property_settings").insert({
    property_id: property.id,
    check_in_time: "15:00",
    check_out_time: "11:00",
  });

  // 5. Grant the setup user the 'owner' role on their first property.
  // Must use the admin client because user_property_roles RLS requires an
  // existing owner/general_manager row to allow inserts — a chicken-and-egg
  // problem at onboarding time.
  const adminClient = createAdminClient();
  await adminClient.from("user_property_roles").insert({
    user_id: user.id,
    property_id: property.id,
    role: "owner",
  });

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

export async function getSetupStatus() {
  return getCurrentSetupStatus();
}
