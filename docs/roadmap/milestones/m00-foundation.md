# M00 Foundation: Platform, Schema, App Shell

## Mission
Build the platform baseline that every later milestone depends on: tenancy model, security model, schema, shared engines, and dashboard shell.

## Detailed Build Scope

### Architecture Decisions (lock before writing feature code)
- Multi-tenancy model: organizations -> properties -> domain data.
- Every domain table includes either organization_id or property_id.
- Role model: super_admin, property_manager, front_desk, housekeeping, engineering, fnb_manager, spa_manager, accountant, concierge.
- Mutations are Server Actions.
- Realtime events via Supabase Realtime.
- File storage via Supabase Storage.
- Payment strategy: Stripe plus Paystack with currency-aware routing (NGN defaults to Paystack).

### Dependencies To Install
- zod
- date-fns
- @react-pdf/renderer
- recharts
- react-big-calendar
- @dnd-kit/core
- @dnd-kit/sortable
- react-day-picker
- stripe
- @stripe/stripe-js
- paystack integration client (HTTPS API)
- twilio

### Migration Plan (must exist by end of milestone)
- 001_organizations_properties.sql
- 002_users_roles.sql
- 003_rooms.sql
- 004_guests.sql
- 005_rate_management.sql
- 006_reservations.sql
- 007_folio_billing.sql
- 008_checkin_checkout.sql
- 009_night_audit.sql
- 010_cash_shift.sql
- 011_housekeeping.sql
- 012_tasks_maintenance.sql
- 013_assets.sql
- 014_fnb.sql
- 015_guest_experience.sql
- 016_distribution.sql
- 017_corporate_loyalty.sql
- 018_spa.sql
- 019_multi_property.sql
- 020_reporting.sql
- 021_rls_policies.sql

### Shared Engines And Utilities
- lib/pms/availability.ts
- lib/pms/rates.ts
- lib/pms/folio.ts
- lib/pms/audit.ts
- lib/pms/formatting.ts

### Type System
- types/database.ts baseline scaffold (replace with Supabase CLI generated output when CLI is configured)
- types/pms.ts for composed domain types

### App Shell
- Dashboard layout with grouped navigation
- Property switcher placeholder in top bar
- Shared UI primitives for table, status badge, currency input, date range

## Team-Size Duration
- Solo: 3 weeks
- 5-person: 2 weeks
- 12-person: 1 week

## Dependencies
- None.

## Acceptance Criteria
- [x] All 21 migration files exist and run clean in a fresh database.
- [x] RLS is enabled for all data-bearing tables.
- [x] Base role checks exist for every role family.
- [x] Generated database types compile with no TypeScript errors.
- [x] Dashboard shell supports module-group navigation and property context placeholder.
- [x] Shared UI primitives are reusable and used in at least one screen.
- [x] Payment abstraction exists for multi-gateway support (Stripe and Paystack).

## Agent Tracking
- Status: Completed
- Owner:
- Start Date: 2026-04-02
- Target Date: 2026-04-02
- Blockers:
