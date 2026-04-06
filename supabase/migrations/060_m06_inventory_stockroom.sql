begin;

-- M06 Module 27: Inventory and stockroom
create table if not exists pms.inventory_items (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  outlet_id uuid references pms.outlets(id) on delete set null,
  name text not null,
  unit text not null default 'unit',
  current_qty numeric(12,2) not null default 0,
  reorder_level numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists pms.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  item_id uuid not null references pms.inventory_items(id) on delete cascade,
  movement_type text not null,
  qty_delta numeric(12,2) not null,
  reference text,
  notes text,
  created_by uuid references pms.profiles(id),
  created_at timestamptz not null default now(),
  check (movement_type in ('adjustment','purchase_receive','consumption','waste','transfer'))
);

create table if not exists pms.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  supplier text not null,
  status text not null default 'draft',
  expected_at date,
  received_at timestamptz,
  notes text,
  created_by uuid references pms.profiles(id),
  created_at timestamptz not null default now(),
  check (status in ('draft','submitted','partially_received','received','cancelled'))
);

create table if not exists pms.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references pms.purchase_orders(id) on delete cascade,
  item_id uuid not null references pms.inventory_items(id),
  qty_ordered numeric(12,2) not null,
  qty_received numeric(12,2) not null default 0,
  cost_minor integer,
  check (qty_ordered > 0),
  check (qty_received >= 0)
);

create table if not exists pms.inventory_alerts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  item_id uuid not null references pms.inventory_items(id) on delete cascade,
  alert_type text not null default 'low_stock',
  status text not null default 'open',
  message text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (alert_type in ('low_stock')),
  check (status in ('open','resolved'))
);

create index if not exists idx_inventory_items_property_name on pms.inventory_items(property_id, name);
create index if not exists idx_inventory_movements_item_created on pms.inventory_movements(item_id, created_at desc);
create index if not exists idx_purchase_orders_property_created on pms.purchase_orders(property_id, created_at desc);
create index if not exists idx_inventory_alerts_property_status on pms.inventory_alerts(property_id, status, created_at desc);

alter table pms.inventory_items enable row level security;
alter table pms.inventory_movements enable row level security;
alter table pms.purchase_orders enable row level security;
alter table pms.purchase_order_lines enable row level security;
alter table pms.inventory_alerts enable row level security;

-- Property-scoped policies for authenticated staff.
drop policy if exists inventory_items_rw on pms.inventory_items;
create policy inventory_items_rw
on pms.inventory_items
for all to authenticated
using (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = inventory_items.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = inventory_items.property_id and p.id = auth.uid())
)
with check (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = inventory_items.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = inventory_items.property_id and p.id = auth.uid())
);

drop policy if exists inventory_movements_rw on pms.inventory_movements;
create policy inventory_movements_rw
on pms.inventory_movements
for all to authenticated
using (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = inventory_movements.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = inventory_movements.property_id and p.id = auth.uid())
)
with check (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = inventory_movements.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = inventory_movements.property_id and p.id = auth.uid())
);

drop policy if exists purchase_orders_rw on pms.purchase_orders;
create policy purchase_orders_rw
on pms.purchase_orders
for all to authenticated
using (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = purchase_orders.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = purchase_orders.property_id and p.id = auth.uid())
)
with check (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = purchase_orders.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = purchase_orders.property_id and p.id = auth.uid())
);

drop policy if exists purchase_order_lines_rw on pms.purchase_order_lines;
create policy purchase_order_lines_rw
on pms.purchase_order_lines
for all to authenticated
using (
  exists (
    select 1
    from pms.purchase_orders po
    join pms.user_property_roles upr on upr.property_id = po.property_id
    where po.id = purchase_order_lines.purchase_order_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.purchase_orders po
    join pms.properties pr on pr.id = po.property_id
    join pms.profiles p on p.organization_id = pr.organization_id
    where po.id = purchase_order_lines.purchase_order_id and p.id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pms.purchase_orders po
    join pms.user_property_roles upr on upr.property_id = po.property_id
    where po.id = purchase_order_lines.purchase_order_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.purchase_orders po
    join pms.properties pr on pr.id = po.property_id
    join pms.profiles p on p.organization_id = pr.organization_id
    where po.id = purchase_order_lines.purchase_order_id and p.id = auth.uid()
  )
);

drop policy if exists inventory_alerts_rw on pms.inventory_alerts;
create policy inventory_alerts_rw
on pms.inventory_alerts
for all to authenticated
using (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = inventory_alerts.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = inventory_alerts.property_id and p.id = auth.uid())
)
with check (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = inventory_alerts.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = inventory_alerts.property_id and p.id = auth.uid())
);

commit;
