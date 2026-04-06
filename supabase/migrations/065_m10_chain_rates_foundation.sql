begin;

-- M10 Module 48 foundation: shared chain rate plans and property push mapping
alter table if exists pms.chain_rate_plans
  add column if not exists description text,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_by uuid references pms.profiles(id);

create table if not exists pms.chain_rate_plan_assignments (
  id uuid primary key default gen_random_uuid(),
  chain_rate_plan_id uuid not null references pms.chain_rate_plans(id) on delete cascade,
  property_id uuid not null references pms.properties(id) on delete cascade,
  property_rate_plan_id uuid references pms.rate_plans(id) on delete set null,
  override_allowed boolean not null default true,
  created_at timestamptz not null default now(),
  unique (chain_rate_plan_id, property_id)
);

create table if not exists pms.chain_rate_plan_overrides (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references pms.chain_rate_plan_assignments(id) on delete cascade,
  room_type_id uuid not null references pms.room_types(id),
  date_from date not null,
  date_to date not null,
  rate_minor integer not null check (rate_minor >= 0),
  created_at timestamptz not null default now(),
  check (date_to >= date_from)
);

create index if not exists idx_chain_rate_plan_assignments_property
  on pms.chain_rate_plan_assignments(property_id, created_at desc);

create index if not exists idx_chain_rate_plan_overrides_assignment_date
  on pms.chain_rate_plan_overrides(assignment_id, date_from, date_to);

commit;
