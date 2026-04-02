begin;
-- 004_guests

create table if not exists pms.guests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references pms.organizations(id),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  nationality text,
  date_of_birth date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists pms.guest_preferences (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references pms.guests(id),
  key text not null,
  value text not null,
  created_at timestamptz not null default now(),
  unique (guest_id, key)
);

create table if not exists pms.guest_vip_flags (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references pms.guests(id),
  vip_tier text not null,
  note text,
  flagged_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

commit;
