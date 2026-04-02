-- 013_assets
begin;

create table if not exists pms.assets (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  name text not null,
  category text,
  purchase_date date,
  warranty_until date,
  created_at timestamptz not null default now()
);

commit;
