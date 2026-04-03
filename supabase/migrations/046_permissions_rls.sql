begin;
-- 046_permissions_rls
--
-- Enables row level security on pms.permissions so that:
--   • Any authenticated user in the system can read all permission entries.
--   • Only users with owner or general_manager status (checked via the
--     existing pms.current_user_can_manage_staff_access() security-definer
--     function) can insert, update, or delete permission entries.
--
-- This supports the Settings → Roles & Permissions screen where
-- owners/GMs can toggle permission keys on/off per role.

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable RLS
-- ─────────────────────────────────────────────────────────────────────────────
alter table pms.permissions enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- Read: any authenticated user can see the full permission catalogue
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists permissions_select_authenticated on pms.permissions;
create policy permissions_select_authenticated
  on pms.permissions
  for select
  to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Write (insert/update/delete): owners and general managers only
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists permissions_write_managers on pms.permissions;
create policy permissions_write_managers
  on pms.permissions
  for all
  to authenticated
  using (pms.current_user_can_manage_staff_access())
  with check (pms.current_user_can_manage_staff_access());

commit;
