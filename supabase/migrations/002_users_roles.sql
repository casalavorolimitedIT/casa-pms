begin;
-- 002_users_roles

create table if not exists pms.profiles (
  id uuid primary key,
  organization_id uuid not null references pms.organizations(id),
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists pms.user_property_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references pms.profiles(id),
  property_id uuid not null references pms.properties(id),
  role text not null,
  created_at timestamptz not null default now(),
  unique (user_id, property_id, role)
);

create table if not exists pms.permissions (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  permission_key text not null,
  created_at timestamptz not null default now(),
  unique (role, permission_key)
);

commit;
