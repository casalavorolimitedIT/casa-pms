begin;

-- 015 created the table, but 027 used completely different CREATE TABLE IF NOT EXISTS
-- The IF NOT EXISTS condition prevented the new columns from being added.
-- Fixing concierge_requests table structure.

ALTER TABLE pms.concierge_requests
  ADD COLUMN IF NOT EXISTS guest_id uuid references pms.guests(id),
  ADD COLUMN IF NOT EXISTS priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS description text not null default '',
  ADD COLUMN IF NOT EXISTS assigned_to uuid references pms.profiles(id),
  ADD COLUMN IF NOT EXISTS sla_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_billable boolean not null default false,
  ADD COLUMN IF NOT EXISTS charge_amount_minor integer check (charge_amount_minor is null or charge_amount_minor >= 0),
  ADD COLUMN IF NOT EXISTS folio_id uuid references pms.folios(id),
  ADD COLUMN IF NOT EXISTS posted_charge_id uuid references pms.folio_charges(id),
  ADD COLUMN IF NOT EXISTS created_by uuid references pms.profiles(id),
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz not null default now();

-- Ensure category default is set, since 015 had it as just "text"
ALTER TABLE pms.concierge_requests ALTER COLUMN category SET DEFAULT 'general';

-- To ensure the postgrest schema cache refreshes, NOTIFY pgrst
NOTIFY pgrst, 'reload schema';

commit;
