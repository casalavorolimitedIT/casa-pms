begin;
-- 041_m08_schema_repair
-- Backfill M08 tables in environments where migration history was repaired
-- before SQL execution, leaving schema objects missing.

create table if not exists pms.booking_intents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  guest_email text not null,
  guest_first_name text not null,
  guest_last_name text not null,
  check_in date not null,
  check_out date not null,
  room_type_id uuid not null references pms.room_types(id),
  adults integer not null default 1,
  children integer not null default 0,
  currency_code text not null,
  total_rate_minor integer not null,
  payment_reference text not null unique,
  payment_gateway text not null,
  payment_status text not null default 'initialized'
    check (payment_status in ('initialized','verified','failed','cancelled')),
  reservation_id uuid references pms.reservations(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists pms.channel_connections
  add column if not exists connected_at timestamptz,
  add column if not exists last_sync_at timestamptz,
  add column if not exists last_error text;

create table if not exists pms.dynamic_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  room_type_id uuid references pms.room_types(id),
  name text not null,
  min_occupancy_percent integer check (min_occupancy_percent between 0 and 100),
  min_lead_days integer check (min_lead_days >= 0),
  adjustment_percent numeric(5,2) not null,
  is_active boolean not null default true,
  is_locked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists pms.corporate_rate_assignments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  corporate_account_id uuid not null references pms.corporate_accounts(id),
  rate_plan_id uuid not null references pms.rate_plans(id),
  discount_percent numeric(5,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (property_id, corporate_account_id, rate_plan_id)
);

create table if not exists pms.corporate_invoices (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  corporate_account_id uuid not null references pms.corporate_accounts(id),
  period_start date not null,
  period_end date not null,
  total_minor integer not null default 0,
  status text not null default 'draft'
    check (status in ('draft','issued','paid','void')),
  created_at timestamptz not null default now(),
  unique (property_id, corporate_account_id, period_start, period_end)
);

create table if not exists pms.corporate_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references pms.corporate_invoices(id) on delete cascade,
  amount_minor integer not null,
  method text not null,
  reference text,
  created_at timestamptz not null default now()
);

create table if not exists pms.loyalty_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  loyalty_account_id uuid not null references pms.loyalty_accounts(id) on delete cascade,
  guest_id uuid not null references pms.guests(id),
  reservation_id uuid references pms.reservations(id),
  entry_type text not null check (entry_type in ('earn','redeem','adjustment','tier_upgrade')),
  points_delta integer not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists booking_intents_property_status_idx
  on pms.booking_intents (property_id, payment_status, created_at desc);

create index if not exists dynamic_pricing_rules_property_active_idx
  on pms.dynamic_pricing_rules (property_id, is_active);

create index if not exists corporate_invoices_property_status_idx
  on pms.corporate_invoices (property_id, status, created_at desc);

create index if not exists loyalty_ledger_guest_created_idx
  on pms.loyalty_ledger_entries (guest_id, created_at desc);

-- Force PostgREST to refresh schema cache immediately.
notify pgrst, 'reload schema';

commit;
