# VeteranPCS — Organic Growth & UX Recommendations

_Prepared from a read-only audit of the repo (`/Users/harperfoley/VPCS/vpcs-nextjs-website`), the 162-post content library + `content/_registry/internal-links.json`, the running analytics (`vpcs-weekly-analytics`, week ending 2026-06-14), and the live site via server-rendered fetch (the browser tool blocks the production domain, so `/blog` and `/` were pulled with `web_fetch`)._

> **v6 execution note (2026-06-18):** This recommendations file is historical strategy, not the current executable code plan. For code work, use `docs/blog-updates/organic-growth-projects/claude-opus-4.8-plan.md` as the source of truth. Where older prompts below mention A2 as a multi-step rebuild, B2 as `<BahByBaseTable mha year />`, `docs/ai-first/...` paths, repo Playwright scaffolding, or interleaved AN1-AN4 analytics work, those instructions are superseded by v6 and are annotated inline.

## How to use this document

Each recommendation has four parts: **Problem** (what we found), **Recommendation**, **Impact**, and a **ready-to-run prompt** tagged **[Claude Code]** (run in the repo for code changes) or **[Cowork]** (run in this desktop folder for content/data generation). Every prompt is self-contained — it names the files to read, the conventions to honor, the steps, and a definition of done. All code prompts open a **PR for review and never merge**; all content prompts follow the existing weekly blog routine standards and the `vpcs-blog` skill.

### Cross-cutting context every prompt should assume
- **Conventions:** `CLAUDE.md`, `.impeccable.md` (brand voice: Trusted/Patriotic/Helpful, 5th–7th grade, no emoji, no flag-waving), `.claude/skills/vpcs-blog/SKILL.md`, `lib/blog/types.ts`. Run `scripts/audit-blog-editorial.mjs` for content and the pre-commit hook (`lint && type-check && build`) for code.
- **Where things run:** the sandbox can't reach Salesforce, Google, or download images; do those on the Mac (osascript + Chrome). Build/git/`gh` run on the Mac.
- **CTA building blocks:** `<AgentCTA salesforceId name />` (renders an agent card), the inline `<AgentContactLink salesforceId state>…</AgentContactLink>` (being standardized now), `lib/contactAgentUrl.ts` (`buildContactCtaHref`), and `services/stateService.tsx` for state→agent lookups.
- **Search Console data — RESOLVED (2026-06-18).** The 403 was a dropped property grant (the service account `vpcs-ga4-data-api@salesforce-web-t-…` had zero property access), **not** a Google Cloud/API problem. Fixed by (1) granting that SA `Full` access on the **`https://www.veteranpcs.com/`** URL‑prefix property in Search Console, and (2) repointing the `vpcs-weekly-analytics` routine from `sc-domain:veteranpcs.com` to the www property, with a `sites.list()` self‑check that now alerts immediately if the grant ever drops again. Verified live — `sites.list` returns the property and queries return rows (e.g., `air force bases in florida`: 2,281 impressions / 19 clicks ≈ 0.8% CTR, a ready-made quick-win). The analytics-driven items below now have live query data to steer them.

### Priority matrix

| # | Recommendation | Area | Effort | Impact | Type |
|---|---|---|---|---|---|
| A3 | Lender entry point + up-funnel marketing | Journey | S | High (fixes contact_lender≈0) | Code |
| B1 | Backfill internal links + state-matched CTAs into 126 orphan posts | Automation | M | Very high | Cowork |
| C1 | Category/topic hub pages + pagination | Blog UX | M | Very high (SEO+UX) | Code |
| A2 | Reduce contact-agent form friction (mobile) | Journey | S | High | Code |
| C2 | One real, persistent blog search | Blog UX | S | High | Code |
| A1 | Fix homepage hero CTA + mobile state map | Journey | M | High (62% mobile) | Code |
| C3 | Per-post conversion upgrades (state CTA everywhere, sticky CTA, reading time, TOC) | Blog UX | M | High | Code |
| B2 | BAH-by-base programmatic data pages (scraper) | Automation | M | High (defensible moat) | Code + Cowork |
| A4 | Consolidate/standardize CTAs sitewide | Journey | M | Medium-High | Code |
| B3 | Finish the 50-state base-list cluster (22 states) | Automation | S | Medium-High | Cowork |
| B4 | State military property-tax / veteran tax-benefit series | Automation | M | Medium-High | Cowork |
| B5 | Per-base "PCS to {base}" guides for uncovered installations | Automation | M | High (best-converting format) | Cowork |
| B6 | Consolidate cannibalizing VA-loan-assumption posts | Automation | S | Medium | Code + Cowork |
| A5 | Link/de-index orphan pages; clarify "Contact" nav | Journey | S | Medium | Code |

## Status — re-audited against `main` (2026-06-18)

Since the original audit, PRs #94 (homepage conversion UX), #92 (required state routing), and #97 (blog author resilience) merged, and the GSC issue was fixed — so several items are now partly or fully shipped. Verify here before executing.

**Foundation (Wave 0):**
- **W0a** shared blog CTA components (`AgentCTA`, `AgentContactLink`, registered with `resolvedAuthor`) — **Shipped** (do not rebuild).
- **W0b** `stateSlug` field + page bridge — **Partial.** Field exists in `lib/blog/types.ts`; but `app/(site)/blog/[slug]/page.tsx` still resolves the `FindAgentInState` bridge only via `getStateForBlog(slug)` (3 slug patterns), so ~130 geo posts — incl. ones that already set `stateSlug` — get no bridge CTA.
- **W0c** unified primary "Find an Agent" CTA — **Open** (8+ inconsistent labels/casing across components).

**Part A:** A1 **Partial** (single-primary hero + mobile state-map dropdown shipped in #94; guided popup still desktop-only). A2 **Open** ("How did you hear" still required; single screen; #92 made `state` required + prefilled). A3 **Partial** (lender marketed on homepage via `MakeItHome`, but missing from `Header`/`Footer`). A4 **Open** (= W0c). A5 **Open** (orphan pages exist but unlinked; "Get Listed" partner links nested under the customer "Contact" menu; sparse footer).

**Part B:** B1–B6 **Open** (content programs — see the CoWork runbook).

**Part C:** C1 **Open** (no category hub route, no pagination, pills are scroll buttons). C2 **Partial** (hero search still broken/inside a `<Link>`; a working search form exists in a section; none in the header). C3 **Partial** (hard-coded "4 minutes" reading time; no sticky CTA/TOC; visible breadcrumbs missing; related posts unranked; state CTA limited by W0b). C4 **Open** (state pages link to zero blog posts).

**GSC data:** **Resolved** (2026-06-18) — see the cross-cutting note above.

## Execution — two drop-in runbooks

This file is the strategy + rationale. The executable work is split into two **self-contained** runbooks (each repeats all needed context, so you can hand it directly to the right tool and start):

- **`docs/blog-updates/organic-growth-projects/claude-opus-4.8-plan.md`** — current v6 CODE execution plan. It supersedes the older code runbook where they disagree.
- **`docs/blog-updates/organic-growth-projects/execution-cowork.md`** — CONTENT work (B1 backfill, B3/B4/B5 programs, B2/B6 content halves), runnable as one-off batches or fed into the `vpcs-weekly-blog-generation` routine, with per-task prompts and acceptance checks.

---

# Part A — User journey & conversion cleanup

## A1. The homepage splits intent three ways and degrades on mobile

**Problem.** The hero (`components/homepage/HeroSection.tsx`) shows two equal-weight CTAs — "Find An Agent" (→ `/contact-agent`) and "Browse by State" (→ `#state-map`). `StateMap.tsx` adds a third path, and the interactive SVG map (`StateMapSvg`) is **desktop-only** (`showDesktopMap`, min-width 768px) while the scroll-triggered `AgentFinderPopup` is **disabled on mobile** (`useScrollTrigger.ts`). Mobile is **62% of traffic but converts at half the desktop rate** — and mobile gets the degraded browse experience and loses the guided shortcut.

**Recommendation.** Make "Find an Agent" the single primary hero CTA (browse-by-state becomes a secondary/ghost button). Give mobile a first-class state picker (a searchable state list or a tap-friendly map) and stop disabling the guided finder on mobile. Treat mobile as the primary design target.

**Impact.** Directly addresses the largest conversion gap (mobile) on the highest-traffic page.

```
[Claude Code]
Role: Senior front-end engineer improving mobile conversion on the VeteranPCS homepage. Read-only first, then implement behind a PR.
Read: components/homepage/HeroSection/HeroSection.tsx, components/homepage/StateMap.tsx + StateMapSvg, components/AgentFinderPopup/* and hooks/useScrollTrigger.ts, app/(site)/page.tsx, .impeccable.md (locked brand tokens: navy #292F6C, red #a81f23; light mode; rounded-custom 32px), CLAUDE.md.
Do:
1) In the hero, make "Find an Agent" (→ /contact-agent) the single primary button; demote "Browse by State" to a secondary/ghost style that smooth-scrolls to the state picker. Keep copy exactly "Find an Agent".
2) Give mobile (<768px) a real state picker — a searchable, tap-friendly list (or accessible accordion) that links to /{state}; do not leave mobile with only a bare <select>. Reuse the state list source already feeding StateMap.
3) Remove the mobile disable on the guided finder, OR replace it with a lightweight mobile-friendly "find an agent in your state" inline module; whichever, the finder must point to /contact-agent (conversion), not /{state}#area (browse) — see A4.
4) Preserve WCAG 2.1 AA: tap targets ≥44px, visible labels, keyboard + screen-reader support, prefers-reduced-motion.
Constraints: no new accent colors; use existing Tailwind theme tokens; light mode only; no localStorage. Do not change unrelated components.
Verify: npm run lint && npm run type-check && npm run build all green; manually note expected mobile vs desktop behavior in the PR description.
Output: one PR off the default branch titled "Homepage hero + mobile state picker"; do not merge. Summarize the before/after and any tradeoffs.
```

## A2. The agent lead form is one long 8-field screen (worst on mobile)

**Problem.** `/contact-agent` (`components/ContactAgents/ContactAgent.tsx`) is a single screen with ~8 required fields including a low-value required "How did you hear about us?". A multi-step version was started and abandoned (commented-out progress bar in `app/(site)/contact-agent/page.tsx`). Long single-column forms convert worst on mobile — the exact segment that's underperforming.

**Recommendation.** Make "How did you hear about us?" optional (or ask it post-submit on `/thank-you`). Keep the current single-screen form for the v6 code track, and align client validation to the server rule: require email OR phone, not both. Keep the pre-filled agent deep-link path (`?form=agent&fn=&id=&state=`) as the fast path.

**Impact.** Fewer required fields + progressive disclosure is the highest-leverage form fix for the mobile conversion gap.

```
[Claude Code]
Role: Front-end engineer reducing friction on the VeteranPCS agent lead form. PR only, no merge.
Read: app/(site)/contact-agent/page.tsx (note the commented-out multi-step/progress UI), components/ContactAgents/ContactAgent.tsx, the lender twin components/.../ContactLender.tsx, lib/contactAgentUrl.ts, actions/* (the server action that writes the lead to Salesforce + Slack + OpenPhone — keep its payload identical), CLAUDE.md (lead routing maps destination_city/current_location — do not change those mappings).
Do:
1) SUPERSEDED BY v6: do not rebuild this as a 2-3 step flow in the current code track.
2) Make "How did you hear about us?" optional while preserving identical Salesforce payload keys and empty-string behavior.
3) Align both agent and lender client validation to email OR phone, matching the server `requireContactMethod` rule. Blank email/phone values must not fail regex checks before the cross-field rule runs.
4) Extract testable validation and pure lead-param builders so the outgoing `URLSearchParams` body can be asserted byte-identical on normal and `?state=` paths.
5) Keep the single-screen form, #92 prefilled state behavior, and Salesforce/Slack/OpenPhone payload contract intact. Notification display-copy fallbacks require separate sign-off before implementation.
Constraints: identical Salesforce payload; do not change `services/salesForcePostFormsService.tsx` field mappings or `BASE_URL`; brand tokens only; WCAG AA; no localStorage.
Verify: lint/type-check/build green; Vitest covers email-only, phone-only, both blank, invalid email/phone, and payload identity.
Output: one PR "A2: contact form validation alignment"; do not merge.
```

## A3. The lender path has no entrance — so it converts ≈ 0

**Problem.** Analytics show `contact_lender` near zero for months. The cause is structural, not demand: there is **no "Find a Lender" link in the header or footer**, and the lender service isn't marketed up-funnel. The `/contact-lender` form is reachable only by users already deep on a state or blog page.

**Recommendation.** Add a "Find a Lender" entry to the header and/or footer, add a lender value section to the homepage and `/how-it-works`, and surface a lender CTA alongside the agent CTA on state pages and in posts (the VA-loan cluster especially). Pair lender CTAs with VA-loan content where intent is highest.

**Impact.** Creates the missing top-of-funnel for an entire revenue path that is currently invisible.

```
[Claude Code]
Role: Engineer adding a first-class lender funnel to VeteranPCS. PR only.
Read: components/Header.tsx, components/Footer/Footer.tsx, app/(site)/page.tsx + components/homepage/*, app/(site)/how-it-works/*, app/(site)/contact-lender/page.tsx, components/.../ContactLender.tsx, app/(site)/[state]/page.tsx (StatePageVaLoan / StatePageCTA), components/Blog/* CTA components, .impeccable.md.
Do:
1) Add a "Find a Lender" nav entry (header desktop + mobile drawer; footer) → /contact-lender, styled secondary to the primary "Find an Agent".
2) Add a short lender value block to the homepage and how-it-works explaining the VA-loan lender match (mirror the agent value prop; calm, no hype).
3) On VA-loan blog posts and the state VA-loan section, surface a lender CTA next to the agent CTA. Reuse buildContactCtaHref with form='lender'.
Constraints: do not cannibalize the primary agent CTA — lender is clearly secondary; brand tokens; WCAG AA.
Verify: lint/type-check/build green.
Output: one PR "Add lender funnel entry points"; do not merge. In the PR, list every surface where a lender CTA now appears.
```

## A4. CTAs are inconsistent and one key popup dead-ends at "browse"

**Problem.** At least six phrasings for the same action ("Find An Agent" / "Match Me With An Agent" / "Find an agent for me" / "Let us find you an agent" / "Get in Touch") across `HeroSection`, `StateMap`, `StatePage*`, `AuthorByline`, `BlogDetailsCta`. State pages stack 3+ generic CTAs that dilute the strong personalized agent-card deep-links. And `AgentFinderPopup` interrupts the user, collects State + Area, then routes to `/{state}#area` (browse) instead of the lead form.

**Recommendation.** Standardize on one verb ("Find an Agent") and one primary style everywhere; demote duplicates to a single fallback per page. Point `AgentFinderPopup` at a pre-filled `/contact-agent` (or render the form in-modal). Keep the personalized agent-card deep-links as the hero conversion path on state pages.

**Impact.** Less decision friction, cleaner measurement, and the highest-intent interaction (the popup) finally lands on a form.

```
[Claude Code]
Role: Engineer standardizing CTAs and fixing the agent-finder popup destination. PR only.
Read: components/homepage/HeroSection.tsx, components/homepage/StateMap.tsx, components/AgentFinderPopup/* (note it routes to /{state}#area), components/StatePage/* (StatePageHeroSection, StatePageCTA, StatePageLetFindAgent, StatePageCityAgents), components/Blog/AuthorByline.tsx, components/BlogDetails/BlogDetailsCta/*, lib/contactAgentUrl.ts.
Do:
1) Make every primary agent CTA read exactly "Find an Agent" and use one shared button style/component; keep "Get in Touch" only on the personalized agent card.
2) On state pages, keep the personalized agent-card deep-links primary; reduce the generic CTAs to ONE fallback ("Don't see your area? Find an agent").
3) Repoint AgentFinderPopup to a pre-filled /contact-agent?form=agent&state={state}{&area} (or surface the form in-modal). It must end at the lead form, not a browse page.
Constraints: don't remove GTM/analytics hooks; preserve existing event tracking; brand tokens; WCAG AA.
Verify: lint/type-check/build green.
Output: one PR "Standardize agent CTAs + fix finder popup destination"; do not merge.
```

## A5. Well-built pages are orphaned; the "Contact" menu shows partner links to customers

**Problem.** `/agents` and `/lenders` directory pages (and `/guides`, `/refinancing`, `/military-spouse`, `/va-loan-help`, the calculators) are not linked from the header, footer, or homepage — reachable only by direct URL/SEO. Meanwhile the header "Contact" submenu contains only **partner-recruiting** links (Get Listed Agents/Lenders), which confuses customers.

**Recommendation.** Decide per page: link it (footer "Explore" + relevant in-content links for internal-linking/SEO) or intentionally keep it SEO-only and `noindex` if low quality. Split navigation into "For Military Families" vs "For Agents & Lenders (Partners)".

**Impact.** Recovers internal-link equity for buried pages and removes a confusing nav path.

```
[Claude Code]
Role: Engineer fixing information architecture and internal linking. PR only.
Read: components/Header.tsx, components/Footer/Footer.tsx, and confirm which routes exist under app/(site)/ (agents, lenders, guides, refinancing, military-spouse, va-loan-help, bah-calculator, va-loan-calculator, how-it-works, impact, pcs-resources).
Do:
1) Add a footer "Explore" column linking the high-value customer pages (How It Works, BAH Calculator, VA Loan Calculator, Guides/PCS Resources, Find an Agent, Find a Lender).
2) Split the header so partner-recruiting links live under a clearly labeled "For Agents & Lenders" item, separate from a customer "Contact" item.
3) For any directory/page intentionally SEO-only and thin, add it to a list in the PR for the team to decide link-vs-noindex (do not noindex anything without sign-off).
Constraints: do not remove the state-grid footer links; brand tokens; WCAG AA.
Verify: lint/type-check/build green.
Output: one PR "IA cleanup: footer Explore + partner/customer nav split"; do not merge.
```

---

# Part B — Automating content to grow organic presence

## B1. 126 of 162 posts have zero internal links and no contextual CTA (the biggest single opportunity)

**Problem.** 78% of posts — **every pre-2026 post** — have no outbound internal `/blog/` links, and only 14 use `<AgentCTA>`. The high-traffic, high-intent legacy pages (Hawaii/Florida/California/NY base-lists, the PCS checklist, the decaying CA/TN/AL/GA guides) rely solely on the global footer CTA, which points to `/#state-map` rather than a state-matched agent. Given **AI-search traffic converts ~7.5× the site average** and lands on exactly these citable guides, adding contextual links + CTAs to traffic you already have is the fastest win.

**Recommendation.** Run a one-time backfill pass (then maintain via the weekly routine): add 3–5 relevant internal links and a state/topic-matched CTA (`<AgentContactLink>` inline + `<AgentCTA>` card) to the orphan posts, starting with the GA4-flagged decayers and the zero-converting traffic leaders. No new copy — just links, CTAs, and `updatedAt`.

**Impact.** Lifts conversions and topical authority on existing traffic without writing new posts. Very high ROI.

```
[Cowork]
Role: Run an internal-linking + CTA backfill across the VeteranPCS blog. This is content maintenance, not new writing.
Read first: the weekly blog routine (conventions, where-things-run), `.agents/skills/vpcs-blog/SKILL.md`, CLAUDE.md, content/_registry/internal-links.json (rebuild it with `node scripts/build-internal-link-registry.mjs` — it has every slug, title, component, keywords, and H2 outline for choosing link targets).
Batch order (highest value first): (1) the decayers — what-military-bases-are-in-california, tennessee-military-bases-*, alabama-military-bases, what-military-bases-are-in-georgia, the-ultimate-pcs-checklist-and-timeline-for-active-duty-military-personnel; (2) zero-converting traffic leaders — what-military-bases-are-in-hawaii/-florida/-new-york, pcs-to-hawaii-*; (3) the remaining pre-2026 orphans (posts with zero outbound /blog/ links).
For each post:
1) Add 3–5 contextual internal links to genuinely related posts (use the registry; prefer pillar/cluster siblings and evergreen VA-loan/PCS posts). Natural placement only; no link dumps.
2) Add a state/topic-matched CTA. If the post maps to a state/base, look up an active agent for that state on the MAC via the repo's Salesforce integration (.env.local SALESFORCE_*, query Account WHERE isAgent__pc=true AND Active_on_Website__pc=true AND state licensing matches; use AccountId_15__c) and wire an inline <AgentContactLink salesforceId="..." state="..."> plus an <AgentCTA salesforceId name /> near the end. If no state mapping, use the generic /contact-agent CTA. Never fabricate an ID or print secrets.
3) Bump updatedAt to today; do not rewrite the body or change publishedAt.
Gate + ship: run node scripts/audit-blog-editorial.mjs and confirm no new findings; on the Mac run lint/type-check/build; open ONE PR per batch off the default branch (stage only edited files by path, never git add -A), no merge. Summarize per-post: links added, CTA used, agent matched.
Definition of done: the batch's posts each have ≥3 internal links + a contextual CTA; audit and build green; PR opened for review.
```

## B2. The live BAH scraper is an untapped programmatic content engine

**Problem.** `lib/bah-scraper.ts` already pulls live DTMO BAH by ZIP + rank for every Military Housing Area, and `lib/ai/tools/calc-tools.ts` wraps it — yet only ~3 single-base BAH posts exist. This is unique, hard-to-copy data with near-zero competitor coverage that auto-refreshes every December.

**Recommendation.** Build a **per-base BAH program**: a reusable template (and, ideally, a data-backed dynamic route or a generator script) producing "`{Base} BAH {year}: What Your Allowance Buys`" pages for the top 50–100 installations, each with the live rate table, a buy-vs-rent example, and a state-matched agent/lender CTA. Refresh annually via the weekly routine.

**Impact.** A defensible, scalable moat: dozens–hundreds of high-intent, low-competition pages from data you already own.

```
[Claude Code] (template/route) then [Cowork] (content runs)
Phase 1 — [Claude Code], PR only:
Role: Engineer creating a reusable BAH data section/component for blog posts (no new copy).
Read: lib/bah-scraper.ts (toDtmoYear/toFourDigitYear, __testables, O-7 cap aliasing), lib/__tests__/bah-scraper.test.ts, lib/ai/tools/calc-tools.ts, components/BAHCalculator.tsx, mdx-components.tsx, the existing model post fort-meade-bah-2026-what-your-allowance-buys.mdx, .claude/skills/vpcs-blog/SKILL.md.
Do: SUPERSEDED BY v6: do not build a live MHA-keyed `<BahByBaseTable mha="..." year="..." />`. Build a snapshot pipeline instead: a script-safe base target dataset, a named on-demand generator that fans out `extractBAHData(year, primaryZip, rankId)` across selected ranks, committed snapshot files with source metadata, and a server-only `<BahRateTable base="..." year="..." />` renderer that never scrapes DTMO during render/build. Use plain-ESM extraction by default; do not add `tsx` without sign-off.
Verify: npm test (bah-scraper + snapshot reader/generator tests) + lint/type-check/build green; the literal generator command runs from a clean shell. PR "B2: BAH snapshot pipeline"; no merge.

Phase 2 — [Cowork], content program:
Role: Generate per-base BAH guides using the new component and the weekly-routine standards.
Read: the weekly blog routine, the BAH snapshot renderer from Phase 1, lib/states.ts, services/stateService.tsx.
Do: for a prioritized base list (start: Fort Cavazos, Fort Bliss, JBSA, Fort Liberty, Norfolk, Camp Pendleton, Fort Carson, JBLM, Wright-Patterson, Fort Campbell), generate "{Base} BAH {year}: What Your Allowance Buys" posts: intro, the live BAH table (component), a buy-vs-rent example with rate+date, low-tax/again-verify notes, FAQ, ≥3 internal links, and a STATE-MATCHED agent + lender CTA via Salesforce (Mac). Unique slug per base; weekday staggered publishedAt. No fabricated figures.
Gate + ship: audit + Mac build green; ONE PR for the batch; no merge. Plan an annual December refresh via the weekly routine.
```

## B3. Finish the 50-state "military bases in {state}" cluster (22 missing)

**Problem.** Only 28 of 50 states have the proven `what-military-bases-are-in-{state}` post. Missing includes high-demand states: **Texas, Virginia, Washington, Maryland, South Carolina, Oklahoma, Ohio, Nevada, Missouri** (and Alabama/Tennessee exist only in a non-standard format).

**Recommendation.** Generate the 22 missing states on the existing template (prioritize TX/VA/WA/MD/SC/OK), normalize the two off-format states, and tie the whole set to a hub (see C1). Feed straight into the weekly routine.

**Impact.** Closes a near-complete cluster of reliable long-tail pages and unlocks a strong hub page.

```
[Cowork]
Role: Generate the missing state base-list posts on the existing proven template.
Read: the weekly blog routine, an existing model (what-military-bases-are-in-california.mdx and -florida.mdx), lib/states.ts, content/_registry/internal-links.json (to avoid duplicates and to choose internal links).
Do: produce "what-military-bases-are-in-{state}" for the 22 missing states, prioritizing Texas, Virginia, Washington, Maryland, South Carolina, Oklahoma. For each: accurate installation list verified via WebSearch (home.army.mil/.mil sources), branch/role per base, a short relocation/PCS angle, ≥3 internal links (to relevant base/area guides + the cluster hub once it exists), a state-matched agent CTA (Salesforce on the Mac), FAQ, disclaimer. Reconcile alabama-military-bases and tennessee-military-bases-* to the canonical slug/format (note any needed 301 in the PR; do not implement redirects here). Unique slugs, weekday staggered dates, no fabricated bases.
Gate + ship: audit + Mac build green; ONE PR (or two) for the batch; no merge. Cap at ~5–6 per weekly run if routed through the schedule.
```

## B4. State military property-tax / veteran tax-benefit series (only 1 of ~50 exists)

**Problem.** Only `oklahoma-property-tax-exemption-for-100-disabled-veterans` exists. Military property-tax exemptions, military-pay income-tax treatment, and spouse-residency (MSRRA) rules are extremely high-intent, evergreen, and almost uncontested in this niche.

**Recommendation.** Build a ~50-state "{state} military & veteran property tax exemptions (and income-tax treatment)" series, each pairing the tax facts with a state-matched agent/lender CTA. Verify every figure against the state's `.gov`.

**Impact.** A large, evergreen, low-competition cluster with direct monetization via state-matched CTAs.

```
[Cowork]
Role: Generate a state-by-state military/veteran property-tax-benefit series.
Read: the weekly blog routine, the model oklahoma-property-tax-exemption-for-100-disabled-veterans.mdx, lib/states.ts, .impeccable.md (this is financial/legal-adjacent — be factual, cite the state .gov, add the standard "consult a professional" disclaimer and a "verify current rules with the county/state" caveat).
Do: for each state, "{state} Military & Veteran Property Tax Exemptions ({year})": disabled-veteran exemption rules + thresholds, homestead interaction, military-pay state income-tax treatment, MSRRA spouse residency note, all cited to the state revenue/veterans-affairs .gov page (no fabricated figures; flag anything you can't verify). ≥3 internal links (VA-loan + PCS-to-{state-base} posts), state-matched agent CTA, FAQ. Start with high-base states: Texas, Virginia, Florida, California, North Carolina, Georgia, Washington, Colorado, Hawaii. Unique slugs, weekday staggered dates.
Gate + ship: audit + Mac build green; ONE PR per batch; no merge. Set reviewBy to next year (tax rules change).
```

## B5. Per-base "PCS to {base}" guides for uncovered major installations

**Problem.** Despite ~30 base guides, several of the largest installations have no full PCS/area guide: **Fort Bliss, Fort Cavazos, MCB Quantico, NS Norfolk, Fort Carson, Wright-Patterson, Fort Sill, Fort Leonard Wood, Parris Island, Fort Drum, Travis AFB**. This is the **best-converting format** in the library (each gets a built-in state-matched agent CTA).

**Recommendation.** Generate full "PCS to {base}" guides for the uncovered top installations using the proven format (neighborhoods/where-to-live, BAH via the B2 component, schools, commute, healthcare, FAQ), each with a state-matched agent + lender CTA.

**Impact.** Scales the highest-converting content type into the biggest uncovered demand pools.

```
[Cowork]
Role: Generate full PCS/area guides for uncovered major installations.
Read: the weekly blog routine, two model guides (complete-fort-campbell-pcs-guide.mdx, pcs-to-joint-base-lewis-mcchord-jblm-2026-guide.mdx), the B2 BAH snapshot renderer if available, services/stateService.tsx, content/_registry/internal-links.json.
Do: for Fort Bliss, Fort Cavazos, MCB Quantico, NS Norfolk, Fort Carson, Wright-Patterson, Fort Sill, Fort Leonard Wood (prioritize by size): a complete guide — what/why the base, where to live (with a commute schematic body image), BAH (live table via B2 or link to the BAH calculator), schools, healthcare, climate, things to do, FAQ. Verify facts via WebSearch (home.army.mil/.mil); a masked Unsplash hero + 1 body chart per post; ≥3 internal links; STATE-MATCHED agent + lender CTA via Salesforce (Mac). Unique slugs, weekday staggered dates, no fabricated stats.
Gate + ship: audit + Mac build green; ONE PR per batch (≤5 posts/run); no merge.
```

## B6. Consolidate cannibalizing VA-loan-assumption posts into a pillar

**Problem.** Four near-duplicate posts (`va-loan-assumption-guide-*`, `va-loan-assumptions-a-hidden-strategy-*`, `va-loan-assumptions-the-hidden-entitlement-rule-*`, `va-loan-assumptions-what-military-families-must-know`) compete for the same query and split authority. Dual per-state formats do the same for AL/TN.

**Recommendation.** Merge the four into one canonical "VA Loan Assumptions" pillar, 301 the others to it, and make the pillar the link target for the VA-loan cluster.

**Impact.** Recovers split ranking authority and cleans the VA-loan cluster.

```
[Claude Code] + [Cowork]
Role: Consolidate duplicate VA-loan-assumption posts into one canonical pillar with redirects.
Read: the four va-loan-assumption* MDX files, next.config.mjs (existing 301 redirect patterns for blog), content/_registry/internal-links.json, .claude/skills/vpcs-blog/SKILL.md.
Do (Cowork for content, Claude Code for redirects):
1) Draft one canonical "VA Loan Assumptions: The Complete Guide for Military Families" that absorbs the best of all four (no fabricated facts; verify VA.gov rules), with strong internal links to the VA-loan cluster and a CTA.
2) In next.config.mjs add 301s from the three retired slugs to the canonical slug; remove the retired MDX files.
3) Update internal links across the library that pointed to the retired slugs to point to the canonical one (use the registry to find them).
Gate + ship: audit + Mac build green (build will catch broken links); ONE PR "Consolidate VA-loan-assumption posts + 301s"; no merge. List every redirect and every updated link in the PR.
```

---

# Part C — Blog page experience (navigate, find, contact)

## C1. There are no category hubs and the index dumps all ~159 posts on one page

**Problem.** `/blog` (`app/(site)/blog/page.tsx`) loads **every** post and renders all of them in stacked component sections with **no pagination** (confirmed live: the page returns ~78 KB of post links in one response). There are **no category/topic landing pages** — categories exist only as scroll-anchors that render in the first section, and there are two overlapping taxonomies (`component` vs `categories[]`). The pills are decorative, not links. "U.S. Military Bases" (49 posts) and "PCS Help" (62) have no browsable, linkable, paginated hub.

**Recommendation.** Add real category hub routes `/blog/category/[component]` (paginated, SEO-titled, with their own CTA), make the index sections cap to ~6–9 with a working "View All → hub" link, and make the category pills/labels link to the hubs. Pick one canonical taxonomy.

**Impact.** The biggest combined SEO + navigation win — turns 7 dead scroll-anchors into 7 indexable hubs and makes the library actually browsable.

```
[Claude Code]
Role: Engineer adding paginated blog category hubs and fixing the index. PR only.
Read: app/(site)/blog/page.tsx, components/BlogPage/** (BlogMovingPcsingBlogPostSection, BlogCategory, PcsResourcesBlog), components/PcsResources/PcsResourcesBlog/*, lib/blog/mdx.ts (getAllBlogs, groupBlogsByComponent, and add getBlogsByComponent + pagination helpers if missing), lib/blog/types.ts, the canonical component list in .claude/skills/vpcs-blog/SKILL.md, content/_registry/internal-links.json (byComponent).
Do:
1) Create app/(site)/blog/category/[component]/page.tsx — generateStaticParams over the canonical components; paginated list (e.g., 12/page) with SEO title/meta/canonical, an H1, breadcrumb, and a category CTA.
2) On /blog, cap each section to ~6–9 cards and wire the existing dead "View All" + category pills to link to the hubs (real <Link>s, not scroll anchors).
3) Decide canonical taxonomy: standardize on `component` for grouping/hubs; keep `categories[]` only as display tags or remove. Document the choice.
Constraints: don't break existing /blog/[slug] URLs; emit BreadcrumbList JSON-LD on hubs; brand tokens; WCAG AA.
Verify: lint/type-check/build green; confirm static params generate for all components.
Output: one PR "Blog category hubs + paginated index"; no merge.
```

## C2. The visible blog search is broken; the working one is hidden

**Problem.** The index hero search has **no form, is mobile-only, and sits inside the featured-post `<Link>`** (confirmed live: the featured link literally renders "…By Jacob McCrackin**search**"), so it does nothing. The functional search (`<form action="/blog-search">`) is desktop-only and buried in the first section header. The site header has no blog search at all. `/blog-search` lacks result counts, an empty state, and a link back to `/blog`.

**Recommendation.** Replace the broken hero input with one real, persistent search (works on all breakpoints; ideally also in the index hero and site header), and polish `/blog-search` (result count, empty-state suggestions, back-to-blog).

**Impact.** Lets visitors actually find the post that answers their question — a prerequisite to contacting an agent.

```
[Claude Code]
Role: Engineer fixing blog search. PR only.
Read: components/BlogPage/BlogPage/BlogPageHeroSection/BlogPageHeroSection.tsx (the broken input inside a Link), components/BlogPage/BlogPage/BlogMovingPcsingBlogPostSection.tsx (the working desktop-only form), app/(site)/blog-search/page.tsx, components/SearchBlog/SearchBlog.tsx, lib/blog/mdx.ts (searchBlogs).
Do:
1) Remove the non-functional hero input from inside the <Link>; add a working <form method="GET" action="/blog-search"> search that renders on all breakpoints, in the blog index hero.
2) Add a compact blog search affordance to the site header (or a /blog search bar that's always visible at the top of the list).
3) On /blog-search: show "N results for '…'", a helpful empty state with suggested categories/popular posts, and a "Back to all guides" link.
Constraints: keep the existing GET→/blog-search contract; brand tokens; WCAG AA; no localStorage.
Verify: lint/type-check/build green; manually note search works on mobile + desktop in the PR.
Output: one PR "Fix + surface blog search"; no merge.
```

## C3. Posts under-convert: state CTA misses most geo posts, no sticky CTA, fake reading time, no TOC/breadcrumbs

**Problem.** The strongest in-post CTA, `FindAgentInState` (deep-links to `/{state}`), only fires when `getStateForBlog(slug)` matches a narrow slug pattern — so geo-intent guides like `complete-fort-campbell-pcs-guide` and `pcs-to-charleston-sc-…` get **no** state CTA. Reading time is a hard-coded **"4 minutes"** on every post. There's no visible breadcrumb (only JSON-LD), no table of contents on long guides, no sticky/floating contact CTA, and "related posts" (`CommonBlog`) dumps the whole category unranked. On mobile the author card stacks above the body.

**Recommendation.** Drive the state CTA from a frontmatter `stateSlug` (fallback to the slug heuristic) so every geo post gets it; add a sticky/floating "Find an agent in {state}" CTA; compute real reading time; render visible breadcrumbs + a TOC for long posts; cap and rank related posts.

**Impact.** Converts the geo-intent traffic the blog already earns, and makes long guides navigable.

```
[Claude Code]
Role: Engineer upgrading the blog post template for navigation + conversion. PR only.
Read: app/(site)/blog/[slug]/page.tsx, lib/blog/getStateForBlog.ts, lib/blog/types.ts, components/Blog/FindAgentInState/*, components/BlogDetails/* (BlogDetailsCta, BlogBeginingBlogPostAgent — note the hard-coded "4 minutes"), components/BlogPage/BlogPage/BlogCTA/CommonBlog.tsx, lib/blog/mdx.ts, mdx-components.tsx, components/Blog/AuthorByline.tsx.
Do:
1) Add optional `stateSlug` to the Blog type; in [slug]/page.tsx prefer frontmatter stateSlug, fall back to getStateForBlog. Render FindAgentInState (and a state-matched CTA) on every post that resolves a state.
2) Add a sticky/floating "Find an agent in {state}" button (state-aware; generic fallback) that's reachable above the fold on mobile.
3) Replace the hard-coded "4 minutes" with reading time computed from blog.content word count (add a helper in lib/blog/mdx.ts).
4) Render visible breadcrumbs (you already emit BreadcrumbList JSON-LD) and a TOC built from MDX h2s (add heading ids in mdx-components.tsx) for posts above a length threshold.
5) Cap CommonBlog to 3 and rank by shared categories/primaryKeyword/state instead of dumping the component.
Constraints: don't regress existing JSON-LD/SEO; brand tokens; WCAG AA; no localStorage.
Verify: lint/type-check/build green.
Output: one PR "Blog post template: state CTAs everywhere, sticky CTA, reading time, TOC, related"; no merge. (Pairs with the weekly routine, which already sets stateSlug-style data on new posts — confirm it populates the new field.)
```

## C4. State landing pages — the natural hubs — don't link to any blog content

**Problem.** `app/(site)/[state]/page.tsx` is the obvious hub for a state's content and the strongest agent-conversion surface, but it links to **zero** blog posts for that state. The base/area guides that would help a visitor (and pass link equity) are invisible from the state page.

**Recommendation.** Add a "Guides for {state}" block to the state page that lists the relevant posts (base guides, BAH, PCS-to-{base}, tax exemptions) by matching `stateSlug`/registry, completing the hub-and-spoke and feeding the orphan posts internal links from a high-authority page.

**Impact.** Closes the internal-linking loop, lifts the orphan posts, and gives state visitors deeper content next to the agent CTA.

```
[Claude Code]
Role: Engineer linking state landing pages to relevant blog guides. PR only.
Read: app/(site)/[state]/page.tsx and its components, services/stateService.tsx, lib/blog/mdx.ts, content/_registry/internal-links.json, lib/states.ts, lib/blog/getStateForBlog.ts (+ the new stateSlug from C3 if merged).
Do: add a "Guides for {state}" section to the state page that queries posts mapped to that state (via stateSlug/registry/getStateForBlog) and renders up to ~6 cards linking to those guides. Place it so it complements — not competes with — the agent cards. If no posts map, hide the block.
Constraints: SSR-safe (state pages are SSR from Sanity + Salesforce); don't slow the page (reuse the already-loaded registry/build-time data); brand tokens; WCAG AA.
Verify: lint/type-check/build green.
Output: one PR "State pages: related guides block"; no merge.
```

---

## Suggested sequencing

1. **Task zero — DONE (2026-06-18):** Search Console access restored (SA granted on the `https://www.veteranpcs.com/` property; analytics routine repointed to www + self-checking). Analytics-driven targeting is back online.
2. **Quick, high-ROI on existing traffic:** A3 (lender entry), C2 (search), B1 (link/CTA backfill — start with the 5 decayers + zero-converting leaders), A2 (form friction).
3. **Structural SEO + UX:** C1 (category hubs + pagination), C3 (post template), C4 (state-page guide blocks), A1/A4 (homepage + CTA standardization).
4. **Scaled content programs (feed the weekly routine):** B3 (finish 50 states), B2 (BAH-by-base), B5 (uncovered base guides), B4 (state tax series), B6 (consolidate duplicates).

Everything in Part B can be produced by the existing `vpcs-weekly-blog-generation` routine over successive weeks (3–5 posts/week) — point its topic selection at these programs in priority order — while Parts A and C are discrete engineering PRs.
