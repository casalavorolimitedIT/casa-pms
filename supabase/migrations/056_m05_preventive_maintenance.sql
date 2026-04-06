begin;

-- M05 preventive maintenance schedules + generated actionable instances
create table if not exists pms.maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  room_id uuid references pms.rooms(id) on delete set null,
  asset_id uuid references pms.assets(id) on delete set null,
  title text not null,
  recurrence text not null check (recurrence in ('daily','weekly','monthly','quarterly')),
  every_interval integer not null default 1 check (every_interval >= 1 and every_interval <= 30),
  starts_on date not null,
  is_active boolean not null default true,
  created_by uuid references pms.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists pms.maintenance_schedule_instances (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references pms.maintenance_schedules(id) on delete cascade,
  property_id uuid not null references pms.properties(id),
  due_on date not null,
  status text not null default 'due' check (status in ('due','completed','skipped')),
  completed_at timestamptz,
  completed_by uuid references pms.profiles(id),
  note text,
  created_at timestamptz not null default now(),
  unique (schedule_id, due_on)
);

create index if not exists idx_maintenance_schedules_property_active
  on pms.maintenance_schedules(property_id, is_active, starts_on);
create index if not exists idx_maintenance_instances_property_due
  on pms.maintenance_schedule_instances(property_id, due_on, status);

alter table pms.maintenance_schedules enable row level security;
alter table pms.maintenance_schedule_instances enable row level security;

drop policy if exists maintenance_schedules_select on pms.maintenance_schedules;
create policy maintenance_schedules_select
on pms.maintenance_schedules
for select to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = maintenance_schedules.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = maintenance_schedules.property_id
      and p.id = auth.uid()
  )
);

drop policy if exists maintenance_schedules_insert on pms.maintenance_schedules;
create policy maintenance_schedules_insert
on pms.maintenance_schedules
for insert to authenticated
with check (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = maintenance_schedules.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = maintenance_schedules.property_id
      and p.id = auth.uid()
  )
);

drop policy if exists maintenance_schedules_update on pms.maintenance_schedules;
create policy maintenance_schedules_update
on pms.maintenance_schedules
for update to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = maintenance_schedules.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = maintenance_schedules.property_id
      and p.id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = maintenance_schedules.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = maintenance_schedules.property_id
      and p.id = auth.uid()
  )
);

drop policy if exists maintenance_instances_select on pms.maintenance_schedule_instances;
create policy maintenance_instances_select
on pms.maintenance_schedule_instances
for select to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = maintenance_schedule_instances.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = maintenance_schedule_instances.property_id
      and p.id = auth.uid()
  )
);

drop policy if exists maintenance_instances_insert on pms.maintenance_schedule_instances;
create policy maintenance_instances_insert
on pms.maintenance_schedule_instances
for insert to authenticated
with check (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = maintenance_schedule_instances.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = maintenance_schedule_instances.property_id
      and p.id = auth.uid()
  )
);

drop policy if exists maintenance_instances_update on pms.maintenance_schedule_instances;
create policy maintenance_instances_update
on pms.maintenance_schedule_instances
for update to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = maintenance_schedule_instances.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = maintenance_schedule_instances.property_id
      and p.id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = maintenance_schedule_instances.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = maintenance_schedule_instances.property_id
      and p.id = auth.uid()
  )
);

commit;
