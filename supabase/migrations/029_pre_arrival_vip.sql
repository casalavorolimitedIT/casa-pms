begin;
-- 029_pre_arrival_vip

----------------------------------------------------------------------------
-- Pre-arrival tokens
----------------------------------------------------------------------------
create table if not exists pms.pre_arrival_tokens (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references pms.reservations(id),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz,
  sent_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pre_arrival_tokens_reservation_idx
  on pms.pre_arrival_tokens(reservation_id);

create index if not exists pre_arrival_tokens_token_idx
  on pms.pre_arrival_tokens(token);

----------------------------------------------------------------------------
-- Pre-arrival responses
----------------------------------------------------------------------------
create table if not exists pms.pre_arrival_responses (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references pms.pre_arrival_tokens(id),
  reservation_id uuid not null references pms.reservations(id),
  arrival_time text,
  transport_type text check (transport_type in ('own_car', 'taxi', 'airport_transfer', 'train', 'other', null)),
  room_preferences jsonb not null default '{}',
  special_requests text,
  created_at timestamptz not null default now()
);

create index if not exists pre_arrival_responses_reservation_idx
  on pms.pre_arrival_responses(reservation_id);

----------------------------------------------------------------------------
-- VIP flags – add active status tracking
----------------------------------------------------------------------------
alter table pms.guest_vip_flags
  add column if not exists is_active boolean not null default true,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references pms.profiles(id);

create index if not exists guest_vip_flags_guest_active_idx
  on pms.guest_vip_flags(guest_id, is_active) where is_active = true;

----------------------------------------------------------------------------
-- RLS – pre_arrival_tokens (staff management only)
----------------------------------------------------------------------------
alter table pms.pre_arrival_tokens enable row level security;

drop policy if exists pre_arrival_tokens_read on pms.pre_arrival_tokens;
create policy pre_arrival_tokens_read
on pms.pre_arrival_tokens
for select to authenticated
using (
  exists (
    select 1
    from pms.reservations r
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where r.id = pre_arrival_tokens.reservation_id
      and upr.user_id = auth.uid()
  )
);

drop policy if exists pre_arrival_tokens_insert on pms.pre_arrival_tokens;
create policy pre_arrival_tokens_insert
on pms.pre_arrival_tokens
for insert to authenticated
with check (
  exists (
    select 1
    from pms.reservations r
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where r.id = pre_arrival_tokens.reservation_id
      and upr.user_id = auth.uid()
  )
);

----------------------------------------------------------------------------
-- RLS – pre_arrival_responses (service-role writes from guest forms)
----------------------------------------------------------------------------
alter table pms.pre_arrival_responses enable row level security;

drop policy if exists pre_arrival_responses_read on pms.pre_arrival_responses;
create policy pre_arrival_responses_read
on pms.pre_arrival_responses
for select to authenticated
using (
  exists (
    select 1
    from pms.reservations r
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where r.id = pre_arrival_responses.reservation_id
      and upr.user_id = auth.uid()
  )
);

----------------------------------------------------------------------------
-- RLS – guest_vip_flags
----------------------------------------------------------------------------
alter table pms.guest_vip_flags enable row level security;

drop policy if exists guest_vip_flags_read on pms.guest_vip_flags;
create policy guest_vip_flags_read
on pms.guest_vip_flags
for select to authenticated
using (auth.uid() is not null);

drop policy if exists guest_vip_flags_insert on pms.guest_vip_flags;
create policy guest_vip_flags_insert
on pms.guest_vip_flags
for insert to authenticated
with check (auth.uid() is not null);

drop policy if exists guest_vip_flags_update on pms.guest_vip_flags;
create policy guest_vip_flags_update
on pms.guest_vip_flags
for update to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

commit;
