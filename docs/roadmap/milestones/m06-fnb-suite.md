# M06 Food and Beverage Suite

## Mission
Integrate F and B operations end-to-end: order capture, kitchen execution, posting, and stock control.

## Detailed Build Scope

### Module 22: Menu Management
Route group: app/dashboard/fnb/menus/

Features:
- outlet-based menus
- item categories and modifiers
- per-outlet and time-window pricing

Actions:
- createOutlet
- createMenuCategory
- createMenuItem
- updateMenuItemPrice

### Module 23: QR Ordering
Route groups:
- app/dashboard/fnb/qr/
- app/(guest)/order/[qrCode]/

Features:
- QR generation by room and table
- guest order flow from mobile
- handoff to kitchen and folio posting path

Actions:
- submitGuestOrder
- confirmOrder
- postOrderToFolio

### Module 24: Kitchen Display System
Route group: app/dashboard/fnb/kitchen/

Features:
- real-time ticket queue
- item-ready and complete transitions
- kitchen-first full-screen workflow

Actions:
- markItemReady
- markTicketComplete
- bumpTicket

### Module 25: Table Management
Route group: app/dashboard/fnb/tables/

Features:
- floor plan editing
- table status lifecycle
- reservation and walk-in queue support

Actions:
- updateTableStatus
- createTableReservation
- seatWalkIn

### Module 26: POS Integration
Route group: app/dashboard/fnb/pos/
API route: app/api/pos-webhook/route.ts

Features:
- third-party charge intake via signed webhook
- category mapping to folio posting
- manual fallback posting path

### Module 27: Inventory and Stockroom
Route group: app/dashboard/fnb/inventory/

Features:
- item-level stock tracking
- low-stock alerts
- purchase order and receiving flow

Actions:
- adjustStock
- createPurchaseOrder
- receivePurchaseOrder
- generateLowStockAlert

## Team-Size Duration
- Solo: 8 weeks
- 5-person: 6 weeks
- 12-person: 4 weeks

## Dependencies
- M02 complete.

## Acceptance Criteria
- [ ] Menu model supports categories, modifiers, and outlet pricing.
- [ ] QR orders reliably reach kitchen queue and status pipeline.
- [ ] Completed kitchen tickets can trigger folio posting.
- [ ] POS webhook validates signature before posting.
- [ ] Inventory movements are auditable and alerting is functional.

## Agent Tracking
- Status: Planned
- Owner:
- Start Date:
- Target Date:
- Blockers:
