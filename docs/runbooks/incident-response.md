# Incident Response

## Severity Levels

| Level | Definition | Response Time | Example |
|---|---|---|---|
| P1 — Critical | Production down or data loss | 15 min | Database unreachable; all endpoints 5xx |
| P2 — High | Core business flow broken | 1 hour | Reservations cannot be created; payments failing |
| P3 — Medium | Feature degraded, workaround exists | 4 hours | Reports load slowly; housekeeping board offline |
| P4 — Low | Minor issue, no business impact | Next business day | UI alignment issue; non-critical missing data |

## P1/P2 Response Playbook

### 1 — Detect (0–5 min)
- Alert fires via uptime monitoring or user report
- On-call engineer acknowledges in the incident channel
- Post: `"Investigating P1: <brief description> — <your name> is IC"`

### 2 — Assess (5–15 min)
- Check Supabase dashboard: connection count, query latency, error logs
- Check Next.js hosting logs (Vercel Functions or server logs)
- Run smoke test: `npm run smoke-test`
- Check payment provider dashboards (Stripe / Paystack) for webhook failures
- Identify: Is this a code bug, infrastructure issue, or data problem?

### 3 — Contain (15–30 min)
- If caused by the latest deployment → initiate rollback (see [Rollback Runbook](./rollback-runbook.md))
- If database overload → enable read-replica routing or increase connection pool
- If DDoS / bot traffic → enable rate limiting / WAF rules
- Communicate status page update every 15 minutes

### 4 — Resolve
- Deploy fix or rollback
- Run smoke test to confirm resolution
- Monitor error rate for 30 minutes post-fix

### 5 — Post-Mortem (within 48 hours)
- Document timeline, root cause, contributing factors, remediation
- Add monitoring/alerting improvements to prevent recurrence
- Update runbooks if procedures were unclear

## Common Failure Patterns

### Supabase Connection Exhaustion
**Symptoms:** Database errors; spike in connection count  
**Resolution:**
1. Check for long-running transactions: `SELECT * FROM pg_stat_activity WHERE state = 'active';`
2. Kill idle connections if needed
3. Review application code for missing `await` on Supabase calls (leaked connections)

### Payment Webhook Failures
**Symptoms:** Paystack/Stripe dashboard shows 4xx/5xx on webhook delivery  
**Check:**
- `PAYSTACK_WEBHOOK_SECRET` / `STRIPE_WEBHOOK_SECRET` env vars match the provider dashboard
- Webhook route is accessible (no auth middleware blocking it)
- Recent deployments changed `lib/security/webhook-signature.ts`

### RLS Policy Blocking Legitimate Access
**Symptoms:** Users see empty data they should have access to; 406/403 responses  
**Resolution:**
1. Run `npm run security:rls-audit` to identify policy gaps
2. Check `user_property_roles` table for correct entries for the affected user
3. Review recent RLS policy migrations

### Migration Lock
**Symptoms:** Deployment hangs; database CPU spikes  
**Resolution:**
1. Check for long-running queries blocking the migration: `SELECT * FROM pg_locks JOIN pg_stat_activity USING (pid);`
2. Kill offending processes if safe
3. Migrations 069+ use `CONCURRENTLY` index creation which is non-blocking

## Escalation Path

```
On-call Engineer → Engineering Lead → CTO
                 → Supabase Support (infra issues)
                 → Stripe/Paystack Support (payment issues)
```

## Communication Templates

**Status page — investigating:**
> We are investigating reports of [issue description]. Our team has been alerted and is actively working on a resolution.

**Status page — resolved:**
> The issue affecting [feature] has been resolved as of [time]. Root cause was [brief cause]. A full post-mortem will be published within 48 hours.
