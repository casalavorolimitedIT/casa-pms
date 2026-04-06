# Go-Live Checklist

This checklist must be completed and signed off before promoting a release to production.

## Pre-Deployment

### Infrastructure
- [ ] Supabase project is on a paid plan (no free-tier limits on production data)
- [ ] Database connection poolers (PgBouncer / Supavisor) configured for expected concurrent load
- [ ] Database backups enabled and tested (point-in-time recovery validated)
- [ ] Custom domain configured and SSL certificate issued
- [ ] CDN / edge caching rules reviewed for Next.js App Router compatibility

### Environment Variables
- [ ] All required env vars set in production hosting (Vercel / self-hosted)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — production Supabase URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key (safe for browser exposure)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — service-role key (secret, server-only)
- [ ] `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` — production Stripe keys
- [ ] `PAYSTACK_SECRET_KEY` and `PAYSTACK_WEBHOOK_SECRET` — production Paystack keys
- [ ] `TWILIO_AUTH_TOKEN` and `TWILIO_ACCOUNT_SID` — production Twilio credentials
- [ ] `POS_WEBHOOK_SECRET` — POS integration secret
- [ ] `DATABASE_URL` — direct PostgreSQL connection string (for scripts)

### Database
- [ ] All migrations (001 → 069) applied in order with zero errors
- [ ] RLS audit script passes: `npm run security:rls-audit`
- [ ] Performance indexes from migration 069 created and verified with `\d <table>`
- [ ] Seed / demo data imported if required for go-live demo

### Application Build
- [ ] `npm run build` succeeds with zero TypeScript errors and zero lint errors
- [ ] All unit tests pass: `npm run test:unit`
- [ ] Integration tests pass against staging: `npm run test:integration`
- [ ] `npm run benchmark` run against staging — no threshold violations
- [ ] All secrets rotated from development/staging values

### Security
- [ ] Authorization matrix reviewed — no unguarded write paths
- [ ] Webhook signature validation active on Paystack, Stripe, Twilio, and POS routes
- [ ] CSRF/CORS headers configured in `next.config.ts`
- [ ] `Content-Security-Policy` header set (see `docs/security/`)
- [ ] Rate limiting configured on auth and webhook endpoints

## Deployment

- [ ] Blue/green or rolling deployment (avoid hard cutover during peak hours)
- [ ] Deployment initiated during low-traffic window
- [ ] DNS TTL lowered ahead of cutover
- [ ] Database migration applied before new code is live

## Post-Deployment Validation

- [ ] Smoke test passes: `npm run smoke-test`
- [ ] Health check endpoint returns HTTP 200
- [ ] Sign-in flow works end-to-end
- [ ] Reservation creation, check-in, and folio posting tested manually
- [ ] Paystack + Stripe webhook delivery tested (send a test event from dashboard)
- [ ] Error monitoring (Sentry / equivalent) receiving events
- [ ] Uptime alerting active
- [ ] Logs are flowing to log aggregation service

## Sign-Off

| Role | Name | Date | Signed |
|---|---|---|---|
| Engineering Lead | | | ☐ |
| QA Lead | | | ☐ |
| Product Owner | | | ☐ |
| Security Reviewer | | | ☐ |

## Rollback Trigger Criteria

Initiate rollback immediately if any of the following occur within 2 hours of deployment:

- Error rate > 5% on any critical endpoint (reservations, check-in, payments)
- Database connection errors
- Smoke test failure
- Payment webhook delivery failures (Stripe/Paystack dashboard shows repeated 5xx)
- Any data-corruption alert

See [`docs/runbooks/rollback-runbook.md`](../runbooks/rollback-runbook.md) for rollback procedure.
