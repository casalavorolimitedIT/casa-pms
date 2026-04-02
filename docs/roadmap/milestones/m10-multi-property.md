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
- [ ] Property switcher updates query scope everywhere in dashboard.
- [ ] Guest profile linkage across properties is queryable and stable.
- [ ] Central reservations can book and transfer across properties.
- [ ] Shared chain rates push correctly with override support.
- [ ] RLS tests confirm no cross-property data leakage.
- [ ] ADR, runbook, and data dictionary artifacts are present and up to date.

## Agent Tracking
- Status: Planned
- Owner:
- Start Date:
- Target Date:
- Blockers:
