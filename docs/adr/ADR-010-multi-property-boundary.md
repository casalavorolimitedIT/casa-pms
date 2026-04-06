# ADR-010 Multi-Property Boundary and Scope Model

- Status: Accepted
- Date: 2026-04-05
- Deciders: PMS Platform Team
- Milestone: M10 Multi-Property Operations

## Context

Casa PMS supports organizations with multiple properties and users operating across different subsets of those properties. M10 introduces chain-level reservations, chain reporting, shared rate plans, and cross-property guest identity links.

Without a strict boundary model, chain-level pages can accidentally query all organization properties regardless of active scope or user assignment, causing data exposure risk and inconsistent UX.

## Decision

1. Property scope source of truth is role-aware and user-specific.
2. Active property must always resolve from the user-scoped property set.
3. Chain-level modules may span multiple properties, but only inside the scoped property set and permission checks.
4. Cross-property guest links are canonicalized by guest pair and prevented from self-linking.
5. M10 persistence objects (chain rate plans/assignments/overrides and cross-property links) must have explicit RLS policies.

## Consequences

Positive:
- Dashboard behavior aligns with property switcher scope.
- Chain modules can operate across properties safely.
- Guest identity linking is stable and deduplicated.
- RLS protections are explicit on M10 tables.

Trade-offs:
- Slightly more server-side permission filtering in context loaders.
- Additional migration and integration test maintenance.

## Implementation References

- Property scope helper: lib/pms/property-scope.ts
- Active property resolver: lib/pms/property-context.ts
- Property switcher data: app/dashboard/actions/property-switcher-data.ts
- Central reservations context/actions: app/dashboard/central-reservations/actions/central-res-actions.ts
- Chain rates context/actions: app/dashboard/rates/chain/actions/chain-rate-actions.ts
- Chain reports query/page: lib/pms/reports/chain.ts, app/dashboard/chain-reports/page.tsx
- Guest identity helper and detail view: lib/pms/guest-identity.ts, app/dashboard/guests/actions/guest-actions.ts, app/dashboard/guests/[id]/page.tsx
- RLS migration: supabase/migrations/066_m10_multi_property_rls_and_links.sql
