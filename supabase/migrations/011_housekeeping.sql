-- 011_housekeeping
begin;

create table if not exists pms.housekeeping_assignments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  room_id uuid not null references pms.rooms(id),
  attendant_user_id uuid,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists pms.wake_up_calls (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references pms.reservations(id),
  scheduled_for timestamptz not null,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

commit;
