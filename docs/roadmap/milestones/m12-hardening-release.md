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
- [ ] High-traffic queries are indexed and benchmarked.
- [ ] All write paths enforce authorization.
- [ ] RLS audit passes for all tables in scope.
- [ ] Critical integration tests pass on CI.
- [ ] Release checklist is signed off with rollback plan validated.
- [ ] Ten-year maintainability standards are adopted and linked in roadmap index.
- [ ] Stripe and Paystack webhook signature validation is tested and enforced.

## Agent Tracking
- Status: Planned
- Owner:
- Start Date:
- Target Date:
- Blockers:
