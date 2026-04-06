-- 069_performance_indexes.sql
-- M12: Performance workstream — composite indexes on high-traffic query paths.
-- Each index targets an RLS policy join or a common filter pattern identified in
-- the availability, reservation search, folio ledger, and reporting data layers.
-- Note: CONCURRENTLY is omitted — Supabase CLI wraps migrations in a transaction
-- and CONCURRENTLY cannot run inside a transaction block.

-- ─── reservations ─────────────────────────────────────────────────────────────
-- Primary hot path: availability overlap check (check_in < ? AND check_out > ?)
-- filtered by property + status. Used by getRoomTypeAvailability and reservation search.
create index if not exists idx_reservations_property_dates_status
  on pms.reservations (property_id, check_in, check_out, status);

-- Night-audit daily scan: status = 'checked_in', check_out = today.
create index if not exists idx_reservations_status_checkout
  on pms.reservations (status, check_out);

-- Folio join path: folios.reservation_id → reservations.property_id (used in RLS policies).
create index if not exists idx_reservations_id_property
  on pms.reservations (id, property_id);

-- ─── rooms ────────────────────────────────────────────────────────────────────
-- Availability count query: rooms per property filtered by status.
create index if not exists idx_rooms_property_type_status
  on pms.rooms (property_id, room_type_id, status);

-- ─── folios ───────────────────────────────────────────────────────────────────
-- Folio lookup by reservation (1:1 or 1:many) — used in check-in and AR aging.
create index if not exists idx_folios_reservation_id
  on pms.folios (reservation_id);

-- ─── folio_charges ────────────────────────────────────────────────────────────
-- Ledger listing ordered by date; also used in revenue reconciliation report.
create index if not exists idx_folio_charges_folio_created
  on pms.folio_charges (folio_id, created_at desc);

-- Reporting: sum charges across a property in a date range (join via folio → reservation).
create index if not exists idx_folio_charges_created_at
  on pms.folio_charges (created_at);

-- ─── folio_payments ───────────────────────────────────────────────────────────
-- Balance query: sum payments for a folio.
create index if not exists idx_folio_payments_folio_id
  on pms.folio_payments (folio_id);

-- ─── guests ───────────────────────────────────────────────────────────────────
-- Guest search by name / email scoped to organisation (used in front-desk search).
create index if not exists idx_guests_org_email
  on pms.guests (organization_id, email);

create index if not exists idx_guests_org_name
  on pms.guests (organization_id, last_name, first_name);

-- ─── user_property_roles ──────────────────────────────────────────────────────
-- RLS hot path: every authenticated query joins on (user_id, property_id).
create index if not exists idx_user_property_roles_user_property
  on pms.user_property_roles (user_id, property_id);

-- ─── housekeeping_assignments ─────────────────────────────────────────────────
-- Housekeeping board filtered by property and date; also used in productivity report.
create index if not exists idx_housekeeping_assignments_property_date
  on pms.housekeeping_assignments (property_id, created_at desc);

-- ─── reservation_rooms ────────────────────────────────────────────────────────
-- Used in availability count: group by room_type_id where reservation overlaps range.
create index if not exists idx_reservation_rooms_room_type
  on pms.reservation_rooms (room_type_id);

-- ─── room_rates ───────────────────────────────────────────────────────────────
-- Rate calculation date-overlap query: lte(date_from, checkOut) + gte(date_to, checkIn).
create index if not exists idx_room_rates_type_dates
  on pms.room_rates (room_type_id, date_from, date_to);
