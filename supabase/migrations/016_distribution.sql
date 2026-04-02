-- 016_distribution
begin;

create table if not exists pms.channel_connections (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  channel_name text not null,
  status text not null default 'disconnected',
  created_at timestamptz not null default now()
);

create table if not exists pms.channel_bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  channel_name text not null,
  external_booking_id text not null,
  reservation_id uuid references pms.reservations(id),
  created_at timestamptz not null default now(),
  unique (channel_name, external_booking_id)
);

commit;
