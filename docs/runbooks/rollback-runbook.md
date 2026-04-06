# Rollback Runbook

Use this runbook when a production deployment needs to be reversed.

## Decision Criteria

Roll back when:
- Smoke test fails post-deployment
- Error rate exceeds 5% on any critical path (reservations, check-in, payments)
- Data integrity alerts are triggered
- Database migration caused schema errors

Do **not** roll back for:
- Minor visual regressions that do not affect business operations
- Non-critical feature bugs that have a workaround

## Rollback Procedure

### Step 1 — Communicate

1. Post in the incident channel: `"rolling back <deployment-id> due to <reason>"`
2. Notify on-call engineering and product stakeholders.
3. Set status page to "Investigating" if not already.

### Step 2 — Revert Application Code

**Vercel (recommended):**
```shell
vercel rollback [deployment-id]
```
Or use the Vercel dashboard → Deployments → select the previous good deployment → "Promote to Production".

**Self-hosted (Docker / VPS):**
```shell
# Re-deploy the previous image tag
docker pull <registry>/casa-pms:<previous-tag>
docker-compose up -d --no-deps app
```

### Step 3 — Assess Database State

If the failed deployment included a migration:

1. Identify whether the migration was destructive (column/table drops) or additive-only.
2. **Additive migrations** (indexes, new columns, new tables): safe to leave in place — old code is forwards-compatible.
3. **Destructive migrations**: restore from the most recent backup taken before deployment.

#### Restore from Supabase backup
```shell
# Point-in-time restore via Supabase dashboard:
# Settings → Database → Backups → Restore to a point in time
```

#### Manual schema rollback (additive rollback only)
```sql
-- Example: drop an index added in 069 that caused blocking
DROP INDEX CONCURRENTLY IF EXISTS pms.idx_reservations_property_dates_status;
```

### Step 4 — Verify Rollback

1. Run smoke test against production: `npm run smoke-test`
2. Verify payments are processing (check Stripe/Paystack dashboards)
3. Test one end-to-end reservation creation manually
4. Confirm error rate returns to baseline in monitoring

### Step 5 — Post-Rollback

1. Set status page to "Resolved"
2. Document the incident in the incident log
3. Open a post-mortem ticket with root cause and remediation plan
4. Do not re-deploy the same code without fixing the root cause

## Contacts

| Responsibility | Contact |
|---|---|
| On-call Engineering | (fill in) |
| Supabase Support | support.supabase.com |
| Stripe Support | support.stripe.com |
| Paystack Support | support.paystack.com |

## Related Runbooks

- [Incident Response](./incident-response.md)
- [Go-Live Checklist](../release/go-live-checklist.md)
