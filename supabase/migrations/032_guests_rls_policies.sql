begin;
-- 032_guests_rls_policies

alter table pms.guests enable row level security;

drop policy if exists guests_select_own_org on pms.guests;
create policy guests_select_own_org
on pms.guests
for select to authenticated
using (
  exists (
    select 1
    from pms.profiles p
    where p.id = auth.uid()
      and p.organization_id = pms.guests.organization_id
  )
);

drop policy if exists guests_insert_own_org on pms.guests;
create policy guests_insert_own_org
on pms.guests
for insert to authenticated
with check (
  exists (
    select 1
    from pms.profiles p
    where p.id = auth.uid()
      and p.organization_id = pms.guests.organization_id
  )
);

drop policy if exists guests_update_own_org on pms.guests;
create policy guests_update_own_org
on pms.guests
for update to authenticated
using (
  exists (
    select 1
    from pms.profiles p
    where p.id = auth.uid()
      and p.organization_id = pms.guests.organization_id
  )
)
with check (
  exists (
    select 1
    from pms.profiles p
    where p.id = auth.uid()
      and p.organization_id = pms.guests.organization_id
  )
);

commit;
