begin;

-- Enforce stable, canonical cross-property guest links.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cross_property_guest_links_not_self'
      and conrelid = 'pms.cross_property_guest_links'::regclass
  ) then
    alter table pms.cross_property_guest_links
      add constraint cross_property_guest_links_not_self
      check (source_guest_id <> linked_guest_id);
  end if;
end $$;

create unique index if not exists uq_cross_property_guest_links_pair
  on pms.cross_property_guest_links (
    organization_id,
    least(source_guest_id, linked_guest_id),
    greatest(source_guest_id, linked_guest_id)
  );

-- RLS for cross-property identity links.
alter table if exists pms.cross_property_guest_links enable row level security;

drop policy if exists cross_property_guest_links_rw on pms.cross_property_guest_links;
create policy cross_property_guest_links_rw
on pms.cross_property_guest_links
for all
using (
  exists (
    select 1
    from pms.profiles p
    where p.id = auth.uid()
      and p.organization_id = cross_property_guest_links.organization_id
  )
)
with check (
  exists (
    select 1
    from pms.profiles p
    where p.id = auth.uid()
      and p.organization_id = cross_property_guest_links.organization_id
  )
);

-- RLS for chain-level rates artifacts introduced in M10.
alter table if exists pms.chain_rate_plans enable row level security;
alter table if exists pms.chain_rate_plan_assignments enable row level security;
alter table if exists pms.chain_rate_plan_overrides enable row level security;

drop policy if exists chain_rate_plans_rw on pms.chain_rate_plans;
create policy chain_rate_plans_rw
on pms.chain_rate_plans
for all
using (
  exists (
    select 1
    from pms.profiles p
    where p.id = auth.uid()
      and p.organization_id = chain_rate_plans.organization_id
  )
)
with check (
  exists (
    select 1
    from pms.profiles p
    where p.id = auth.uid()
      and p.organization_id = chain_rate_plans.organization_id
  )
);

drop policy if exists chain_rate_plan_assignments_rw on pms.chain_rate_plan_assignments;
create policy chain_rate_plan_assignments_rw
on pms.chain_rate_plan_assignments
for all
using (
  exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = chain_rate_plan_assignments.property_id
      and p.id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = chain_rate_plan_assignments.property_id
      and p.id = auth.uid()
  )
);

drop policy if exists chain_rate_plan_overrides_rw on pms.chain_rate_plan_overrides;
create policy chain_rate_plan_overrides_rw
on pms.chain_rate_plan_overrides
for all
using (
  exists (
    select 1
    from pms.chain_rate_plan_assignments a
    join pms.properties pr on pr.id = a.property_id
    join pms.profiles p on p.organization_id = pr.organization_id
    where a.id = chain_rate_plan_overrides.assignment_id
      and p.id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pms.chain_rate_plan_assignments a
    join pms.properties pr on pr.id = a.property_id
    join pms.profiles p on p.organization_id = pr.organization_id
    where a.id = chain_rate_plan_overrides.assignment_id
      and p.id = auth.uid()
  )
);

commit;
