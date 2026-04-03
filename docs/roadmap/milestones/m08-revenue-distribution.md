# M08 Revenue and Distribution

## Mission
Open new demand channels and automate price and revenue controls.

## Detailed Build Scope

### Module 34: Direct Booking Engine
Route group: app/(booking)/

Features:
- availability search
- room/rate selection
- guest details capture
- payment and confirmation flow
- payment-gateway routing by currency (NGN -> Paystack, non-NGN -> Stripe unless overridden)

Expected output:
- successful booking creates reservation in PMS

Implementation map:
- app/(booking)/checkout/page.tsx
- app/api/payments/initialize/route.ts
- app/api/payments/verify/route.ts
- lib/payments/gateway-router.ts
- lib/paystack/server.ts
- lib/stripe/server.ts

### Module 35: Channel Manager
Route group: app/dashboard/channels/
API route: app/api/channel-webhook/[channel]/route.ts

Features:
- outbound rate and availability push
- inbound OTA reservation mapping
- channel health and sync status visibility

Adapters:
- lib/channels/booking-com.ts
- lib/channels/expedia.ts
- lib/channels/airbnb.ts

Actions:
- connectChannel
- syncAvailability
- syncRates
- processOTABooking

### Module 36: Dynamic Pricing
Route group: app/dashboard/pricing/

Features:
- rule engine by occupancy and lead time
- lock and override support
- simulation preview before activation

Actions:
- createPricingRule
- toggleDynamicPricing
- previewPricingImpact

### Module 37: Corporate Accounts
Route group: app/dashboard/corporate/

Features:
- negotiated corporate rates
- account billing cycle controls
- AR and invoice generation

Actions:
- createCorporateAccount
- assignCorporateRate
- generateMonthlyInvoice
- postCorporatePayment

### Module 38: Travel Agent Rates
Route group: app/dashboard/agents/

Features:
- agent profile management
- commission-rate assignment
- commission tracking and reporting

Actions:
- createAgent
- assignAgentRate
- calculateCommission

### Module 39: Loyalty Programme
Route group: app/dashboard/loyalty/

Features:
- tier configuration
- points earn and redemption
- tier progression automation

Actions:
- earnPoints
- redeemPoints
- upgradeTier

## Team-Size Duration
- Solo: 9 weeks
- 5-person: 6 weeks
- 12-person: 4 weeks

## Dependencies
- M01 and M02 complete.
- M06 optional for bundled cross-sell.

## Acceptance Criteria
- [x] Direct booking flow confirms and writes reservation with payment outcome.
- [x] NGN checkout completes through Paystack with verified callback before reservation confirmation.
- [x] Channel sync works both outbound and inbound with mapping reliability.
- [x] Dynamic pricing rule simulation and activation are both available.
- [x] Corporate and travel-agent contracts affect sellable rates correctly.
- [x] Loyalty earn/redeem entries are auditable in guest and folio history.

## Agent Tracking
- Status: Complete
- Owner:
- Start Date:
- Target Date:
- Blockers: None.
