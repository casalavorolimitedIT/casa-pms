# M01 Core PMS: Rooms, Guests, Reservations

## Mission
Deliver the core booking engine of the PMS: inventory, guests, and reservation lifecycle.

## Detailed Build Scope

### Module 1: Room Management
Route group: app/dashboard/rooms/

Pages and actions:
- page.tsx for room list with floor grouping and status badges
- [id]/page.tsx for room detail and history
- types/page.tsx for room type administration
- actions/room-actions.ts for create/update/status workflows

Components:
- components/rooms/room-grid.tsx
- components/rooms/room-status-badge.tsx
- components/rooms/room-form.tsx

### Module 2: Guest Profiles
Route group: app/dashboard/guests/

Pages and actions:
- page.tsx for search and recent guests
- [id]/page.tsx for full profile, preferences, stay history, VIP markers
- actions/guest-actions.ts for create/update/document upload/merge

Components:
- components/guests/guest-card.tsx
- components/guests/guest-search.tsx
- components/guests/vip-badge.tsx
- components/guests/preference-form.tsx

### Module 3: Reservations
Route group: app/dashboard/reservations/

Pages and actions:
- page.tsx reservation list and filters
- new/page.tsx reservation wizard
- [id]/page.tsx reservation details and timeline
- calendar/page.tsx timeline/Gantt view
- groups/page.tsx group blocks
- waitlist/page.tsx waitlist management
- actions/reservation-actions.ts for full lifecycle operations

Core engines:
- availability engine returns available inventory by date range and property
- rate engine returns nightly breakdown and total after restrictions/overrides

Components:
- components/reservations/reservation-wizard.tsx
- components/reservations/room-availability-grid.tsx
- components/reservations/rate-selector.tsx
- components/reservations/reservation-timeline.tsx
- components/reservations/reservation-status-badge.tsx

## Team-Size Duration
- Solo: 5 weeks
- 5-person: 4 weeks
- 12-person: 3 weeks

## Dependencies
- M00 complete.

## Acceptance Criteria
- [x] Rooms and room types are CRUD-capable with status transitions.
- [x] Guest profile supports search, edit, and preference persistence.
- [x] Reservation can be created, modified, cancelled, and reassigned.
- [x] Availability excludes out-of-order and already-booked rooms.
- [x] Rate calculation returns nightly breakdown plus accurate total.
- [x] media_metadata + media_audit_log schema created (migration 022).
- [x] Image compression (50% quality) runs before every Supabase Storage upload.
- [x] MediaUpload component supports file picker AND device camera capture.
- [x] Guest document upload wired to guest-documents bucket (7-year retention).

## Agent Tracking
- Status: Completed
- Owner:
- Start Date: 2026-04-02
- Target Date: 2026-04-02
- Blockers: None
