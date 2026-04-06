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
- [x] Menu model supports categories, modifiers, and outlet pricing.
- [x] QR orders reliably reach kitchen queue and status pipeline.
- [x] Completed kitchen tickets can trigger folio posting.
- [x] POS webhook validates signature before posting.
- [x] Inventory movements are auditable and alerting is functional.

## Agent Tracking
- Status: Complete
- Owner: Copilot
- Start Date: 2026-04-05
- Target Date:
- Blockers:
- Notes:
	- 2026-04-05: Added menu-management schema (`menu_categories`, `menu_items`, `menu_item_modifiers`, `outlet_menu_item_prices`) with RLS in `supabase/migrations/057_m06_menu_management.sql`.
	- 2026-04-05: Added Module 22 actions in `app/dashboard/fnb/menus/actions.ts` (`createOutlet`, `createMenuCategory`, `createMenuItem`, `createModifier`, `updateMenuItemPrice`).
	- 2026-04-05: Added Module 22 UI route `app/dashboard/fnb/menus/page.tsx` and sidebar navigation entry under Operations.
	- 2026-04-05: Added QR + kitchen schema pipeline (`order_qr_codes`, `order_items`, order status columns) in `supabase/migrations/058_m06_qr_kitchen_pipeline.sql`.
	- 2026-04-05: Added Module 23/24 actions in `app/dashboard/fnb/actions.ts` (`submitGuestOrder`, `confirmOrder`, `markItemReady`, `bumpTicket`, `markTicketComplete`, `postOrderToFolio`).
	- 2026-04-05: Added routes `app/dashboard/fnb/qr/page.tsx`, `app/dashboard/fnb/kitchen/page.tsx`, and guest ordering page `app/(guest)/order/[qrCode]/page.tsx`.
	- 2026-04-05: Added POS webhook signature utility (`lib/security/webhook-signature.ts`) and signed endpoint (`app/api/pos-webhook/route.ts`) with idempotency/audit table (`supabase/migrations/059_m06_pos_webhook_events.sql`).
	- 2026-04-05: Added inventory/stockroom schema (`inventory_items`, `inventory_movements`, `purchase_orders`, `purchase_order_lines`, `inventory_alerts`) in `supabase/migrations/060_m06_inventory_stockroom.sql`.
	- 2026-04-05: Added inventory actions (`adjustStock`, `createPurchaseOrder`, `receivePurchaseOrder`, `generateLowStockAlert`) and route UI `app/dashboard/fnb/inventory/page.tsx`.
