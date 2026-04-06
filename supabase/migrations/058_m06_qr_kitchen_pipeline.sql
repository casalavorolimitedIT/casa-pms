begin;

-- M06 Modules 23/24: QR ordering and kitchen ticket pipeline

alter table if exists pms.orders
  add column if not exists source text not null default 'staff',
  add column if not exists qr_code_id uuid,
  add column if not exists ticket_number text,
  add column if not exists confirmed_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists folio_posted_at timestamptz,
  add column if not exists posted_charge_id uuid references pms.folio_charges(id),
  add column if not exists notes text,
  add column if not exists guest_name text;

create table if not exists pms.order_qr_codes (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  outlet_id uuid not null references pms.outlets(id) on delete cascade,
  reservation_id uuid references pms.reservations(id) on delete set null,
  code text not null unique,
  label text,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists pms.order_items (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  order_id uuid not null references pms.orders(id) on delete cascade,
  menu_item_id uuid references pms.menu_items(id) on delete set null,
  item_name text not null,
  quantity integer not null default 1,
  unit_price_minor integer not null default 0,
  status text not null default 'queued',
  note text,
  ready_at timestamptz,
  created_at timestamptz not null default now(),
  check (quantity > 0),
  check (status in ('queued','in_progress','ready','served','cancelled'))
);

create index if not exists idx_order_qr_codes_property_active
  on pms.order_qr_codes(property_id, is_active, created_at desc);
create index if not exists idx_orders_property_status
  on pms.orders(property_id, status, created_at desc);
create index if not exists idx_order_items_order_status
  on pms.order_items(order_id, status, created_at asc);

alter table pms.order_qr_codes enable row level security;
alter table pms.order_items enable row level security;

-- Guest/public ordering can only read active QR codes by code.
drop policy if exists order_qr_codes_public_read on pms.order_qr_codes;
create policy order_qr_codes_public_read
on pms.order_qr_codes
for select
using (is_active = true and (expires_at is null or expires_at > now()));

-- Authenticated property users can manage QR codes.
drop policy if exists order_qr_codes_write on pms.order_qr_codes;
create policy order_qr_codes_write
on pms.order_qr_codes
for all to authenticated
using (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = order_qr_codes.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = order_qr_codes.property_id and p.id = auth.uid()
  )
)
with check (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = order_qr_codes.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = order_qr_codes.property_id and p.id = auth.uid()
  )
);

-- Authenticated property users can read and write order items.
drop policy if exists order_items_rw on pms.order_items;
create policy order_items_rw
on pms.order_items
for all to authenticated
using (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = order_items.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = order_items.property_id and p.id = auth.uid()
  )
)
with check (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = order_items.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = order_items.property_id and p.id = auth.uid()
  )
);

commit;
