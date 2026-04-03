begin;

create table if not exists pms.travel_agents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  default_commission_percent numeric(5,2) not null default 10.00,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists pms.travel_agent_commissions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  travel_agent_id uuid not null references pms.travel_agents(id) on delete cascade,
  reservation_id uuid not null references pms.reservations(id) on delete cascade,
  commission_percent numeric(5,2) not null,
  commission_minor integer not null default 0,
  payout_status text not null default 'pending'
    check (payout_status in ('pending','approved','paid','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, reservation_id)
);

create index if not exists travel_agents_property_idx
  on pms.travel_agents (property_id, company_name);

create index if not exists travel_agent_commissions_property_idx
  on pms.travel_agent_commissions (property_id, payout_status, created_at desc);

commit;