begin;

-- M09: Spa and wellness operations

create table if not exists pms.spa_services (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  name text not null,
  duration_min integer not null default 60 check (duration_min > 0 and duration_min <= 600),
  price_minor integer not null default 0 check (price_minor >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists pms.spa_treatment_rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  name text not null,
  capacity integer not null default 1 check (capacity > 0 and capacity <= 12),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists pms.spa_therapists (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  profile_id uuid references pms.profiles(id),
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists pms.spa_therapist_qualifications (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  therapist_id uuid not null references pms.spa_therapists(id) on delete cascade,
  service_id uuid not null references pms.spa_services(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (therapist_id, service_id)
);

create table if not exists pms.spa_therapist_shifts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  therapist_id uuid not null references pms.spa_therapists(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'available' check (status in ('available', 'off', 'blocked')),
  notes text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists pms.spa_bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  reservation_id uuid references pms.reservations(id) on delete set null,
  guest_id uuid references pms.guests(id) on delete set null,
  service_id uuid not null references pms.spa_services(id),
  therapist_id uuid not null references pms.spa_therapists(id),
  room_id uuid not null references pms.spa_treatment_rooms(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'settled')),
  notes text,
  posted_charge_id uuid references pms.folio_charges(id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists pms.spa_settlements (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  booking_id uuid not null references pms.spa_bookings(id) on delete cascade,
  amount_minor integer not null check (amount_minor >= 0),
  method text not null default 'card',
  reference text,
  status text not null default 'paid' check (status in ('paid', 'refunded', 'voided', 'transferred_to_hotel_folio')),
  created_at timestamptz not null default now(),
  unique (booking_id)
);

create table if not exists pms.spa_memberships (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  guest_id uuid not null references pms.guests(id),
  plan_name text not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  valid_from date not null,
  valid_until date not null,
  total_allowance integer not null default 0 check (total_allowance >= 0),
  remaining_allowance integer not null default 0 check (remaining_allowance >= 0),
  sold_amount_minor integer not null default 0 check (sold_amount_minor >= 0),
  folio_charge_id uuid references pms.folio_charges(id),
  created_at timestamptz not null default now(),
  check (valid_until >= valid_from)
);

create table if not exists pms.spa_membership_usage (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  membership_id uuid not null references pms.spa_memberships(id) on delete cascade,
  booking_id uuid references pms.spa_bookings(id) on delete set null,
  units_used integer not null default 1 check (units_used > 0),
  note text,
  used_at timestamptz not null default now()
);

-- Backfill schema drift for environments where early spa tables already exist
-- with partial/legacy columns. This keeps migration idempotent.
alter table if exists pms.spa_services
  add column if not exists property_id uuid references pms.properties(id),
  add column if not exists name text,
  add column if not exists duration_min integer,
  add column if not exists price_minor integer,
  add column if not exists is_active boolean,
  add column if not exists created_at timestamptz;

alter table if exists pms.spa_treatment_rooms
  add column if not exists property_id uuid references pms.properties(id),
  add column if not exists name text,
  add column if not exists capacity integer,
  add column if not exists is_active boolean,
  add column if not exists created_at timestamptz;

alter table if exists pms.spa_therapists
  add column if not exists property_id uuid references pms.properties(id),
  add column if not exists profile_id uuid references pms.profiles(id),
  add column if not exists display_name text,
  add column if not exists is_active boolean,
  add column if not exists created_at timestamptz;

alter table if exists pms.spa_therapist_qualifications
  add column if not exists property_id uuid references pms.properties(id),
  add column if not exists therapist_id uuid references pms.spa_therapists(id) on delete cascade,
  add column if not exists service_id uuid references pms.spa_services(id) on delete cascade,
  add column if not exists created_at timestamptz;

alter table if exists pms.spa_therapist_shifts
  add column if not exists property_id uuid references pms.properties(id),
  add column if not exists therapist_id uuid references pms.spa_therapists(id) on delete cascade,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists status text,
  add column if not exists notes text,
  add column if not exists created_at timestamptz;

alter table if exists pms.spa_bookings
  add column if not exists property_id uuid references pms.properties(id),
  add column if not exists reservation_id uuid references pms.reservations(id) on delete set null,
  add column if not exists guest_id uuid references pms.guests(id) on delete set null,
  add column if not exists service_id uuid references pms.spa_services(id),
  add column if not exists therapist_id uuid references pms.spa_therapists(id),
  add column if not exists room_id uuid references pms.spa_treatment_rooms(id),
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists status text,
  add column if not exists notes text,
  add column if not exists posted_charge_id uuid references pms.folio_charges(id),
  add column if not exists created_at timestamptz;

alter table if exists pms.spa_settlements
  add column if not exists property_id uuid references pms.properties(id),
  add column if not exists booking_id uuid references pms.spa_bookings(id) on delete cascade,
  add column if not exists amount_minor integer,
  add column if not exists method text,
  add column if not exists reference text,
  add column if not exists status text,
  add column if not exists created_at timestamptz;

alter table if exists pms.spa_memberships
  add column if not exists property_id uuid references pms.properties(id),
  add column if not exists guest_id uuid references pms.guests(id),
  add column if not exists plan_name text,
  add column if not exists status text,
  add column if not exists valid_from date,
  add column if not exists valid_until date,
  add column if not exists total_allowance integer,
  add column if not exists remaining_allowance integer,
  add column if not exists sold_amount_minor integer,
  add column if not exists folio_charge_id uuid references pms.folio_charges(id),
  add column if not exists created_at timestamptz;

alter table if exists pms.spa_membership_usage
  add column if not exists property_id uuid references pms.properties(id),
  add column if not exists membership_id uuid references pms.spa_memberships(id) on delete cascade,
  add column if not exists booking_id uuid references pms.spa_bookings(id) on delete set null,
  add column if not exists units_used integer,
  add column if not exists note text,
  add column if not exists used_at timestamptz;

create index if not exists idx_spa_bookings_property_time
  on pms.spa_bookings(property_id, starts_at, ends_at, status);
create index if not exists idx_spa_shifts_therapist_time
  on pms.spa_therapist_shifts(therapist_id, starts_at, ends_at);
create index if not exists idx_spa_memberships_guest_status
  on pms.spa_memberships(property_id, guest_id, status, valid_until);

alter table pms.spa_services enable row level security;
alter table pms.spa_treatment_rooms enable row level security;
alter table pms.spa_therapists enable row level security;
alter table pms.spa_therapist_qualifications enable row level security;
alter table pms.spa_therapist_shifts enable row level security;
alter table pms.spa_bookings enable row level security;
alter table pms.spa_settlements enable row level security;
alter table pms.spa_memberships enable row level security;
alter table pms.spa_membership_usage enable row level security;

-- Generic property-scoped RLS for authenticated staff.
drop policy if exists spa_services_rw on pms.spa_services;
create policy spa_services_rw
on pms.spa_services
for all to authenticated
using (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = spa_services.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = spa_services.property_id and p.id = auth.uid())
)
with check (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = spa_services.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = spa_services.property_id and p.id = auth.uid())
);

drop policy if exists spa_rooms_rw on pms.spa_treatment_rooms;
create policy spa_rooms_rw
on pms.spa_treatment_rooms
for all to authenticated
using (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = spa_treatment_rooms.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = spa_treatment_rooms.property_id and p.id = auth.uid())
)
with check (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = spa_treatment_rooms.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = spa_treatment_rooms.property_id and p.id = auth.uid())
);

drop policy if exists spa_therapists_rw on pms.spa_therapists;
create policy spa_therapists_rw
on pms.spa_therapists
for all to authenticated
using (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = spa_therapists.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = spa_therapists.property_id and p.id = auth.uid())
)
with check (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = spa_therapists.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = spa_therapists.property_id and p.id = auth.uid())
);

drop policy if exists spa_qualifications_rw on pms.spa_therapist_qualifications;
create policy spa_qualifications_rw
on pms.spa_therapist_qualifications
for all to authenticated
using (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = spa_therapist_qualifications.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = spa_therapist_qualifications.property_id and p.id = auth.uid())
)
with check (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = spa_therapist_qualifications.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = spa_therapist_qualifications.property_id and p.id = auth.uid())
);

drop policy if exists spa_shifts_rw on pms.spa_therapist_shifts;
create policy spa_shifts_rw
on pms.spa_therapist_shifts
for all to authenticated
using (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = spa_therapist_shifts.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = spa_therapist_shifts.property_id and p.id = auth.uid())
)
with check (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = spa_therapist_shifts.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = spa_therapist_shifts.property_id and p.id = auth.uid())
);

drop policy if exists spa_bookings_rw on pms.spa_bookings;
create policy spa_bookings_rw
on pms.spa_bookings
for all to authenticated
using (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = spa_bookings.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = spa_bookings.property_id and p.id = auth.uid())
)
with check (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = spa_bookings.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = spa_bookings.property_id and p.id = auth.uid())
);

drop policy if exists spa_settlements_rw on pms.spa_settlements;
create policy spa_settlements_rw
on pms.spa_settlements
for all to authenticated
using (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = spa_settlements.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = spa_settlements.property_id and p.id = auth.uid())
)
with check (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = spa_settlements.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = spa_settlements.property_id and p.id = auth.uid())
);

drop policy if exists spa_memberships_rw on pms.spa_memberships;
create policy spa_memberships_rw
on pms.spa_memberships
for all to authenticated
using (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = spa_memberships.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = spa_memberships.property_id and p.id = auth.uid())
)
with check (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = spa_memberships.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = spa_memberships.property_id and p.id = auth.uid())
);

drop policy if exists spa_membership_usage_rw on pms.spa_membership_usage;
create policy spa_membership_usage_rw
on pms.spa_membership_usage
for all to authenticated
using (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = spa_membership_usage.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = spa_membership_usage.property_id and p.id = auth.uid())
)
with check (
  exists (select 1 from pms.user_property_roles upr where upr.property_id = spa_membership_usage.property_id and upr.user_id = auth.uid())
  or exists (select 1 from pms.properties pr join pms.profiles p on p.organization_id = pr.organization_id where pr.id = spa_membership_usage.property_id and p.id = auth.uid())
);

commit;
