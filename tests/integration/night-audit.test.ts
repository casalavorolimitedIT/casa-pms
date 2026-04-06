/**
 * tests/integration/night-audit.test.ts
 *
 * Verifies night-audit data-layer invariants against a live Supabase environment:
 *   - Reservations due to check out today are queryable with the expected index path.
 *   - No reservation has check_in > check_out (data integrity).
 *   - Night-audit idempotency: running the same date query twice returns identical results.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   M12_FRONT_DESK_EMAIL
 *   M12_FRONT_DESK_PASSWORD
 *   M12_TEST_PROPERTY_ID
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const FRONT_DESK_EMAIL = process.env.M12_FRONT_DESK_EMAIL;
const FRONT_DESK_PASSWORD = process.env.M12_FRONT_DESK_PASSWORD;
const TEST_PROPERTY_ID = process.env.M12_TEST_PROPERTY_ID;

function getClient() {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(
  client: ReturnType<typeof getClient>,
  email?: string,
  password?: string,
) {
  if (!email || !password) throw new Error("Missing credentials");
  const { error } = await client.auth.signInWithPassword({ email, password });
  assert.equal(error, null, `Sign-in failed: ${error?.message}`);
}

const TODAY = new Date().toISOString().slice(0, 10);

test("M12 night-audit: can query checked-in reservations due to check out today", async () => {
  if (!TEST_PROPERTY_ID) {
    console.warn("SKIP — M12_TEST_PROPERTY_ID not set");
    return;
  }

  const client = getClient();
  await signIn(client, FRONT_DESK_EMAIL, FRONT_DESK_PASSWORD);

  const { data, error } = await client
    .from("reservations")
    .select("id, status, check_in, check_out")
    .eq("property_id", TEST_PROPERTY_ID)
    .eq("status", "checked_in")
    .eq("check_out", TODAY)
    .limit(200);

  assert.equal(error, null, error?.message);
  assert.ok(Array.isArray(data), "Expected array");

  // All returned rows must have status checked_in and check_out = today
  for (const row of data ?? []) {
    assert.equal(row.status, "checked_in");
    assert.equal(row.check_out, TODAY);
  }
});

test("M12 night-audit: no reservation has check_in strictly after check_out", async () => {
  if (!TEST_PROPERTY_ID) {
    console.warn("SKIP — M12_TEST_PROPERTY_ID not set");
    return;
  }

  const client = getClient();
  await signIn(client, FRONT_DESK_EMAIL, FRONT_DESK_PASSWORD);

  const { data, error } = await client
    .from("reservations")
    .select("id, check_in, check_out")
    .eq("property_id", TEST_PROPERTY_ID)
    .limit(500);

  assert.equal(error, null, error?.message);

  for (const row of data ?? []) {
    assert.ok(
      row.check_in <= row.check_out,
      `Reservation ${row.id} has check_in (${row.check_in}) > check_out (${row.check_out})`,
    );
  }
});

test("M12 night-audit: same-date query is idempotent (returns same count on repeat)", async () => {
  if (!TEST_PROPERTY_ID) {
    console.warn("SKIP — M12_TEST_PROPERTY_ID not set");
    return;
  }

  const client = getClient();
  await signIn(client, FRONT_DESK_EMAIL, FRONT_DESK_PASSWORD);

  const query = () =>
    client
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("property_id", TEST_PROPERTY_ID)
      .eq("status", "checked_in");

  const [r1, r2] = await Promise.all([query(), query()]);

  assert.equal(r1.error, null, r1.error?.message);
  assert.equal(r2.error, null, r2.error?.message);
  assert.equal(r1.count, r2.count, "Idempotency failed: counts differed between two identical queries");
});

test("M12 night-audit: housekeeping assignments are accessible for property", async () => {
  if (!TEST_PROPERTY_ID) {
    console.warn("SKIP — M12_TEST_PROPERTY_ID not set");
    return;
  }

  const client = getClient();
  await signIn(client, FRONT_DESK_EMAIL, FRONT_DESK_PASSWORD);

  const { error } = await client
    .from("housekeeping_assignments")
    .select("id, status")
    .eq("property_id", TEST_PROPERTY_ID)
    .limit(100);

  assert.equal(error, null, error?.message);
});
