-- 017_corporate_loyalty
begin;

create table if not exists pms.corporate_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references pms.organizations(id),
  name text not null,
  credit_limit_minor integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists pms.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references pms.guests(id),
  tier text not null default 'bronze',
  points_balance integer not null default 0,
  created_at timestamptz not null default now(),
  unique (guest_id)
);

commit;
