begin;
-- 033_rooms_rls_policies

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
)
with check (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = pms.rooms.property_id
      and upr.user_id = auth.uid()
  )
);

commit;
