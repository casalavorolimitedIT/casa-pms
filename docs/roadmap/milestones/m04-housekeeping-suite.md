# M04 Housekeeping Suite

## Mission
Deliver all room-readiness and guest-service execution tools for daily operations.

## Detailed Build Scope

### Module 11: Housekeeping Board
Route group: app/dashboard/housekeeping/

Features:
- room status matrix (clean, dirty, inspecting, OOO)
- attendant assignments and priority indicators
- realtime sync for assignment and status updates

### Module 12: Task Management
Route group: app/dashboard/tasks/

Features:
- Kanban workflow (to do, in progress, done)
- task linkage to room and reservation
- role-based assignment and closure

### Module 13: Lost and Found
Route group: app/dashboard/lost-found/

Features:
- found-item logging and claims workflow
- image attachment support
- lookup by room and date range

### Module 14: Linen Tracking
Route group: app/dashboard/linen/

Features:
- sent/returned/damaged transaction log
- per-room-type stock view
- outstanding reconciliation

### Module 15: Minibar Tracking
Route group: app/dashboard/minibar/

Features:
- per-room minibar state
- consumption posting
- automatic folio charge handoff on checkout

### Module 16: Wake-up Calls
Route group: app/dashboard/front-desk/wake-up-calls/

Features:
- schedule, execute, and close wake-up requests
- visible queue for due calls

### Module 17: Do Not Disturb Log
Cross-cutting feature in room board and housekeeping views.

Features:
- per-room DND state and timeline
- alerting when service windows are at risk

## Team-Size Duration
- Solo: 5 weeks
- 5-person: 4 weeks
- 12-person: 3 weeks

## Dependencies
- M02 complete.

## Acceptance Criteria
- [x] Housekeeping board supports assignment and status updates with audit trail.
- [x] Task board supports complete lifecycle and links to room context.
- [x] Linen/minibar workflows are persisted and financially reconcilable.
- [x] Lost-and-found supports image-backed claims process.
- [x] Wake-up and DND states are visible to operations in real time.

## Agent Tracking
- Status: Complete
- Owner: Copilot
- Start Date: 2026-04-03
- Completed Date: 2026-04-03
- Blockers:
