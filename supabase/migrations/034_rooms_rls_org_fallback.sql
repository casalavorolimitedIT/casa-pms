begin;
-- 034_rooms_rls_org_fallback
-- Expand rooms RLS to also allow users in the same organization as the property.

alter table pms.rooms enable row level security;

drop policy if exists rooms_select_own_property on pms.rooms;
create policy rooms_select_own_property
on pms.rooms
for select to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = pms.rooms.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = pms.rooms.property_id
      and p.id = auth.uid()
  )
);

drop policy if exists rooms_insert_own_property on pms.rooms;
create policy rooms_insert_own_property
on pms.rooms
for insert to authenticated
with check (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = pms.rooms.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = pms.rooms.property_id
      and p.id = auth.uid()
  )
);

drop policy if exists rooms_update_own_property on pms.rooms;
create policy rooms_update_own_property
on pms.rooms
for update to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = pms.rooms.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = pms.rooms.property_id
      and p.id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = pms.rooms.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = pms.rooms.property_id
      and p.id = auth.uid()
  )
);

commit;
