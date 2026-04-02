-- 019_multi_property
begin;

create table if not exists pms.chain_rate_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references pms.organizations(id),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists pms.cross_property_guest_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references pms.organizations(id),
  source_guest_id uuid not null references pms.guests(id),
  linked_guest_id uuid not null references pms.guests(id),
  created_at timestamptz not null default now(),
  unique (source_guest_id, linked_guest_id)
);

commit;
