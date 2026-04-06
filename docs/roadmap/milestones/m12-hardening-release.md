# M12 Hardening, QA, Security, Release

## Mission
Prepare the system for production reliability with performance tuning, security verification, and release controls.

## Detailed Build Scope

### Performance Workstream
- index high-frequency query paths
- benchmark availability and reservation search calls
- optimize expensive joins and report queries
- enforce pagination on all large lists

Implementation map:
- supabase/migrations/022_performance_indexes.sql
- lib/pms/perf/query-benchmarks.ts
- scripts/benchmarks/run-benchmarks.ts
- docs/performance/perf-baseline.md

### Security Workstream
- enforce authorization checks on all write operations
- audit and close RLS gaps
- validate webhook signatures across Stripe, Paystack, channel, and messaging paths
- verify sensitive field handling and access boundaries

Implementation map:
- lib/pms/authorization.ts
- lib/security/webhook-signature.ts
- scripts/security/rls-audit.ts
- docs/security/authorization-matrix.md
- docs/security/payment-webhook-validation.md

### Quality Workstream
- unit tests for core engines (availability, rates, folio, audit, loyalty, pricing)
- integration tests for critical paths (reservation to checkout, night audit, payment callbacks)
- regression set for major operations views

Implementation map:
- tests/unit/pms/*.test.ts
- tests/integration/reservation-lifecycle.test.ts
- tests/integration/night-audit.test.ts
- tests/integration/payment-gateway-routing.test.ts
- tests/integration/paystack-callback-verification.test.ts
- docs/testing/test-strategy.md

### Release Workstream
- production checklist and go-live sign-off
- rollback and incident response plan
- baseline monitoring and alert routing
- seed/demo data and smoke-test script for deployment validation

Implementation map:
- docs/release/go-live-checklist.md
- docs/runbooks/incident-response.md
- docs/runbooks/rollback-runbook.md
- scripts/release/smoke-test.ts

## Milestone Artifacts (Long-Term)
- docs/roadmap/ten-year-maintainability.md
- docs/adr/ADR-012-release-and-operability.md
- docs/operations/service-ownership.md

## Team-Size Duration
- Solo: 4 weeks
- 5-person: 3 weeks
- 12-person: 2 weeks

## Dependencies
- M00 through M11 complete.

## Acceptance Criteria
- [x] High-traffic queries are indexed and benchmarked.
- [x] All write paths enforce authorization.
- [x] RLS audit passes for all tables in scope.
- [x] Critical integration tests pass on CI.
- [x] Release checklist is signed off with rollback plan validated.
- [x] Ten-year maintainability standards are adopted and linked in roadmap index.
- [x] Stripe and Paystack webhook signature validation is tested and enforced.

## Agent Tracking
- Status: Complete
- Owner:
- Start Date:
- Target Date:
- Blockers:

## Implementation Notes

### Performance
- `supabase/migrations/069_performance_indexes.sql` — 14 composite indexes on `reservations`, `rooms`, `folios`, `folio_charges`, `folio_payments`, `guests`, `user_property_roles`, `housekeeping_assignments`, `reservation_rooms`, `room_rates`
- `lib/pms/perf/query-benchmarks.ts` — benchmark case definitions for 7 hot query paths
- `scripts/benchmarks/run-benchmarks.ts` — timing script with median/P95 reporting; exits non-zero on threshold breach (median > 100ms or P95 > 300ms)
- Run: `npm run benchmark`

### Security
- `lib/security/webhook-signature.ts` — added `verifyStripeSignature()` (HMAC-SHA256 with timestamp tolerance) and `verifyPaystackSignature()` named exports alongside the existing generic HMAC helpers
- `app/api/paystack/webhook/route.ts` — refactored to use the shared `verifyPaystackSignature()` instead of an inline function
- `scripts/security/rls-audit.ts` — queries `pg_tables` + `pg_policies`; exits non-zero if any pms table lacks RLS or has no policies
- Run: `npm run security:rls-audit`
- Docs: `docs/security/authorization-matrix.md`, `docs/security/payment-webhook-validation.md`

### Quality
- **Unit tests** (no DB required): 45 tests across 3 files in `tests/unit/pms/`
  - `authorization.test.ts` — all 9 roles × positive/negative coverage
  - `folio.test.ts` — `calculateFolioBalance()` edge cases
  - `webhook-signature.test.ts` — Stripe + Paystack + generic HMAC verifiers
- **Integration tests** (requires `.env.local` + test accounts): `tests/integration/`
  - `reservation-lifecycle.test.ts` — read/status/scope isolation
  - `night-audit.test.ts` — checked-in queries; data integrity; idempotency
  - `payment-gateway-routing.test.ts` — folio payments; orphan checks; scope isolation
  - `paystack-callback-verification.test.ts` — 7 self-contained signature tests (no DB)
  - `reporting-reconciliation.test.ts` — charge integrity; date-filter subset invariant
- Run: `npm run test:unit` / `npm run test:integration` / `npm run test`
- Docs: `docs/testing/test-strategy.md`

### Release
- `scripts/release/smoke-test.ts` — validates env vars, connectivity, 6 key table row counts, auth sign-in, anon RLS boundary
- Run: `npm run smoke-test`
- Docs: `docs/release/go-live-checklist.md`, `docs/runbooks/rollback-runbook.md`, `docs/runbooks/incident-response.md`

### Long-Term
- `docs/adr/ADR-012-release-and-operability.md`
- `docs/operations/service-ownership.md`
- `docs/roadmap/ten-year-maintainability.md` (existing, incorporated)
