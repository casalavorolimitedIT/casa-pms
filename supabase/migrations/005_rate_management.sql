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

-- Backward compatibility for databases created with the legacy schema
-- (columns: date, amount_minor). This ensures db push works on both old and new states.
alter table pms.room_rates add column if not exists date_from date;
alter table pms.room_rates add column if not exists date_to date;
alter table pms.room_rates add column if not exists rate_minor integer;
alter table pms.room_rates add column if not exists min_stay integer;
alter table pms.room_rates add column if not exists max_stay integer;
alter table pms.room_rates add column if not exists closed_to_arrival boolean not null default false;
alter table pms.room_rates add column if not exists closed_to_departure boolean not null default false;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'pms'
      and table_name = 'room_rates'
      and column_name = 'date'
  ) then
    execute 'update pms.room_rates set date_from = coalesce(date_from, "date"), date_to = coalesce(date_to, "date") where "date" is not null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'pms'
      and table_name = 'room_rates'
      and column_name = 'amount_minor'
  ) then
    execute 'update pms.room_rates set rate_minor = coalesce(rate_minor, amount_minor) where amount_minor is not null';
  end if;
end $$;

create index if not exists idx_room_rates_lookup
  on pms.room_rates(rate_plan_id, room_type_id, date_from, date_to);

commit;
