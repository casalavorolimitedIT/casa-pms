begin;
-- 024_onboarding_policies
-- Allow a fresh authenticated user to self-service create their org/profile
-- during the initial onboarding wizard.

-- Any authenticated user can create a new organization (no org yet → registration path).
alter table pms.organizations enable row level security;

drop policy if exists organizations_insert_self_service on pms.organizations;
create policy organizations_insert_self_service
on pms.organizations
for insert
to authenticated
with check (true);

-- Users can update their own organization.
drop policy if exists organizations_update_own on pms.organizations;
create policy organizations_update_own
on pms.organizations
for update
to authenticated
using (
  exists (
    select 1 from pms.profiles p
    where p.id = auth.uid()
      and p.organization_id = pms.organizations.id
  )
);

-- A user can insert a profile for themselves only.
alter table pms.profiles enable row level security;

drop policy if exists profiles_insert_own on pms.profiles;
create policy profiles_insert_own
on pms.profiles
for insert
to authenticated
with check (id = auth.uid());

-- A user can read their own profile.
drop policy if exists profiles_select_own on pms.profiles;
create policy profiles_select_own
on pms.profiles
for select
to authenticated
using (id = auth.uid());

-- A user can update their own profile.
drop policy if exists profiles_update_own on pms.profiles;
create policy profiles_update_own
on pms.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

commit;
