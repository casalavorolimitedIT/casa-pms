begin;

-- M06 Module 22: Menu management foundation (outlets, categories, items, modifiers, outlet pricing)

alter table if exists pms.outlets
  add column if not exists is_active boolean not null default true,
  add column if not exists description text;

create table if not exists pms.menu_categories (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  outlet_id uuid references pms.outlets(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists pms.menu_items (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  outlet_id uuid not null references pms.outlets(id) on delete cascade,
  category_id uuid references pms.menu_categories(id) on delete set null,
  name text not null,
  description text,
  base_price_minor integer not null default 0,
  is_active boolean not null default true,
  available_from time,
  available_to time,
  created_at timestamptz not null default now()
);

create table if not exists pms.menu_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  menu_item_id uuid not null references pms.menu_items(id) on delete cascade,
  name text not null,
  price_delta_minor integer not null default 0,
  is_required boolean not null default false,
  max_select integer not null default 1,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists pms.outlet_menu_item_prices (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  outlet_id uuid not null references pms.outlets(id) on delete cascade,
  menu_item_id uuid not null references pms.menu_items(id) on delete cascade,
  price_minor integer not null,
  effective_from timestamptz,
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  unique (outlet_id, menu_item_id)
);

create index if not exists idx_menu_categories_property_outlet
  on pms.menu_categories(property_id, outlet_id, sort_order, name);
create index if not exists idx_menu_items_property_outlet
  on pms.menu_items(property_id, outlet_id, is_active, name);
create index if not exists idx_modifiers_item
  on pms.menu_item_modifiers(menu_item_id, sort_order);
create index if not exists idx_outlet_menu_prices_lookup
  on pms.outlet_menu_item_prices(outlet_id, menu_item_id);

alter table pms.menu_categories enable row level security;
alter table pms.menu_items enable row level security;
alter table pms.menu_item_modifiers enable row level security;
alter table pms.outlet_menu_item_prices enable row level security;

-- Any authenticated user with property access (upr or org fallback) can read/write.
drop policy if exists menu_categories_select on pms.menu_categories;
create policy menu_categories_select
on pms.menu_categories
for select to authenticated
using (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = menu_categories.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = menu_categories.property_id and p.id = auth.uid()
  )
);

drop policy if exists menu_categories_insert on pms.menu_categories;
create policy menu_categories_insert
on pms.menu_categories
for insert to authenticated
with check (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = menu_categories.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = menu_categories.property_id and p.id = auth.uid()
  )
);

drop policy if exists menu_categories_update on pms.menu_categories;
create policy menu_categories_update
on pms.menu_categories
for update to authenticated
using (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = menu_categories.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = menu_categories.property_id and p.id = auth.uid()
  )
)
with check (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = menu_categories.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = menu_categories.property_id and p.id = auth.uid()
  )
);

drop policy if exists menu_items_select on pms.menu_items;
create policy menu_items_select
on pms.menu_items
for select to authenticated
using (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = menu_items.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = menu_items.property_id and p.id = auth.uid()
  )
);

drop policy if exists menu_items_insert on pms.menu_items;
create policy menu_items_insert
on pms.menu_items
for insert to authenticated
with check (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = menu_items.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = menu_items.property_id and p.id = auth.uid()
  )
);

drop policy if exists menu_items_update on pms.menu_items;
create policy menu_items_update
on pms.menu_items
for update to authenticated
using (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = menu_items.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = menu_items.property_id and p.id = auth.uid()
  )
)
with check (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = menu_items.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = menu_items.property_id and p.id = auth.uid()
  )
);

drop policy if exists modifiers_select on pms.menu_item_modifiers;
create policy modifiers_select
on pms.menu_item_modifiers
for select to authenticated
using (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = menu_item_modifiers.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = menu_item_modifiers.property_id and p.id = auth.uid()
  )
);

drop policy if exists modifiers_insert on pms.menu_item_modifiers;
create policy modifiers_insert
on pms.menu_item_modifiers
for insert to authenticated
with check (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = menu_item_modifiers.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = menu_item_modifiers.property_id and p.id = auth.uid()
  )
);

drop policy if exists modifiers_update on pms.menu_item_modifiers;
create policy modifiers_update
on pms.menu_item_modifiers
for update to authenticated
using (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = menu_item_modifiers.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = menu_item_modifiers.property_id and p.id = auth.uid()
  )
)
with check (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = menu_item_modifiers.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = menu_item_modifiers.property_id and p.id = auth.uid()
  )
);

drop policy if exists outlet_prices_select on pms.outlet_menu_item_prices;
create policy outlet_prices_select
on pms.outlet_menu_item_prices
for select to authenticated
using (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = outlet_menu_item_prices.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = outlet_menu_item_prices.property_id and p.id = auth.uid()
  )
);

drop policy if exists outlet_prices_insert on pms.outlet_menu_item_prices;
create policy outlet_prices_insert
on pms.outlet_menu_item_prices
for insert to authenticated
with check (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = outlet_menu_item_prices.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = outlet_menu_item_prices.property_id and p.id = auth.uid()
  )
);

drop policy if exists outlet_prices_update on pms.outlet_menu_item_prices;
create policy outlet_prices_update
on pms.outlet_menu_item_prices
for update to authenticated
using (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = outlet_menu_item_prices.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = outlet_menu_item_prices.property_id and p.id = auth.uid()
  )
)
with check (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = outlet_menu_item_prices.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = outlet_menu_item_prices.property_id and p.id = auth.uid()
  )
);

commit;
