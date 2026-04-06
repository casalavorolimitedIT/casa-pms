#!/usr/bin/env node
/**
 * scripts/release/smoke-test.ts
 *
 * Post-deployment smoke test.  Verifies:
 *   1. Environment variables are complete.
 *   2. Supabase is reachable (service-role ping).
 *   3. Key tables in the pms schema are non-empty (seed data is present).
 *   4. Auth sign-in works with a designated smoke-test account.
 *   5. RLS enforcement: anon client cannot read protected tables.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx/esm scripts/release/smoke-test.ts
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SMOKE_TEST_EMAIL          — test account email
 *   SMOKE_TEST_PASSWORD       — test account password
 */

import { createClient } from "@supabase/supabase-js";

// ─── Env validation ───────────────────────────────────────────────────────────

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SMOKE_TEST_EMAIL",
  "SMOKE_TEST_PASSWORD",
] as const;

const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`\n✗ Smoke test aborted — missing env vars: ${missing.join(", ")}\n`);
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SMOKE_EMAIL = process.env.SMOKE_TEST_EMAIL!;
const SMOKE_PASSWORD = process.env.SMOKE_TEST_PASSWORD!;

// ─── Clients ──────────────────────────────────────────────────────────────────

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Checks ───────────────────────────────────────────────────────────────────

type CheckResult = { label: string; passed: boolean; detail?: string };
const results: CheckResult[] = [];

function pass(label: string, detail?: string) {
  results.push({ label, passed: true, detail });
}

function fail(label: string, detail: string) {
  results.push({ label, passed: false, detail });
}

async function checkTableNonEmpty(tableName: string) {
  const { count, error } = await adminClient
    .from(tableName)
    .select("id", { count: "exact", head: true })
    .limit(0);

  if (error) {
    fail(`table:${tableName}`, `Query error: ${error.message}`);
  } else if ((count ?? 0) === 0) {
    fail(`table:${tableName}`, "Table is empty — seed data may be missing");
  } else {
    pass(`table:${tableName}`, `${count} row(s)`);
  }
}

async function checkAuthSignIn() {
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await authClient.auth.signInWithPassword({
    email: SMOKE_EMAIL,
    password: SMOKE_PASSWORD,
  });

  if (error) {
    fail("auth:sign-in", error.message);
  } else {
    pass("auth:sign-in", `Signed in as ${SMOKE_EMAIL}`);
  }
}

async function checkAnonCannotReadProperties() {
  const { data, error } = await anonClient
    .from("properties")
    .select("id")
    .limit(10);

  if (error) {
    // An error for anon is also acceptable (e.g. RLS blocks entirely)
    pass("rls:anon-cannot-read-properties", `Blocked with error: ${error.message}`);
    return;
  }

  if ((data ?? []).length === 0) {
    pass("rls:anon-cannot-read-properties", "Returned 0 rows (RLS working)");
  } else {
    fail(
      "rls:anon-cannot-read-properties",
      `Anon client returned ${data!.length} property row(s) — RLS may not be enforced`,
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\nCasa PMS — Deployment Smoke Test\n");
  console.log(`Target: ${SUPABASE_URL}\n`);

  // 1. Key table row counts
  const keyTables = [
    "organizations",
    "properties",
    "profiles",
    "room_types",
    "rooms",
    "reservations",
  ];

  await Promise.all(keyTables.map(checkTableNonEmpty));

  // 2. Auth sign-in
  await checkAuthSignIn();

  // 3. Anon RLS boundary
  await checkAnonCannotReadProperties();

  // ─── Summary ────────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);

  console.log(`\n${"─".repeat(70)}`);
  for (const r of results) {
    const status = r.passed ? "  PASS" : "  FAIL";
    const detail = r.detail ? `  (${r.detail})` : "";
    console.log(`${status}  ${r.label}${detail}`);
  }
  console.log("─".repeat(70));
  console.log(`\n${passed.length}/${results.length} checks passed.\n`);

  if (failed.length > 0) {
    console.error(`✗ Smoke test FAILED (${failed.length} check(s) failed)\n`);
    process.exit(1);
  }

  console.log("✓ Smoke test PASSED — deployment looks healthy.\n");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
