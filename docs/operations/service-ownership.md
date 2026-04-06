# Service Ownership

This document defines which team member or role owns each service area of Casa PMS.

## Application Domains

| Domain | Primary Owner | Secondary Owner | On-Call? |
|---|---|---|---|
| Reservations & Front Desk | Engineering Lead | Backend Dev | Yes |
| Payment Processing (Stripe / Paystack) | Backend Dev | Engineering Lead | Yes |
| Housekeeping & Maintenance | Full-Stack Dev | Engineering Lead | No |
| F&B / POS Integration | Backend Dev | Engineering Lead | No |
| Spa & Wellness | Full-Stack Dev | — | No |
| Reporting & Analytics | Full-Stack Dev | Engineering Lead | No |
| Messaging (Twilio / WhatsApp) | Backend Dev | — | No |
| Channel Management (Booking.com, Expedia) | Backend Dev | Engineering Lead | Yes |
| Authentication & Access Control | Engineering Lead | — | Yes |

## Infrastructure Ownership

| Component | Owner | Notes |
|---|---|---|
| Supabase (DB + Auth + Storage) | Engineering Lead | Billing and project admin |
| Vercel (Hosting) | Engineering Lead | Deploy keys and team access |
| Stripe | Engineering Lead | Webhook configuration, key rotation |
| Paystack | Engineering Lead | Webhook configuration, key rotation |
| Twilio | Backend Dev | Messaging number and auth token |
| Domain / DNS | Engineering Lead | |

## Runbook Assignments

| Runbook | Owner |
|---|---|
| [Rollback Runbook](./rollback-runbook.md) | Engineering Lead |
| [Incident Response](./incident-response.md) | On-call rotation |
| RLS Audit | Engineering Lead |
| Go-Live Checklist sign-off | Engineering Lead + Product Owner |

## On-Call Rotation

- Coverage: business hours + escalation for P1/P2 at any hour
- Tool: (fill in — PagerDuty / OpsGenie / phone list)
- Escalation path: On-call → Engineering Lead → CTO

## Secret Rotation Schedule

| Secret | Rotation Frequency | Owner |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | On team member offboarding + annually | Engineering Lead |
| `STRIPE_WEBHOOK_SECRET` | Annually or on exposure | Engineering Lead |
| `PAYSTACK_WEBHOOK_SECRET` | Annually or on exposure | Engineering Lead |
| `TWILIO_AUTH_TOKEN` | Annually or on exposure | Backend Dev |
| `POS_WEBHOOK_SECRET` | Annually | Backend Dev |
