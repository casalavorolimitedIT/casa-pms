# ADR-012 — Release and Operability Standards

**Status:** Accepted  
**Date:** 2024  
**Deciders:** Engineering team  
**Supersedes:** N/A

## Context

As Casa PMS moves toward its first production release, we need to establish standard practices for:
- How releases are deployed and validated
- Who owns operational responsibilities
- What monitoring and alerting baseline is required before go-live
- How incidents are handled and escalated

Without these standards, production deployments are risky and recovery from incidents is slow.

## Decision

We adopt the following release and operability standards for all production deployments:

### 1. Pre-Release Gate
Every release must pass a Go-Live Checklist ([`docs/release/go-live-checklist.md`](../release/go-live-checklist.md)) including:
- Zero TypeScript / lint errors in CI
- All unit and integration tests green
- RLS audit passes on the target environment
- Smoke test passes against staging

### 2. Smoke Test Script
A `scripts/release/smoke-test.ts` script validates connectivity, seed data, auth sign-in, and RLS boundaries on the target environment immediately after deployment.

### 3. Rollback Protocol
All deployments must support rollback within 10 minutes. Application code rollback uses Vercel's one-command deployment rollback. Database schema changes are additive-first; destructive changes are gated behind a separate migration with a documented rollback path.

### 4. Incident Response
Incidents are classified P1–P4 with defined response times. The on-call engineer follows the playbook in [`docs/runbooks/incident-response.md`](../runbooks/incident-response.md). Post-mortems are required for all P1 and P2 incidents within 48 hours.

### 5. Observability Baseline
Before go-live, the following must be instrumented:
- Request latency and error rate per endpoint
- Database connection count and query latency
- Payment gateway success/failure rate
- Uptime monitoring with PagerDuty / equivalent

### 6. Webhook Signature Enforcement
All inbound webhooks (Stripe, Paystack, Twilio, POS) must validate cryptographic signatures before processing any payload. Implementation is centralised in `lib/security/webhook-signature.ts`.

## Options Considered

| Option | Verdict |
|---|---|
| No formal release process (ad-hoc) | Rejected — too risky for production |
| Full CI/CD with automated deploy | Future state — currently manual with script guards |
| Blue/green deployment | Preferred for production scale; current state is rolling |

## Tradeoffs

| Pro | Con |
|---|---|
| Predictable production quality | Overhead on every release |
| Fast rollback (< 10 min) | Requires discipline to follow checklists |
| Clear on-call escalation path | On-call burden depends on team size |

## Rollback Strategy

This ADR itself can be superseded by a future ADR-012b if deployment automation matures to full CI/CD with automated gate enforcement. The manual checklist will remain as a fallback.
