#!/usr/bin/env node
/**
 * scripts/benchmarks/run-benchmarks.ts
 *
 * Runs each query benchmark case against the target database and reports
 * median latency and P95 latency across N iterations.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx/esm scripts/benchmarks/run-benchmarks.ts [--runs 20] [--property <uuid>]
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (service role bypasses RLS for uniform benchmark data)
 *
 * Optional flags:
 *   --runs     Number of iterations per benchmark (default: 10)
 *   --property Target property UUID (falls back to first property in DB)
 */

import { createClient } from "@supabase/supabase-js";
import { getBenchmarkCases } from "../../lib/pms/perf/query-benchmarks.ts";

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const runsFlag = args.indexOf("--runs");
const RUNS = runsFlag !== -1 ? parseInt(args[runsFlag + 1], 10) : 10;

const propertyFlag = args.indexOf("--property");
let propertyId: string | null = propertyFlag !== -1 ? args[propertyFlag + 1] : null;

const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function pad(s: string, len: number): string {
  return s.length >= len ? s : s + " ".repeat(len - s.length);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function resolvePropertyId(): Promise<string> {
  if (propertyId) return propertyId;
  const { data, error } = await client
    .from("properties")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    console.error("ERROR: Could not resolve a property ID from the database.");
    process.exit(1);
  }
  return data.id as string;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  propertyId = await resolvePropertyId();

  const cases = getBenchmarkCases(propertyId, today);

  console.log(`\nRunning ${cases.length} benchmarks × ${RUNS} iterations each`);
  console.log(`Property: ${propertyId}  |  Date: ${today}\n`);

  const header = `${pad("Benchmark", 58)}  ${"Median(ms)".padStart(10)}  ${"P95(ms)".padStart(8)}  ${"Min(ms)".padStart(8)}  ${"Max(ms)".padStart(8)}`;
  console.log(header);
  console.log("-".repeat(header.length));

  const results: Array<{ label: string; median: number; p95: number; min: number; max: number }> = [];

  for (const c of cases) {
    const timings: number[] = [];

    for (let i = 0; i < RUNS; i++) {
      const start = performance.now();
      try {
        await c.run(client);
      } catch (err) {
        console.warn(`  WARN [${c.label}]: ${(err as Error).message}`);
      }
      timings.push(performance.now() - start);
    }

    timings.sort((a, b) => a - b);
    const med = percentile(timings, 50);
    const p95 = percentile(timings, 95);
    const min = timings[0];
    const max = timings[timings.length - 1];

    results.push({ label: c.label, median: med, p95, min, max });

    const row = [
      pad(c.label.slice(0, 57), 58),
      med.toFixed(1).padStart(10),
      p95.toFixed(1).padStart(8),
      min.toFixed(1).padStart(8),
      max.toFixed(1).padStart(8),
    ].join("  ");
    console.log(row);
  }

  const WARN_MEDIAN_MS = 100;
  const WARN_P95_MS = 300;
  const warnings = results.filter((r) => r.median > WARN_MEDIAN_MS || r.p95 > WARN_P95_MS);

  if (warnings.length > 0) {
    console.log(`\n⚠  ${warnings.length} benchmark(s) exceed thresholds (median > ${WARN_MEDIAN_MS}ms or P95 > ${WARN_P95_MS}ms):`);
    for (const w of warnings) {
      console.log(`   • ${w.label} — median ${w.median.toFixed(1)}ms, P95 ${w.p95.toFixed(1)}ms`);
    }
    process.exit(1);
  }

  console.log("\n✓ All benchmarks within acceptable thresholds.");
}

main();
