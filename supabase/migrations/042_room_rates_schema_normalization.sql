begin;
-- 042_room_rates_schema_normalization
-- Normalize room_rates across legacy/new environments so modern columns
-- are authoritative and legacy columns no longer block inserts.

do $$
begin
  -- If legacy date column exists, backfill modern dates and relax legacy nullability.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'pms'
      and table_name = 'room_rates'
      and column_name = 'date'
  ) then
    execute 'update pms.room_rates set date_from = coalesce(date_from, "date"), date_to = coalesce(date_to, "date")';
    execute 'alter table pms.room_rates alter column "date" drop not null';
  end if;

  -- If legacy amount_minor exists, backfill modern rate and relax legacy nullability.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'pms'
      and table_name = 'room_rates'
      and column_name = 'amount_minor'
  ) then
    execute 'update pms.room_rates set rate_minor = coalesce(rate_minor, amount_minor)';
    execute 'alter table pms.room_rates alter column amount_minor drop not null';
  end if;
end $$;

-- Final safety backfill before enforcing modern not-null columns.
update pms.room_rates
set
  date_from = coalesce(date_from, date_to, current_date),
  date_to = coalesce(date_to, date_from, current_date),
  rate_minor = coalesce(rate_minor, 0)
where date_from is null
   or date_to is null
   or rate_minor is null;

alter table pms.room_rates alter column date_from set not null;
alter table pms.room_rates alter column date_to set not null;
alter table pms.room_rates alter column rate_minor set not null;

-- Ensure date range rule exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'pms'
      and t.relname = 'room_rates'
      and c.conname = 'room_rates_date_range_check'
  ) then
    alter table pms.room_rates
      add constraint room_rates_date_range_check check (date_to >= date_from);
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
