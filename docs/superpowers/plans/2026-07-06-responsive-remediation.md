# Responsive Remediation Implementation Plan — VeteranPCS

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (fresh subagent per task). Steps use checkbox syntax for tracking.

> **Persistence & handoff:** this file (`docs/superpowers/plans/2026-07-06-responsive-remediation.md`, committed to main 2026-07-06) is the canonical plan — it survives context clears and is present in every git worktree branched from main. Execution is driven by a `/goal` session pointed at this file; check off tasks here as they complete so any session can resume from the checkboxes. Approved by Harper and adversarially reviewed by Codex (plan gate passed) — executors should not re-plan or re-ask for approval.

**Goal:** Fix every finding from the 2026-07-06 responsive-design audit (1 Critical, 8 High, ~26 Medium, ~15 Low, plus approved secondary cleanup: alt text, h1 hierarchy, dead code), then visually validate every fix across device sizes so the site is verifiably usable by a human at 375px through 1440px.

**Architecture:** UI-only changes — Tailwind classes, module CSS, JSX structure, static assets, and client-side viewport gating. **No backend logic changes**: no edits to `services/`, `actions/`, `app/api/`, form submit handlers, or Salesforce/Sanity code. Form-control replacements (e.g. multi-select → checkbox grid) must preserve the exact state shape and submit payload.

**Tech stack:** Next.js 16 App Router, Tailwind (default breakpoints + `min-[1400px]`), CSS modules, next/image, Playwright MCP for validation, sharp/ffmpeg for asset work.

## Global Constraints

- **UI-only.** Any task that would require touching `services/`, `actions/`, `app/api/`, or submit-handler logic stops and reports instead.
- **Git hygiene (hard rules):** never commit to `main`; stage files by name; commit ≠ push; commits end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`; pre-commit (lint + type-check + build) must pass — never `--no-verify`.
- **Concurrent automation:** a weekly auto-blog job shares this working dir and can switch branches / merge to origin/main mid-session — so **all implementation happens in a dedicated git worktree per phase**, never the main tree (Codex plan-gate blocker). `git fetch` + verify branch before every commit anyway.
- **UI-only diff guard (mechanical):** before every commit, check staged `git diff --name-only` against the denylist `services/`, `actions/`, `app/api/`, `proxy.ts`, `.env*` — any hit aborts and reports. Judgment doesn't replace the guard.
- **Surgical diffs:** match surrounding idiom (Tailwind utility style, existing `min-h-11` pattern, existing module-CSS style). No refactors beyond the approved scope.
- **Touch-target standard:** reuse the codebase's existing `min-h-11` idiom (44px), as in `components/common/Button.tsx:23`.
- **Every phase = one PR**, branched sequentially (phase N+1 stacks on phase N's branch; PRs retargeted to main as predecessors merge). PR bodies end with the standard Claude Code attribution line.
- **Definition of done per task:** build passes AND the task's named viewport check passes AND I have looked at the screenshot and judged it sensible for a human user.

## Success Criteria (checked at Phase 7)

1. **Per-finding checks:** every task below has a concrete check; all pass.
2. **Overflow gate (the big one):** with `overflow-x-hidden` REMOVED (Phase 6), the overflow probe reports `scrollWidth == innerWidth` and zero elements beyond viewport bounds on all 11 audited pages × all 6 viewports. Additionally, **every phase's probe runs with the mask temporarily disabled** (injected style override in the probe, production CSS untouched) so no phase can hide new overflow behind the global mask.
3. **Touch-target gate:** interactive elements on audited pages measure ≥44px CSS in at least one dimension with adequate spacing, or are documented exceptions (inline prose links).
4. **Quality gates:** `npm run lint`, `npm run type-check`, `npm run build` pass per phase (pre-commit enforces); `npm test` run once per phase (no `lib/ai`/`services` changes expected, but cheap insurance).
5. **Weight gate:** homepage mobile transfer materially reduced — hero background from 2.0 MB to <300 KB; the 6.8 MB video no longer auto-downloads on phones.
6. **Human-sense gate:** I review before/after screenshots for every phase at every viewport and report a verdict per page — not "looks the same" but named observations.
7. **Manual-only carve-outs (declared, not simulated):** real iOS Safari behavior — `dvh` resize during scroll, video autoplay policy, Low Power Mode — cannot be proven in desktop Playwright. These ship with safe fallbacks (see T1.2, T3.3) and are flagged for a manual device check in the final report, not claimed as verified.

## Validation Harness (built in Phase 0, reused every phase)

- **Server:** `npm run dev` run **from the phase worktree** at `http://127.0.0.1:3000` (killed when done). Concierge phases pass the flag **inline** — `NEXT_PUBLIC_CONCIERGE_ENABLED=1 npm run dev` — never written to `.env.local`. Phase 7 additionally sweeps once against a production build (`npm run build && npm start`) for real asset transfer numbers.
- **Viewports (6):** 320×568 (small-phone floor), 375×812 (phone), 667×375 (landscape phone), 768×1024 (tablet), 1280×800 (laptop — the `min-[1400px]` gap), 1440×900 (desktop).
- **Pages (11):** `/`, `/about`, `/impact`, `/contact`, `/how-it-works`, `/pcs-resources`, `/blog`, `/blog/2026-bah-rates-what-changed-and-how-to-check-yours`, `/texas`, `/get-listed-agents`, `/get-listed-lenders`.
- **Probes (run via Playwright MCP by a validation subagent):**
  - *Overflow probe:* `scrollWidth` vs `innerWidth` + list of elements whose bounding rect exceeds viewport bounds (same probe the audit used) — run **with the global `overflow-x-hidden` mask disabled** via injected override (`html, body { overflow-x: visible !important }`) so pre-Phase-6 probes measure true overflow, not the masked baseline.
  - *Touch probe:* bounding boxes of all `a, button, input, select, textarea, [role=button], label[for]` — report any interactive box <44px in both dimensions with <8px spacing to neighbors.
  - *Screenshots:* top-of-page + any section a task touched, saved to the session scratchpad `screenshots/<phase>/<page>-<viewport>.png`.
- **Baseline:** full probe + screenshot sweep BEFORE any change (Phase 0), so every later diff has a comparison point.

---

## Phase 0 — Worktree, harness, baseline (no PR)

- [x] `git fetch origin && git status` — verify main tree state, note `origin/main` HEAD (auto-blog automation may have moved it).
- [x] Worktree: `git worktree add ../vpcs-responsive-p1 -b fix/responsive-p1-critical origin/main` — all Phase 1 work happens there (each later phase gets its own worktree branched from the previous phase's branch; worktrees removed after their PR merges).
- [x] **Plan persisted in the repo:** this file was committed to main on 2026-07-06 — it is canonical; check its boxes off (and commit the checkbox updates on the phase branches) as tasks complete.
- [x] Start dev server from the worktree; run baseline probe (mask-off) + screenshot sweep across all 11 pages × 6 viewports (validation subagent). Save to scratchpad.
- [x] (CONFIRMED 2026-07-06: renders 400px wide at 375px viewport, right edge 400px — T1.6 proceeds) Re-verify H5 (PcsResourcesHowDoesWorkIt `w-[400px]`) live at 375px — the production probe didn't reproduce it; confirm against local before fixing.

## Phase 1 — PR 1: Critical + dead controls + smallest-text fixes

Files: `components/Header.tsx`, `app/globals.css` (submenu rules only), `components/Impact/ImpactVaLoan/ImpactVaLoan.tsx`, `app/(site)/get-listed-agents/page.tsx`, `app/(site)/get-listed-lenders/page.tsx`, `components/StatePage/StatePageCityAgents/StatePageCityAgents.tsx`, `components/StatePage/StatePageVaLoan/StatePageVaLoan.tsx`, `components/PcsResources/PcsResourcesHowDoesWork/PcsResourcesHowDoesWorkIt.tsx`.

- [x] **T1.1 (C1) Get Listed submenu reachable on touch.** In the mobile drawer (`Header.tsx:209-245` region): render "Get Listed Agents" and "Get Listed Lenders" as plain inline nav items (no flyout). At `min-[1400px]`: **split control** — the parent stays a link to `/get-listed-agents` (preserves existing navigation), with an adjacent chevron `<button aria-expanded aria-controls>` that toggles the submenu via controlled React state; **remove** the `:hover`/`:focus-within` open rules from `globals.css:69-89` (don't blend CSS-open with state-open — conflicting open mechanisms was a Codex flag) and the `-left-[170px]`/`-left-[150px]` offsets. Close on Esc, outside click, and route change. Check: at 375px, tap path Home → menu → Get Listed Lenders lands on `/get-listed-lenders`; at 1440px, parent link still navigates, chevron opens/closes, Esc/outside-click/navigation closes.
- [x] **T1.2 (H2) Drawer scrolls.** `Header.tsx:66`: layer `dvh` over a `vh` fallback rather than a blind swap — `max-h-[calc(100vh-64px)] supports-[height:100dvh]:max-h-[calc(100dvh-64px)]` (and lg 80px variant) + `overflow-y-auto`. Check: at 667×375 all items reachable by scrolling inside the drawer; real-device iOS behavior flagged manual-only.
- [x] **T1.3 (H3a) Wire dead VA-loan CTA.** `ImpactVaLoan.tsx:80`: replace the href-less `Button` with the **existing `LenderCtaLink`/`TrackedCtaLink` primitive** (whichever sibling VA-loan CTAs on the page use) so tracking and destination resolution are preserved — do not hand-roll a one-off anchor. Check: renders as `<a>`, click navigates to the lender flow, CTA click event still fires.
- [x] **T1.4 (H3b) Dead X buttons on both Get Listed forms** (`get-listed-agents/page.tsx:102-115`, `get-listed-lenders/page.tsx:114-127`): make them `Link` to `/` (exit affordance mid-form). Check: tap exits to homepage.
- [x] **T1.5 (H4) NMLS/brokerage text 10px → 14px.** `StatePageCityAgents.tsx:106`, `StatePageVaLoan.tsx:78`: `sm:text-[10px] text-[10px]` → `text-sm` (keep `md:text-[18px]`). Check: screenshot at 375px, legible.
- [x] **T1.6 (H5) 400px fixed block** `PcsResourcesHowDoesWorkIt.tsx:10`: `w-[400px]` chain → `w-full max-w-[700px] px-5` (only if Phase 0 re-verification confirms; otherwise document why not).
- [x] Phase validation sweep (drawer, nav, state page, pcs-resources at all 6 viewports) + screenshot review + commit(s) + PR 1. Codex diff gate.

## Phase 2 — PR 2: Overlap & stacking (incl. Concierge)

Files: 4 hero components + their module.css (`components/About/aboutherosection/AboutHeroSection.tsx`, `components/Impact/ImpactHeroSection/ImpactHeroSection.tsx`, `components/contactpage/ContactHeroSection/ContactHeroSection.tsx`, `components/HowItWork/HowItWorkHeroSection/HowItWorkHeroSection.tsx`), `components/Header.tsx`, `components/Concierge/ConciergeWidget.tsx`, `components/homepage/HeroSection/HeroSection.tsx`.

- [x] **T2.1 (H6) Hero logo escape ×4.** Add `pointer-events-none` to the absolutely-positioned logo on all four heroes; where the next section compensates with magic padding (`ContactForm.module.css:112-114`, `YourImpact.module.css:21`) leave the padding as-is this phase (visual parity), but on How It Works reserve bottom margin in `HowItWorkHeroSection.module.css` mirroring the PcsResources pattern (`PcsResources.module.css:16`, `margin-bottom:120px` mobile). Check: at 375px Contact, taps on "Agents, Get Listed Here" work through the logo zone; How It Works logo no longer vanishes into the white section.
- [x] **T2.2 (H8) Header stacking.** `Header.tsx:39`: `z-50` → `z-nav` (token exists in `tailwind.config.ts`). Check (flag on): open mobile drawer at 375px — Concierge launcher does not paint over it.
- [x] **T2.3 (H7) Concierge landscape height.** `ConciergeWidget.tsx:357`: `sm:h-[560px]` → `sm:h-[min(560px,calc(100dvh-6rem))]`. Check (flag on): at 667×375 the panel header/close button is visible and tappable.
- [x] **T2.4 (M11a) Header logo sizing.** `Header.tsx:43,59`: size the link container only; image becomes `w-full h-auto`. Check: 320px-wide screenshot, no overlap.
- [x] **T2.5 (M11b) Surface "Find an Agent" CTA from `lg:`.** Show the red CTA button (not the nav links) at `lg:` instead of `min-[1400px]:`; hamburger still owns nav until 1400px. **Change the three coordinated visibility rules together** so exactly one CTA is visible per state: desktop CTA (`Header.tsx:250` `min-[1400px]`→`lg`), hamburger (`Header.tsx:270`, unchanged but re-verified), and the drawer's duplicate CTA (`Header.tsx:68` `min-[1400px]:hidden`→`lg:hidden`). Check: header open AND closed at 1024, 1280, and 1366 — no double CTA, no crowding (screenshot judgment).
- [x] **T2.6 (homepage hero overlay).** `HeroSection.tsx:159-167`: `pointer-events-none` on the decorative couple-with-check overlay + reserve its ~126px bleed with bottom padding on the hero image wrapper so it stops eating the StateMap section. Check: 375px screenshot — no overlap with "Where are you moving?", taps in that strip hit the map section.
- [x] Phase sweep + screenshots + PR 2 + Codex diff gate.

## Phase 3 — PR 3: Media & asset weight

Files: `components/homepage/HeroSection/HeroSection.module.css`, `public/assets/` (new optimized assets), `components/common/Slider.tsx`, `components/homepage/VideoFamily.tsx`, `components/StatePage/*` (4 `sizes` adds), `components/BlogPage/BlogPage/BlogMovingPcsingPost.tsx`, `components/Blog/mdx/BlogImage.tsx`, `mdx-components.tsx`, `components/BlogPage/BlogPage/BlogCTA/BlogCta.tsx`, `components/Header.tsx` (impact fetch gate).

- [x] **T3.1 (H1) Hero background.** Generate `herobg-1600.webp` (~desktop) + `herobg-750.webp` (mobile) from the 13214px PNG via a one-off script (sharp is available through Next's dependency tree; fallback `sips` + `cwebp`). CSS: declare a plain `background-image: url(herobg-1600.webp)` **first** as the universal fallback, then override with `image-set()`/media query for the mobile variant — never `image-set()` alone (no-support clients would get background color only). Keep the original PNG file untouched in git history; delete from `public/` only if nothing else references it (grep first). Check: network tab at 375px shows the ≤~150 KB variant; fallback verified by disabling `image-set` support in DevTools or asserting the computed style; visual parity screenshots.
- [x] **T3.2 (M3) `sizes` sweep, 9 locations** (audit list: StatePage headshots + hero + CTA, Slider logos, blog card, BlogImage, mdx img, BlogCta). Pattern: headshot circles `sizes="(min-width:768px) 200px, 100px"`; full-bleed `sizes="(min-width:1024px) 50vw, 100vw"`; card images matched to grid. Check: rendered `srcset`/`sizes` in DOM; no visual change.
- [x] **T3.3 (M4) Video.** Add `poster` (frame export); `preload="none"`; replace bare `autoPlay` with play-when-visible via IntersectionObserver in the existing client component (UI-only). **Catch `video.play()` rejection** (iOS Low Power Mode / autoplay policy can refuse even a muted visible video) and fall back to showing the poster + native `controls` so the user can play manually. If `ffmpeg` is on PATH, also re-encode to ~720p ≤1.5 MB; otherwise skip re-encode and say so. Stat overlay: `grid-cols-3` → stacked/2-row below `sm`, labels `text-[10px]` → ≥12px. Check (scoped honestly): no eager download at 375px + graceful fallback path exercised (simulate rejection); real iOS autoplay is manual-only.
- [x] **T3.4 (Low) Impact stat fetch gate.** `Header.tsx:16-32`: only fetch `/api/v1/impact` when `matchMedia('(min-width:1536px)')` matches (client-side gate; the API itself untouched). Note: `VideoFamily.tsx:22` fetches the same endpoint for the homepage stats overlay, which IS visible on mobile — that fetch stays. Check (narrowed accordingly): on a **non-homepage** route at 375px, zero `/api/v1/impact` requests; header stat still renders at 1536px+.
- [x] Phase sweep (incl. before/after transfer-size numbers) + PR 3 + Codex diff gate.

## Phase 4 — PR 4: Touch targets, forms, keyboard access

Files: `components/contactpage/ContactForm/*`, `components/homepage/KeepInTouch/KeepInTouch.tsx`, `components/BlogPage/.../BlogCategory.tsx` + "View All" links, `components/GetListedAgents/*`, `components/GetListedLenders/*`, `components/common/StateSelect.tsx`, `components/common/AccordionItem.tsx`, `components/About/{DigitalTeam,AdminTeam,CeoFounder}`, `components/StatePage/{StatePageCityAgents,StatePageVaLoan}.tsx` (Read More), `components/common/DownloadGuideComponent.tsx`, `components/PcsResources/MovingBonusCalculator/MovingBonusCalculator.tsx`, `components/BAHCalculator.tsx` (inputMode only), `components/Footer/Footer.tsx`, `components/Header.tsx` (nav anchor padding), `components/Concierge/MessageRenderer.tsx`.

- [x] **T4.1 (M2) 44px sweep** using the `min-h-11` idiom: contact inputs (module CSS `min-height:44px`), social icons (pad link to 44), blog pills/View All/breadcrumbs (`inline-flex items-center min-h-11`), Get Listed inputs + StateSelect trigger/options (`py-3`), footer Terms/Privacy, drawer nav anchors (pad to fill 52px row pitch), MessageRenderer `h-9`→`min-h-11`, submit/Next/Back `py-2`→`py-3`. Check: touch probe on all affected pages at 375px reports 0 failures (exceptions documented).
- [x] **T4.2 (M7) Multi-select → checkbox grid** in `AgentInfo.tsx:141-155` and `GetListedLendersProfileInfoWantShareMore.tsx:100-111`. HARD CONSTRAINT: same state variable, same string[] value, same field name in the submit payload; only the input UI changes (2-col checkbox grid, 44px rows, remove "Hold Ctrl/Cmd" copy). Implement through the form's **existing registration mechanism** (these fields are registered via the form library — use its controlled API, e.g. `Controller`/`setValue`, verified in-file) so `otherStates` stays a `string[]` under the same field name. **Proof = intercepted submit payload**, not React state: tap-select two states at 375px, submit (or tap into the submit handler pre-network), and diff the outgoing field name + array value against a baseline capture from the current multi-select. `services/salesForcePostFormsService.tsx` joins the array server-side — that file is untouched and the input it receives must be byte-identical.
- [x] **T4.3 (M8) iOS zoom:** `text-sm`→`text-base` on inputs in `DownloadGuideComponent.tsx:189-203`, `MovingBonusCalculator.tsx:203`.
- [x] **T4.4 (M10) Keyboard/AT:** `AccordionItem.tsx:17-21` header div → `<button aria-expanded aria-controls>` (full-width, style preserved); team-bio checkbox-hack (3 files) → `<button aria-expanded>` with `useState`, ≥44px target, fix invalid `bottom-[-1]`. Check: keyboard-only operation of FAQ + bios; visual parity screenshots.
- [x] **T4.5 (Lows):** `ContactForm.tsx:326` `rows={1}`→`rows={4}`; `inputMode="numeric"` on ZIP (`BAHCalculator.tsx:291-300`) + price (`MovingBonusCalculator.tsx:198-204`); Read More toggle only rendered when bio exceeds collapse height + 44px label (StatePage ×2, and the dangling-toggle bug); reserve error-message space or accept shift but per-field placement in `DownloadGuideComponent.tsx:218-224` (move pooled errors under their fields).
- [x] Phase sweep + keyboard pass + PR 4 + Codex diff gate.

## Phase 5 — PR 5: Layout & breakpoint corrections

Files: blog details components, `app/(site)/blog/[slug]/page.tsx`, `components/StatePage/*`, `components/homepage/{Covered,SkillsFuturesBuild,VeteranCommunity,VeteranPCSWorksComp,StateMap}.tsx` + module CSS, `components/Impact/{ImpactHeroSection,VideoReview}.tsx`, `components/PcsResources/{PcsResourcesMilSpouse,PcsResourcesEmployment,PcsResourcesMovingYourLife}.tsx`, `components/HowItWork/HowItWorkText/HowTheMoveInBonusWorks.tsx`, `components/BlogPage/*` pills/cards, `components/AgentFinderPopup/*`, `components/About/*` fixed widths, `app/globals.css` (scroll-padding only).

- [ ] **T5.1 (M5) Blog post:** TOC as `<details>` above article below `lg` (`BlogBeginingBlogPostAgent.tsx:46`); page wrapper `pb-20 md:pb-0` for the sticky CTA (`blog/[slug]/page.tsx:212`); hero h1 → `text-[28px] md:text-[36px]` (`BlogDetailsHeroSection.tsx:21`); align both body halves to the same `lg:` split + gutter (`EndBlogPostDetails.tsx:26-27` vs `BlogBeginingBlogPostAgent.tsx:32-60`).
- [ ] **T5.2 (M6) Un-hide content:** benefits band `hidden xl:block` → stacked base + `md:grid-cols-3` (`StatePageHeroSecondSection.tsx:29`); Covered heading smaller variant instead of hidden (`Covered.tsx:68-75`); MilSpouse heading `order-1` at base (`PcsResourcesMilSpouse.tsx:14`); blog section search `hidden md:inline-flex`, drop conflicting width (`BlogMovingPcsingBlogPostSection.tsx:36`).
- [ ] **T5.3 (M9) Fixed dims → fluid:** CoveredComp + StatePageWhyChooseVetpcs module widths → `width:100%` (delete the whipsaw px rules), drop `lg:h-[350px]`; SkillsFuturesBuild fixed heights → `min-height` + flow padding, drop `w-[300px]` paragraph; VideoReview + ImpactHeroSection → `aspect-video`/`h-auto`; VeteranCommunity/StatePageCTA/CeoFounder/Mission/AboutOurStory `w-[326-552px]` → `w-full max-w-[…]`.
- [ ] **T5.4 (M12) Blog card pills:** `flex-wrap max-w-[calc(100%-2rem)] justify-end` (`BlogMovingPcsingPost.tsx:47`, `PcsResourcesBlog.tsx:72`); title `line-clamp-2` + `min-height` cards (`PcsResourcesBlog.module.css:7,34`).
- [ ] **T5.5 (M13) Inverted/broken breakpoints with real behavior:** swap the StatePageLetFindAgent pairs to mobile-first (`:19-21`); wrap bonus table in `overflow-x-auto`, drop `lg:w-[1000px]` (`HowTheMoveInBonusWorks.tsx:61-90`); lender card `pl-10` → `md:pl-10 pl-4` (`StatePageVaLoan.tsx:68`); DownloadGuide icon row `flex-col sm:flex-row` + `text-2xl sm:text-3xl`.
- [ ] **T5.6 (Lows):** AgentFinderPopup `max-height:calc(100dvh-40px)` + body scroll-lock while open (match Concierge's existing pattern); StateMap tooltip clamp to viewport right edge; `scroll-pt-20` on html; small-state SVG label rects enlarged (~1.7×) for 768px tablets; `text-[11px]/[12px]/[13px]` floors → 12–14px (BAHResult, YourImpact, PcsResources body copy); SupportOurVeterans heading `text-[28px] sm:text-[40px]`; PcsResourcesMovingYourLife h2 31px base + logo `h-auto` (unforce 356×95); `px-9 sm:px-4` mid-range padding fix (About ×3); check icons' declared width/height metadata.
- [ ] Phase sweep (this is the biggest visual-change phase — full screenshot review at all 6 viewports) + PR 5 + Codex diff gate.

## Phase 6 — PR 6: Systemic cleanup + overflow unmasking + semantics

Files: sitewide small edits; `app/globals.css` LAST.

- [ ] **T6.1 Typo'd/invalid classes (bugs, fix everywhere):** `lg:w-[600ox]`, `text-leeft`, `items-cenetr`, `text-xsfont-bold`, `robot`→`roboto`, `order-0`, `translate-[-45%]`→`-translate-x-[45%]` (verify intent per site), `[@media(pointer:fine):hidden]`→`[@media(pointer:fine)]:hidden`, `md:grid-cols-0`, `focus-visible:outline-inset`, `sm:text-leeft`, `bottom-[-1]`. Verification per typo (not screenshot-only): (a) `rg` zero-check confirms the typo token is gone repo-wide; (b) a computed-style assertion on the affected element confirms the activated class actually applies (e.g. `getComputedStyle(...).width` after fixing `600ox`); (c) screenshot judged at every breakpoint the class targets — fixing a typo ACTIVATES a previously dead style; visual change is expected and must be judged, including breakpoints outside the standard screenshot set if the class names one.
- [ ] **T6.2 No-op breakpoint stacks:** remove duplicates ONLY in files already touched by Phases 1-5 (surgical rule); leave untouched files alone.
- [ ] **T6.3 Alt text:** `alt="Jason"` per-member names (`DigitalTeam.tsx:57`), `alt="Description of the image"` placeholders (Mission, heroes, BlogCta) → descriptive alts.
- [ ] **T6.4 h1 hierarchy:** one h1 per page (the hero title); demote extra h1s to h2 keeping their exact classes (state page ×3+, blog index ×2, About/Impact ×3-4 each, Contact/YourImpact title-vs-subtitle inversion fixed so the visual title is the h1). **SEO snapshot before/after per page** (this is an SEO-first site — visual parity alone is insufficient): h1 count + text, JSON-LD blocks, `id`/`href="#…"` anchor pairs, `aria-labelledby` references — diff must show ONLY heading-level changes, nothing structural. Visual parity screenshots required too.
- [ ] **T6.5 Dead code deletion** (approved) — **selector-by-selector with proof, never range deletion** (Codex plan-gate blocker: the original ranges contained live selectors). For each candidate selector: `rg` the class name across `.tsx/.jsx/.mdx` including dynamic `classes[...]`/template-string access; delete only on zero hits; spot-check computed styles on the pages that previously matched. **Known LIVE — do NOT delete:** `.LocationItem` (`Footer.module.css:42`, used at `Footer.tsx:85`), `st0`–`st3` (used by `StateMapSvg.tsx:47`), `.tooltip` (used by `StateMap.tsx:255`) — even though they sit inside the originally-listed ranges. Remaining candidates: unused `Footer.module.css` selectors (proven individually), `.map-container`/`.reviw-topslider`/`.custom-slider` in `globals.css` (proven individually); `components/StatePage/StatePaheHeroSection/CityButton.tsx`; `components/GetListedAgents/MilitaryService.tsx`; empty div `BlogMovingPcsingBlogPostSection.tsx:37-38`; duplicate `blogimageone/two/Three` classes; duplicate `<FrequentlyAskedQuestion/>` on pcs-resources (`page.tsx:102,118` — removing one changes the rendered page; screenshot-check); redundant `import "@/app/globals.css"` in components (keep root imports).
- [ ] **T6.6 (M1) Remove `overflow-x-hidden`** from `app/globals.css:10-17` and `:283-289` (all three declarations). THEN run the full overflow probe on all 11 pages × 6 viewports. Fix every newly exposed overflow (loop: probe → fix → re-probe until zero). This is deliberately LAST — and low-drama by then, since every earlier phase probed with the mask disabled, so genuinely new overflow here should be near zero.
- [ ] Phase sweep + PR 6 + Codex diff gate.

## Phase 7 — Final validation (no code unless failures found)

- [ ] Full success-criteria run: overflow gate, touch gate, quality gates, weight numbers, Concierge flag-on checks at 667×375.
- [ ] **Production-build sweep:** `npm run build && npm start` once; re-run the overflow probe + capture real transfer sizes (hero variants, video non-download) against the prod server — dev-server numbers don't count for the weight gate.
- [ ] Human-sense review: I examine every screenshot (11 pages × 6 viewports) and write a per-page verdict; any "technically passes but feels wrong for a human" issue becomes a fix or a documented decision.
- [ ] Report the manual-only checklist (iOS Safari: dvh drawer, video autoplay, Low Power Mode) for Harper to spot-check on a real device.
- [ ] Kill dev server. Summary report: finding → fix → evidence for all ~60 items.

## Delegation & Parallelism

- **Execution model:** subagent-driven development. Each T-task goes to a fresh implementation subagent with a minimal brief (exact files/lines/before→after from this plan + the UI-only and idiom constraints) and a verifiable done-condition (build + named check). **Each phase runs in its own git worktree** (`../vpcs-responsive-pN`, branched from the previous phase's branch, removed after merge) — the main tree is left to the auto-blog automation, which can switch branches there mid-session. Tasks *within* a phase run sequentially inside that worktree — they're small and several share files (Header.tsx appears in 4 phases), so per-task worktrees would cost more in merge overhead than they save.
- **Validation** is delegated to a dedicated browser subagent per phase (single Playwright instance, sequential pages internally). Screenshot review verdicts are mine, not the subagent's.
- **Codex gates (three kinds):**
  - *Plan gate* — adversarial review of this document via the Codex rescue agent: **DONE** (2026-07-06, 15 findings: 2 blockers [worktree execution, live selectors in the dead-CSS list] + 12 should-fix + 1 consider; all incorporated).
  - *Pre-stage gate (before each phase's implementation):* Codex reviews that phase's task list against the current code in the phase worktree — catches stale line numbers and drifted assumptions from earlier phases before any edit is made. Findings folded into the phase brief.
  - *Diff gate (after each phase's implementation):* Codex reviews the phase branch diff before its PR is marked ready. Blocker findings are fixed before the PR proceeds.
- **Tests:** `npm run lint && npm run type-check && npm run build` pass per commit (pre-commit enforces); `npm test` must pass per phase before its PR is opened — a failing test is a hard stop, not a note.
- **Asset generation** (T3.1 image variants, T3.3 poster/re-encode) runs as its own subagent with tool-availability fallbacks spelled out.

## Risks & Notes

- **H5 unconfirmed live** — Phase 0 re-verifies before we change it.
- **T6.6 is the riskiest step**: removing the overflow safety net can expose unknown overflow anywhere, including pages outside the audit's 11. Mitigation: it's last, every prior phase probed mask-off, the probe loop is budgeted, and the change is a 3-line revert if something intractable surfaces.
- **Coverage is scoped to the audited 11 pages + 6 viewports.** Unaudited routes (Spanish pages, guides, stories, terms, category pagination) may retain responsive issues — a documented limitation, not a claim of sitewide perfection. Real-device iOS behaviors are manual-only (see success criterion 7).
- **T6.1 activates dead styles** — each typo fix is a functional change in disguise; screenshot-judged individually.
- **T2.5 changes desktop header composition** at 1024–1399px — explicitly a design judgment call; screenshots presented before the PR is marked ready.
- **T4.2 is the only structural form change** — the payload-shape constraint keeps it UI-only; if preserving the payload proves impossible without touching submit logic, the task stops and reports.
- **Video re-encode** depends on ffmpeg presence; poster + lazy-play ships regardless.
- Blog byline, brand voice, and copy are untouched — this plan changes no user-facing words except removing "Hold Ctrl/Cmd" helper text and alt attributes.

## Kickoff — /goal condition (run in a fresh session)

Per the /goal docs, the condition stays short and evaluator-checkable: one end state, transcript-visible proofs, hard constraints, and stop clauses. All process detail (worktrees, subagent briefs, gate mechanics, git hygiene) lives in THIS file, which the working model reads on turn 1 — the condition is the directive, not the rulebook.

**Setup (order matters):** `/clear` first (clearing removes any active goal), enable auto mode so tool calls don't stall the loop (`/goal` removes per-turn prompts; auto mode removes per-tool prompts — they're complementary), then set the goal. If the session ends mid-run, resume with `claude --resume` — the condition carries over; a brand-new session loses it.

```
/goal Execute docs/superpowers/plans/2026-07-06-responsive-remediation.md exactly as written — it is pre-approved and Codex-plan-gated; do not re-plan or ask for approval. Done when the transcript shows: (1) every Phase 0–7 checkbox in that file checked and committed; (2) six open PR URLs printed from gh pr create, one per phase, merging not required; (3) for each phase, npm run lint, npm run type-check, npm run build, and npm test exiting 0 on the phase branch, plus a Codex pre-stage review before implementing and a Codex diff review before the PR opened, with blocker findings resolved; (4) the Phase 7 validation report printed: overflow probe zero failures on 11 pages x 6 viewports with overflow-x-hidden removed, touch-target results, production-build weight numbers, and the manual-only iOS checklist. Constraints: no commits to main; no staged diff touches services/, actions/, app/api/, proxy.ts, or .env files. After each phase, print the phase checklist with done/pending status. Or stop after 120 turns, or stop and summarize the blocker if the same phase fails its gates 3 times in a row.
```

(~1,300 chars, well under the 4,000 limit; every numbered proof is something the evaluator can see in the transcript.)
