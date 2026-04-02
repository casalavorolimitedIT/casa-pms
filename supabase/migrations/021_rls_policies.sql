begin;
-- 021_rls_policies

alter table pms.organizations enable row level security;
alter table pms.properties enable row level security;
alter table pms.profiles enable row level security;
alter table pms.rooms enable row level security;
alter table pms.guests enable row level security;
alter table pms.reservations enable row level security;
alter table pms.folios enable row level security;

drop policy if exists organizations_authenticated_read on pms.organizations;
create policy organizations_authenticated_read
on pms.organizations
for select
using (auth.uid() is not null);

drop policy if exists properties_authenticated_read on pms.properties;
create policy properties_authenticated_read
on pms.properties
for select
using (auth.uid() is not null);

drop policy if exists reservations_authenticated_read on pms.reservations;
create policy reservations_authenticated_read
on pms.reservations
for select
using (auth.uid() is not null);

commit;
