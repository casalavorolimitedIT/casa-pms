-- 014_fnb
begin;

create table if not exists pms.outlets (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists pms.orders (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  outlet_id uuid references pms.outlets(id),
  reservation_id uuid references pms.reservations(id),
  status text not null default 'new',
  created_at timestamptz not null default now()
);

commit;
