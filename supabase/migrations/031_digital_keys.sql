begin;
-- 031_digital_keys

create table if not exists pms.digital_keys (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references pms.reservations(id),
  room_id uuid not null references pms.rooms(id),
  property_id uuid not null references pms.properties(id),
  provider text not null default 'manual'
    check (provider in ('manual', 'kaba', 'assa', 'salto', 'dormakaba')),
  provider_key_id text,
  status text not null default 'issued'
    check (status in ('issued', 'active', 'revoked', 'expired')),
  issued_at timestamptz not null default now(),
  valid_from timestamptz,
  valid_until timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references pms.profiles(id),
  issued_by uuid references pms.profiles(id),
  audit_log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists digital_keys_property_idx
  on pms.digital_keys(property_id, created_at desc);

create index if not exists digital_keys_reservation_idx
  on pms.digital_keys(reservation_id);

create index if not exists digital_keys_status_idx
  on pms.digital_keys(property_id, status);

create index if not exists digital_keys_room_idx
  on pms.digital_keys(room_id, status);

alter table pms.digital_keys enable row level security;

drop policy if exists digital_keys_read on pms.digital_keys;
create policy digital_keys_read
on pms.digital_keys
for select to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = digital_keys.property_id
      and upr.user_id = auth.uid()
  )
);

drop policy if exists digital_keys_insert on pms.digital_keys;
create policy digital_keys_insert
on pms.digital_keys
for insert to authenticated
with check (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = digital_keys.property_id
      and upr.user_id = auth.uid()
  )
);

drop policy if exists digital_keys_update on pms.digital_keys;
create policy digital_keys_update
on pms.digital_keys
for update to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = digital_keys.property_id
      and upr.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = digital_keys.property_id
      and upr.user_id = auth.uid()
  )
);

commit;
