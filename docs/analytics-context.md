# VeteranPCS analytics context (shared by the three Claude Code tasks)

Copy this file into the site repo as `docs/analytics-context.md`. It summarises findings from the weekly analytics review (week ending 2026-11-08, PostHog rerun on 2026-11-15). Treat the numbers as findings to verify, not as ground truth about the code. Nobody has inspected the code yet.

## Analytics stack

- **PostHog** is the primary analytics tool: project 480186, US cloud, timezone UTC. posthog-js 1.391.2, sent through a reverse proxy at `/ingest`. Every event carries `$config_defaults = 2026-01-30T00:00:00Z`. History starts 2026-06-22.
- **GA4** is the cross-check and the only source for year-over-year: property 289589120.
- **Search Console** covers `https://www.veteranpcs.com/`.

## PostHog event mapping (as observed)

| Purpose | Event | Key properties |
|---|---|---|
| Page load | `$pageview` | fires on full page loads only today (see Known issue 1) |
| Leave page | `$pageleave` | ~51% of pageviews |
| Blog content view | `content_viewed` | `content_slug`, `content_type`, `topic_cluster`, `journey_stage`, `source_page_path` |
| State hub view | `state_page_viewed` | `$pathname` (e.g. `/texas`) |
| CTA click | `cta_clicked` | CTA id values seen include `state_agent_card_contact`, the state hero "find agent" button, `header_desktop_find_agent`, `blog_mobile_sticky_agent`, `blog_find_agent_in_state` (exact property names unconfirmed, so check them in code) |
| Form funnel | `form_started` → `form_submit_attempted` → `form_validation_failed` | `form_id` (`contact_agent`, `contact_lender`, `contact_form`, `keep_in_touch`, `first_time_homebuyer_guide`, `va_loan_guide`) |
| Lead created | `lead_conversion_created` | **server-side** (posthog-node), no `$session_id`; `form_id`, `partner_type`, `partner_salesforce_id`, `submission_id`, `state_slug`, `source_page_path`, `pageview_count_before_conversion` |
| Other | `bah_calculator_used`, `moving_bonus_calculated`, `calculator_cta_clicked`, `$web_vitals`, `$exception` | |

- Agent lead = `lead_conversion_created` with `form_id = 'contact_agent'`.
- `vpcs_visitor_id` is present on both client and server events.

**"Clean" traffic** excludes two kinds of session:

- any session with a `$pageview` where `$virt_is_bot = true`;
- Direct sessions (`session.$channel_type = 'Direct'`) with `$session_duration = 0`. These are mostly China and datacenter crawlers.

## Key numbers, week of 2–8 Nov 2026 (PostHog, clean unless noted)

- Traffic:
  - 1,563 sessions (GA4 bot-cleaned: 1,507). Desktop 52%, mobile 47%.
  - 15 agent leads (0.96% of sessions), 1 lender lead.
- Where leads came from:
  - State hubs produced 11 leads, the homepage 3 and the blog 1.
  - Those 15 leads came from 1,183 blog landings in total.
- Pages per session: PostHog 1.13, GA4 2.6.

## Known issue 1: in-site navigations aren't tracked as `$pageview` (Task A)

- 0 of 2,374 `$pageview` events had an internal veteranpcs.com `$referrer`.
- Rebuilding visits from other events gives roughly 1.25 distinct pages per session. PostHog misses at least 7–9% of page visits overall.
- Missing pageviews are worst on conversion pages: no `$pageview` in 76% of sessions active on `/contact-agent`, 6 of 9 on `/contact-lender`, and 23% on `/`.
- Likely cause: something overrides `capture_pageview` (for example `capture_pageview: true`), when `history_change` would track in-site navigation.
- GA4's 2.6 pages per session may itself be inflated. A GA4 bot showed exactly 2 `page_view` hits per session, which suggests a double fire.

## Known issue 2: desktop visitors rarely start the contact-agent form (Task B)

- Same-intent comparison: of US visitors who clicked a state-page agent card (`state_agent_card_contact`) and then reached `/contact-agent` in the last 28 days, 20% started the form on desktop (9/45) against 47% on mobile (33/70).
- Once started, the desktop form converts: 5 of 9 became leads.
- With suspected automation removed, the start rate was 26% on desktop and 45% on mobile (2–8 Nov).
- Unflagged desktop automation inflates desktop sessions and LCP. Its signatures are:
  - viewport = screen at 1920x1080 on Windows Chrome via Direct;
  - Linux Chrome with impossible window sizes;
  - 1366x768 windows;
  - single-pageview Direct sessions with no `$web_vitals` event.
- Page speed is probably not the main cause:

  | US, p75 LCP on `/` + `/contact-agent` | LCP |
  |---|---|
  | Clean desktop | 2.3s |
  | Mobile | 1.9s |
  | Automated desktop cluster | 8.1s |

- What desktop users do instead of starting the form:
  - Click the header "Find an Agent" while already on `/contact-agent`: 23 clicks in 11 sessions, up to 4 per session.
  - Scroll past the form and leave through the footer state links (~9 sessions).
  - Click the logo (15 sessions).
  - Mobile shows almost none of this.
- Hypothesis: on desktop, `/contact-agent` doesn't read as "this is how you contact an agent". The form may be below the fold or visually secondary, and the header link reloads the same page. Not yet verified, because nobody has inspected the page layout.

## Known issue 3: blog readers rarely reach a state hub (Task C)

90 days, 2026-08-11 to 11-08.

- Conversion by session type:

  | Session type | Lead rate |
  |---|---|
  | Blog-reader sessions (~77% of sessions) | 0.10% (16 leads) |
  | Sessions landing on a state hub | 4.9% |
  | Sessions landing on the homepage | 3.0% |

- Blog → matching state hub → lead happened **once in 90 days**. Blog pages sent only ~25 sessions to hubs, through `blog_find_agent_in_state`, footer links and state selects.
- Most blog → contact traffic goes straight to `/contact-agent` via the mobile sticky CTA (85 sessions, 6 leads).
- Blog visitors who reach a hub and then `/contact-agent` convert far better: 4 of 9.
- Highest-traffic posts with zero downstream leads:

  | Post | Readers |
  |---|---|
  | house-hunting-leave-pcs-guide | 1,177 |
  | what-military-bases-are-in-california | 680 |
  | what-military-bases-are-in-north-carolina | 498 |
  | what-military-bases-are-in-washington | 489 |
  | what-military-bases-are-in-alaska | 469 |
  | what-military-bases-are-in-florida | 390 |
  | what-military-bases-are-in-georgia | 302 |

- Target: raise blog → hub click-through from ~0.8% to 3%+ of blog sessions, worth roughly 10 extra leads per 90 days.

## Coordination rules for the three tasks

- **Merge Task A first.** Tasks B and C are measured with PostHog funnels, which are unreliable until in-site pageviews are tracked.
- **Reserved new event names.** Don't invent others without noting them here.
  - `cta_clicked` with CTA id `blog_state_hub_cta` (Task C) and `contact_agent_header_scroll` (Task B).
  - Feature flag keys: `desktop-contact-agent-v2` (Task B) and `blog-state-hub-cta` (Task C).
  - Added by Task C: `cta_clicked` properties `placement` (`inline`, `end`) and `state_source` (`post`, `picker`) on `blog_state_hub_cta`. Details are in `docs/analytics/telemetry-taxonomy.md`, "Blog State Hub CTA Experiment".
  - Added by Task C: `lib/analytics/useFeatureFlagVariant.ts`, a generic client hook for reading a PostHog flag. Task B can reuse it instead of adding its own.
- All three tasks may touch the PostHog provider/init module. Keep edits there minimal and isolated to reduce merge conflicts.
- **Never submit real leads.** Forms write to Salesforce. Test against local dev with submission mocked or stubbed, or use whatever test mode the repo provides.
- No PostHog dashboards, insights or settings changes from code tasks. PostHog bot rules and annotations are done by a human in the PostHog UI.
