# VeteranPCS PostHog Implementation Context

**Date:** 2026-06-26
**Purpose:** Keep only the durable context needed to plan and extend VeteranPCS funnel telemetry. This is not the event taxonomy reference.

**Status:** App-side PostHog telemetry, privacy sanitization, Customer Web-to-Lead attribution fields, server-confirmed accepted-lead events, and the explicit CTA hardening pass are implemented in the app code. Salesforce Lead-to-Opportunity mappings and read-only FLS are configured, but record-level Opportunity propagation still needs the first attributed Lead conversion to verify. The Salesforce Opportunity outcome webhook is a later phase.

For the current event taxonomy, properties, PostHog queries, Salesforce joins, and GA/GTM comparator notes, see [telemetry-taxonomy.md](telemetry-taxonomy.md). For the post-implementation coverage gaps and hardening sequence, see [telemetry-hardening-audit.md](telemetry-hardening-audit.md).

## Measurement Goal

VeteranPCS needs trustworthy telemetry for organic growth:

> Which content, search channels, and on-site journeys produce leads that become real Salesforce opportunities and closed outcomes?

PostHog is the primary system for new web telemetry and Salesforce outcome attribution. GA4/GTM remains a web-funnel comparator during dual-run, not the source of truth for Salesforce stages, revenue, or closed-loop attribution.

## Non-Negotiables

- Salesforce remains the business source of truth for leads, Customer Opportunities, stages, and revenue fields.
- Existing Web-to-Lead payload behavior must remain byte-identical except for explicitly approved additive ID fields.
- New Salesforce Web-to-Lead fields must be posted with generated `00N...` field IDs, not API names:
  - `VPCS_VISITOR_ID_W2L_FIELD_ID=00NRg00000PjSD3MAN`
  - `VPCS_SUBMISSION_ID_W2L_FIELD_ID=00NRg00000PjSEfMAN`
- `vpcs_visitor_id` is the stable PostHog person key.
- The Opportunity join key is server-minted per accepted submission, using the existing `submissionId` concept.
- Email is never a durable identity, join key, PostHog distinct id, or PostHog event property.
- Attribution belongs on immutable conversion events, not as mutable person source-of-truth.
- Raw name, email, phone, free text, full URL query strings, raw search queries, raw concierge messages, full ZIP codes, and Salesforce payloads must not appear in PostHog, replay, or server logs.
- Exact Salesforce-derived revenue fields are approved for server-side PostHog outcome events once the signed Opportunity webhook exists.
- Historical PostHog PII cleanup is a non-blocking risk decision for this implementation. Stop future leakage first; do not treat historical PII-tainted data as production-quality dashboard input.

## Current Repo Facts And Pitfalls To Re-Verify

- PostHog client initialization and privacy controls live in `instrumentation-client.ts`.
- The client analytics wrapper lives in `lib/analytics/client.ts`; the server-only wrapper lives in `lib/analytics/server.ts`.
- Reusable CTA property construction lives in `lib/analytics/cta.ts`; tracked links live in `components/common/TrackedCtaLink.tsx`, `components/common/AgentCtaLink.tsx`, and `components/common/LenderCtaLink.tsx`.
- `vpcs_visitor_id`, first-touch attribution, last-touch attribution, and safe pre-conversion counters live in `lib/analytics/visitor.ts`.
- Sanitization rules live in `lib/analytics/sanitizer.ts`. Future telemetry changes should add tests there when introducing user-input-derived properties.
- Customer Web-to-Lead forms now append only the approved additive Salesforce fields for visitor id and submission id.
- `lead_conversion_created` is the canonical server-confirmed accepted-lead event. GA4/GTM conversion/download events are comparator signals and must not be treated as Salesforce-accepted conversions.
- The shared guide download component now routes first-time homebuyer guide submissions through the first-time homebuyer action/source.
- Customer forms emit `form_submit_attempted` before client validation so invalid submit attempts are counted.
- BAH analytics uses `zip_prefix`, not full ZIP.
- Direct email-keyed PostHog identifies/captures were removed from the Customer lead flow.
- Contact Lender success handling accepts either redirect-style responses or message/submission-id accepted responses, then redirects successful message-only submissions to `/thank-you`.
- Concierge lead tools thread visitor/attribution context into the shared post functions and include safe `submission_id` values on completed tool telemetry when available.
- Concierge open, message, and approval telemetry is explicit for launcher, seeded CTA, seeded message, manual message, agent-card selection, and tool approval paths. Do not send raw messages or prompts.
- Server PostHog delivery failures are logged through the logging service with event/distinct-id context only; payload contents must not be logged.
- The existing Salesforce revalidate route is not an acceptable pattern for money/outcome webhooks.
- Record-level Lead-to-Opportunity attribution copying still needs live verification after an attributed Customer Lead is converted.

## Customer Lead Scope

Closed-loop Customer lead telemetry covers every Web-to-Lead source that creates Customer lead records:

- Contact Agent
- Contact Lender
- Keep in Touch
- Contact Form
- VA Loan Guide
- First Time Home Buyer Guide
- Concierge lead tools that call the same post functions

Partner listing, recruiting, and internship flows are outside the Customer close loop unless separately planned.

## Required Architecture

1. Add a client-safe typed analytics layer for funnel events.
2. Keep server-only analytics helpers separate from client modules.
3. Bootstrap `vpcs_visitor_id` before first client capture.
4. Store first-touch and last-touch attribution in first-party state, then snapshot it onto canonical conversion events.
5. Emit exactly one canonical server-confirmed conversion after accepted Salesforce Web-to-Lead submission.
6. Inject only the required additive identity fields into Salesforce.
7. Configure PostHog client privacy controls: sanitizer/before-send behavior, masked inputs, safe URL/query handling, and no business reliance on autocapture.
8. Later phase: receive Salesforce Opportunity updates through a new HMAC-authenticated, fail-closed, idempotent route.
9. Later phase: implement Salesforce sending through pure Apex: Opportunity after insert/update trigger -> bulk-safe handler -> Queueable callout -> signed Next.js API route.
10. Build PostHog dashboards from the taxonomy after live events validate.

## Core Event Families

The durable taxonomy is maintained in [telemetry-taxonomy.md](telemetry-taxonomy.md). Summary:

Top funnel:

- `$pageview`
- `content_viewed`
- `state_page_viewed`
- `blog_search_submitted`
- `blog_search_results`
- `bah_calculator_used`
- `moving_bonus_calculated`

Mid funnel:

- `cta_clicked`
- `calculator_cta_clicked`
- `form_started`
- `form_submit_attempted`
- `form_validation_failed`
- `form_submission_failed`
- `guide_download_requested`
- `guide_download_started`
- `concierge_opened`
- `concierge_message_sent`
- `concierge_tool_approval_responded`
- `concierge_tool_submitted`
- `concierge_tool_completed`
- `concierge_tool_failed`
- `concierge_chat_completed`

Bottom funnel:

- `lead_conversion_created`

Outcome funnel, later Salesforce webhook phase:

- `lead_stage_changed`
- `lead_under_contract`
- `lead_transaction_closed`
- `lead_closed_won`
- `lead_cashback_paid`
- `lead_closed_lost`
- `lead_revenue_finalized`

## Required Common Event Properties

Every custom event should include:

- `analytics_schema_version: 1`
- `journey_stage`: `top`, `mid`, `bottom`, or `outcome`

Use stable snake_case ids and controlled enums where possible:

- `vpcs_visitor_id`
- `submission_id` where a form submission exists
- `source_page_path`
- `source_content_type`
- `content_id`, `content_slug`, `content_type`, `topic_cluster`, `audience`, `pcs_stage` where known from CMS or controlled route context
- `form_id`
- `lead_source`
- `guide_id`
- `state_code`, `state_slug`
- `partner_type`, `partner_salesforce_id`
- `cta_id`, `cta_intent`, `cta_position`, `cta_component`, `cta_location`, `cta_label`, `page_type`, `destination_path`
- `content_slug`, `content_type`, `calculator_id`, `calculator_name`, `input_origin`, `concierge_topic` where applicable
- `has_email`, `has_phone`
- first-touch and last-touch attribution snapshots on `lead_conversion_created`
- conversion context counters when safely available: `conversion_lag_seconds`, `pageview_count_before_conversion`, `cta_click_count_before_conversion`, `form_attempt_count_before_conversion`

Never derive ids from user-entered text. For blog search, do not send raw query text; send safe derived properties such as `query_length`, `query_word_count`, `result_count`, `result_bucket`, `matched_state_code`, and controlled `matched_topic` only.

Click taxonomy decision: use `cta_clicked` as the canonical event for partner cards, state CTAs, blog CTAs, popup CTAs, and generic contact links. Distinguish with `cta_id`, `cta_intent`, `cta_position`, `cta_component`, `cta_location`, `cta_label`, `page_type`, `partner_type`, `partner_salesforce_id`, `state_code`, `state_slug`, `content_slug`, `content_type`, and `destination_path`. Do not add dedicated `agent_card_clicked`, `lender_card_clicked`, or `contact_click` events unless a future reporting requirement cannot be handled with `cta_clicked` properties.

## Resolved Salesforce Attribution Setup

Production org: `Veteran PCS` / `00D4x000003yaV2EAI`.

Created fields:

| Object | API Name | Field Id | Purpose |
|---|---|---|---|
| Lead | `VPCS_Visitor_ID__c` | `00NRg00000PjSD3MAN` | Web visitor/person join id |
| Lead | `VPCS_Submission_ID__c` | `00NRg00000PjSEfMAN` | Form submission/opportunity join id |
| Opportunity | `VPCS_Visitor_ID__c` | `00NRg00000PjSGHMA3` | Copied visitor id for outcome joins |
| Opportunity | `VPCS_Submission_ID__c` | `00NRg00000PjSHtMAN` | Copied submission id for outcome joins |

Verified Lead conversion mappings:

- `Lead.VPCS_Visitor_ID__c -> Opportunity.VPCS_Visitor_ID__c`
- `Lead.VPCS_Submission_ID__c -> Opportunity.VPCS_Submission_ID__c`

Verified read-only FLS:

- Permission set: `VPCS_PostHog_Attribution_Read`
- Permission set id: `0PSRg000000DiJNOA0`
- Assignment id: `0PaRg00000cXqmjKAC`
- Assigned to: `VeteranPCS Technology` / `0054x000008x6NqAAI`
- SOQL read access verified for all four attribution fields.

## Remaining Salesforce Dependencies

Before implementing the closed-loop outcome webhook, confirm:

- Exact Opportunity webhook payload shape.
- HMAC signing mechanism and secret rotation strategy.
- Pure Apex deployment path from sandbox/dev to production.
- Customer Opportunity record type remains `0124x000000Z7G3AAK`.
- Live stage semantics for `Closed Won`, `Transaction Closed`, `Paid - Complete`, and `Closed - Lost`.
- Revenue property mapping for exact Salesforce-derived `Amount` if used, `Sale_Price__c`, `Closing_Commission__c`, `Payout_Amount__c`, and `Charity_Amount__c`.
- The user will need hands-on Codex guidance for Apex development, sandbox validation, deployment/promotion, production verification, and rollback planning.

## Verification Gates

- Re-read the code before planning implementation.
- Inventory all current Customer lead sources and `recordType` values.
- Test all six Customer lead surfaces, including phone-only leads and multiple submissions from one browser.
- Test first-time homebuyer guide submissions use the correct form action/source.
- Test Web-to-Lead payloads include only additive attribution fields with the exact `00N...` ids above.
- Test no PostHog capture uses email/name/phone as distinct id or event properties.
- Test future server logs do not include raw PII/free text.
- Test failed or abandoned submissions do not emit canonical conversions.
- Test form failure telemetry uses safe `failure_stage` and `error_codes`, never raw messages.
- Test invalid submissions emit both `form_submit_attempted` and `form_validation_failed`.
- Test BAH telemetry does not include full ZIP.
- Test concierge telemetry excludes raw messages/contact details.
- Test reusable CTA telemetry sends path-only destinations and no raw query strings.
- Test server PostHog delivery failures log safely without throwing.
- Test GA4 comparator events are not treated as source-of-truth conversions.
- Later webhook phase: test bad HMAC, stale timestamp, duplicate delivery, Redis unavailable/error, PostHog delivery failure, non-Customer Opportunity, stale `SystemModstamp`, and revenue/date corrections.
- Run `npm run lint`, `npm run type-check`, `npm run build`, and `npm test` for touched `lib/**`, `services/**`, forms, server actions, or webhook routes.

## Organic Growth Dashboards To Plan

The event taxonomy now exists and core live events have been validated. Dashboard work can proceed, with outcome dashboards waiting on the Salesforce Opportunity webhook phase.

- Content and channel to accepted lead.
- Blog/state page to CTA to form start to accepted lead.
- Guide downloads to accepted lead.
- Concierge engagement to accepted lead.
- Accepted lead to Salesforce stage progression.
- Accepted lead to closed won/lost and paid complete.
- Revenue, cashback, and charity impact after revenue semantics are confirmed.
- GA4 comparator limited to web-form confirmed conversions, with concierge excluded unless a future GA4 Measurement Protocol plan exists.
