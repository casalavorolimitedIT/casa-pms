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
- [ ] Booking validates therapist and room capacity before confirmation.
- [ ] Scheduling supports shift edits and qualification constraints.
- [ ] Spa billing can settle to hotel folio or standalone path.
- [ ] Membership/package usage and expiry are enforced correctly.
- [ ] Spa events are visible in guest financial and service timeline.

## Agent Tracking
- Status: Planned
- Owner:
- Start Date:
- Target Date:
- Blockers:
