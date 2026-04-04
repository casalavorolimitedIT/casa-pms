begin;
-- 052_backfill_owner_property_roles
--
-- Seed an 'owner' row in pms.user_property_roles for any user whose profile
-- belongs to the same organization as a property, but who has no existing row
-- in user_property_roles for that property.
--
-- This fixes accounts created before migration 052 was applied, where
-- setupOrganization did not write a user_property_roles row, causing storage
-- RLS INSERT checks to fail for all file uploads.

insert into pms.user_property_roles (user_id, property_id, role)
select
  p.id          as user_id,
  pr.id         as property_id,
  'owner'::text as role
from pms.profiles p
join pms.properties pr on pr.organization_id = p.organization_id
where not exists (
  select 1
  from pms.user_property_roles upr
  where upr.user_id   = p.id
    and upr.property_id = pr.id
)
on conflict do nothing;

commit;
