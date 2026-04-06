begin;

-- M05: Asset service history for auditability
create table if not exists pms.asset_service_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  asset_id uuid not null references pms.assets(id) on delete cascade,
  work_order_id uuid references pms.work_orders(id) on delete set null,
  service_type text not null default 'maintenance',
  vendor text,
  cost_minor integer,
  notes text,
  serviced_at timestamptz not null default now(),
  created_by uuid references pms.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_asset_service_events_asset_serviced
  on pms.asset_service_events(asset_id, serviced_at desc);
create index if not exists idx_asset_service_events_property_created
  on pms.asset_service_events(property_id, created_at desc);

alter table pms.asset_service_events enable row level security;

drop policy if exists asset_service_events_select on pms.asset_service_events;
create policy asset_service_events_select
on pms.asset_service_events
for select to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = asset_service_events.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = asset_service_events.property_id
      and p.id = auth.uid()
  )
);

drop policy if exists asset_service_events_insert on pms.asset_service_events;
create policy asset_service_events_insert
on pms.asset_service_events
for insert to authenticated
with check (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = asset_service_events.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = asset_service_events.property_id
      and p.id = auth.uid()
  )
);

commit;
