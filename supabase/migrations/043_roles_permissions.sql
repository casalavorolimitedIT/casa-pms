begin;
-- 043_roles_permissions
--
-- Defines the canonical staff roles and their permission grants.
-- Staff (pms.profiles) are hotel employees who log in to the PMS.
-- They are completely separate from hotel guests (pms.guests).
--
-- Roles:
--   owner             – Org owner; full access incl. settings & billing.
--   general_manager   – All operational access; can manage staff.
--   supervisor        – All ops, no billing or settings.
--   front_desk        – Reservations, check‑in/out, guests, keys, concierge, messages.
--   cashier           – Folios, payments, cash shift, night audit.
--   housekeeping_manager – Full housekeeping module + room status.
--   housekeeping_staff   – Housekeeping tasks, room status updates only.
--   concierge         – Concierge requests, messaging, pre‑arrival.
--   maintenance       – Work orders, room maintenance status.
--   night_auditor     – Night audit, reports, folios read.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Enrich pms.profiles with staff-specific fields
-- ─────────────────────────────────────────────────────────────────────────────
alter table pms.profiles
  add column if not exists avatar_url text,
  add column if not exists job_title  text,
  add column if not exists phone      text,
  add column if not exists is_active  boolean not null default true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Constrain user_property_roles.role to known role values
-- ─────────────────────────────────────────────────────────────────────────────
alter table pms.user_property_roles
  drop constraint if exists user_property_roles_role_check;

alter table pms.user_property_roles
  add constraint user_property_roles_role_check
  check (role in (
    'owner',
    'general_manager',
    'supervisor',
    'front_desk',
    'cashier',
    'housekeeping_manager',
    'housekeeping_staff',
    'concierge',
    'maintenance',
    'night_auditor'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Seed permissions table
--    Insert canonical role → permission_key mappings.
--    ON CONFLICT DO NOTHING is safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- owner -----------------------------------------------------------------------
insert into pms.permissions (role, permission_key) values
  ('owner', 'reservations.view'),
  ('owner', 'reservations.create'),
  ('owner', 'reservations.update'),
  ('owner', 'reservations.cancel'),
  ('owner', 'checkin.perform'),
  ('owner', 'checkout.perform'),
  ('owner', 'checkin.override'),
  ('owner', 'guests.view'),
  ('owner', 'guests.create'),
  ('owner', 'guests.update'),
  ('owner', 'rooms.view'),
  ('owner', 'rooms.update_status'),
  ('owner', 'rooms.manage'),
  ('owner', 'folios.view'),
  ('owner', 'folios.post_charge'),
  ('owner', 'folios.process_payment'),
  ('owner', 'folios.adjust'),
  ('owner', 'housekeeping.view'),
  ('owner', 'housekeeping.manage'),
  ('owner', 'housekeeping.assign'),
  ('owner', 'night_audit.run'),
  ('owner', 'cash_shift.manage'),
  ('owner', 'keys.manage'),
  ('owner', 'concierge.view'),
  ('owner', 'concierge.manage'),
  ('owner', 'messaging.view'),
  ('owner', 'messaging.send'),
  ('owner', 'work_orders.view'),
  ('owner', 'work_orders.create'),
  ('owner', 'work_orders.manage'),
  ('owner', 'tasks.view'),
  ('owner', 'tasks.manage'),
  ('owner', 'minibar.manage'),
  ('owner', 'linen.manage'),
  ('owner', 'lost_found.view'),
  ('owner', 'lost_found.manage'),
  ('owner', 'feedback.view'),
  ('owner', 'pre_arrival.view'),
  ('owner', 'pre_arrival.manage'),
  ('owner', 'dnd.manage'),
  ('owner', 'rates.view'),
  ('owner', 'rates.manage'),
  ('owner', 'reports.view'),
  ('owner', 'reports.financial'),
  ('owner', 'staff.view'),
  ('owner', 'staff.manage'),
  ('owner', 'staff.invite'),
  ('owner', 'settings.view'),
  ('owner', 'settings.manage')
on conflict (role, permission_key) do nothing;

-- general_manager -------------------------------------------------------------
insert into pms.permissions (role, permission_key) values
  ('general_manager', 'reservations.view'),
  ('general_manager', 'reservations.create'),
  ('general_manager', 'reservations.update'),
  ('general_manager', 'reservations.cancel'),
  ('general_manager', 'checkin.perform'),
  ('general_manager', 'checkout.perform'),
  ('general_manager', 'checkin.override'),
  ('general_manager', 'guests.view'),
  ('general_manager', 'guests.create'),
  ('general_manager', 'guests.update'),
  ('general_manager', 'rooms.view'),
  ('general_manager', 'rooms.update_status'),
  ('general_manager', 'rooms.manage'),
  ('general_manager', 'folios.view'),
  ('general_manager', 'folios.post_charge'),
  ('general_manager', 'folios.process_payment'),
  ('general_manager', 'folios.adjust'),
  ('general_manager', 'housekeeping.view'),
  ('general_manager', 'housekeeping.manage'),
  ('general_manager', 'housekeeping.assign'),
  ('general_manager', 'night_audit.run'),
  ('general_manager', 'cash_shift.manage'),
  ('general_manager', 'keys.manage'),
  ('general_manager', 'concierge.view'),
  ('general_manager', 'concierge.manage'),
  ('general_manager', 'messaging.view'),
  ('general_manager', 'messaging.send'),
  ('general_manager', 'work_orders.view'),
  ('general_manager', 'work_orders.create'),
  ('general_manager', 'work_orders.manage'),
  ('general_manager', 'tasks.view'),
  ('general_manager', 'tasks.manage'),
  ('general_manager', 'minibar.manage'),
  ('general_manager', 'linen.manage'),
  ('general_manager', 'lost_found.view'),
  ('general_manager', 'lost_found.manage'),
  ('general_manager', 'feedback.view'),
  ('general_manager', 'pre_arrival.view'),
  ('general_manager', 'pre_arrival.manage'),
  ('general_manager', 'dnd.manage'),
  ('general_manager', 'rates.view'),
  ('general_manager', 'rates.manage'),
  ('general_manager', 'reports.view'),
  ('general_manager', 'reports.financial'),
  ('general_manager', 'staff.view'),
  ('general_manager', 'staff.manage'),
  ('general_manager', 'staff.invite'),
  ('general_manager', 'settings.view')
on conflict (role, permission_key) do nothing;

-- supervisor ------------------------------------------------------------------
insert into pms.permissions (role, permission_key) values
  ('supervisor', 'reservations.view'),
  ('supervisor', 'reservations.create'),
  ('supervisor', 'reservations.update'),
  ('supervisor', 'reservations.cancel'),
  ('supervisor', 'checkin.perform'),
  ('supervisor', 'checkout.perform'),
  ('supervisor', 'checkin.override'),
  ('supervisor', 'guests.view'),
  ('supervisor', 'guests.create'),
  ('supervisor', 'guests.update'),
  ('supervisor', 'rooms.view'),
  ('supervisor', 'rooms.update_status'),
  ('supervisor', 'rooms.manage'),
  ('supervisor', 'folios.view'),
  ('supervisor', 'folios.post_charge'),
  ('supervisor', 'folios.process_payment'),
  ('supervisor', 'folios.adjust'),
  ('supervisor', 'housekeeping.view'),
  ('supervisor', 'housekeeping.manage'),
  ('supervisor', 'housekeeping.assign'),
  ('supervisor', 'night_audit.run'),
  ('supervisor', 'cash_shift.manage'),
  ('supervisor', 'keys.manage'),
  ('supervisor', 'concierge.view'),
  ('supervisor', 'concierge.manage'),
  ('supervisor', 'messaging.view'),
  ('supervisor', 'messaging.send'),
  ('supervisor', 'work_orders.view'),
  ('supervisor', 'work_orders.create'),
  ('supervisor', 'work_orders.manage'),
  ('supervisor', 'tasks.view'),
  ('supervisor', 'tasks.manage'),
  ('supervisor', 'minibar.manage'),
  ('supervisor', 'linen.manage'),
  ('supervisor', 'lost_found.view'),
  ('supervisor', 'lost_found.manage'),
  ('supervisor', 'feedback.view'),
  ('supervisor', 'pre_arrival.view'),
  ('supervisor', 'pre_arrival.manage'),
  ('supervisor', 'dnd.manage'),
  ('supervisor', 'rates.view'),
  ('supervisor', 'reports.view'),
  ('supervisor', 'staff.view')
on conflict (role, permission_key) do nothing;

-- front_desk ------------------------------------------------------------------
insert into pms.permissions (role, permission_key) values
  ('front_desk', 'reservations.view'),
  ('front_desk', 'reservations.create'),
  ('front_desk', 'reservations.update'),
  ('front_desk', 'reservations.cancel'),
  ('front_desk', 'checkin.perform'),
  ('front_desk', 'checkout.perform'),
  ('front_desk', 'guests.view'),
  ('front_desk', 'guests.create'),
  ('front_desk', 'guests.update'),
  ('front_desk', 'rooms.view'),
  ('front_desk', 'rooms.update_status'),
  ('front_desk', 'folios.view'),
  ('front_desk', 'folios.post_charge'),
  ('front_desk', 'folios.process_payment'),
  ('front_desk', 'keys.manage'),
  ('front_desk', 'concierge.view'),
  ('front_desk', 'concierge.manage'),
  ('front_desk', 'messaging.view'),
  ('front_desk', 'messaging.send'),
  ('front_desk', 'tasks.view'),
  ('front_desk', 'tasks.manage'),
  ('front_desk', 'lost_found.view'),
  ('front_desk', 'lost_found.manage'),
  ('front_desk', 'feedback.view'),
  ('front_desk', 'pre_arrival.view'),
  ('front_desk', 'pre_arrival.manage'),
  ('front_desk', 'dnd.manage'),
  ('front_desk', 'housekeeping.view')
on conflict (role, permission_key) do nothing;

-- cashier ---------------------------------------------------------------------
insert into pms.permissions (role, permission_key) values
  ('cashier', 'reservations.view'),
  ('cashier', 'guests.view'),
  ('cashier', 'rooms.view'),
  ('cashier', 'folios.view'),
  ('cashier', 'folios.post_charge'),
  ('cashier', 'folios.process_payment'),
  ('cashier', 'folios.adjust'),
  ('cashier', 'cash_shift.manage'),
  ('cashier', 'night_audit.run'),
  ('cashier', 'reports.view'),
  ('cashier', 'reports.financial')
on conflict (role, permission_key) do nothing;

-- housekeeping_manager --------------------------------------------------------
insert into pms.permissions (role, permission_key) values
  ('housekeeping_manager', 'rooms.view'),
  ('housekeeping_manager', 'rooms.update_status'),
  ('housekeeping_manager', 'rooms.manage'),
  ('housekeeping_manager', 'housekeeping.view'),
  ('housekeeping_manager', 'housekeeping.manage'),
  ('housekeeping_manager', 'housekeeping.assign'),
  ('housekeeping_manager', 'minibar.manage'),
  ('housekeeping_manager', 'linen.manage'),
  ('housekeeping_manager', 'tasks.view'),
  ('housekeeping_manager', 'tasks.manage'),
  ('housekeeping_manager', 'work_orders.view'),
  ('housekeeping_manager', 'work_orders.create'),
  ('housekeeping_manager', 'lost_found.view'),
  ('housekeeping_manager', 'lost_found.manage')
on conflict (role, permission_key) do nothing;

-- housekeeping_staff ----------------------------------------------------------
insert into pms.permissions (role, permission_key) values
  ('housekeeping_staff', 'rooms.view'),
  ('housekeeping_staff', 'rooms.update_status'),
  ('housekeeping_staff', 'housekeeping.view'),
  ('housekeeping_staff', 'tasks.view'),
  ('housekeeping_staff', 'minibar.manage'),
  ('housekeeping_staff', 'linen.manage'),
  ('housekeeping_staff', 'lost_found.view'),
  ('housekeeping_staff', 'lost_found.manage')
on conflict (role, permission_key) do nothing;

-- concierge -------------------------------------------------------------------
insert into pms.permissions (role, permission_key) values
  ('concierge', 'reservations.view'),
  ('concierge', 'guests.view'),
  ('concierge', 'rooms.view'),
  ('concierge', 'concierge.view'),
  ('concierge', 'concierge.manage'),
  ('concierge', 'messaging.view'),
  ('concierge', 'messaging.send'),
  ('concierge', 'pre_arrival.view'),
  ('concierge', 'pre_arrival.manage'),
  ('concierge', 'feedback.view'),
  ('concierge', 'tasks.view'),
  ('concierge', 'tasks.manage')
on conflict (role, permission_key) do nothing;

-- maintenance -----------------------------------------------------------------
insert into pms.permissions (role, permission_key) values
  ('maintenance', 'rooms.view'),
  ('maintenance', 'rooms.update_status'),
  ('maintenance', 'rooms.manage'),
  ('maintenance', 'work_orders.view'),
  ('maintenance', 'work_orders.create'),
  ('maintenance', 'work_orders.manage'),
  ('maintenance', 'tasks.view'),
  ('maintenance', 'tasks.manage')
on conflict (role, permission_key) do nothing;

-- night_auditor ---------------------------------------------------------------
insert into pms.permissions (role, permission_key) values
  ('night_auditor', 'reservations.view'),
  ('night_auditor', 'guests.view'),
  ('night_auditor', 'rooms.view'),
  ('night_auditor', 'folios.view'),
  ('night_auditor', 'night_audit.run'),
  ('night_auditor', 'cash_shift.manage'),
  ('night_auditor', 'reports.view'),
  ('night_auditor', 'reports.financial')
on conflict (role, permission_key) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Helper function: check if the calling user has a permission at a property
--
--    Usage in RLS:  pms.current_user_has_permission(property_id, 'folios.adjust')
--    Usage in app:  SELECT pms.current_user_has_permission($1, $2)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function pms.current_user_has_permission(
  p_property_id uuid,
  p_permission  text
)
returns boolean
security definer
set search_path = pms, public
language sql
stable
as $$
  select exists (
    select 1
    from pms.user_property_roles upr
    join pms.permissions perm
      on perm.role = upr.role
    where upr.user_id      = auth.uid()
      and upr.property_id  = p_property_id
      and perm.permission_key = p_permission
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Helper function: get all permissions for the current user at a property
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function pms.current_user_permissions(
  p_property_id uuid
)
returns table (permission_key text)
security definer
set search_path = pms, public
language sql
stable
as $$
  select distinct perm.permission_key
  from pms.user_property_roles upr
  join pms.permissions perm
    on perm.role = upr.role
  where upr.user_id     = auth.uid()
    and upr.property_id = p_property_id;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Helper view: current staff roster with roles per property
-- ─────────────────────────────────────────────────────────────────────────────
create or replace view pms.staff_roster as
  select
    p.id              as user_id,
    p.organization_id,
    p.email,
    p.full_name,
    p.job_title,
    p.phone,
    p.avatar_url,
    p.is_active,
    p.created_at      as joined_at,
    upr.property_id,
    upr.role,
    upr.created_at    as role_assigned_at
  from pms.profiles p
  left join pms.user_property_roles upr
    on upr.user_id = p.id;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RLS: staff can read all profiles in their own organization
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists profiles_select_same_org on pms.profiles;
create policy profiles_select_same_org
on pms.profiles
for select to authenticated
using (
  organization_id = (
    select p2.organization_id
    from pms.profiles p2
    where p2.id = auth.uid()
    limit 1
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RLS: owner/general_manager can update any profile in the org
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists profiles_update_managers on pms.profiles;
create policy profiles_update_managers
on pms.profiles
for update to authenticated
using (
  -- own profile always
  id = auth.uid()
  or
  -- managers in same org
  (
    organization_id = (
      select p2.organization_id
      from pms.profiles p2
      where p2.id = auth.uid()
      limit 1
    )
    and exists (
      select 1
      from pms.user_property_roles upr
      join pms.properties pr on pr.id = upr.property_id
      join pms.profiles me on me.id = auth.uid()
        and me.organization_id = pr.organization_id
      where upr.user_id = auth.uid()
        and upr.role in ('owner', 'general_manager')
    )
  )
)
with check (
  id = auth.uid()
  or
  (
    organization_id = (
      select p2.organization_id
      from pms.profiles p2
      where p2.id = auth.uid()
      limit 1
    )
    and exists (
      select 1
      from pms.user_property_roles upr
      join pms.properties pr on pr.id = upr.property_id
      join pms.profiles me on me.id = auth.uid()
        and me.organization_id = pr.organization_id
      where upr.user_id = auth.uid()
        and upr.role in ('owner', 'general_manager')
    )
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. RLS on user_property_roles
-- ─────────────────────────────────────────────────────────────────────────────
alter table pms.user_property_roles enable row level security;

drop policy if exists upr_select_same_org on pms.user_property_roles;
create policy upr_select_same_org
on pms.user_property_roles
for select to authenticated
using (
  exists (
    select 1
    from pms.profiles me
    join pms.properties pr on pr.organization_id = me.organization_id
    where me.id = auth.uid()
      and pr.id = pms.user_property_roles.property_id
  )
);

drop policy if exists upr_manage_managers on pms.user_property_roles;
create policy upr_manage_managers
on pms.user_property_roles
for all to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles my_role
    join pms.properties pr on pr.id = my_role.property_id
    join pms.profiles me on me.id = auth.uid()
      and me.organization_id = pr.organization_id
    where my_role.user_id = auth.uid()
      and my_role.role in ('owner', 'general_manager')
  )
)
with check (
  exists (
    select 1
    from pms.user_property_roles my_role
    join pms.properties pr on pr.id = my_role.property_id
    join pms.profiles me on me.id = auth.uid()
      and me.organization_id = pr.organization_id
    where my_role.user_id = auth.uid()
      and my_role.role in ('owner', 'general_manager')
  )
);

commit;
