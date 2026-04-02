-- 018_spa
begin;

create table if not exists pms.spa_services (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  name text not null,
  duration_minutes integer not null,
  price_minor integer not null,
  created_at timestamptz not null default now()
);

create table if not exists pms.spa_bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  reservation_id uuid references pms.reservations(id),
  service_id uuid not null references pms.spa_services(id),
  starts_at timestamptz not null,
  status text not null default 'booked',
  created_at timestamptz not null default now()
);

commit;
