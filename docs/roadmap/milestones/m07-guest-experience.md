# M07 Guest Experience Suite

## Mission
Build guest-facing and service-facing touchpoints that improve stay quality and responsiveness.

## Detailed Build Scope

### Module 28: Concierge Requests
Route group: app/dashboard/concierge/

Features:
- request intake and categorization
- staff assignment and SLA tracking
- optional folio posting for billable services

Actions:
- createRequest
- assignRequest
- updateRequestStatus
- postConciergeCharge

### Module 29: Guest Messaging
Route group: app/dashboard/messaging/
API route: app/api/twilio-webhook/route.ts

Features:
- unified inbox across channels
- templates for common guest communication
- inbound webhook processing and thread mapping

Actions:
- sendMessage
- replyToThread
- sendTemplate
- markAsRead

### Module 30: Pre-arrival Profile
Route groups:
- app/dashboard/pre-arrival/
- app/(guest)/pre-arrival/[token]/

Features:
- pre-arrival survey delivery
- preference capture for room and service setup
- operational follow-up task generation

Actions:
- sendPreArrivalSurvey
- recordPreArrivalResponse

### Module 31: VIP Management
Integrated across guests and arrivals features.

Features:
- tier tagging and VIP profile visibility
- pre-arrival briefing generation
- amenity task automation on arrival

### Module 32: Guest Feedback
Route groups:
- app/dashboard/feedback/
- app/(guest)/feedback/[token]/

Features:
- in-stay feedback intake
- threshold-based escalation path
- issue resolution workflow

Actions:
- submitFeedback
- escalateFeedback
- resolveFeedbackIssue

### Module 33: Digital Key and Keycard
Route group: app/dashboard/keys/

Features:
- issue and revoke key lifecycle
- assignment tracking by stay
- provider integration abstraction

Actions:
- issueDigitalKey
- revokeKey
- getKeyStatus

## Team-Size Duration
- Solo: 6 weeks
- 5-person: 4 weeks
- 12-person: 3 weeks

## Dependencies
- M02 complete.

## Acceptance Criteria
- [ ] Concierge requests support assignment, progress, and closure with traceability.
- [ ] Messaging supports inbound and outbound thread continuity.
- [ ] Pre-arrival responses update preferences and trigger ops tasks.
- [ ] Feedback escalation triggers for low scores are reliable.
- [ ] Key lifecycle actions are auditable and tied to reservation context.

## Agent Tracking
- Status: Planned
- Owner:
- Start Date:
- Target Date:
- Blockers:
