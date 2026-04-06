# M09 Spa and Wellness

## Mission
Run spa operations as a first-class business line with scheduling and billing control.

## Detailed Build Scope

### Module 40: Spa Booking
Route group: app/dashboard/spa/bookings/

Features:
- service, therapist, room, and time selection
- dual availability check (therapist plus room)
- booking confirmation and change flow

### Module 41: Therapist Scheduling
Route group: app/dashboard/spa/therapists/

Features:
- shift and availability planning
- treatment qualification assignment
- daily/weekly schedule visibility

Actions:
- createSpaBooking
- assignTherapist
- updateTherapistSchedule

### Module 42: Spa Folio
Integrated billing behavior.

Features:
- post to hotel folio or settle as spa-only folio
- property-level billing mode configuration

Actions:
- postSpaCharge
- settleSpaSeparately
- transferSpaToHotelFolio

### Module 43: Memberships and Packages
Route group: app/dashboard/spa/memberships/

Features:
- package sales and entitlement usage
- membership validity and renewal
- expiry and balance controls

Actions:
- sellMembership
- usePackageAllowance
- renewMembership
- expireMembership

## Team-Size Duration
- Solo: 7 weeks
- 5-person: 5 weeks
- 12-person: 3 weeks

## Dependencies
- M02 complete.

## Acceptance Criteria
- [x] Booking validates therapist and room capacity before confirmation.
- [x] Scheduling supports shift edits and qualification constraints.
- [x] Spa billing can settle to hotel folio or standalone path.
- [x] Membership/package usage and expiry are enforced correctly.
- [x] Spa events are visible in guest financial and service timeline.

## Agent Tracking
- Status: Complete
- Owner: Copilot
- Start Date: 2026-04-05
- Target Date:
- Blockers:
- Notes:
	- 2026-04-05: Added spa schema foundation and RLS (`spa_services`, `spa_treatment_rooms`, `spa_therapists`, `spa_therapist_qualifications`, `spa_therapist_shifts`, `spa_bookings`, `spa_settlements`, `spa_memberships`, `spa_membership_usage`) in `supabase/migrations/063_m09_spa_wellness.sql`.
	- 2026-04-05: Added spa server actions for booking validation, therapist scheduling, folio posting/standalone settlement, and membership lifecycle at `app/dashboard/spa/actions.ts`.
	- 2026-04-05: Added spa route UIs at `app/dashboard/spa/bookings/page.tsx`, `app/dashboard/spa/therapists/page.tsx`, and `app/dashboard/spa/memberships/page.tsx`.
	- 2026-04-05: Added sidebar + tooltip entries for Spa modules under Operations Service.
	- 2026-04-05: Added guest-level Spa Service Timeline and Financial Timeline visibility in `app/dashboard/guests/[id]/page.tsx` with data aggregation in `app/dashboard/guests/actions/guest-actions.ts`.
