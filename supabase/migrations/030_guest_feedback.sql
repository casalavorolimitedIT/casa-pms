begin;
-- 030_guest_feedback

----------------------------------------------------------------------------
-- Feedback tokens
----------------------------------------------------------------------------
create table if not exists pms.feedback_tokens (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references pms.reservations(id),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz,
  sent_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists feedback_tokens_reservation_idx
  on pms.feedback_tokens(reservation_id);

create index if not exists feedback_tokens_token_idx
  on pms.feedback_tokens(token);

----------------------------------------------------------------------------
-- Feedback entries
----------------------------------------------------------------------------
create table if not exists pms.feedback_entries (
  id uuid primary key default gen_random_uuid(),
  token_id uuid references pms.feedback_tokens(id),
  reservation_id uuid not null references pms.reservations(id),
  property_id uuid not null references pms.properties(id),
  overall_score integer not null check (overall_score between 1 and 5),
  cleanliness_score integer check (cleanliness_score between 1 and 5),
  service_score integer check (service_score between 1 and 5),
  food_score integer check (food_score between 1 and 5),
  comment text,
  status text not null default 'received' check (status in ('received', 'escalated', 'resolved')),
  escalation_reason text,
  escalation_note text,
  resolved_at timestamptz,
  resolved_by uuid references pms.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists feedback_entries_property_idx
  on pms.feedback_entries(property_id, created_at desc);

create index if not exists feedback_entries_status_idx
  on pms.feedback_entries(property_id, status);

create index if not exists feedback_entries_score_idx
  on pms.feedback_entries(property_id, overall_score);

----------------------------------------------------------------------------
-- RLS – feedback_tokens
----------------------------------------------------------------------------
alter table pms.feedback_tokens enable row level security;

drop policy if exists feedback_tokens_read on pms.feedback_tokens;
create policy feedback_tokens_read
on pms.feedback_tokens
for select to authenticated
using (
  exists (
    select 1
    from pms.reservations r
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where r.id = feedback_tokens.reservation_id
      and upr.user_id = auth.uid()
  )
);

drop policy if exists feedback_tokens_insert on pms.feedback_tokens;
create policy feedback_tokens_insert
on pms.feedback_tokens
for insert to authenticated
with check (
  exists (
    select 1
    from pms.reservations r
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where r.id = feedback_tokens.reservation_id
      and upr.user_id = auth.uid()
  )
);

----------------------------------------------------------------------------
-- RLS – feedback_entries (staff read + service-role writes from guest forms)
----------------------------------------------------------------------------
alter table pms.feedback_entries enable row level security;

drop policy if exists feedback_entries_read on pms.feedback_entries;
create policy feedback_entries_read
on pms.feedback_entries
for select to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = feedback_entries.property_id
      and upr.user_id = auth.uid()
  )
);

drop policy if exists feedback_entries_update on pms.feedback_entries;
create policy feedback_entries_update
on pms.feedback_entries
for update to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = feedback_entries.property_id
      and upr.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = feedback_entries.property_id
      and upr.user_id = auth.uid()
  )
);

commit;
