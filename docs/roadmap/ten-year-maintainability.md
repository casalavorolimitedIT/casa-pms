# Ten-Year Maintainability Standard

This document defines the minimum documentation and structure required so the codebase remains understandable over long periods.

## 1) Mandatory Documentation Set
- docs/adr/: architecture decision records for every irreversible or high-impact decision.
- docs/data-dictionary/: table-level and field-level definitions for each domain.
- docs/runbooks/: operational runbooks for incidents, reconciliations, and critical workflows.
- docs/security/: authorization matrix and security boundaries.
- docs/release/: go-live, rollback, and smoke-test procedures.

## 2) ADR Rules
- Every major technical decision must have one ADR file.
- ADR filename format: ADR-XXX-short-title.md.
- Each ADR includes: context, options considered, decision, tradeoffs, rollback strategy.
- Superseded ADRs must link to replacement ADR.

## 3) File and Naming Conventions
- Route handlers live under app/ with clear domain grouping.
- Server actions live in actions/ folders adjacent to route groups.
- Domain logic lives under lib/pms/ and must not be mixed with UI concerns.
- Every non-trivial module has a single entry helper and explicit types.

## 4) Data Model Clarity
- Each migration must include rationale comments for non-obvious columns.
- New tables require a matching section in docs/data-dictionary/.
- Every cross-property or cross-module relation must document ownership and cascade behavior.

## 5) Testing Baseline
- Unit tests for all pricing, availability, folio, and audit engines.
- Integration tests for reservation lifecycle, check-in/out, and night audit.
- Regression tests for previously fixed severe bugs.
- CI must block merge on failing critical-path tests.

## 6) Observability and Operations
- Every critical workflow emits structured logs with correlation IDs.
- Incidents update docs/runbooks/incident-response.md with lessons learned.
- Monitoring alerts must map to runbook actions.

## 7) Readability Contract
- Functions should be short and single-purpose where possible.
- Complex business logic requires succinct context comments.
- Public helpers must include examples or usage notes.
- Avoid hidden magic values; centralize domain constants.

## 8) Backward Compatibility Rules
- Breaking changes to APIs, schemas, or contracts require ADR and migration plan.
- Deprecations should include target removal date and replacement path.
- Version integration payloads where external systems are involved.

## 9) Payment Gateway Standards
- Payment integrations must use a gateway adapter layer under lib/payments/.
- Currency routing rules must be explicit and documented (NGN default route is Paystack).
- Webhook verification is mandatory before state changes.
- Payment event IDs must be stored for idempotency and replay protection.
- Fallback behavior (gateway outage, callback timeout) must be documented in runbooks.

## 10) Contributor Checklist (Per Milestone)
- Update milestone file status and blockers.
- Update ADR if architecture changed.
- Update data dictionary for schema changes.
- Update runbook if operational behavior changed.
- Add or update tests for changed behavior.

## 11) Annual Maintenance Ritual
- Re-run architecture review for active modules.
- Archive stale docs and mark superseded decisions.
- Refresh risk register and dependency versions.
- Re-verify RLS and authorization matrix against current roles.
