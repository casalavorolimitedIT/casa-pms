begin;
-- 044_fix_onboarding_profile_visibility
--
-- Avoid recursive/self-dependent reads of pms.profiles inside RLS policies
-- and provide a stable onboarding status helper for the app.

create or replace function pms.current_user_organization_id()
returns uuid
security definer
set search_path = pms, public
language sql
stable
as $$
  select p.organization_id
  from pms.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function pms.current_user_profile_status()
returns table (
  user_id uuid,
  has_profile boolean,
  organization_id uuid
)
security definer
set search_path = pms, public
language sql
stable
as $$
  select
    auth.uid() as user_id,
    exists(
      select 1
      from pms.profiles p
      where p.id = auth.uid()
    ) as has_profile,
    pms.current_user_organization_id() as organization_id;
$$;

drop policy if exists profiles_select_same_org on pms.profiles;
create policy profiles_select_same_org
on pms.profiles
for select to authenticated
using (
  organization_id = pms.current_user_organization_id()
);

drop policy if exists profiles_update_managers on pms.profiles;
create policy profiles_update_managers
on pms.profiles
for update to authenticated
using (
  id = auth.uid()
  or
  (
    organization_id = pms.current_user_organization_id()
    and exists (
      select 1
      from pms.user_property_roles upr
      join pms.properties pr on pr.id = upr.property_id
      where upr.user_id = auth.uid()
        and upr.role in ('owner', 'general_manager')
        and pr.organization_id = pms.current_user_organization_id()
    )
  )
)
with check (
  id = auth.uid()
  or
  (
    organization_id = pms.current_user_organization_id()
    and exists (
      select 1
      from pms.user_property_roles upr
      join pms.properties pr on pr.id = upr.property_id
      where upr.user_id = auth.uid()
        and upr.role in ('owner', 'general_manager')
        and pr.organization_id = pms.current_user_organization_id()
    )
  )
);

drop policy if exists upr_select_same_org on pms.user_property_roles;
create policy upr_select_same_org
on pms.user_property_roles
for select to authenticated
using (
  exists (
    select 1
    from pms.properties pr
    where pr.id = pms.user_property_roles.property_id
      and pr.organization_id = pms.current_user_organization_id()
  )
);

drop policy if exists upr_manage_managers on pms.user_property_roles;
create policy upr_manage_managers
on pms.user_property_roles
for all to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles my_role
    join pms.properties pr on pr.id = my_role.property_id
    where my_role.user_id = auth.uid()
      and my_role.role in ('owner', 'general_manager')
      and pr.organization_id = pms.current_user_organization_id()
  )
)
with check (
  exists (
    select 1
    from pms.user_property_roles my_role
    join pms.properties pr on pr.id = my_role.property_id
    where my_role.user_id = auth.uid()
      and my_role.role in ('owner', 'general_manager')
      and pr.organization_id = pms.current_user_organization_id()
  )
);

commit;