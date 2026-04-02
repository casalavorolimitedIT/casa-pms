-- 009_night_audit
begin;

create table if not exists pms.audit_runs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  business_date date not null,
  status text not null,
  created_at timestamptz not null default now(),
  unique (property_id, business_date)
);

create table if not exists pms.daily_revenue_snapshots (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  business_date date not null,
  room_revenue_minor integer not null default 0,
  non_room_revenue_minor integer not null default 0,
  created_at timestamptz not null default now(),
  unique (property_id, business_date)
);

commit;
