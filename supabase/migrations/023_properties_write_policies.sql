begin;
-- 023_properties_write_policies
-- Allow authenticated users to create and edit properties in their own organization.

alter table pms.properties enable row level security;
alter table pms.property_settings enable row level security;

drop policy if exists properties_insert_own_organization on pms.properties;
create policy properties_insert_own_organization
on pms.properties
for insert
to authenticated
with check (
  exists (
    select 1
    from pms.profiles p
    where p.id = auth.uid()
      and p.organization_id = pms.properties.organization_id
  )
);

drop policy if exists properties_update_own_organization on pms.properties;
create policy properties_update_own_organization
on pms.properties
for update
to authenticated
using (
  exists (
    select 1
    from pms.profiles p
    where p.id = auth.uid()
      and p.organization_id = pms.properties.organization_id
  )
)
with check (
  exists (
    select 1
    from pms.profiles p
    where p.id = auth.uid()
      and p.organization_id = pms.properties.organization_id
  )
);

drop policy if exists property_settings_select_own_organization on pms.property_settings;
create policy property_settings_select_own_organization
on pms.property_settings
for select
to authenticated
using (
  exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = pms.property_settings.property_id
      and p.id = auth.uid()
  )
);

drop policy if exists property_settings_insert_own_organization on pms.property_settings;
create policy property_settings_insert_own_organization
on pms.property_settings
for insert
to authenticated
with check (
  exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = pms.property_settings.property_id
      and p.id = auth.uid()
  )
);

drop policy if exists property_settings_update_own_organization on pms.property_settings;
create policy property_settings_update_own_organization
on pms.property_settings
for update
to authenticated
using (
  exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = pms.property_settings.property_id
      and p.id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = pms.property_settings.property_id
      and p.id = auth.uid()
  )
);

commit;
