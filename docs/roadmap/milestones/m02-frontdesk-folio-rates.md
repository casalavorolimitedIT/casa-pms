# M02 Front Desk, Folio, Rate Management

## Mission
Operationalize arrivals and departures, billing, and commercial control of rates.

## Detailed Build Scope

### Module 4: Check-in / Check-out
Route group: app/dashboard/front-desk/

Pages and actions:
- page.tsx front desk command center
- check-in/[reservationId]/page.tsx with ID verification and room assignment
- check-out/[reservationId]/page.tsx with final folio settlement
- room-move/page.tsx for room reallocation
- actions/checkin-actions.ts

Components:
- components/front-desk/registration-card.tsx (PDF-ready)
- components/front-desk/key-card-form.tsx
- components/front-desk/early-late-modal.tsx

### Module 5: Folio and Billing
Route group: app/dashboard/folios/

Pages and actions:
- page.tsx folio search
- [id]/page.tsx full folio details
- company/page.tsx city ledger and company balances
- actions/folio-actions.ts

Rules:
- room charges auto-post in night audit
- minibar/FnB/spa/concierge can auto-post via integration actions
- manual postings available for front desk

Components:
- components/folio/folio-line-item.tsx
- components/folio/payment-form.tsx
- components/folio/folio-pdf.tsx

Stripe integration:
- lib/stripe/client.ts
- lib/stripe/server.ts
- setup-intent at check-in, payment-intent at checkout, refunds supported

Paystack integration (NGN):
- lib/paystack/client.ts
- lib/paystack/server.ts
- app/api/paystack/webhook/route.ts
- transaction initialize/verify flow for card, bank transfer, and local rails supported by Paystack

### Module 6: Rate Management
Route group: app/dashboard/rates/

Pages and actions:
- page.tsx for plan list
- [id]/page.tsx for plan details and restrictions
- packages/page.tsx
- seasons/page.tsx
- actions/rate-actions.ts

Components:
- components/rates/rate-calendar.tsx
- components/rates/rate-plan-form.tsx
- components/rates/restriction-form.tsx

## Team-Size Duration
- Solo: 6 weeks
- 5-person: 4 weeks
- 12-person: 3 weeks

## Dependencies
- M01 complete.

## Acceptance Criteria
- [x] Check-in/check-out path works from reservation to room release.
- [x] Room moves preserve stay integrity and billing linkage.
- [ ] Folio supports charge posting, payment, split, transfer, and invoice generation.
- [ ] Stripe sandbox flow validated for setup, capture, and refund.
- [ ] Paystack test mode flow validated for NGN initialize, callback/verify, and folio posting.
- [x] Rate plans support restrictions and seasonal overrides.

## Agent Tracking
- Status: In Progress
- Owner:
- Start Date: 2026-04-02
- Target Date:
- Blockers: Validate Stripe/Paystack end-to-end test flows and add folio split/transfer + PDF invoice output.
