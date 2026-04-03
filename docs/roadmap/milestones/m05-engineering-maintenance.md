# M05 Engineering and Maintenance

## Mission
Deliver maintenance execution and asset control to protect room availability and service quality.

## Detailed Build Scope

### Module 18: Work Orders
Route group: app/dashboard/work-orders/

Features:
- create and categorize work orders
- assign to engineering staff
- track lifecycle and resolution time
- optionally link to room blocking

Actions:
- createWorkOrder
- assignWorkOrder
- updateWorkOrderStatus
- resolveWorkOrder

### Module 19: Preventive Maintenance
Route group: app/dashboard/maintenance/

Features:
- recurring schedules by room, equipment, or system
- due and overdue queues
- completion logs and recurrence regeneration

Actions:
- createSchedule
- logMaintenanceCompleted
- createRecurringInstances

### Module 20: Out-of-Order Rooms
Integrated with rooms and work orders.

Features:
- OOO period creation and release
- automatic inventory blocking in availability engine
- optional auto-release tied to work order resolution

Actions:
- markRoomOutOfOrder
- releaseRoomFromOOR

### Module 21: Asset Register
Route group: app/dashboard/assets/

Features:
- asset registry by category and location
- warranty tracking
- service history timeline

Actions:
- createAsset
- logServiceEvent
- updateWarranty

## Team-Size Duration
- Solo: 4 weeks
- 5-person: 3 weeks
- 12-person: 2 weeks

## Dependencies
- M02 complete.

## Acceptance Criteria
- [x] Work-order lifecycle works from creation to close with ownership trail.
- [ ] Preventive schedule recurrence creates actionable future items.
- [ ] OOO periods block sellable inventory immediately.
- [ ] OOO release restores inventory and audit trace remains intact.
- [ ] Asset register supports warranty and service audit history.

## Agent Tracking
- Status: In Progress
- Owner: Copilot
- Start Date: 2026-04-03
- Target Date:
- Blockers:
