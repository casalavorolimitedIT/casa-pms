begin;
-- 027_concierge_requests

create table if not exists pms.concierge_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  reservation_id uuid references pms.reservations(id),
  guest_id uuid references pms.guests(id),
  category text not null default 'general',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'assigned', 'in_progress', 'completed', 'cancelled')),
  description text not null,
  assigned_to uuid references pms.profiles(id),
  sla_due_at timestamptz,
  is_billable boolean not null default false,
  charge_amount_minor integer check (charge_amount_minor is null or charge_amount_minor >= 0),
  folio_id uuid references pms.folios(id),
  posted_charge_id uuid references pms.folio_charges(id),
  created_by uuid references pms.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists concierge_requests_property_idx
  on pms.concierge_requests(property_id, created_at desc);

create index if not exists concierge_requests_status_idx
  on pms.concierge_requests(property_id, status);

alter table pms.concierge_requests enable row level security;

drop policy if exists concierge_requests_read on pms.concierge_requests;
create policy concierge_requests_read
on pms.concierge_requests
for select to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = concierge_requests.property_id
      and upr.user_id = auth.uid()
  )
);

drop policy if exists concierge_requests_insert on pms.concierge_requests;
create policy concierge_requests_insert
on pms.concierge_requests
for insert to authenticated
with check (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = concierge_requests.property_id
      and upr.user_id = auth.uid()
  )
);

drop policy if exists concierge_requests_update on pms.concierge_requests;
create policy concierge_requests_update
on pms.concierge_requests
for update to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = concierge_requests.property_id
      and upr.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = concierge_requests.property_id
      and upr.user_id = auth.uid()
  )
);

commit;
