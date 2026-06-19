# VeteranPCS — Claude Code Execution Runbook (code work)

**Drop this file into Claude Code at the repo root and execute top‑to‑bottom by wave.** It is self‑contained: every task lists the files, the exact change, constraints, and an acceptance check. Status tags reflect `main` as of **2026‑06‑18**. Companion content runbook: `docs/blog-updates/organic-growth-projects/execution-cowork.md`. Strategy/rationale: `docs/blog-updates/organic-growth-projects/organic-growth-recommendations.md`.

> **v6 supersession banner (2026-06-18):** This runbook is historical and contains stale executable prompts. The current source of truth is `docs/blog-updates/organic-growth-projects/claude-opus-4.8-plan.md`. Where this file describes Wave 0 as only W0b/W0c, asks for repo Playwright scaffolding, scopes A2 as a multi-step rebuild, scopes B2 as a live `<BahByBaseTable mha year />`, or interleaves AN1-AN4 analytics work, those instructions are superseded by v6 and annotated inline below.

**Analytics work (deferred by v6):** rationale in `docs/analytics/analytics-audit-and-recommendations.md`; the GA4/GTM config half (done in the browser, not here) is in `docs/analytics/analytics-execution-checklist.md`. The code tasks (AN1–AN4) are not part of the current organic-growth implementation; run them later as a separate analytics wave.

Hard rules for every task: **open one PR per task (or per track), and never merge — a human reviews.** Stage files by path (never `git add -A`). Don't touch `.env*`.

---

## Repo context (read once)

- **Stack:** Next.js 16 App Router (Turbopack), React 19, MDX blog. Repo: this directory (`/Users/harperfoley/VPCS/vpcs-nextjs-website`).
- **Conventions to honor:** `CLAUDE.md`; `.impeccable.md` (brand: navy `#292F6C`, red `#a81f23`, **light mode only**, radius `rounded-custom` 32px, **no emoji**, calm tone; **WCAG 2.1 AA**: tap targets ≥44px, visible labels, keyboard + screen‑reader, `prefers-reduced-motion`; **mobile‑first** — mobile is 62% of traffic and converts at half the desktop rate); `.claude/skills/vpcs-blog/SKILL.md`; `lib/blog/types.ts`.
- **Commands:** `npm run dev` (http://127.0.0.1:3000), `npm run lint`, `npm run type-check`, `npm run build`. The pre‑commit hook runs `lint && type-check && build`. Run `npm test` (Vitest) for changes under `lib/`. **No `localStorage`/`sessionStorage`.**
- **Git/worktrees:** branch off `main`; one PR per task/track; never merge. For parallel work use up to **3 git worktrees** with **disjoint file ownership** (each worktree needs its own `npm install` + build, so 3 concurrent builds is the practical ceiling). The wave plan below assigns disjoint domains.
- **Already shipped on `main` — DO NOT rebuild:**
  - `components/Blog/mdx/AgentCTA.tsx` (card) and `AgentContactLink.tsx` (inline) exist, are exported from `components/Blog/mdx/index.ts`, and are registered in `mdx-components.tsx` via `createBlogMdxComponents()` with `resolvedAuthor` injected; both read `salesforceId/name/state/stateSlug` and route through `AuthorByline` → `resolveAuthor` → `lib/contactAgentUrl.ts`.
  - `stateSlug` (and `state`) exist on the `Blog`/author types in `lib/blog/types.ts`.
  - `getStateForBlog(slug)` in `lib/blog/getStateForBlog.ts` matches only `what-military-bases-are-in-<state>`, `pcsing-to-<state>`, `<state>-military-bases`.
  - #94 homepage conversion UX: `HeroSection.tsx` is single‑primary CTA + ghost "Browse by State"; `StateMap.tsx` has a mobile (`<768px`) searchable state dropdown with real links.
  - #92 required state routing: contact forms require `state` (validated vs `US_STATE_CODES`) and hide+prefill it when arriving with `?state=`.
  - #97 blog author resilience; GSC API access restored (property `https://www.veteranpcs.com/`).
- **Verification:** every PR must pass `lint`/`type-check`/`build`. For journey/blog UX PRs, **browser-verify the changed path and capture screenshots**, but do **not** add Playwright as a repo dependency or scaffold a new Playwright suite unless explicitly requested.

---

## Wave & track plan

- **Wave 0 (serial, foundation — merge first):** SUPERSEDED BY v6. Wave 0 now means shared data contracts first: script-safe component taxonomy, state identity catalog, blog state resolver, deterministic internal-link registry, and state-agent helper. W0b/W0c below are historical prompts and must not be run as the foundation.
- **Wave 1 (3 parallel worktrees — disjoint files):**
  - *Track BLOG* (`app/(site)/blog/**`, `components/BlogPage/**`, `components/Blog/**`, `lib/blog/**`): C1, C2, C3.
  - *Track NAV/FUNNEL* (`components/Header.tsx`, `components/Footer/**`): A3, A5.
  - *Track HOME/FORM* (`components/homepage/**`, `AgentFinderPopup/**`, `app/(site)/contact-agent/**`): A1, A2.
- **Wave 2 (after Wave 1 merges):** C4 (needs blog↔state linking from v6 W0.2/W0.3), B2‑code (snapshot pipeline), B6‑code (redirects, after content consolidation).
- **Wave 3 (analytics — runs after Wave 1/2 merge):** SUPERSEDED BY v6 for this initiative. AN1-AN4 are deferred to a separate analytics Wave 4 after A2, A1/A4, and C3 land. Do not interleave analytics work with the organic-growth tracks.

Historical note: W0c originally landed in Wave 0, but v6 moves shared data contracts first and runs scoped CTA cleanup later.

---

## WAVE 0

### W0b — Wire the state‑bridge CTA to frontmatter `stateSlug` (Status: Partial → finish)
> **SUPERSEDED BY v6:** Do not run this prompt directly. The current plan replaces it with W0.2/W0.3: a shared blog state resolver and deterministic registry using script-safe data. The bridge CTA should consume that resolver after the shared state catalog lands.

**Problem.** The field exists but `app/(site)/blog/[slug]/page.tsx` resolves the `FindAgentInState` bridge only from `getStateForBlog(slug)`, so ~130 geo posts (every `pcs-to-<base>`, `best-places-to-live-near-*`, base/city guides) — including ones that already set `stateSlug` — get no top/bottom state CTA.

```
Read app/(site)/blog/[slug]/page.tsx (the `bridgeState = getStateForBlog(slug)` line and the two <FindAgentInState> renders), lib/blog/getStateForBlog.ts, lib/blog/types.ts, components/Blog/FindAgentInState/*, lib/blog/mdx.ts (how frontmatter is parsed onto the Blog object).
Change: resolve the bridge state as `blog.stateSlug ?? blog.author?.stateSlug ?? getStateForBlog(slug)` (normalize to a state slug). Pass that to FindAgentInState (top + bottom). Confirm FindAgentInState renders for any resolved state, not just heuristic matches.
Constraints: don't change getStateForBlog's existing matches; SSR-safe; no behavior change for posts that already worked.
Acceptance: build green; a post with `stateSlug: maryland` and a non-matching slug (e.g. fort-meade-bah-2026-what-your-allowance-buys) now renders the state CTA; add a Vitest for the resolver precedence.
PR: "W0b: blog state CTA from frontmatter stateSlug". No merge.
```

### W0c / A4 — One canonical "Find an Agent" / "Find a Lender" CTA (Status: Open)
> **SUPERSEDED BY v6 AS WAVE-0 FOUNDATION:** This still exists as a scoped CTA task, but it no longer lands before shared contracts. Run it later as W0c/A4 after Wave 0 data contracts, replacing only generic English customer CTAs with single interactive `AgentCtaLink`/`LenderCtaLink` elements.

**Problem.** 8+ inconsistent labels/casing: "Find An Agent" ×4, "Find an Agent" ×2, "Find an agent for me", "Find an Agent For Me" ×3, "Match Me With An Agent", "Let us find you an agent", "Don't want to browse?…" ×2; lender "Find A Lender"/"Connect with a Lender". Locations incl. `HeroSection.tsx:80`, `WhyVeteranPCS.tsx:117`, `HowItWorkHeroSection.tsx:76`, `BlogDetailsCta.tsx`, `BlogCta.tsx`, `MovingBonusCalculator.tsx:193`, `StatePageHeroSection.tsx:45`, `AuthorByline.tsx` ("Get in Touch").

```
Read components/common/Button.tsx and every occurrence above (grep: buttonText="Find|Match|Connect|Get in Touch|Let us find).
Change: create a single canonical CTA component (e.g. components/common/AgentCta.tsx / LenderCta.tsx) wrapping common/Button with fixed copy "Find an Agent" / "Find a Lender" and an optional state/destination prop; replace all scattered agent/lender buttons with it. Keep the personalized blog agent-card "Get in Touch" (AuthorByline) as its own intentional variant. Do not change destinations/analytics hooks — only standardize copy/casing/markup.
Acceptance: grep shows one canonical source; build green; visual parity screenshot of hero + a blog CTA + a state CTA.
PR: "W0c: canonical agent/lender CTA". No merge. (Merge before Wave 1.)
```

---

## WAVE 1 — Track BLOG (one worktree; C1→C2→C3 share lib/blog/mdx.ts, do sequentially)

### C1 — Category hub pages + paginated index (Status: Open)
**Problem.** No `app/(site)/blog/category/[component]/` route; `app/(site)/blog/page.tsx` renders all posts with no pagination; category pills (`BlogCategory.tsx`) are `scrollIntoView` buttons, not links.

```
Read app/(site)/blog/page.tsx, components/BlogPage/** (BlogCategory, the section components), lib/blog/mdx.ts (add getBlogsByComponent + pagination helpers if missing), lib/blog/types.ts, the canonical component list in .claude/skills/vpcs-blog/SKILL.md, content/_registry/internal-links.json (byComponent counts).
Change: (1) create app/(site)/blog/category/[component]/page.tsx with generateStaticParams over the canonical components, pagination (~12/page), SEO title/meta/canonical, an H1, breadcrumb, BreadcrumbList JSON-LD, and a category CTA; (2) cap each /blog section to ~6-9 cards and make the dead "View All" + category pills real <Link>s to the hubs; (3) standardize on `component` for grouping (keep `categories[]` as display tags only — document the choice).
Constraints: don't break /blog/[slug]; SSR/SSG-safe; brand tokens; WCAG AA.
Acceptance: static params generate for all components; index paginates; pills navigate; build green; browser verification: pill → hub → page 2. Do not add Playwright scaffolding.
PR: "C1: blog category hubs + pagination". No merge.
```

### C2 — Fix + surface blog search (Status: Partial)
**Problem.** The hero search input sits **inside** the featured‑post `<Link>` with no form/handler and is mobile‑only (`BlogPageHeroSection.tsx`), so it navigates to the post instead of searching. A working `<form method=GET action=/blog-search>` exists only in `BlogMovingPcsingBlogPostSection.tsx` (desktop). No header search. `/blog-search` lacks result count/empty state.

```
Read components/BlogPage/BlogPage/BlogPageHeroSection/BlogPageHeroSection.tsx, components/BlogPage/BlogPage/BlogMovingPcsingBlogPostSection.tsx, app/(site)/blog-search/page.tsx, components/SearchBlog/SearchBlog.tsx, lib/blog/mdx.ts (searchBlogs).
Change: remove the broken input from inside the <Link>; add a real <form method="GET" action="/blog-search"> in the blog hero that works on all breakpoints; add a compact blog search to the site header (or an always-visible search bar atop /blog); on /blog-search add "N results for '…'", an empty state with suggested categories/popular posts, and a "Back to all guides" link.
Constraints: keep the GET→/blog-search contract; brand tokens; WCAG AA; no localStorage.
Acceptance: search works on mobile + desktop; build green; browser verification: type query → results page with count. Do not add Playwright scaffolding.
PR: "C2: fix + surface blog search". No merge.
```

### C3 — Blog post template: state CTA everywhere, sticky CTA, reading time, TOC, related (Status: Partial→mostly Open)
**Problem.** State CTA limited (see W0b); no sticky/floating CTA; reading time hard‑coded `"4 minutes"` (`BlogBeginingBlogPostAgent.tsx:31`); breadcrumbs only in JSON‑LD (`page.tsx:128‑145`), none visible; no TOC; related posts (`CommonBlog`→`getBlogsByComponent`) are file‑order, unranked.

```
Read app/(site)/blog/[slug]/page.tsx, components/BlogDetails/* (BlogBeginingBlogPostAgent, BlogDetailsCta), components/BlogPage/BlogPage/BlogCTA/CommonBlog.tsx, lib/blog/mdx.ts, mdx-components.tsx, components/Blog/FindAgentInState/*. (W0b should be merged first.)
Change: (1) compute reading time from blog.content word count (helper in lib/blog/mdx.ts) — remove the hard-coded "4 minutes"; (2) add visible breadcrumbs (you already emit BreadcrumbList JSON-LD); (3) build a TOC from MDX h2s (add heading ids in mdx-components.tsx) for posts above a length threshold; (4) add a sticky/floating "Find an agent in {state}" CTA (state-aware via the W0b resolver; generic fallback), reachable above the fold on mobile; (5) rank CommonBlog to 3 by shared state/categories/primaryKeyword instead of file order.
Constraints: don't regress JSON-LD/SEO; brand tokens; WCAG AA.
Acceptance: build green; a long post shows TOC + breadcrumbs + accurate reading time + sticky CTA; related posts are relevant; browser snapshot. Do not add Playwright scaffolding.
PR: "C3: blog post template upgrades". No merge.
```

---

## WAVE 1 — Track NAV/FUNNEL (one worktree)

### A3 — Customer lender entry in header/footer (Status: Partial)
**Problem.** `/contact-lender` is marketed on the homepage (`MakeItHome.tsx:45`, `VaLoanGuideDownload.tsx`) but there's **no customer "Find a Lender" link in `Header.tsx` or `Footer.tsx`** (header only has partner "Get Listed Lenders").

```
Read components/Header.tsx, components/Footer/Footer.tsx, app/(site)/contact-lender/page.tsx, lib/contactAgentUrl.ts (form='lender'), the W0c LenderCta component.
Change: add a customer "Find a Lender" nav link (header desktop + mobile drawer; footer) → /contact-lender, styled secondary to "Find an Agent". Use the canonical LenderCta where a button fits.
Acceptance: lender link visible in header + footer on desktop + mobile; build green; browser verification: header "Find a Lender" → /contact-lender. Do not add Playwright scaffolding.
PR: "A3: customer lender entry in nav". No merge.
```

### A5 — Surface orphan pages + split partner/customer nav + richer footer (Status: Open)
**Problem.** `/agents`, `/lenders`, `/guides`, `/refinancing`, `/military-spouse`, `/va-loan-help`, `/bah-calculator`, `/va-loan-calculator` exist but are **not linked** from header/footer. "Get Listed Agents/Lenders" (partner recruiting) sits under the customer‑labeled **"Contact"** menu. Footer is just state Locations + legal.

```
Read components/Header.tsx, components/Footer/Footer.tsx; confirm the routes above exist under app/(site)/.
Change: (1) add a footer "Explore" column linking the high-value customer pages (How It Works, BAH Calculator, VA Loan Calculator, Guides/PCS Resources, Find an Agent, Find a Lender); (2) move "Get Listed Agents/Lenders" under a clearly labeled "For Agents & Lenders" nav item, separate from a customer "Contact"; (3) list any page that should stay SEO-only for the team to decide link-vs-noindex (do not noindex without sign-off).
Acceptance: footer + header show the new structure on desktop + mobile; build green; screenshot of header menu split + footer.
PR: "A5: IA cleanup — footer Explore + partner/customer nav split". No merge.
```

---

## WAVE 1 — Track HOME/FORM (one worktree)

### A1 — Mobile guided agent finder (Status: Partial — most shipped in #94)
**Problem.** #94 already delivered the single‑primary hero and a mobile state‑map dropdown. The remaining gap: the guided `AgentFinderPopup` is still **desktop‑only** (`components/AgentFinderPopup/useScrollTrigger.ts` returns `showPopup && isDesktop`; listener early‑returns when not desktop). Decide whether mobile (62% of traffic) should get a guided finder.

```
First confirm current behavior: read components/homepage/HeroSection/HeroSection.tsx and components/homepage/StateMap.tsx — if the single-primary hero + mobile state dropdown are present and good, mark A1 as DONE for those sub-items in the PR description.
If a mobile guided finder is wanted: read components/AgentFinderPopup/* (useScrollTrigger.ts, AgentFinderPopupWrapper.tsx). Add a mobile-appropriate variant (e.g., a dismissible bottom-sheet or an inline "find an agent in your state" module) that routes to a PREFILLED /contact-agent (not a browse page). Respect prefers-reduced-motion; non-intrusive; one-time per session via in-memory state (no localStorage).
Acceptance: build green; on mobile the guided finder appears and lands on the lead form; browser mobile-viewport check. Do not add Playwright scaffolding. If you instead conclude #94 is sufficient, document that and close A1.
PR: "A1: mobile guided agent finder" (or a note that #94 closed A1). No merge.
```

### A2 — Reduce contact‑agent form friction (Status: Open)
> **SUPERSEDED BY v6:** A2 is single-screen validation alignment, not a multi-step rebuild. Keep the form shape, make `howDidYouHear` optional, relax client validation to email OR phone, extract pure lead-param builders, and prove the Salesforce `URLSearchParams` body is byte-identical. Notification copy fallbacks are deferred pending separate sign-off.

**Problem.** `app/(site)/contact-agent/page.tsx` renders one long `<ContactAgents>` (the multi‑step progress bar is commented out, lines 36‑50). `ContactAgent.tsx` has ~9 fields and **"How did you hear about us?" is still required** (`howDidYouHear: yup.string().required()`). #92 made `state` required + prefilled when `?state=` is present (don't undo that).

```
Read app/(site)/contact-agent/page.tsx, components/ContactAgents/ContactAgent.tsx, the lender twin, and the server action it submits to (keep the Salesforce/Slack/OpenPhone payload identical — confirm which fields are actually required by the write before removing any). Honor CLAUDE.md lead-routing (destination_city/current_location mappings — don't change them).
Change: (1) make "How did you hear about us?" optional; (2) align agent and lender client validation to email OR phone with blank-safe Yup handling; (3) extract testable validation and pure `URLSearchParams` builders; (4) preserve the single-screen form, `?state=` prefilled fast path, #92 required-state behavior, and the Salesforce payload contract.
Acceptance: identical Salesforce lead payload; Vitest for validation and payload identity; build green; browser-verify normal and prefilled paths. Do not add Playwright scaffolding.
PR: "A2: contact form validation alignment". No merge.
```

---

## WAVE 2

### C4 — State landing pages link to relevant blog guides (Status: Open)
**Problem.** `app/(site)/[state]/page.tsx` links to **zero** blog posts; the blog↔state relationship is one‑way.

```
Read app/(site)/[state]/page.tsx and its StatePage/* components, services/stateService.tsx, lib/blog/mdx.ts, lib/blog/getStateForBlog.ts (+ frontmatter stateSlug from W0b), content/_registry/internal-links.json, lib/states.ts.
Change: add a "Guides for {state}" section listing up to ~6 posts mapped to that state (via stateSlug/registry/getStateForBlog), placed to complement — not compete with — the agent cards. Hide if none.
Constraints: SSR-safe (state pages SSR from Sanity + Salesforce); reuse build-time data; brand tokens; WCAG AA.
Acceptance: a state with mapped posts shows the block; build green; screenshot.
PR: "C4: state pages related-guides block". No merge.
```

### B2‑code — BAH‑by‑base data component (Status: Open; content half in the CoWork runbook)
> **SUPERSEDED BY v6:** Do not build a live MHA-keyed `<BahByBaseTable mha year />`. Build a snapshot pipeline with script-safe data, an on-demand generator, committed snapshot metadata, and a server-only `<BahRateTable base year />` renderer. Use plain-ESM extraction by default; adding `tsx` needs sign-off.

**Problem.** `lib/bah-scraper.ts` pulls live DTMO BAH by ZIP+rank for every MHA but only ~3 BAH posts exist.

```
Read lib/bah-scraper.ts (toDtmoYear/toFourDigitYear, __testables, O-7 cap aliasing), lib/__tests__/bah-scraper.test.ts, lib/ai/tools/calc-tools.ts, components/BAHCalculator.tsx, mdx-components.tsx, the model post fort-meade-bah-2026-what-your-allowance-buys.mdx.
Change: create `content/_data/bah-base-targets.json`, a named on-demand generator such as `scripts/build-bah-snapshots.mjs`, plain-ESM scraper extraction shared by the TS wrapper, committed snapshot files with `{ year, sourceYear, source, generatedAt, ranks }`, and a server-only MDX `<BahRateTable base="..." year="..." />` that reads snapshots and degrades gracefully when missing.
Acceptance: npm test passes (scraper + snapshot/generator tests); the literal generator command runs from a clean shell; lint/type-check/build green.
PR: "B2: BAH snapshot pipeline". No merge. (Then the CoWork runbook generates the per-base posts.)
```

### B6‑code — 301 redirects for consolidated VA‑loan‑assumption posts (Status: Open; content half in CoWork)
```
After the CoWork runbook produces the canonical "VA Loan Assumptions" pillar and lists the retired slugs: read next.config.mjs (existing blog 301 patterns). Add 301s from the 3 retired va-loan-assumption* slugs to the canonical slug; remove the retired MDX; update any internal links that pointed to retired slugs (use content/_registry/internal-links.json to find them).
Acceptance: build catches no broken links; redirects resolve; lint/type-check/build green.
PR: "B6: VA-loan-assumption 301s + link fixes". No merge.
```

---

## WAVE 3 — Analytics instrumentation
> **SUPERSEDED BY v6 FOR THIS RUN:** AN1-AN4 are deferred to a separate Wave 4 after A2, A1/A4, and C3 land. Do not start analytics work during the organic-growth implementation. Keep the notes below only as future reference, and apply the same Salesforce lead-contract guardrail when that later wave starts.

**Goal:** make user behavior measurable end‑to‑end and reconcile reported conversions with real Salesforce leads. Grounded in `docs/analytics/analytics-audit-and-recommendations.md` — **use the event/param taxonomy in §4 of that doc verbatim** so the code matches the GA4 custom dimensions + GTM variables created in the browser (`docs/analytics/analytics-execution-checklist.md`).

> **⚠️ Alignment with the 2026-06-18 config execution** (read the "Corrections" callout at the top of the audit doc). The GA4/GTM config half is done; AN1–AN4 must respect:
> - **BAH calculator params are GTM-remapped.** Today GTM's "GA4 - BAH Calculator Use" event-settings variable sends the dataLayer `bah_zip_code`/`bah_paygrade` to GA4 as **`zip_code`/`paygrade`** (the GA4 dims are bound to those names). When AN3 moves the BAH calculator to the §4 `calculator_use`/`calc_type` taxonomy, **change the GTM variable AND the GA4 dimensions together**, or BAH data silently drops again.
> - **Contact Lender remaps `agent_id` → `lender_id`** at the GTM tag (this is the "agent_id on the lender event" AN1 notes). Account for it when typing the conversion events.
> - **The `bah_calculator_use` over-fire is purely code.** The GTM trigger is a clean Custom Event — there is **no GTM trigger to change** for checklist 3a; fix it only in `BAHCalculator.tsx` (AN3).
> - **GA4 → BigQuery export is already on** (daily, dataset `analytics_289589120`, project `salesforce-web-t-1731552477942`) — AN4 can assume it. Not retroactive (data from 2026-06-18 forward). To query it from scripts, the `vpcs-ga4-data-api@…` service account needs BigQuery Data Viewer + Job User roles.
> - Dimensions for the already-flowing params are registered (`agent_id`, `zip_code`, `paygrade`, plus pre-existing `state`/`home_value`/`content`/`position`/`blog_slug`/`area_assignment`/`bonus_amount`/`trigger_type`/`closure_method`); the envelope/Batch-2 dims still wait for this code.

> **⚠️ Salesforce-forms guardrail (applies to AN2 + AN4).** Do **not** change what the contact‑agent / contact‑lender forms submit, the server action's Salesforce/Slack/OpenPhone payload, the `destination_city`/`current_location` field mappings, or #92's required‑state behavior. AN2 changes only the *timing/placement* of the analytics call; AN4 adds only an *additive* hidden field. Verify the submitted payload is byte‑for‑byte identical before/after, and exercise both the multi‑step flow and the `?state=` prefilled fast path. If a change would alter the lead contract, stop and ask.

Historical analytics sequence: when the separate analytics wave starts, run AN1 before AN2-AN4. Do not run these tasks during the current organic-growth implementation.

### AN1 — Typed analytics layer (Status: Open; may land early — new files only)
**Problem.** 12 event names are emitted as ~17 inline, untyped `sendGTMEvent({...})` literals with no shared module; params drift (`state` is a slug here, a 2‑letter code there, an href elsewhere; `agent_id` even appears on the lender event; `conversion_download` is disambiguated by free text). Nothing forces a new interactive component to be instrumented.

```
Read every current call site (grep: sendGTMEvent\() and lib/contactAgentUrl.ts (state normalization), components/homepage/StateMap.tsx, AgentFinderPopup/*, the contact pages.
Change: create lib/analytics/ — a typed trackEvent(name, params) wrapping sendGTMEvent, with a TS union of event names + per-event param types (the §4 taxonomy), and a withContext() helper that auto-attaches the envelope (page_type, placement, state_code normalized to 2-letter, content_id/content_type). Migrate the existing ~17 call sites to trackEvent WITHOUT changing the emitted event names/params yet (pure refactor to the typed wrapper); normalize state to a 2-letter code in one place.
Constraints: no behavior change to existing events in this task (names/params identical on the wire); SSR-safe; no localStorage.
Acceptance: lint/type-check/build green; grep shows no remaining raw sendGTMEvent outside lib/analytics/; add a Vitest for the state normalizer + the event registry types.
PR: "AN1: typed analytics layer". No merge.
```

### AN2 — Fire conversions on server-confirmed success (Status: Open)
**Problem.** `conversion_contact_agent` / `conversion_contact_lender` fire client-side **before** the server action is awaited (`app/(site)/contact-agent/page.tsx:23`, `app/(site)/contact-lender/page.tsx:24`), so failed/bot/honeypot submits still count and GA over-reports vs Salesforce.

```
Read app/(site)/contact-agent/page.tsx, app/(site)/contact-lender/page.tsx, the server action(s) they call, and the honeypot/validation path. (Coordinate with A2 — merge A2 first if it's reworking these pages.)
Change: emit the conversion event only AFTER the server action resolves successfully (or from /thank-you on confirmed success), deduped, with bot/honeypot submissions excluded. Use the AN1 typed layer.
Constraints (HARD): do NOT change the Salesforce submit payload, field mappings, or required-state behavior — only move/condition the analytics call. Confirm the lead write path is untouched.
Acceptance: a forced server failure produces NO conversion event; a success produces exactly one; lead payload diff is empty before/after; lint/type-check/build green; browser verification for both forms incl. the ?state= fast path. Do not add Playwright scaffolding.
PR: "AN2: server-confirmed conversions". No merge.
```

### AN3 — Instrument the dark mid-funnel (Status: Open)
**Problem.** No events for: hero CTA, agent-card / "Get in Touch" clicks, contact form_start + field errors, blog AgentCTA/AgentContactLink clicks, blog body-link clicks, blog search, the VA-loan calculator, `tel:`/`mailto:` clicks, and the entire Concierge widget. `bah_calculator_use` over-fires (~15k/mo).

```
Read components/homepage/HeroSection/HeroSection.tsx, components/Blog/mdx/AgentCTA.tsx + AgentContactLink.tsx, components/ContactAgents/ContactAgent.tsx + the lender twin (for form_start/form_field_error), components/SearchBlog/SearchBlog.tsx, app/(site)/va-loan-calculator/page.tsx, components/BAHCalculator.tsx, header/footer (tel/mailto), components/Concierge/* . (Run after Wave-1 tracks merge.)
Change: add the §4 taxonomy events via the AN1 typed layer — cta_click (with placement), agent_card_click, form_start, form_field_error, blog_cta_click, blog_link_click, contact_click (tel/mailto), calculator_use (calc_type), concierge_open/message/card_click. Fix BAHCalculator to fire calculator_use on deliberate submit only (debounced) — this IS checklist 3a, which needs NO GTM change (the over-fire is entirely the component's auto-submit useEffect, ~lines 100-158). If you adopt calc_type naming, update the GTM "GA4 - BAH Calculator Use" variable + GA4 dims together (see the alignment note above).
Constraints: brand tokens; WCAG AA; no localStorage; don't regress existing events.
Acceptance: DebugView shows each new event with correct params; lint/type-check/build green; browser verification covering hero CTA, a blog CTA, form_start, and a tel/mailto click. Do not add Playwright scaffolding.
PR: "AN3: mid-funnel instrumentation". No merge.
```

### AN4 — Close the Salesforce loop (Status: Open)
**Problem.** Online sessions can't be tied to actual lead quality / closed deals, so "what content produces leads that close" is unanswerable.

```
Read the contact-agent/lender pages + server action + the Salesforce lead create in services/ (how fields map onto the Person Account). GA4 BigQuery export is ON as of 2026-06-18 (daily, dataset `analytics_289589120`) — assume it's available (not retroactive).
Change: read the GA client_id (and StatSig stable id if adopted) on the lead forms, pass as an ADDITIVE hidden field into the existing submit, and store on the Salesforce lead. No change to existing fields.
Constraints (HARD): additive only — do not alter existing required fields, mappings, or #92 required-state behavior. If Salesforce has no field to hold it, STOP and ask (a new SF field is a human decision).
Acceptance: a test lead carries the client_id through to Salesforce; existing payload otherwise identical; lint/type-check/build green.
PR: "AN4: client_id → Salesforce loop". No merge.
```

---

## Definition of done (whole runbook)
Wave 0 merged first; Wave 1 tracks run after shared contracts; Wave 2 follows; analytics is deferred to a later Wave 4. Every PR: passes `lint`/`type-check`/`build`, includes browser/screenshot evidence for journey/blog UX changes without repo Playwright scaffolding, and is left open for human review (never auto‑merged). No analytics PR may alter the Salesforce lead payload, field mappings, or required‑state behavior.
