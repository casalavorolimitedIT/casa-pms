begin;
-- 036_m04_ops_extensions

alter table if exists pms.tasks
  add column if not exists reservation_id uuid references pms.reservations(id),
  add column if not exists assigned_to uuid,
  add column if not exists description text,
  add column if not exists priority text not null default 'normal',
  add column if not exists due_at timestamptz,
  add column if not exists completed_at timestamptz;

create table if not exists pms.lost_found_items (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  room_id uuid references pms.rooms(id),
  reservation_id uuid references pms.reservations(id),
  item_name text not null,
  description text,
  status text not null default 'logged',
  image_url text,
  found_at timestamptz not null default now(),
  claimed_by_name text,
  claimed_contact text,
  claimed_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists pms.linen_transactions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  room_type_id uuid references pms.room_types(id),
  txn_type text not null,
  quantity integer not null,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists pms.minibar_postings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  reservation_id uuid references pms.reservations(id),
  room_id uuid references pms.rooms(id),
  item_name text not null,
  quantity integer not null default 1,
  amount_minor integer not null,
  status text not null default 'posted',
  folio_charge_id uuid references pms.folio_charges(id),
  posted_at timestamptz not null default now(),
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists pms.room_dnd_logs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  room_id uuid not null references pms.rooms(id),
  is_dnd boolean not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  note text,
  set_by uuid,
  created_at timestamptz not null default now()
);

alter table if exists pms.wake_up_calls
  add column if not exists property_id uuid references pms.properties(id),
  add column if not exists note text,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid;

update pms.wake_up_calls w
set property_id = r.property_id
from pms.reservations r
where r.id = w.reservation_id
  and w.property_id is null;

create index if not exists idx_tasks_property_status on pms.tasks(property_id, status);
create index if not exists idx_lost_found_property_status on pms.lost_found_items(property_id, status);
create index if not exists idx_linen_property_created on pms.linen_transactions(property_id, created_at desc);
create index if not exists idx_minibar_property_posted on pms.minibar_postings(property_id, posted_at desc);
create index if not exists idx_dnd_property_room_active on pms.room_dnd_logs(property_id, room_id, ends_at);
create index if not exists idx_wakeup_property_status_time on pms.wake_up_calls(property_id, status, scheduled_for);

commit;
