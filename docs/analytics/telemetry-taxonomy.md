# VeteranPCS Telemetry Taxonomy

Last updated: 2026-07-12

This is the durable reference for VeteranPCS web telemetry. Use it when changing analytics code, troubleshooting PostHog, comparing against Google Analytics, or planning Salesforce closed-loop reporting.

## Systems

PostHog is the source of truth for new web funnel telemetry and Salesforce attribution joins. Google Analytics / GTM remains a comparator for web-funnel behavior during dual-run; it is not the source of truth for Salesforce stages, revenue, or accepted lead conversion.

Salesforce remains the business source of truth for Leads, Customer Opportunities, stages, and revenue fields.

## Implementation Files

| Surface | Files |
|---|---|
| Client analytics wrapper | `lib/analytics/client.ts` |
| Server analytics wrapper | `lib/analytics/server.ts` |
| Visitor id and attribution state | `lib/analytics/visitor.ts` |
| Property sanitizer | `lib/analytics/sanitizer.ts` |
| Reusable CTA tracking | `lib/analytics/cta.ts`, `components/common/TrackedCtaLink.tsx`, `components/common/AgentCtaLink.tsx`, `components/common/LenderCtaLink.tsx` |
| PostHog browser SDK config | `instrumentation-client.ts` |
| Page/content/search trackers | `components/Analytics/Trackers.tsx` |
| Salesforce Web-to-Lead attribution fields | `services/salesforceLeadParams.ts`, `services/salesForcePostFormsService.tsx` |
| Server-side PostHog delivery | `lib/posthog-server.ts` |

## Identity And Join Keys

`vpcs_visitor_id` is the first-party anonymous visitor key and the default PostHog identity for funnel telemetry. It is generated client-side, stored in localStorage and a first-party cookie, and sent through form submissions as analytics context.

`submission_id` is the server-minted form submission id. It is the stable join key between an accepted Salesforce Lead and a future Salesforce Opportunity.

Email, name, phone, free text, raw search text, full URL query strings, full ZIP codes, and Salesforce payloads must never be used as PostHog distinct IDs or event properties.

## Salesforce Attribution Fields

Use the generated Web-to-Lead field IDs for Lead payloads, not API names.

| Object | API Name | Web-to-Lead Field ID | Purpose |
|---|---|---|---|
| Lead | `VPCS_Visitor_ID__c` | `00NRg00000PjSD3MAN` | PostHog visitor/person join id |
| Lead | `VPCS_Submission_ID__c` | `00NRg00000PjSEfMAN` | Accepted lead / opportunity join id |
| Opportunity | `VPCS_Visitor_ID__c` | n/a | Copied from Lead conversion mapping |
| Opportunity | `VPCS_Submission_ID__c` | n/a | Copied from Lead conversion mapping |

Known Salesforce mapping:

- `Lead.VPCS_Visitor_ID__c -> Opportunity.VPCS_Visitor_ID__c`
- `Lead.VPCS_Submission_ID__c -> Opportunity.VPCS_Submission_ID__c`

Record-level Opportunity propagation is only verifiable after an attributed Customer Lead is converted.

## Common PostHog Properties

Every custom PostHog event should include:

| Property | Notes |
|---|---|
| `analytics_schema_version` | Current value: `1` |
| `journey_stage` | `top`, `mid`, `bottom`, or later `outcome` |
| `vpcs_visitor_id` | Present when browser analytics context exists |
| `source_page_path` | Path only, no query string |

Common optional properties:

| Property | Use |
|---|---|
| `submission_id` | Accepted lead joins |
| `form_id` | Form lifecycle and conversion reporting |
| `lead_source` | Salesforce LeadSource-compatible value |
| `guide_id` | `va_loan_guide`, `first_time_homebuyer_guide` |
| `state_code`, `state_slug` | State pages, partner CTAs, lead intent |
| `partner_type` | `agent` or `lender` |
| `partner_salesforce_id` | Salesforce Account/partner id, not a person name |
| `cta_id`, `cta_intent`, `cta_position`, `cta_component`, `cta_location`, `cta_label` | Click reporting dimensions |
| `destination_path` | Path only, no query string |
| `page_type` | Route/content surface grouping for CTA coverage |
| `content_slug`, `content_type` | Content-navigation CTA context |
| `calculator_id`, `calculator_name` | Calculator-specific CTA context |
| `input_origin`, `concierge_topic` | Concierge open/message context; controlled enums only |
| `has_email`, `has_phone` | Boolean contact coverage flags only |
| `first_touch_attribution`, `last_touch_attribution` | Snapshotted onto `lead_conversion_created` |
| `pageview_count_before_conversion` | Safe pre-conversion counter |
| `cta_click_count_before_conversion` | Safe pre-conversion counter |
| `form_attempt_count_before_conversion` | Safe pre-conversion counter |

## Canonical PostHog Events

### Top Funnel

| Event | Emitted By | Key Properties |
|---|---|---|
| `$pageview` | PostHog SDK | `$pathname`, `vpcs_visitor_id` when initialized after telemetry deploy |
| `content_viewed` | Blog posts | `content_id`, `content_slug`, `content_type`, `topic_cluster` |
| `state_page_viewed` | State landing pages | `state_code`, `state_slug`, `source_content_type` |
| `blog_search_submitted` | Blog search results pages | `query_length`, `query_word_count`, `query_word_count_bucket`, `result_count`, `result_bucket` |
| `blog_search_results` | Blog search results pages | `result_count`, `result_bucket`, `page` |
| `bah_calculator_used` | BAH calculator success | `zip_prefix`, `paygrade`, `dependents`, `year`, `mha` |
| `moving_bonus_calculated` | Moving bonus calculator | `home_value_bucket`, `bonus_amount`, `charity_amount` |

### Mid Funnel

| Event | Emitted By | Key Properties |
|---|---|---|
| `cta_clicked` | Shared tracked CTA links, state CTAs, partner cards, blog CTAs, popup CTAs | `cta_id`, `cta_intent`, `cta_position`, `cta_component`, `cta_location`, `cta_label`, `page_type`, `destination_path`, optional partner/state/content fields |
| `calculator_cta_clicked` | VA loan calculator, moving bonus calculator, BAH result CTA, PCS calculator cards | `calculator_id`, `calculator_name`, `cta_id`, `cta_intent`, `destination_path`, calculator-specific buckets |
| `form_started` | Customer forms | `form_id`, optional `guide_id` |
| `form_submit_attempted` | Customer forms before client validation | `form_id`, `has_email`, `has_phone`, optional `guide_id`, state fields |
| `form_validation_failed` | Customer forms | `form_id`, `failure_stage`, safe field-level `error_codes` |
| `form_submission_failed` | Customer forms | `form_id`, `failure_stage`, `error_codes` |
| `guide_download_requested` | Guide forms | `guide_id`, `form_id`, `has_email` |
| `guide_download_started` | Guide forms after accepted server response | `guide_id`, `form_id` |
| `concierge_opened` | Concierge provider open paths | `source_page_path`, optional `input_origin`, `concierge_topic` |
| `concierge_message_sent` | Concierge widget manual sends, seeded messages, agent-card selections | `query_length`, `query_word_count`, optional `input_origin`, no raw text |
| `concierge_tool_approval_responded` | Concierge approval UI | `tool_name`, `approved` |
| `concierge_tool_submitted` | Server-side concierge lead tools | `tool_name`, `form_id`, `lead_source`, optional state/guide fields |
| `concierge_tool_completed` | Server-side concierge lead tools | same as submitted plus optional `submission_id` |
| `concierge_tool_failed` | Server-side concierge lead tools | same as submitted plus `failure_stage`, `error_codes` |
| `concierge_chat_completed` | Chat route finish | `tokens_used`, `source_page_path` |

### Bottom Funnel

| Event | Emitted By | Key Properties |
|---|---|---|
| `lead_conversion_created` | Server after Salesforce Web-to-Lead acceptance | `form_id`, `lead_source`, `submission_id`, `vpcs_visitor_id`, contact flags, attribution snapshots, pre-conversion counters |

This is the canonical accepted-lead event. It must fire exactly once after Salesforce accepts a Customer Web-to-Lead submission. It must not fire for validation failures, abandoned forms, network errors before acceptance, or spam-quarantined leads.

### Outcome Funnel (Planned)

These are not implemented yet. They belong to the later Salesforce Opportunity webhook phase.

- `lead_stage_changed`
- `lead_under_contract`
- `lead_transaction_closed`
- `lead_closed_won`
- `lead_cashback_paid`
- `lead_closed_lost`
- `lead_revenue_finalized`

## Click Taxonomy Decision

Use `cta_clicked` as the canonical event for partner cards, state CTAs, blog CTAs, popup CTAs, and generic contact links. Distinguish the click with properties instead of separate event names:

- `cta_id`
- `cta_intent`
- `cta_position`
- `cta_component`
- `cta_location`
- `cta_label`
- `page_type`
- `partner_type`
- `partner_salesforce_id`
- `state_code`
- `state_slug`
- `content_slug`
- `content_type`
- `destination_path`

Do not add dedicated events like `agent_card_clicked`, `lender_card_clicked`, or `contact_click` unless a future reporting requirement cannot be handled with `cta_clicked` properties.

Use `calculator_cta_clicked` only for calculator-specific CTAs where calculator context is central to analysis.

### Blog Discovery Surface CTA Registry (2026-07 refactor)

All blog discovery modules consolidate onto `cta_clicked`. `result_count` on `blog_search_results` always means the TOTAL ranked count, never the page slice; `page` records which results page fired the event. Numbered pagination links (`PaginationNav`) are deliberately untracked navigation chrome; pageviews capture them.

Post template (`page_type: blog_post`):

| cta_id | cta_position | cta_intent |
|---|---|---|
| `blog_breadcrumb_category` | `blog_post_breadcrumb` | `content_navigation` |
| `blog_details_find_agent` / `blog_details_find_lender` (kept; carry `state_slug`; single-intent rationalization now renders exactly one block per post, chosen by the post's category `partnerIntent` in `content/_data/blog-components.json`; payload now also carries `content_slug` and `content_type: 'blog_post'`) | `blog_details_cta_band` | `contact_agent` / `contact_lender` |
| `blog_next_guide` | `blog_post_after_body` | `content_navigation` |
| `blog_related_card` / `blog_related_card_view_all` (`blog_related_card_view_all` is documented, not yet wired in code; see PR #169) | `blog_post_related_rail` | `content_navigation` |
| `blog_find_agent_in_state` (kept; built via `buildCtaProperties`; renders only on agent-intent, state-matched posts; position `top` only, `bottom` retired) | `top` | `state_agent_search` |
| `blog_mobile_sticky_agent` (fixed mobile footer on agent-intent posts; added to correct prior documentation drift, the id already fires in code) | `mobile_sticky_footer` | `contact_agent` |
| `blog_mobile_sticky_lender` (fixed mobile footer on lender-intent posts; new) | `mobile_sticky_footer` | `contact_lender` |

Blog landing (`page_type: blog_landing`):

| cta_id | cta_position | cta_intent |
|---|---|---|
| `blog_landing_category_nav` | `blog_landing_nav_strip` | `content_navigation` |
| `blog_landing_start_here` | `blog_landing_start_here` | `content_navigation` |
| `blog_landing_rail_card` / `blog_landing_rail_view_all` | `blog_landing_category_rail` | `content_navigation` |
| `blog_landing_agent_cta` / `blog_landing_lender_cta` (ids kept; intent changed from `state_map`, destination now `/contact-agent` and `/contact-lender`) | `blog_landing_cta_band` | `contact_agent` / `contact_lender` |
| `blog_landing_state_link` (+ `state_slug`; the "All states" chip fires it without `state_slug`) | `blog_landing_state_rail` | `state_agent_search` |
| `blog_landing_latest_card` | `blog_landing_latest` | `content_navigation` |

Archive `/blog/page/N` (`page_type: blog_archive`):

| cta_id | cta_position | cta_intent |
|---|---|---|
| `blog_archive_card` | `blog_archive_grid` | `content_navigation` |
| `blog_archive_find_agent` / `blog_archive_find_lender` | `blog_archive_cta_band` | `contact_agent` / `contact_lender` |

Category hubs (`page_type: blog_category`):

| cta_id | cta_position | cta_intent |
|---|---|---|
| `blog_category_card` (replaces `blog_article_card`; position kept for distribution continuity) | `blog_article_grid` | `content_navigation` |
| `blog_category_pillar` | `blog_category_pillar` | `content_navigation` |
| `blog_category_find_agent` / `blog_category_find_lender` | `blog_category_header`, `blog_category_cta_band` | `contact_agent` / `contact_lender` |

Search results (`page_type: blog_search`):

| cta_id | cta_position | cta_intent |
|---|---|---|
| `blog_search_result_card` (replaces `blog_search_result_image` + `blog_search_result_title`) | `blog_search_results` | `content_navigation` |
| `blog_search_results_all_guides`, `blog_search_no_results_all_guides`, `blog_search_no_results_category` (unchanged) | `blog_search_results_header` / `blog_search_no_results` | `content_navigation` |

Retired ids (stop appearing after the refactor deploy): `blog_article_card` (hub grid), `blog_search_result_image`, `blog_search_result_title`. `pcs_resources_blog_card` no longer fires on post pages (the related rail now emits `blog_related_card`) but still fires on `/va-loan-help`, `/pcs-resources`, and `/thank-you`.

The single-intent CTA rationalization change (branch `feat/blog-post-cta-rationalization`, pending deploy as of 2026-07-12) retires `blog_find_agent_in_state` position `bottom`. Only position `top` continues to fire, and only on agent-intent, state-matched posts. This does not retire the `blog_find_agent_in_state` id itself, only the `bottom` position value.

### Blog Post CTA Comparability (2026-07 single-intent rationalization)

Before this change, `blog_details_find_agent` and `blog_details_find_lender` both rendered on every blog post, so a click-through rate could be computed against total blog post views. As of this change, the `blog_details_cta_band` renders exactly one block per post, chosen by the post's category `partnerIntent`. Treat the two ids as separate populations with separate denominators, not two variants sharing one pool:

- `blog_details_find_agent`, `blog_mobile_sticky_agent`, and `blog_find_agent_in_state` (position `top`): denominator is agent-intent posts only, 247 posts as of 2026-07-12 (`pcs-help`, `us-military-bases`, `military-transition-help`, `things-to-do-near-you`, and `real-estate-insights` categories).
- `blog_details_find_lender` and `blog_mobile_sticky_lender`: denominator is lender-intent posts only, 95 posts as of 2026-07-12 (`va-loan-help` and `financial-guidance` categories).

Build the denominator from `content_viewed` (carries `content_slug` and `topic_cluster`) sequenced or joined with `cta_clicked` per `cta_id`, and segment both sides by category intent by mapping `topic_cluster` to `partnerIntent` in `content/_data/blog-components.json`. Do not divide clicks on one id by pageviews of the whole blog post population; that overstates the denominator for both intents now that only one CTA block renders per post.

Pre/post comparison windows must start no earlier than 2026-06-27, when `cta_clicked` with `page_type: blog_post` first fired in PostHog. Blog `$pageview` capture started earlier, on 2026-06-22, but that is a pageview-only signal and understates the CTA baseline if used as the instrumentation start date. Exclude a QA burst on 2026-07-12 between 23:40 and 23:43 UTC: a single test session produced roughly 30 `cta_clicked` events in that window while validating the PR #169 blog discovery surfaces (`blog_category` and `blog_archive` page types). Verified against the PostHog `events` table on 2026-07-12.

Dashboard disposition: any saved PostHog insight or dashboard tile that filters `cta_id = 'blog_mobile_sticky_agent'` alone now undercounts total mobile sticky footer engagement, because lender-intent posts fire `blog_mobile_sticky_lender` instead. File a follow-up to add `blog_mobile_sticky_lender` to those filters. The same applies to any saved insight built around `blog_find_agent_in_state` that does not segment out the retired `bottom` position.

These ctaId changes are ticketed by the Blog Post CTA Rationalization plan (branch `feat/blog-post-cta-rationalization`); this keeps them consistent with the ctaId-stability rule recorded for the homepage cycle in `docs/ai-first/homepage-followups.md:33`, which requires a ticket for any ctaId change.

## Customer Form IDs

Closed-loop Customer lead telemetry covers:

| `form_id` | Salesforce Lead Source | Notes |
|---|---|---|
| `contact_agent` | `Contact Agent` | Agent/contact-agent form and concierge agent tool |
| `contact_lender` | `Contact Lender` | Lender/contact-lender form and concierge lender tool |
| `keep_in_touch` | `Keep in Touch` | Homepage keep-in-touch form |
| `contact_form` | `Contact Form` | General contact form and concierge general inquiry |
| `va_loan_guide` | `VA Loan Guide` | VA loan guide forms and concierge VA guide tool |
| `first_time_homebuyer_guide` | `First Time Home Buyer Guide` | Homebuyer guide forms |

Partner listing, recruiting, and internship flows are outside the Customer closed-loop taxonomy unless separately planned.

## Attribution Snapshots

First-touch and last-touch attribution are stored client-side and snapshotted onto `lead_conversion_created`.

Allowed attribution keys:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `gclid`
- `gbraid`
- `wbraid`
- `fbclid`
- `msclkid`
- `referrer_domain`
- `landing_page_path`
- `captured_at`

Do not send raw landing URLs with query strings.

## Privacy Guardrails

The sanitizer blocks contact and free-text keys and drops values that look like email addresses, phone numbers, full ZIP codes, or unsafe URLs with query strings.

Allowed substitutes:

| Sensitive Data | Use Instead |
|---|---|
| Email present | `has_email: true` |
| Phone present | `has_phone: true` |
| Raw search query | `query_length`, `query_word_count`, buckets |
| Concierge message | `query_length`, `query_word_count` |
| ZIP code | `zip_prefix`, MHA, state, or controlled bucket |
| Full URL | `source_page_path`, `destination_path` |
| Partner name | `partner_salesforce_id`, `partner_type` |
| Validation error message/value | safe field-level `error_codes` only |

## Google Analytics / GTM Comparator Events

GTM events still exist for continuity and web-funnel comparison. Treat these as comparator signals, not authoritative accepted conversions.

Known GTM events in the current app:

| GTM Event | Current Use |
|---|---|
| `conversion_contact_agent` | Contact-agent page submission path |
| `conversion_contact_lender` | Contact-lender page submission path |
| `conversion_contact_form` | General contact form |
| `conversion_keep_in_touch` | Keep-in-touch form |
| `conversion_download` | Guide download forms |
| `moving_bonus_calculator_interaction` | Moving bonus calculator interaction |
| `moving_bonus_calculator_cta_click` | Moving bonus calculator CTA |
| `bah_calculator_use` | BAH calculator success |
| `agentfinder_popup_*` | Agent finder popup lifecycle and submit actions |
| `state_map_interaction` | Homepage state map interaction |
| `get_listed_agent_submitted` | Agent listing request |
| `get_listed_lender_submitted` | Lender listing request |
| `blog_to_state_cta_click` | `FindAgentInState` blog post CTA (`blog_find_agent_in_state`), position `top`, agent-intent posts only; comparator alongside the PostHog `cta_clicked` event |

If a GTM conversion fires before a confirmed Salesforce acceptance, use the PostHog `lead_conversion_created` event for accepted-lead reporting.

## Troubleshooting In PostHog

Use the project timezone when reporting by day. As of this writing, the PostHog project timezone is UTC. If the business question means a local VeteranPCS day, convert America/Chicago to UTC before querying.

### Check New Event Counts

```sql
SELECT event, count() AS events, uniqExact(distinct_id) AS distinct_ids, min(timestamp) AS first_seen, max(timestamp) AS last_seen
FROM events
WHERE timestamp >= toDateTime('YYYY-MM-DD HH:MM:SS')
  AND timestamp < toDateTime('YYYY-MM-DD HH:MM:SS')
  AND event IN (
    '$pageview',
    'content_viewed',
    'state_page_viewed',
    'blog_search_submitted',
    'blog_search_results',
    'bah_calculator_used',
    'moving_bonus_calculated',
    'calculator_cta_clicked',
    'cta_clicked',
    'form_started',
    'form_submit_attempted',
    'form_validation_failed',
    'form_submission_failed',
    'guide_download_requested',
    'guide_download_started',
    'concierge_opened',
    'concierge_message_sent',
    'concierge_tool_approval_responded',
    'concierge_tool_submitted',
    'concierge_tool_completed',
    'concierge_tool_failed',
    'concierge_chat_completed',
    'lead_conversion_created'
  )
GROUP BY event
ORDER BY events DESC
LIMIT 100
```

### Check CTA Coverage By Surface

```sql
SELECT properties.cta_location AS cta_location,
       properties.page_type AS page_type,
       properties.destination_path AS destination_path,
       count() AS clicks,
       uniqExact(distinct_id) AS distinct_ids
FROM events
WHERE timestamp >= toDateTime('YYYY-MM-DD HH:MM:SS')
  AND timestamp < toDateTime('YYYY-MM-DD HH:MM:SS')
  AND event = 'cta_clicked'
GROUP BY cta_location, page_type, destination_path
ORDER BY clicks DESC
LIMIT 200
```

### Check CTA Required Properties

```sql
SELECT count() AS clicks,
       countIf(properties.cta_id IS NOT NULL) AS with_cta_id,
       countIf(properties.cta_intent IS NOT NULL) AS with_cta_intent,
       countIf(properties.cta_location IS NOT NULL OR properties.cta_component IS NOT NULL) AS with_location,
       countIf(properties.destination_path IS NOT NULL) AS with_destination_path,
       countIf(position(toString(properties.destination_path), '?') > 0) AS rows_with_query_strings
FROM events
WHERE timestamp >= toDateTime('YYYY-MM-DD HH:MM:SS')
  AND timestamp < toDateTime('YYYY-MM-DD HH:MM:SS')
  AND event = 'cta_clicked'
```

### Check Required Property Coverage

```sql
SELECT event,
       count() AS events,
       countIf(properties.analytics_schema_version IS NOT NULL) AS with_schema_version,
       countIf(properties.vpcs_visitor_id IS NOT NULL) AS with_visitor_id,
       countIf(properties.journey_stage IS NOT NULL) AS with_journey_stage,
       countIf(properties.source_page_path IS NOT NULL OR properties.$pathname IS NOT NULL) AS with_path
FROM events
WHERE timestamp >= toDateTime('YYYY-MM-DD HH:MM:SS')
  AND timestamp < toDateTime('YYYY-MM-DD HH:MM:SS')
  AND event != '$pageview'
GROUP BY event
ORDER BY events DESC
LIMIT 100
```

### Check For Blocked PII Properties

```sql
SELECT event,
       count() AS events,
       countIf(
         properties.email IS NOT NULL
         OR properties.phone IS NOT NULL
         OR properties.name IS NOT NULL
         OR properties.first_name IS NOT NULL
         OR properties.last_name IS NOT NULL
         OR properties['firstName'] IS NOT NULL
         OR properties['lastName'] IS NOT NULL
         OR properties.message IS NOT NULL
         OR properties.query IS NOT NULL
         OR properties.search_query IS NOT NULL
         OR properties.raw_text IS NOT NULL
         OR properties.zip_code IS NOT NULL
         OR properties.zipCode IS NOT NULL
         OR properties.bah_zip_code IS NOT NULL
         OR position(toString(properties.source_page_path), '?') > 0
         OR position(toString(properties.destination_path), '?') > 0
       ) AS rows_with_blocked_properties
FROM events
WHERE timestamp >= toDateTime('YYYY-MM-DD HH:MM:SS')
  AND timestamp < toDateTime('YYYY-MM-DD HH:MM:SS')
GROUP BY event
ORDER BY rows_with_blocked_properties DESC, events DESC
LIMIT 100
```

### Check Lead Join Properties

```sql
SELECT event,
       properties.form_id AS form_id,
       count() AS events,
       countIf(properties.submission_id IS NOT NULL) AS with_submission_id,
       countIf(properties.vpcs_visitor_id IS NOT NULL) AS with_visitor_id
FROM events
WHERE timestamp >= toDateTime('YYYY-MM-DD HH:MM:SS')
  AND timestamp < toDateTime('YYYY-MM-DD HH:MM:SS')
  AND event IN ('lead_conversion_created', 'concierge_tool_completed')
GROUP BY event, form_id
ORDER BY event ASC, form_id ASC
LIMIT 100
```

### Check Accepted Lead Conversions

```sql
SELECT properties.form_id AS form_id,
       properties.lead_source AS lead_source,
       count() AS conversions,
       uniqExact(distinct_id) AS distinct_ids,
       min(timestamp) AS first_seen,
       max(timestamp) AS last_seen
FROM events
WHERE timestamp >= toDateTime('YYYY-MM-DD HH:MM:SS')
  AND timestamp < toDateTime('YYYY-MM-DD HH:MM:SS')
  AND event = 'lead_conversion_created'
GROUP BY form_id, lead_source
ORDER BY conversions DESC
LIMIT 100
```

### Check Form Lifecycle

```sql
SELECT event,
       properties.form_id AS form_id,
       count() AS events,
       uniqExact(distinct_id) AS distinct_ids,
       min(timestamp) AS first_seen,
       max(timestamp) AS last_seen
FROM events
WHERE timestamp >= toDateTime('YYYY-MM-DD HH:MM:SS')
  AND timestamp < toDateTime('YYYY-MM-DD HH:MM:SS')
  AND event IN (
    'form_started',
    'form_submit_attempted',
    'form_validation_failed',
    'form_submission_failed',
    'lead_conversion_created'
  )
GROUP BY event, form_id
ORDER BY form_id ASC, event ASC
LIMIT 100
```

## Troubleshooting In Salesforce

For same-day Customer lead checks, query Leads created in the business-day window and inspect:

- `LeadSource`
- `RecordType.Name`
- `IsConverted`
- `ConvertedOpportunityId`
- `VPCS_Visitor_ID__c`
- `VPCS_Submission_ID__c`

For Opportunity propagation, query Opportunities by `VPCS_Submission_ID__c` from the matching Lead. A successful conversion should show:

- `Lead.VPCS_Visitor_ID__c = Opportunity.VPCS_Visitor_ID__c`
- `Lead.VPCS_Submission_ID__c = Opportunity.VPCS_Submission_ID__c`

If no attributed Lead has converted, Opportunity propagation cannot be record-verified yet even if the Salesforce field mapping exists.

## Change Checklist

Before changing telemetry:

1. Add or update the event in `lib/analytics/client.ts` or `lib/analytics/server.ts`.
2. Confirm the event belongs to one journey stage.
3. Prefer adding properties to `cta_clicked` over creating a new click event.
4. Add sanitizer tests for any new property carrying user input or location data.
5. Add a source-level privacy regression test if a flow touches forms, concierge messages, ZIPs, or search queries.
6. Update this document.
7. Run `npm run type-check`, `npm run lint`, `npm test`, and `npm run build` for code changes.
