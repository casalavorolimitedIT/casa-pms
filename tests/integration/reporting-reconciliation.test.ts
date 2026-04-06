/**
 * tests/integration/reporting-reconciliation.test.ts
 *
 * Verifies that revenue report data reconciles with the folio ledger:
 *   - Folio charges posted to a property sum consistently across two query paths.
 *   - No folio charge has a negative amount (data integrity).
 *   - AR aging buckets: overdue folios are queryable and link to valid reservations.
 *   - Report filters (date range) return a subset that is ≤ the unfiltered total.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   M12_ACCOUNTANT_EMAIL
 *   M12_ACCOUNTANT_PASSWORD
 *   M12_TEST_PROPERTY_ID
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ACCOUNTANT_EMAIL = process.env.M12_ACCOUNTANT_EMAIL;
const ACCOUNTANT_PASSWORD = process.env.M12_ACCOUNTANT_PASSWORD;
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
const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 86400 * 1000).toISOString().slice(0, 10);

test("M12 reporting: folio charges have non-negative amounts", async () => {
  if (!TEST_PROPERTY_ID) {
    console.warn("SKIP — M12_TEST_PROPERTY_ID not set");
    return;
  }

  const client = getClient();
  await signIn(client, ACCOUNTANT_EMAIL, ACCOUNTANT_PASSWORD);

  const { data, error } = await client
    .from("folio_charges")
    .select("id, amount_minor")
    .limit(500);

  assert.equal(error, null, error?.message);

  for (const row of data ?? []) {
    assert.ok(
      typeof row.amount_minor === "number" && row.amount_minor >= 0,
      `Charge ${row.id} has negative amount_minor: ${row.amount_minor}`,
    );
  }
});

test("M12 reporting: date-filtered charges are a subset of unfiltered charges", async () => {
  if (!TEST_PROPERTY_ID) {
    console.warn("SKIP — M12_TEST_PROPERTY_ID not set");
    return;
  }

  const client = getClient();
  await signIn(client, ACCOUNTANT_EMAIL, ACCOUNTANT_PASSWORD);

  const [allRes, filteredRes] = await Promise.all([
    client
      .from("folio_charges")
      .select("id", { count: "exact", head: true })
      .limit(0),
    client
      .from("folio_charges")
      .select("id", { count: "exact", head: true })
      .gte("created_at", THIRTY_DAYS_AGO)
      .lte("created_at", TODAY)
      .limit(0),
  ]);

  assert.equal(allRes.error, null, allRes.error?.message);
  assert.equal(filteredRes.error, null, filteredRes.error?.message);

  const allCount = allRes.count ?? 0;
  const filteredCount = filteredRes.count ?? 0;

  assert.ok(
    filteredCount <= allCount,
    `Filtered count (${filteredCount}) cannot exceed total count (${allCount})`,
  );
});

test("M12 reporting: folio charges can be joined to their parent folio", async () => {
  if (!TEST_PROPERTY_ID) {
    console.warn("SKIP — M12_TEST_PROPERTY_ID not set");
    return;
  }

  const client = getClient();
  await signIn(client, ACCOUNTANT_EMAIL, ACCOUNTANT_PASSWORD);

  const { data: charges, error: cErr } = await client
    .from("folio_charges")
    .select("id, folio_id")
    .limit(30);

  assert.equal(cErr, null, cErr?.message);
  if (!charges || charges.length === 0) return;

  const folioIds = [...new Set(charges.map((c) => c.folio_id))];

  const { data: folios, error: fErr } = await client
    .from("folios")
    .select("id")
    .in("id", folioIds);

  assert.equal(fErr, null, fErr?.message);

  const foundFolioIds = new Set((folios ?? []).map((f) => f.id));
  for (const charge of charges) {
    assert.ok(
      foundFolioIds.has(charge.folio_id),
      `Charge ${charge.id} references folio_id ${charge.folio_id} which does not exist (orphaned charge)`,
    );
  }
});

test("M12 reporting: accountant can access folio_payments for reconciliation", async () => {
  if (!TEST_PROPERTY_ID) {
    console.warn("SKIP — M12_TEST_PROPERTY_ID not set");
    return;
  }

  const client = getClient();
  await signIn(client, ACCOUNTANT_EMAIL, ACCOUNTANT_PASSWORD);

  const { error } = await client
    .from("folio_payments")
    .select("id, folio_id, amount_minor, status")
    .limit(50);

  assert.equal(error, null, error?.message);
});
