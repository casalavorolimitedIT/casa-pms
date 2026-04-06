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
- [x] Preventive schedule recurrence creates actionable future items.
- [x] OOO periods block sellable inventory immediately.
- [x] OOO release restores inventory and audit trace remains intact.
- [x] Asset register supports warranty and service audit history.

## Agent Tracking
- Status: Complete
- Owner: Copilot
- Start Date: 2026-04-03
- Target Date:
- Blockers:
- Notes:
	- 2026-04-05: Added `pms.asset_service_events` migration with indexes and RLS (`supabase/migrations/055_m05_asset_service_history.sql`).
	- 2026-04-05: Added `logServiceEvent` server action and asset detail UI for logging + timeline audit trail (`app/dashboard/assets/actions.ts`, `app/dashboard/assets/[id]/page.tsx`).
	- 2026-04-05: Added preventive maintenance schema (`pms.maintenance_schedules`, `pms.maintenance_schedule_instances`) with RLS (`supabase/migrations/056_m05_preventive_maintenance.sql`).
	- 2026-04-05: Added maintenance actions (`createSchedule`, `createRecurringInstances`, `logMaintenanceCompleted`) and route UI at `app/dashboard/maintenance/page.tsx`.
	- OOO block flow: creating a work order with room blocking writes `out_of_order_periods` and sets room status to `out_of_order`.
	- OOO release flow: resolving with release updates `out_of_order_periods.released_at/released_by`, sets room status to `inspection`, and writes `room_status_log` for traceability.
