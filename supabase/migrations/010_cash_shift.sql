-- 010_cash_shift
begin;

create table if not exists pms.shifts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  user_id uuid,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_float_minor integer not null default 0,
  closing_count_minor integer
);

create table if not exists pms.cash_drawer_entries (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references pms.shifts(id),
  entry_type text not null,
  amount_minor integer not null,
  created_at timestamptz not null default now()
);

commit;
