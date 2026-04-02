-- 008_checkin_checkout
begin;

create table if not exists pms.check_in_records (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references pms.reservations(id),
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists pms.room_moves (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references pms.reservations(id),
  from_room_id uuid references pms.rooms(id),
  to_room_id uuid references pms.rooms(id),
  moved_at timestamptz not null default now()
);

commit;
