# M03 Live Operations, Arrivals/Departures, Night Audit

## Mission
Provide real-time day-of-stay control and close-of-day financial integrity.

## Detailed Build Scope

### Module 7: Room Board (Live)
Route group: app/dashboard/room-board/

Features:
- real-time room grid with reservation bars
- drag reassignment support
- color state legend
- quick detail drawer

Components:
- components/room-board/board-grid.tsx
- components/room-board/reservation-bar.tsx
- components/room-board/board-legend.tsx

### Module 8: Arrivals and Departures
Route group: app/dashboard/arrivals-departures/

Features:
- arrivals list
- departures list
- in-house list
- quick operations for pre-check-in and no-show marking

### Module 9: Night Audit
Route group: app/dashboard/night-audit/

Features:
- run wizard for close-of-day flow
- post room charges
- run discrepancy detection
- produce daily revenue outputs

Core action set:
- runNightAudit
- postRoomCharges
- runNoShowLogic
- generateAuditReport

### Module 10: Cash Drawer / Shift
Route group: app/dashboard/cashier/

Features:
- open shift
- live transaction register
- close shift with expected vs actual and variance

## Team-Size Duration
- Solo: 4 weeks
- 5-person: 3 weeks
- 12-person: 2 weeks

## Dependencies
- M02 complete.

## Acceptance Criteria
- [ ] Room board updates without page refresh on key events.
- [ ] Arrivals/departures supports operational triage in one screen.
- [ ] Night audit posts charges and flags discrepancies.
- [ ] Daily revenue snapshots are produced and queryable.
- [ ] Cash shift close outputs variance and closure record.

## Agent Tracking
- Status: Planned
- Owner:
- Start Date:
- Target Date:
- Blockers:
