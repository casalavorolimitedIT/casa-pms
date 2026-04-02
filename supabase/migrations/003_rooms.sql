begin;
-- 003_rooms

create table if not exists pms.room_types (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  name text not null,
  description text,
  base_rate_minor integer not null default 0,
  max_occupancy integer not null default 2,
  created_at timestamptz not null default now()
);

create table if not exists pms.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  room_type_id uuid not null references pms.room_types(id),
  room_number text not null,
  floor integer,
  status text not null default 'vacant',
  created_at timestamptz not null default now(),
  unique (property_id, room_number)
);

create table if not exists pms.room_status_log (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references pms.rooms(id),
  status text not null,
  changed_by uuid references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);

commit;
