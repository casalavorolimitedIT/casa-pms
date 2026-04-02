begin;
-- 006_reservations

create table if not exists pms.reservations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  guest_id uuid not null references pms.guests(id),
  status text not null default 'confirmed'
    check (status in ('tentative','confirmed','checked_in','checked_out','cancelled','no_show')),
  check_in date not null,
  check_out date not null,
  adults integer not null default 1,
  children integer not null default 0,
  source text,
  notes text,
  rate_plan_id uuid references pms.rate_plans(id),
  total_rate_minor integer,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pms.reservation_rooms (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references pms.reservations(id),
  room_id uuid references pms.rooms(id),
  room_type_id uuid not null references pms.room_types(id),
  rate_per_night_minor integer,
  created_at timestamptz not null default now()
);

create table if not exists pms.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  guest_id uuid not null references pms.guests(id),
  room_type_id uuid references pms.room_types(id),
  requested_check_in date not null,
  requested_check_out date not null,
  notes text,
  created_at timestamptz not null default now()
);

commit;
