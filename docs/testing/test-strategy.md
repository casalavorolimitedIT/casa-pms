# Test Strategy

## Overview

All automated tests for Casa PMS use the **Node.js native test runner** (`node:test`) with strict assertions (`node:assert/strict`). There is no additional test framework dependency (no Jest, Vitest, or Mocha).

## Test Architecture

```
tests/
├── unit/
│   └── pms/
│       ├── authorization.test.ts    — hasPermission() — pure function, fast, no I/O
│       ├── folio.test.ts            — calculateFolioBalance() — pure function, fast
│       └── webhook-signature.test.ts — HMAC verifiers — pure crypto, no network
└── integration/
    ├── multi-property-isolation.test.ts      — RLS: user A/B data isolation (M10)
    ├── reservation-lifecycle.test.ts         — Reservation read, status, folio links
    ├── night-audit.test.ts                   — Checked-in + due-today queries; idempotency
    ├── payment-gateway-routing.test.ts       — Folio payments; no orphaned records
    ├── paystack-callback-verification.test.ts — Signature verification (no DB needed)
    └── reporting-reconciliation.test.ts      — AR charges; date-filter subset invariant
```

## Unit Tests

Unit tests verify **pure functions** with no I/O or network calls.

Run:
```shell
node --env-file=.env.local --import tsx/esm --test tests/unit/pms/*.test.ts
```

### Covered functions

| File | Function | Cases |
|---|---|---|
| `authorization.test.ts` | `hasPermission(role, permission)` | all 9 roles × positive/negative; wildcard; unknown permission |
| `folio.test.ts` | `calculateFolioBalance(input)` | zero, partial, exact, over-payment, large amounts |
| `webhook-signature.test.ts` | `verifyStripeSignature`, `verifyPaystackSignature`, `verifyHmacSha*` | valid, tampered, missing header, wrong secret, stale timestamp |

## Integration Tests

Integration tests require a live Supabase test environment and test user accounts with appropriate `user_property_roles` entries.

Run:
```shell
node --env-file=.env.local --import tsx/esm --test tests/integration/*.test.ts
```

### Required environment variables

| Variable | Used by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | all integration tests |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all integration tests |
| `M10_TEST_USER_A_EMAIL` / `M10_TEST_USER_A_PASSWORD` | `multi-property-isolation` |
| `M10_TEST_USER_B_EMAIL` / `M10_TEST_USER_B_PASSWORD` | `multi-property-isolation` |
| `M12_FRONT_DESK_EMAIL` / `M12_FRONT_DESK_PASSWORD` | `reservation-lifecycle`, `night-audit`, `payment-gateway-routing` |
| `M12_ACCOUNTANT_EMAIL` / `M12_ACCOUNTANT_PASSWORD` | `reporting-reconciliation` |
| `M12_TEST_PROPERTY_ID` | all M12 integration tests (skips gracefully if unset) |

### Graceful skips

All integration tests that depend on `M12_TEST_PROPERTY_ID` emit a `SKIP` warning and pass without error when the variable is unset. This allows the unit test suite to run from any environment.

## Test Invariant Categories

### Data Integrity
- No `check_in > check_out`
- No negative `amount_minor` on charges
- No orphaned `folio_charges` or `folio_payments` (all link to valid folios)

### RLS / Authorization
- Scoped users see only their assigned property's data
- Out-of-scope queries return empty (not an error)

### Idempotency
- Same night-audit date query returns identical count on repeat execution

### Cryptographic Correctness
- Valid signatures pass; tampered payloads fail; missing/stale headers fail; wrong secrets fail

## Running All Tests

```shell
# Unit tests only (no env vars required beyond building the app)
npm run test:unit

# Integration tests (requires .env.local with test credentials)
npm run test:integration

# All tests
npm run test
```

## CI Integration

In CI, unit tests run on every pull request. Integration tests run on push to `main` and when the `M12_TEST_PROPERTY_ID` secret is available in the environment.

## Adding New Tests

1. Place pure function tests in `tests/unit/pms/`.
2. Place database-touching tests in `tests/integration/`.
3. Follow the existing pattern: `import { test } from "node:test"` and `import assert from "node:assert/strict"`.
4. Skip gracefully when required env vars are absent rather than throwing.
5. Add relevant env var requirements to this document.
