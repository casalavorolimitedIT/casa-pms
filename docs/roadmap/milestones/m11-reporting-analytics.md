# M11 Reporting and Analytics

## Mission
Deliver decision-grade reporting with traceable metrics and export paths.

## Detailed Build Scope

### Module 49: Daily Revenue Report
Route group: app/dashboard/reports/revenue/

Features:
- daily revenue by source and department
- comparison against prior periods
- forward booked revenue view

Implementation map:
- app/dashboard/reports/revenue/page.tsx
- lib/pms/reports/revenue.ts
- components/reports/revenue-breakdown-chart.tsx

### Module 50: Occupancy, ADR, RevPAR
Route group: app/dashboard/reports/kpis/

Features:
- KPI trends by day/week/month
- property and room-type breakdowns
- comparatives over date windows

Implementation map:
- app/dashboard/reports/kpis/page.tsx
- lib/pms/reports/kpis.ts
- components/reports/kpi-cards.tsx
- components/reports/kpi-trend-chart.tsx

### Module 51: Accounts Receivable
Route group: app/dashboard/reports/ar/

Features:
- invoice and folio outstanding balances
- aging buckets
- payment posting handoff

Implementation map:
- app/dashboard/reports/ar/page.tsx
- lib/pms/reports/ar-aging.ts
- components/reports/ar-aging-table.tsx

### Module 52: Housekeeping Report
Route group: app/dashboard/reports/housekeeping/

Features:
- rooms cleaned by attendant
- turnover times
- pending room workload

Implementation map:
- app/dashboard/reports/housekeeping/page.tsx
- lib/pms/reports/housekeeping.ts
- components/reports/housekeeping-productivity-table.tsx

### Module 53: Pace Report
Route group: app/dashboard/reports/pace/

Features:
- pickup and pacing vs prior period
- forecast occupancy trend view

Implementation map:
- app/dashboard/reports/pace/page.tsx
- lib/pms/reports/pace.ts
- components/reports/pace-curve-chart.tsx

### Module 54: Market Segmentation
Route group: app/dashboard/reports/segmentation/

Features:
- revenue share by direct, OTA, corporate, walk-in, group, agent
- filter by date, property, and room type
- walk-in reporting includes the timestamp a receptionist booked the walk-in guest, with receptionist attribution where available

Implementation map:
- app/dashboard/reports/segmentation/page.tsx
- lib/pms/reports/segmentation.ts
- components/reports/segmentation-chart.tsx

## Milestone Artifacts (Long-Term)
- docs/data-dictionary/reporting-metrics.md
- docs/runbooks/report-reconciliation-runbook.md
- docs/adr/ADR-011-reporting-definitions.md
- tests/integration/reporting-reconciliation.test.ts

## Team-Size Duration
- Solo: 6 weeks
- 5-person: 4 weeks
- 12-person: 3 weeks

## Dependencies
- M03 complete.
- M08 complete.

## Acceptance Criteria
- [ ] Daily revenue reconciles with audit and folio totals.
- [ ] KPI metrics are reproducible from source data.
- [ ] AR report supports aging and payment linkage.
- [ ] Pace/segmentation reports support full filtering needs.
- [ ] Walk-in analytics can show when a receptionist booked a walk-in guest for operational and conversion analysis.
- [ ] CSV and PDF export works for all top-level report pages.
- [ ] Reporting dictionary and reconciliation runbook are present and versioned.

## Agent Tracking
- Status: Planned
- Owner:
- Start Date:
- Target Date:
- Blockers:
