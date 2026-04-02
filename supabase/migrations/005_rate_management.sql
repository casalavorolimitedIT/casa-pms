begin;
-- 005_rate_management

create table if not exists pms.rate_plans (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  name text not null,
  currency_code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists pms.room_rates (
  id uuid primary key default gen_random_uuid(),
  rate_plan_id uuid not null references pms.rate_plans(id),
  room_type_id uuid not null references pms.room_types(id),
  date_from date not null,
  date_to date not null,
  rate_minor integer not null,
  min_stay integer,
  max_stay integer,
  closed_to_arrival boolean not null default false,
  closed_to_departure boolean not null default false,
  created_at timestamptz not null default now(),
  check (date_to >= date_from)
);

create index if not exists idx_room_rates_lookup
  on pms.room_rates(rate_plan_id, room_type_id, date_from, date_to);

commit;
