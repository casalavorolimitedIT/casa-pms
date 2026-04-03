begin;
-- 035_reservations_rls_policies

alter table pms.reservations enable row level security;

drop policy if exists reservations_select_own_property on pms.reservations;
create policy reservations_select_own_property
on pms.reservations
for select to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = pms.reservations.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = pms.reservations.property_id
      and p.id = auth.uid()
  )
);

drop policy if exists reservations_insert_own_property on pms.reservations;
create policy reservations_insert_own_property
on pms.reservations
for insert to authenticated
with check (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = pms.reservations.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = pms.reservations.property_id
      and p.id = auth.uid()
  )
);

drop policy if exists reservations_update_own_property on pms.reservations;
create policy reservations_update_own_property
on pms.reservations
for update to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = pms.reservations.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = pms.reservations.property_id
      and p.id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = pms.reservations.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = pms.reservations.property_id
      and p.id = auth.uid()
  )
);

commit;
