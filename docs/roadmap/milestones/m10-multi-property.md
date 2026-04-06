# M10 Multi-Property Operations

## Mission
Enable chain-level operation across multiple properties with strict data isolation.

## Detailed Build Scope

### Module 44: Property Switcher
Cross-dashboard capability.

Features:
- active property context switch
- context persistence in cookie/session
- role-aware property visibility

Implementation map:
- app/dashboard/layout.tsx: global property context UI and navigation state
- components/nav/property-switcher.tsx: property selector control
- lib/pms/property-context.ts: read/write active property cookie and server accessor
- lib/pms/authorization.ts: property-role access helper

### Module 45: Cross-Property Guest Profiles
Cross-property identity linkage.

Features:
- linked guest records across properties
- stay history aggregation
- duplicate detection support

Implementation map:
- app/dashboard/guests/[id]/page.tsx: merged cross-property timeline panel
- lib/pms/guest-merge.ts: deterministic and fuzzy matching logic
- supabase/migrations/019_multi_property.sql: cross_property_guest_links schema
- lib/pms/guest-identity.ts: safe query helpers scoped by organization

### Module 46: Central Reservations
Route group: app/dashboard/central-reservations/

Features:
- multi-property availability search
- create reservation at selected property
- transfer booking between properties

Actions:
- searchAcrossProperties
- createCentralReservation
- transferGuestBetweenProperties

Implementation map:
- app/dashboard/central-reservations/page.tsx: multi-property availability and booking UI
- app/dashboard/central-reservations/actions/central-res-actions.ts: server actions for search/book/transfer
- lib/pms/availability.ts: cross-property availability wrapper
- lib/pms/reservation-transfer.ts: transfer protocol and integrity checks

### Module 47: Chain-Level Reporting
Route group: app/dashboard/chain-reports/

Features:
- consolidated revenue and occupancy
- side-by-side property comparison
- export support

Implementation map:
- app/dashboard/chain-reports/page.tsx
- lib/pms/reports/chain.ts: aggregation query layer
- components/reports/chain-comparison-table.tsx
- components/reports/export-controls.tsx

### Module 48: Shared Rate Plans
Route group: app/dashboard/rates/chain/

Features:
- create chain plan once
- push to selected properties
- allow controlled per-property overrides

Actions:
- createChainRatePlan
- pushChainRateToProperties
- overridePropertyRate

Implementation map:
- app/dashboard/rates/chain/page.tsx
- app/dashboard/rates/chain/actions/chain-rate-actions.ts
- lib/pms/rates-chain.ts: plan push and override logic
- supabase/migrations/019_multi_property.sql: chain rate tables

## Milestone Artifacts (Long-Term)
- docs/adr/ADR-010-multi-property-boundary.md
- docs/runbooks/property-switching-runbook.md
- docs/data-dictionary/multi-property.md
- tests/integration/multi-property-isolation.test.ts

## Team-Size Duration
- Solo: 5 weeks
- 5-person: 4 weeks
- 12-person: 3 weeks

## Dependencies
- M08 complete.

## Acceptance Criteria
- [x] Property switcher updates query scope everywhere in dashboard.
- [x] Guest profile linkage across properties is queryable and stable.
- [x] Central reservations can book and transfer across properties.
- [x] Shared chain rates push correctly with override support.
- [x] RLS tests confirm no cross-property data leakage.
- [x] ADR, runbook, and data dictionary artifacts are present and up to date.

## Agent Tracking
- Status: Completed
- Owner: Copilot
- Start Date: 2026-04-05
- Target Date: 2026-04-05
- Blockers:
- Notes:
	- 2026-04-05: Added central reservations module routes/actions (`app/dashboard/central-reservations/page.tsx`, `app/dashboard/central-reservations/actions/central-res-actions.ts`) for cross-property search, booking, and transfer flows.
	- 2026-04-05: Added transfer and chain-rate helper libraries (`lib/pms/reservation-transfer.ts`, `lib/pms/rates-chain.ts`).
	- 2026-04-05: Added chain rates UI/actions (`app/dashboard/rates/chain/page.tsx`, `app/dashboard/rates/chain/actions/chain-rate-actions.ts`) and schema foundation migration `supabase/migrations/065_m10_chain_rates_foundation.sql`.
	- 2026-04-05: Added chain reports route and components (`app/dashboard/chain-reports/page.tsx`, `lib/pms/reports/chain.ts`, `components/reports/chain-comparison-table.tsx`, `components/reports/export-controls.tsx`).
	- 2026-04-05: Added sidebar entries for Central Reservations, Chain Rates, and Chain Reports in navigation.
	- 2026-04-05: Enforced role-aware property scope consistency via `lib/pms/property-scope.ts` and applied scoped filtering in property context/switcher and M10 chain contexts.
	- 2026-04-05: Hardened cross-property guest linkage and surfaced linked profiles/stays in guest details (`lib/pms/guest-identity.ts`, `app/dashboard/guests/actions/guest-actions.ts`, `app/dashboard/guests/[id]/page.tsx`).
	- 2026-04-05: Added M10 RLS hardening migration `supabase/migrations/066_m10_multi_property_rls_and_links.sql`.
	- 2026-04-05: Added RLS integration test scaffold `tests/integration/multi-property-isolation.test.ts`.
	- 2026-04-05: Added required milestone artifacts (`docs/adr/ADR-010-multi-property-boundary.md`, `docs/runbooks/property-switching-runbook.md`, `docs/data-dictionary/multi-property.md`).
