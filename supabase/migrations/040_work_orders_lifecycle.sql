begin;
-- 037_work_orders_lifecycle

alter table if exists pms.work_orders
  add column if not exists category text not null default 'general',
  add column if not exists priority text not null default 'normal',
  add column if not exists description text,
  add column if not exists assigned_to uuid references pms.profiles(id),
  add column if not exists due_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references pms.profiles(id),
  add column if not exists resolution_note text,
  add column if not exists ooo_period_id uuid references pms.out_of_order_periods(id),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists pms.out_of_order_periods
  add column if not exists property_id uuid references pms.properties(id),
  add column if not exists reason text,
  add column if not exists work_order_id uuid references pms.work_orders(id),
  add column if not exists released_at timestamptz,
  add column if not exists released_by uuid references pms.profiles(id);

update pms.out_of_order_periods oop
set property_id = r.property_id
from pms.rooms r
where r.id = oop.room_id
  and oop.property_id is null;

create index if not exists idx_work_orders_property_status on pms.work_orders(property_id, status);
create index if not exists idx_work_orders_assigned_to on pms.work_orders(assigned_to);
create index if not exists idx_work_orders_due_at on pms.work_orders(due_at);
create index if not exists idx_ooo_property_room on pms.out_of_order_periods(property_id, room_id);
create index if not exists idx_ooo_work_order on pms.out_of_order_periods(work_order_id);

commit;
