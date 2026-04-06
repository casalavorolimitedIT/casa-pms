# Authorization Matrix

This document maps every PMS role to the permissions it holds and the application operations those permissions unlock.

## Role → Permission Mapping

| Role | Permissions |
|------|-------------|
| `super_admin` | `*` (all permissions) |
| `property_manager` | `reservations.manage`, `rooms.manage`, `reports.view` |
| `front_desk` | `reservations.manage`, `checkin.manage`, `folios.manage` |
| `housekeeping` | `housekeeping.manage`, `rooms.status.update` |
| `engineering` | `maintenance.manage`, `workorders.manage` |
| `fnb_manager` | `fnb.manage`, `inventory.manage` |
| `spa_manager` | `spa.manage` |
| `accountant` | `reports.view`, `folios.manage`, `ar.manage` |
| `concierge` | `concierge.manage`, `guest-messages.manage` |

_Source of truth: [`lib/pms/authorization.ts`](../../lib/pms/authorization.ts)_

## Permission → Feature Mapping

| Permission | Features / Pages Protected |
|---|---|
| `reservations.manage` | Create / edit / cancel reservations; reservation detail |
| `rooms.manage` | Room type configuration; room status management |
| `rooms.status.update` | Housekeeping room status transitions (dirty → clean, etc.) |
| `checkin.manage` | Check-in workflow; room assignment at arrival |
| `folios.manage` | View and post folio charges; process payments |
| `housekeeping.manage` | Housekeeping board; assignment creation and status updates |
| `maintenance.manage` | Engineering work orders; asset service history |
| `workorders.manage` | Work-order creation and resolution |
| `fnb.manage` | Menu management; kitchen order pipeline |
| `inventory.manage` | Stockroom / ingredient inventory management |
| `spa.manage` | Spa service bookings; therapist scheduling |
| `ar.manage` | Accounts-receivable aging; folio settlement |
| `reports.view` | All reporting & analytics pages |
| `concierge.manage` | Concierge request queue |
| `guest-messages.manage` | Messaging threads; inbound/outbound SMS/WhatsApp |

## Write-Path Authorization Enforcement

All server actions in `app/dashboard/**/actions/` call `requirePropertyAccess()` or an equivalent guard before mutating data.  
The guard pattern is:

```ts
const { user, role } = await requirePropertyAccess(propertyId);
if (!hasPermission(role, "folios.manage")) {
  throw new Error("Unauthorized");
}
```

## Known Gaps / Remediation

| Gap | Status | Notes |
|---|---|---|
| `checkin.perform` used in sidebar but not in `authorization.ts` | Resolved — sidebar uses `checkin.manage` | No separate `checkin.perform` permission is needed |

## RLS Layer

Row-Level Security policies on Supabase complement the application-layer permission checks.  
Run `npm run security:rls-audit` to verify every table in the `pms` schema has RLS enabled and at least one policy.
