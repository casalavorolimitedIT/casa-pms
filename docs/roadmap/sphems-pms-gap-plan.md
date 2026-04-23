# SPHEMS-to-Casa PMS Gap Plan

## Scope And Method
- Reference analyzed: https://live.sphems.com/#!/pms/stay-view/11cdf8f1e1
- Because the target app is a JS-rendered Angular shell, direct page scraping exposed placeholders only.
- To get concrete coverage, I extracted module routes from `views/pms/pms.js` loaded by live.sphems.com.
- This gives reliable module-level parity planning, but not pixel-level UI parity for every screen state.

## Product Direction: SPHEMS Workflow First, No Duplicates
- Guiding principle: preserve SPHEMS mental model so staff can switch with near-zero retraining.
- Do not build parallel modules that solve the same operational job in different places.
- For each workflow, keep one canonical entry point, one canonical detail page, one canonical action path.
- When Casa already has overlapping functionality, merge into the SPHEMS-aligned module and retire duplicate routes.
- Optimize around fewer clicks, clearer defaults, and faster transitions, not more feature surfaces.

## Reference PMS Modules Discovered
From route and iframe module mapping in SPHEMS PMS bridge:
- dashboard
- stay-view
- room-view
- reservation
- reservation-data
- guests
- companies
- reports
- pos
- stores
- maintenance
- maintenance-group
- leads
- hr-module
- accounts
- pms-operations-data
- banquet
- payment-settlement
- group-stayview
- pms-all-logs

## Current Casa PMS Surface (App Router)
Primary operational areas already present:
- dashboard, front-desk, room-board, night-audit, cashier
- reservations, central-reservations, rooms, guests, folios
- housekeeping, tasks, lost-found, linen
- maintenance, work-orders, assets
- fnb, minibar, spa
- pricing, rates, channels, corporate, loyalty
- reports, chain-reports
- staff, settings, messaging, concierge, pre-arrival

## Gap Matrix (Reference -> Casa PMS)

1. dashboard -> Exists (Equivalent)
- Casa routes: /dashboard + operation summaries.
- Action: align KPI cards and drilldowns to benchmark where useful.

2. stay-view -> Partial
- Closest Casa areas: /dashboard/front-desk, /dashboard/room-board, /dashboard/reservations.
- Gap: single consolidated in-house stay workspace.

3. room-view -> Partial
- Closest Casa areas: /dashboard/rooms, /dashboard/room-board.
- Gap: one-screen room timeline/status deep operations view.

4. reservation + reservation-data -> Exists (Distributed)
- Casa has reservations flows and front-desk actions.
- Gap: data-rich reservation detail workspace parity and quick action density.

5. guests -> Exists
- Action: enrich guest timeline, stay history, and folio linkage if thinner than benchmark.

6. companies -> Partial
- Closest Casa areas: /dashboard/corporate and company folio concepts.
- Gap: dedicated company profile + ledger + contract + contact workspace.

7. reports -> Exists
- Action: map report catalog one-to-one and fill missing operational reports.

8. pos -> Partial
- Closest Casa areas: /dashboard/fnb and /dashboard/cashier.
- Gap: explicit POS module boundary with cashier/fiscal integrations.

9. stores -> Partial
- Closest Casa areas: F&B inventory/minibar/asset flows.
- Gap: central stores/stock movement workspace (GRN, transfers, consumption).

10. maintenance -> Exists
- Action: compare preventive maintenance depth and SLA views.

11. maintenance-group -> Partial
- Closest Casa areas: chain-reports, potential multi-property contexts.
- Gap: explicit group maintenance control panel.

12. leads -> Missing
- No clear leads/prospecting module exposed in dashboard routes.

13. hr-module -> Partial
- Closest Casa areas: /dashboard/staff.
- Gap: HR workflows (rosters, attendance, leave, payroll adjacencies if in scope).

14. accounts -> Partial
- Closest Casa areas: cashier/folios/corporate.
- Gap: accounting workspace, chart mapping, posting controls, reconciliation center.

15. pms-operations-data -> Missing/Unclear
- No dedicated operations analytics/raw operations data workspace.

16. banquet -> Missing
- No explicit banquet/events operations module.

17. payment-settlement -> Partial
- Closest Casa areas: cashier + payments integrations.
- Gap: settlement-specific dashboard and dispute/recon queue.

18. group-stayview -> Partial
- Closest Casa areas: central reservations + chain reports.
- Gap: cross-property live stayboard with transfer controls.

19. pms-all-logs -> Missing/Partial
- Some audit capabilities likely present, but no dedicated global logs center route.

## Canonical Workflow Mapping (Keep/Merge/Retire)

1. Live Operations Board
- Canonical module: stay-view
- Keep: /dashboard/stay-view (new)
- Merge from: /dashboard/front-desk, /dashboard/room-board
- Retire or downscope: duplicate arrival/departure boards that repeat same actions.

2. Room Operations
- Canonical module: room-view
- Keep: /dashboard/room-view (new)
- Merge from: /dashboard/rooms, /dashboard/room-board, parts of housekeeping board where room status overlaps.
- Retire or downscope: duplicate room-status grids.

3. Reservation Workspace
- Canonical module: reservation + reservation-data
- Keep: /dashboard/reservations with a single details hub
- Merge from: fragmented reservation details in front-desk and separate tabs.
- Retire or downscope: alternative reservation detail pages with same controls.

4. Guests Workspace
- Canonical module: guests
- Keep: /dashboard/guests
- Merge from: VIP, messaging snippets, and profile cards duplicated across modules.

5. Corporate/Company Workspace
- Canonical module: companies
- Keep: /dashboard/corporate (expanded to company profile + ledger + contacts + contracts)
- Merge from: company ledger fragments under folios.

6. Settlement And Cash Control
- Canonical module: payment-settlement
- Keep: /dashboard/payment-settlement (new)
- Merge from: cashier reconciliation snippets and payments admin screens.

7. POS And Stores
- Canonical modules: pos, stores
- Keep: /dashboard/pos and /dashboard/stores (new/expanded)
- Merge from: overlapping F&B inventory and minibar stock flows.

8. Engineering And Group Engineering
- Canonical modules: maintenance, maintenance-group
- Keep: /dashboard/maintenance and /dashboard/maintenance-group (new)
- Merge from: duplicated work-order trackers and preventive maintenance lists.

9. Reporting
- Canonical module: reports
- Keep: /dashboard/reports
- Merge from: KPI snapshots spread across unrelated pages.

10. Audit Logs
- Canonical module: pms-all-logs
- Keep: /dashboard/logs (new)
- Merge from: dispersed event logs and run histories.

## De-duplication Rules (Hard Constraints)
1. One workflow, one owner module.
2. No duplicated action buttons for same state transition in different modules.
3. Shared entities (guest, reservation, room, folio) open the same detail view everywhere.
4. If two pages show same table and same actions, consolidate and leave one shortcut only.
5. Keep deep links for old URLs, but redirect to canonical page.
6. Sidebar should expose canonical modules only; remove redundant siblings.
7. Every new feature must declare whether it extends an existing canonical module before any route is created.

## Seamless UX Requirements (Familiar But Easier)
1. Preserve SPHEMS naming and ordering for top workflows.
2. Keep common front-desk actions accessible in <= 2 clicks from stay-view.
3. Use consistent keyboard shortcuts for check-in, check-out, room move, post charge.
4. Keep context sticky: selected date, property, and filters persist while navigating.
5. Use progressive disclosure: basic operations first, advanced actions in drawers/modals.
6. Ensure fast transitions by prefetching canonical destination pages from nav hover/focus.

## Recommended Roadmap

## Phase 0 - Benchmark Baseline (1 week)
1. Build parity checklist per module and per critical workflow.
2. Record current Casa completion score: Exists / Partial / Missing.
3. Define acceptance metrics:
- task completion time
- clicks per core operation
- operational error rate
- first response time for front-desk tasks
4. Build Duplicate Inventory:
- route pairs that solve same job
- duplicate tables/actions/components
- owner decision: keep, merge, retire

## Phase 1 - Core Ops Parity (3-5 weeks)
Priority targets:
1. Stay View Workspace
- New route: /dashboard/stays (or /dashboard/stay-view)
- Unified in-house board, arrival/departure timeline, quick actions, assignment controls.
- Migration action: move front-desk and room-board overlapping actions here first.

2. Room View Workspace
- New route: /dashboard/room-view
- Room-centric timeline, occupancy blocks, maintenance overlays, housekeeping state.
- Migration action: remove duplicate room grids after parity validation.

3. Reservation Detail Hub Upgrade
- Consolidate reservation + reservation-data parity in one pane with tabs.
- Migration action: route all reservation deep links to one details hub.

4. Payment Settlement Center
- New route: /dashboard/payment-settlement
- Payment gateway settlement feed, mismatch queue, manual adjustment workflow.
- Migration action: deprecate duplicate reconciliation UIs in cashier/payments screens.

## Phase 2 - Finance/Inventory Expansion (3-4 weeks)
1. Accounts Workspace
- New route: /dashboard/accounts
- Posting rules, revenue buckets, reconciliation monitor, export-ready ledgers.

2. Stores Workspace
- New route: /dashboard/stores
- Stock ledger, transfers, reorder alerts, variance reporting.

3. POS Boundary Hardening
- New route: /dashboard/pos (if not already routed)
- Tight cashier and folio posting integration.

## Phase 3 - Group And Control Layers (2-3 weeks)
1. Group Stay View
- New route: /dashboard/group-stayview
- Multi-property occupancy + movement board.

2. Group Maintenance
- New route: /dashboard/maintenance-group
- SLA and backlog across properties.

3. Operations Data Center
- New route: /dashboard/operations-data
- Drillable event logs and operational KPIs.

4. All Logs Center
- New route: /dashboard/logs
- Security/audit/business event timeline with filters and export.

## Phase 4 - Optional Verticals (2-4 weeks)
1. Leads module (if sales funnel is in scope)
- New route: /dashboard/leads

2. Banquet module (if events business is in scope)
- New route: /dashboard/banquet

3. HR depth expansion
- Extend /dashboard/staff or split to /dashboard/hr

## Migration Strategy (No User Disruption)
1. Shadow mode
- Launch canonical pages behind feature flags.
- Read from same data sources as old pages.

2. Controlled cutover
- Add in-page banner on legacy routes with one-click jump to canonical page.
- Track usage and success metrics side-by-side.

3. Redirect and retire
- Convert legacy routes to 301/302 app redirects after KPI acceptance.
- Keep legacy route aliases only for bookmarks and external links.

4. Train by familiarity
- Keep SPHEMS labels and flow order in sidebar and page headings.
- Add lightweight page help modal describing old-to-new mapping.

## Implementation Notes For This Codebase (Next.js App Router)
1. Route-first delivery
- Add each new workspace as an independent App Router segment under app/dashboard.
- Keep server/client boundaries clean and localized.

2. Sidebar and permissions
- Update navigation config in components/app-sidebar.tsx.
- Introduce explicit permission keys for each new module.

3. Shared operational primitives
- Reuse card/table/filter patterns across rooms, stays, settlement, stores.
- Standardize status enums for arrivals, housekeeping, maintenance, and billing states.

4. Data contracts and APIs
- Add typed domain services under lib/pms, lib/payments, lib/reservations as needed.
- Add route handlers only when server actions are insufficient.

5. Auditability
- Implement append-only operation logs for settlement, folio edits, room moves, and maintenance closures.

## Immediate Backlog You Can Start Now
1. Build duplicate inventory document for current dashboard routes and actions.
2. Create /dashboard/stay-view as canonical live operations board.
3. Redirect overlapping front-desk and room-board actions into stay-view components.
4. Create /dashboard/room-view and wire all room status links to it.
5. Create /dashboard/payment-settlement and route reconciliation actions there.
6. Add sidebar entries for canonical modules, remove redundant duplicates.
7. Add integration tests for:
- check-in/check-out + folio consistency
- room move state transitions
- settlement mismatch resolution flow

## Risks
1. Feature parity without UX simplification can increase cognitive load.
2. Settlement/accounts modules require strict audit and reconciliation controls.
3. Group-level modules need mature property context switching and tenancy boundaries.

## Validation Checklist
1. Every module has clear owner persona and success metric.
2. Every critical workflow is <= target click count.
3. Data mutations emit audit events.
4. Permission checks are enforced both in UI and server layer.
5. Each new module has at least one integration test path.
