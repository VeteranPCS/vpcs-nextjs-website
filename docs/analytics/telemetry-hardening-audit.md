# Telemetry Hardening Audit

Last updated: 2026-06-26

This document captures the post-implementation coverage audit for VeteranPCS telemetry and the remediation status from the explicit telemetry hardening pass. Use it with `docs/analytics/telemetry-taxonomy.md` when planning future telemetry changes.

## Bottom Line

The core lead funnel telemetry is in place, and the 2026-06-26 hardening pass added explicit CTA coverage across the highest-value header, footer, homepage, state, blog/content, guide, calculator, and marketing surfaces without enabling PostHog autocapture.

Confidence levels after the hardening pass:

- Core lead funnel: high. Page counters, blog/state views, Customer form lifecycle, guide downloads, accepted Salesforce lead conversions, BAH usage, moving bonus, VA calculator CTA, and state partner-card CTAs are implemented.
- Explicit high-value CTA coverage: medium-high pending post-deploy validation. Reusable CTA infrastructure now covers the known high-value gaps from this audit; final confidence depends on deployed PostHog volume/property checks.
- Privacy posture: high pending post-deploy validation. New telemetry uses path-only destinations, safe field-level validation codes, contact flags, query metrics, and safe submission ids instead of raw user input.

Do not build final PostHog dashboards until the post-deploy SQL checks in `telemetry-taxonomy.md` confirm CTA coverage, required properties, and absence of blocked PII properties in live data.

## Covered Spine

- `PageviewTracker` is mounted globally in `app/layout.tsx`.
- `content_viewed` is mounted on blog post pages in `app/(site)/blog/[slug]/page.tsx`.
- `state_page_viewed` is mounted on state pages in `app/(site)/[state]/page.tsx`.
- Blog search emits `blog_search_submitted` and `blog_search_results` without raw query text.
- State agent/lender cards emit `cta_clicked` with partner and state context.
- State CTA band emits `cta_clicked` for agent/lender paths.
- Customer forms emit form lifecycle events and pass `formTrackingPayload()` into server submissions.
- Guide forms emit `guide_download_requested`, `guide_download_started`, and form lifecycle events.
- Server-confirmed `lead_conversion_created` fires only after accepted Salesforce Web-to-Lead and skips spam-quarantined leads.
- BAH usage emits `bah_calculator_used` with `zip_prefix`, not full ZIP.
- Moving bonus emits `moving_bonus_calculated` and its CTA emits `calculator_cta_clicked`.
- VA loan calculator custom quote CTA emits `calculator_cta_clicked`.
- Concierge has basic open/message/tool/completion telemetry.
- Shared CTA tracking now lives in `lib/analytics/cta.ts` and `components/common/TrackedCtaLink.tsx`.
- `AgentCtaLink` and `LenderCtaLink` emit canonical `cta_clicked` events.
- Header, footer, homepage, state map, state page, blog/content, guide, calculator, and marketing CTAs have explicit PostHog coverage through `cta_clicked` or `calculator_cta_clicked`.
- Contact-lender success handling accepts message/submission-id server responses as successful accepted submissions.
- Form submit attempts are tracked before client validation, including invalid submissions.
- Validation error telemetry preserves safe field-level codes while blocking raw values.
- Concierge open, seeded/manual message, agent-card selection, approval, and lead-tool completion telemetry aligns with the taxonomy and avoids raw text.
- Server PostHog capture failures are logged safely without throwing or leaking event payload contents.

## Hardening Pass Remediation

Completed in this pass:

- Added reusable tracked CTA infrastructure with path-only destination sanitization and shared agent/lender wrappers.
- Patched high-value CTA gaps across global navigation, footer links, homepage sections, state map/state pages, blog/content journeys, guide modules, calculator links, refinancing, Spanish, impact/charity, contact, and about-style marketing surfaces.
- Preserved existing GA/GTM comparator events while adding canonical PostHog events.
- Fixed contact-lender message-only success handling so accepted leads do not register as client-side submission failures.
- Moved customer-form submit-attempt telemetry before client validation so invalid attempts are counted.
- Preserved safe validation error codes for contact fields without sending raw names, email addresses, phone numbers, messages, or field values.
- Removed server-owned concierge event names from the client analytics event union.
- Aligned concierge approval telemetry to `tool_name` plus boolean `approved`.
- Added explicit telemetry for seeded concierge opens/messages and agent-card selection messages without raw text.
- Added safe `submission_id` to completed concierge lead-tool telemetry when the underlying service returns one.
- Added safe logging for server PostHog capture failures.
- Added focused tests for CTA sanitization, privacy regressions, contact-lender success handling, validation codes, concierge/server event boundaries, and server PostHog failure logging.

Still intentionally out of scope:

- Salesforce Opportunity webhook and outcome events.
- PostHog dashboard creation or modification.
- Salesforce metadata/admin config changes.
- Salesforce test lead creation.
- Historical PostHog deletion or anonymization.
- Broad PostHog autocapture.
- New `concierge_chat_failed` or `concierge_chat_blocked` events; add these only through a future taxonomy update and route-level implementation.

## Pre-Pass High-Priority Gaps (Historical)

The items below are preserved as the source audit that drove the hardening pass. Re-check code and live PostHog data before treating any historical gap as still open.

### Shared And Global CTAs

- `components/common/AgentCtaLink.tsx` and `components/common/LenderCtaLink.tsx` only build URLs; they do not emit `cta_clicked`.
- `components/Header.tsx` uses those wrappers and plain links, so global navigation and primary header CTAs are under-instrumented.
- `components/Footer/Footer.tsx` Explore links, calculator links, contact links, and state/location links do not emit canonical CTA events.

### Homepage And Marketing Surfaces

- Homepage hero CTAs in `components/homepage/HeroSection/HeroSection.tsx` are untracked.
- `components/homepage/StateMap.tsx` sends GTM only; desktop map links, mobile dropdown links, and the bottom match CTA do not emit canonical `cta_clicked`.
- Homepage/marketing cards and CTAs such as `VeteranPCSWorksComp`, `MakeItHome`, `CoveredComp`, impact/charity partner CTAs, refinancing CTAs, and Spanish-page CTAs are mostly plain links.
- Guide modules track guide form events, but adjacent secondary CTAs are silent PostHog exits:
  - `components/homepage/VaLoanGuideDownload.tsx`
  - `components/homepage/VeteranPCSWorksComp/HomebuyerGuideDownload.tsx`
  - `components/common/DownloadGuideComponent.tsx`

### Blog And Content Journeys

- Blog landing hero/article/category links are not tracked as content-navigation CTAs.
- Blog CTA bands are untracked:
  - `components/BlogPage/BlogPage/BlogCTA/BlogCta.tsx`
  - `components/BlogDetails/BlogDetailsCta/BlogDetailsCta.tsx`
  - mobile sticky CTA in `app/(site)/blog/[slug]/page.tsx`
- Author and MDX CTAs are untracked:
  - `components/Blog/AuthorByline.tsx`
  - `components/Blog/mdx/AgentContactLink.tsx`
  - `components/Blog/mdx/PromoCard.tsx`
- Blog search result clicks and no-result recovery links are not canonical CTAs.
- Category page "Find an Agent" CTA in `app/(site)/blog/category/[category]/CategoryBlogPage.tsx` is untracked.

### State Pages

- State hero "Find an agent for me" in `components/StatePage/StatePaheHeroSection/StatePageHeroSection.tsx` is untracked.
- State related-guide cards in `components/StatePage/StatePageRelatedGuides/StatePageRelatedGuides.tsx` are untracked.
- `components/StatePage/StatePageLetFindAgent/StatePageLetFindAgent.tsx` emits `cta_clicked`, but omits state context.

### Forms And Calculators

- `app/(site)/contact-lender/page.tsx` can mark a successful accepted lead as client-side `form_submission_failed` because it only treats `redirectUrl` as success, while the service may return `{ message, submissionId }`.
- Invalid form submits currently emit `form_validation_failed` but not `form_submit_attempted`, so submit attempts before validation are undercounted.
- `errorCodesFromErrors` may over-sanitize safe validation field codes for fields like email, phone, firstName, and lastName.
- BAH result CTA "Questions about VA Loan?" in `components/BAHCalculator.tsx` should emit `calculator_cta_clicked`.
- PCS resource calculator navigation cards are untracked.
- Legacy GTM for moving bonus still receives raw `home_value`; PostHog is bucketed.
- Accepted-lead tests mainly assert the contact-agent path; other canonical Customer form IDs need coverage.

### Concierge

- `concierge_tool_approval_responded` does not match the taxonomy: docs expect `tool_name` and boolean `approved`, while code sends `approval_response`.
- Concierge opens from form CTAs call `openConcierge()` without telemetry, so seeded opens are undercounted.
- `concierge_message_sent` tracks manual messages but not seeded opening messages or agent-card selection messages.
- `concierge_chat_completed` has no failure or blocked counterpart, so guardrail/rate-limit/model failures are opaque.
- Server-owned event names are still present in the client event union, which creates a misuse risk.
- `concierge_tool_completed` does not include `submission_id`, even though the underlying form services return one.
- `lib/posthog-server.ts` swallows server PostHog delivery failures without logging.

## Completed Implementation Sequence

1. Create a reusable tracked CTA pattern.
   - Add a client helper/component for `Link`-based CTAs.
   - Extend `AgentCtaLink` and `LenderCtaLink` so shared contact CTAs emit `cta_clicked` with `cta_id`, `cta_intent`, `cta_position`, `cta_component`, and path-only `destination_path`.

2. Patch high-value CTA surfaces.
   - Header, footer, homepage hero, state map, state hero, guide secondary CTAs, BAH result CTA, calculator cards, blog CTA bands, blog sticky CTA, author/MDX CTA helpers, search result clicks, and state related-guide cards.

3. Fix telemetry correctness bugs.
   - Normalize contact-lender success handling.
   - Decide whether `form_submit_attempted` should fire before validation and implement consistently.
   - Preserve safe validation error codes without leaking values.
   - Align concierge approval properties with taxonomy.
   - Track seeded concierge opens/messages.
   - Include `submission_id` on concierge tool completion where available.
   - Log server PostHog delivery failures safely.

4. Add focused tests.
   - CTA helper property shape and path sanitization.
   - Shared agent/lender CTA clicks.
   - BAH result CTA.
   - Guide secondary CTAs.
   - Contact-lender success handling.
   - Validation error-code behavior.
   - Accepted-lead telemetry for all six Customer form IDs.
   - Concierge approval/open/message/tool completion behavior.

5. Verify locally and after deploy.
   - Run `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`.
   - After deployment, use the SQL snippets in `telemetry-taxonomy.md` to verify event counts, required property coverage, blocked PII checks, form lifecycle, and accepted conversions.

## Planning Notes

- Keep PostHog autocapture disabled unless there is an explicit privacy-reviewed decision to change it.
- Prefer properties on `cta_clicked` over creating new click events.
- Do not send names, email, phone, raw messages, raw search queries, full URL queries, or full ZIP codes to PostHog.
- Dashboard work should wait until this hardening pass is deployed and the SQL checks in `telemetry-taxonomy.md` confirm live event coverage and privacy safety.
