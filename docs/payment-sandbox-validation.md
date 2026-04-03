# Payment Sandbox Validation (M02)

This runbook provides reproducible checks for the two open M02 acceptance items:
- Stripe sandbox: setup, capture, refund
- Paystack test mode: initialize, callback/verify, folio posting traceability

## Prerequisites

- `.env.local` has valid test keys:
  - `STRIPE_SECRET_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `PAYSTACK_SECRET_KEY`
  - `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
  - `NEXT_PUBLIC_APP_URL` (example: `http://localhost:3000`)
- App is running for callback checks:
  - `npm run dev`

## 1) Stripe Sandbox Validation

Command:

```bash
npm run validate:stripe:sandbox
```

What it does:
- Creates a SetupIntent with `pm_card_visa` (setup validation)
- Creates a manual-capture PaymentIntent and captures it (capture validation)
- Creates a refund from the captured charge (refund validation)

Expected outcome:
- JSON output with non-empty `setup.intentId`, `capture.intentId`, `refund.refundId`
- `setup.status` should be terminal (`succeeded` in normal test mode)
- `capture.status` should be `succeeded`
- `refund.status` should be `succeeded` or `pending` depending on account settings

Optional overrides:
- `STRIPE_SANDBOX_CAPTURE_AMOUNT_MINOR`
- `STRIPE_SANDBOX_REFUND_AMOUNT_MINOR`
- `STRIPE_SANDBOX_CURRENCY` (default `usd`)

## 2) Paystack Test Mode Validation

Command:

```bash
npm run validate:paystack:sandbox
```

What it does:
- Calls Paystack initialize endpoint with NGN test payload
- Attempts verification using the same reference

Important:
- Verification may fail until you complete hosted checkout using the returned `authorizationUrl`
- After completion, rerun with:

```bash
PAYSTACK_SANDBOX_VERIFY_REFERENCE=<reference> npm run validate:paystack:sandbox
```

Expected outcome:
- Initialize output contains `authorizationUrl` and `reference`
- Verify output contains Paystack transaction data with a successful status after hosted flow completes

Optional overrides:
- `PAYSTACK_SANDBOX_EMAIL`
- `PAYSTACK_SANDBOX_AMOUNT_MINOR`
- `PAYSTACK_SANDBOX_CURRENCY` (default `NGN`)
- `PAYSTACK_SANDBOX_REFERENCE`
- `PAYSTACK_SANDBOX_VERIFY_REFERENCE`
- `PAYSTACK_BASE_URL`

## 3) Folio Posting Evidence (Current App Flow)

Current checkout action posts a folio payment row immediately after payment initialization and stores provider reference.

To evidence folio posting in sandbox:
1. Complete a card checkout flow in Front Desk Check-out
2. Open the linked folio
3. Confirm payment line includes:
   - `method=card`
   - `provider=stripe` or `provider=paystack`
   - `provider_reference` matching gateway reference

## 4) Evidence Log Template

Capture each run in this table and attach JSON outputs in your release notes/PR:

| Date (UTC) | Gateway | Scenario | Reference | Result | Notes |
|---|---|---|---|---|---|
| YYYY-MM-DD | Stripe | setup/capture/refund | runId/ref ids | pass/fail | |
| YYYY-MM-DD | Paystack | init+verify | paystack ref | pass/fail | |
| YYYY-MM-DD | Folio | posting traceability | folio id | pass/fail | |

## 5) Updating M02 Checklist

After successful runs and evidence capture, mark these items complete in:
- `docs/roadmap/milestones/m02-frontdesk-folio-rates.md`
