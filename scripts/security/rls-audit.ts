#!/usr/bin/env node
/**
 * scripts/security/rls-audit.ts
 *
 * Audits every table in the `pms` schema to verify:
 *   1. Row-Level Security (RLS) is enabled on the table.
 *   2. At least one RLS policy exists for each enabled table.
 *
 * Requires a direct PostgreSQL connection with superuser or `pg_read_all_settings`
 * privilege so it can query `pg_tables` and `pg_policies`.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx/esm scripts/security/rls-audit.ts
 *
 * Required env vars:
 *   DATABASE_URL   — PostgreSQL connection string (postgres://user:pass@host/db)
 *   (or SUPABASE_DB_URL if using the Supabase direct connection string)
 */

import pg from "pg";

const { Client } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
  console.error(
    "ERROR: Set DATABASE_URL or SUPABASE_DB_URL in your environment.",
  );
  process.exit(1);
}

type TableRow = { tablename: string; rowsecurity: boolean };
type PolicyRow = { tablename: string; policyname: string; cmd: string; roles: string };

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // 1. All tables in the pms schema
    const tablesResult = await client.query<TableRow>(
      `SELECT tablename, rowsecurity
       FROM pg_tables
       WHERE schemaname = 'pms'
       ORDER BY tablename`,
    );

    const tables: TableRow[] = tablesResult.rows;

    // 2. All RLS policies in the pms schema
    const policiesResult = await client.query<PolicyRow>(
      `SELECT tablename, policyname, cmd, array_to_string(roles, ',') AS roles
       FROM pg_policies
       WHERE schemaname = 'pms'
       ORDER BY tablename, policyname`,
    );

    const policiesByTable = new Map<string, PolicyRow[]>();
    for (const row of policiesResult.rows) {
      const existing = policiesByTable.get(row.tablename) ?? [];
      existing.push(row);
      policiesByTable.set(row.tablename, existing);
    }

    // ─── Report ──────────────────────────────────────────────────────────────
    const PASS = "✓";
    const FAIL = "✗";

    let failures = 0;

    console.log(`\nRLS Audit — pms schema (${tables.length} tables)\n`);
    console.log(
      `${"Table".padEnd(45)} ${"RLS Enabled".padEnd(14)} ${"Policies".padEnd(10)} Status`,
    );
    console.log("─".repeat(85));

    for (const table of tables) {
      const policies = policiesByTable.get(table.tablename) ?? [];
      const rlsOk = table.rowsecurity;
      const policiesOk = policies.length > 0;
      const status = rlsOk && policiesOk ? PASS : FAIL;

      if (!rlsOk || !policiesOk) failures++;

      const rlsLabel = rlsOk ? "yes" : "NO ← missing";
      const policyLabel = policiesOk
        ? String(policies.length)
        : "NONE ← missing";
      const statusLabel = status === PASS ? "PASS" : "FAIL";

      console.log(
        `${table.tablename.padEnd(45)} ${rlsLabel.padEnd(14)} ${policyLabel.padEnd(10)} ${statusLabel}`,
      );
    }

    console.log("\n─".repeat(85));

    if (failures === 0) {
      console.log(
        `\n${PASS} RLS audit PASSED — all ${tables.length} tables have RLS enabled and at least one policy.\n`,
      );
    } else {
      console.error(
        `\n${FAIL} RLS audit FAILED — ${failures} table(s) are missing RLS or policies. Review findings above.\n`,
      );
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
