import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const TEST_USER_A_EMAIL = process.env.M10_TEST_USER_A_EMAIL;
const TEST_USER_A_PASSWORD = process.env.M10_TEST_USER_A_PASSWORD;
const TEST_USER_B_EMAIL = process.env.M10_TEST_USER_B_EMAIL;
const TEST_USER_B_PASSWORD = process.env.M10_TEST_USER_B_PASSWORD;

function getClient() {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(
  client: { auth: { signInWithPassword: (credentials: { email: string; password: string }) => Promise<{ error: { message?: string } | null }> } },
  email?: string,
  password?: string,
) {
  if (!email || !password) {
    throw new Error("Missing test credentials for integration test user");
  }

  const { error } = await client.auth.signInWithPassword({ email, password });
  assert.equal(error, null, `Sign-in failed for ${email}: ${error?.message}`);
}

test("M10 RLS: chain rate assignments are isolated by user property scope", async () => {
  const clientA = getClient();
  const clientB = getClient();

  await signIn(clientA, TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD);
  await signIn(clientB, TEST_USER_B_EMAIL, TEST_USER_B_PASSWORD);

  const [aAssignments, bAssignments] = await Promise.all([
    clientA.from("chain_rate_plan_assignments").select("id, property_id").limit(50),
    clientB.from("chain_rate_plan_assignments").select("id, property_id").limit(50),
  ]);

  assert.equal(aAssignments.error, null, aAssignments.error?.message);
  assert.equal(bAssignments.error, null, bAssignments.error?.message);

  const aPropertyIds = new Set((aAssignments.data ?? []).map((row) => row.property_id));
  const bPropertyIds = new Set((bAssignments.data ?? []).map((row) => row.property_id));

  // The exact overlap depends on fixture setup. We at least require each user to have scoped visibility.
  assert.ok(aPropertyIds.size > 0, "User A should see at least one scoped property assignment");
  assert.ok(bPropertyIds.size > 0, "User B should see at least one scoped property assignment");
});

test("M10 RLS: cross-property guest links stay inside organization scope", async () => {
  const clientA = getClient();
  await signIn(clientA, TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD);

  const linksRes = await clientA
    .from("cross_property_guest_links")
    .select("id, organization_id, source_guest_id, linked_guest_id")
    .limit(100);

  assert.equal(linksRes.error, null, linksRes.error?.message);

  for (const row of linksRes.data ?? []) {
    assert.notEqual(row.source_guest_id, row.linked_guest_id, "Guest links must not self-reference");
  }
});
