# Property Switching Runbook

## Purpose

Validate and operate role-aware property scoping across dashboard and chain-level modules.

## Preconditions

1. User is authenticated.
2. User profile has an organization.
3. User has one or more rows in pms.user_property_roles (or org-fallback access where applicable).
4. Migrations through 066 are applied.

## Normal Operation Checks

1. Open dashboard and verify property switcher only shows scoped properties.
2. Switch active property and confirm page data refreshes in module views.
3. Navigate to central reservations and confirm:
- Search spans only properties user can view.
- Create/transfer targets only include properties user can create reservations in.
4. Navigate to chain rates and confirm only rates-manage properties appear in assignments/room types.
5. Navigate to chain reports and confirm only reports-view properties are aggregated.

## Guest Linkage Checks

1. Open a guest profile.
2. Confirm Cross-Property Identity card renders:
- Linked profiles
- Recent linked stays
- Active link count
3. Confirm no duplicate reciprocal links for the same guest pair.

## Failure Modes and Responses

- Symptom: Active property cookie points to an inaccessible property.
  Response: The resolver falls back to the first scoped property. Re-check user_property_roles rows.

- Symptom: Chain page shows empty data unexpectedly.
  Response: Verify permission grants for required keys on scoped properties:
  - reservations.view/reservations.create/reservations.update
  - rates.manage
  - reports.view

- Symptom: Linked guest data missing.
  Response: Verify cross_property_guest_links rows and that linked guests belong to the same organization.

## SQL Quick Checks

```sql
-- Scoped properties for current user
select upr.user_id, upr.property_id, upr.role
from pms.user_property_roles upr
where upr.user_id = auth.uid();

-- Canonicalized cross-property links
select organization_id, source_guest_id, linked_guest_id, created_at
from pms.cross_property_guest_links
order by created_at desc;

-- M10 chain rates objects
select id, organization_id, name, is_active from pms.chain_rate_plans;
select id, chain_rate_plan_id, property_id from pms.chain_rate_plan_assignments;
select id, assignment_id, room_type_id, date_from, date_to from pms.chain_rate_plan_overrides;
```

## Rollback Notes

If scoping regressions are detected, do not disable RLS. Instead:
1. Re-check user_property_roles seeding.
2. Re-check permission grants.
3. Patch context loaders to include scoped property filters.
