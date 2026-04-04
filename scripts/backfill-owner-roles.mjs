/**
 * One-shot backfill script: seeds an 'owner' row in pms.user_property_roles
 * for any user whose profile belongs to a property org but has no role yet.
 *
 * Run once: node scripts/backfill-owner-roles.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Load .env manually (no dotenv dependency needed)
const envFile = readFileSync(new URL("../.env", import.meta.url), "utf-8");
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: "pms" },
  auth: { autoRefreshToken: false, persistSession: false },
});

// Fetch all profiles and their properties, then insert missing owner rows
const { data: profiles, error: profilesError } = await admin
  .from("profiles")
  .select("id, organization_id");

if (profilesError) {
  console.error("Failed to fetch profiles:", profilesError.message);
  process.exit(1);
}

const { data: properties, error: propsError } = await admin
  .from("properties")
  .select("id, organization_id");

if (propsError) {
  console.error("Failed to fetch properties:", propsError.message);
  process.exit(1);
}

const { data: existingRoles, error: rolesError } = await admin
  .from("user_property_roles")
  .select("user_id, property_id");

if (rolesError) {
  console.error("Failed to fetch existing roles:", rolesError.message);
  process.exit(1);
}

const existingSet = new Set(
  (existingRoles ?? []).map((r) => `${r.user_id}:${r.property_id}`)
);

const toInsert = [];
for (const profile of profiles ?? []) {
  for (const property of properties ?? []) {
    if (property.organization_id === profile.organization_id) {
      const key = `${profile.id}:${property.id}`;
      if (!existingSet.has(key)) {
        toInsert.push({ user_id: profile.id, property_id: property.id, role: "owner" });
      }
    }
  }
}

if (toInsert.length === 0) {
  console.log("No missing owner roles found — nothing to backfill.");
  process.exit(0);
}

console.log(`Inserting ${toInsert.length} missing owner role(s)…`);
const { error: insertError } = await admin.from("user_property_roles").insert(toInsert);

if (insertError) {
  console.error("Insert failed:", insertError.message);
  process.exit(1);
}

console.log("Done. Backfill complete.");
