-- 012_tasks_maintenance
begin;

create table if not exists pms.tasks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  room_id uuid references pms.rooms(id),
  title text not null,
  status text not null default 'todo',
  created_at timestamptz not null default now()
);

create table if not exists pms.work_orders (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  room_id uuid references pms.rooms(id),
  title text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists pms.out_of_order_periods (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references pms.rooms(id),
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

commit;
