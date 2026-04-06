begin;

-- M06 Module 26: POS webhook idempotency/audit table
create table if not exists pms.pos_webhook_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  external_reference text not null unique,
  payload jsonb not null,
  charge_id uuid references pms.folio_charges(id),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_pos_webhook_events_property_created
  on pms.pos_webhook_events(property_id, created_at desc);

alter table pms.pos_webhook_events enable row level security;

drop policy if exists pos_webhook_events_select on pms.pos_webhook_events;
create policy pos_webhook_events_select
on pms.pos_webhook_events
for select to authenticated
using (
  exists (
    select 1 from pms.user_property_roles upr
    where upr.property_id = pos_webhook_events.property_id and upr.user_id = auth.uid()
  )
  or exists (
    select 1 from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = pos_webhook_events.property_id and p.id = auth.uid()
  )
);

commit;
