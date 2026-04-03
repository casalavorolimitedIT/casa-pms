begin;
-- 045_fix_user_property_roles_recursion
--
-- Replace recursive user_property_roles policy checks with a helper
-- function that runs outside the table's own RLS context.

create or replace function pms.current_user_can_manage_staff_access()
returns boolean
security definer
set search_path = pms, public
language sql
stable
as $$
  select exists (
    select 1
    from pms.user_property_roles upr
    join pms.properties pr on pr.id = upr.property_id
    where upr.user_id = auth.uid()
      and upr.role in ('owner', 'general_manager')
      and pr.organization_id = pms.current_user_organization_id()
  );
$$;

drop policy if exists profiles_update_managers on pms.profiles;
create policy profiles_update_managers
on pms.profiles
for update to authenticated
using (
  id = auth.uid()
  or (
    organization_id = pms.current_user_organization_id()
    and pms.current_user_can_manage_staff_access()
  )
)
with check (
  id = auth.uid()
  or (
    organization_id = pms.current_user_organization_id()
    and pms.current_user_can_manage_staff_access()
  )
);

drop policy if exists upr_manage_managers on pms.user_property_roles;
create policy upr_manage_managers
on pms.user_property_roles
for all to authenticated
using (pms.current_user_can_manage_staff_access())
with check (pms.current_user_can_manage_staff_access());

commit;