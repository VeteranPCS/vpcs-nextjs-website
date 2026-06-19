# Content Execution Progress — Organic Growth (B1–B6)

**Purpose.** Cross-session handoff tracker for the Cowork content runbook
(`execution-cowork.md`). Cowork sessions are stateless, so this file is how each new session
learns what's done and what's next. **Keep it accurate.**

## Protocol — every Cowork session does this, in order
1. **Read** `docs/blog-updates/organic-growth-projects/execution-cowork.md` (the runbook — follow it
   exactly), this file, `docs/ai-first/weekly-blog-routine.md`, `.claude/skills/vpcs-blog/SKILL.md`,
   `.impeccable.md`, `lib/blog/types.ts`, `CLAUDE.md`.
2. **Reconcile reality (ground truth = repo + PRs, not this file).** On current `main`, run
   `gh pr list --state all --limit 50`, check which posts already exist under `content/`, and
   rebuild + read `content/_registry/internal-links.json`. If this tracker has drifted from
   reality, fix the tracker first.
3. **Verify v6 contracts** (see runbook's alignment guardrail): registry has `posts[].stateSlug`,
   `posts[].componentSlug`, `byState`, `byComponentSlug`; MDX CTA components present; Mac/Chrome/
   Salesforce reachable. If anything is missing, **STOP and report** — do not guess.
4. **Do the next incomplete batch** per the priority order below and the runbook's per-task prompt.
   One PR per batch, never merge.
5. **Update this file in the SAME PR**: tick the items, paste the PR link, and append a Session Log
   entry. (This is part of "definition of done" for every batch — without it, handoff breaks.)

**Priority order:** B1 → B3 → B5 → B4.  (B2 gated on BAH snapshots; B6 coordinates with B6-code.)

**Status legend:** `[ ]` not started · `[~]` in progress · `[PR]` PR open, awaiting review ·
`[x]` done (PR merged) · `[BLOCKED]` dependency missing.

---

## B1 — Backfill internal links + state-matched CTAs into orphan posts — Status: `[~]`
~126 of 162 posts have zero outbound internal links. Maintenance pass only: add 3–5 contextual
internal links + a state/topic-matched CTA (`<AgentContactLink>` + `<AgentCTA>`, set
`author.salesforceId` + top-level `stateSlug`), bump `updatedAt`. **No body rewrites, no
`publishedAt` change.** ≤~8 posts/PR.
- [x] Batch 1 — GA4 decayers: `what-military-bases-are-in-california`, `tennessee-military-bases-*`, `alabama-military-bases`, `what-military-bases-are-in-georgia`, `the-ultimate-pcs-checklist-*` · PR: https://github.com/VeteranPCS/vpcs-nextjs-website/pull/99 (MERGED)
- [x] Batch 2 — zero-converting traffic leaders: `what-military-bases-are-in-hawaii` / `-florida` / `-new-york`, `pcs-to-hawaii-*` · PR: https://github.com/VeteranPCS/vpcs-nextjs-website/pull/100 (MERGED)
- [PR] Batch 3 sub-batch A — geo + base orphans (8 posts) · PR: https://github.com/VeteranPCS/vpcs-nextjs-website/pull/101
  - `what-military-bases-are-in-north-carolina` (CTA Lillian Tackett, Spring Lake/Fort Liberty `0014x00000L4LoY`), `what-military-bases-are-in-colorado` (Jason Anderson, Colorado Springs `0014x00000HWTqI`), `what-military-bases-are-in-arizona` (Andrea Parker, Glendale/Luke AFB `001Rg00000VbQJX`), `best-places-to-live-near-fort-hood` (Maria Barrientos, Killeen `001Rg00000V9YOr` — byline note below), `buying-a-home-near-joint-base-san-antonio-top-5-things-to-know` (kept Lissa Zapata `001Rg000006e4fo`, active TX), `best-places-to-live-near-fort-benning` (kept Bobby Haskin `0014x00000IFGiR`, active GA), `discover-the-best-places-to-live-near-hill-air-force-base-utah` (kept Jeffrey Morris `0014x000019ewED`, active UT, in-body), `best-places-to-live-near-eglin-air-force-base-veteranpcs` (kept Mike Marston `0014x00000IFGiO`, active FL, in-body — body expanded; see log)
- [ ] Batch 3+ — remaining pre-2026 orphans (zero outbound `/blog/` links) · PRs: —
  - **Pool as of 2026-06-19: ~96 posts** (pre-2026 `publishedAt`, zero `](/blog/` or `veteranpcs.com/blog/` links in body, excluding the 9 Batch 1+2 slugs and the 8 Batch 3 sub-batch A slugs). Regenerate the list anytime by scanning `content/blog/*.mdx` bodies for internal `/blog/` links (image paths `/images/blog/` don't count).
  - **Sub-batch A DONE 2026-06-19** (the 8 geo/base posts above). Active agent pools confirmed live this session for NC(32)/CO(6)/AZ(16)/TX(48)/GA(28)/UT(6)/FL(46) via `isAgent__pc=true AND Active_on_Website__pc=true` + state-code query (SF `v62.0`, instance `veteranpcs.my.salesforce.com`).
  - **Recommended Batch 3 next sub-batch (≤8, geo/base — active pools confirmed for NC/FL/TX/GA/AZ):** `pcsing-to-camp-lejeune-2026-onslow-county-guide` (Jacksonville NC), `buy-vs-rent-near-camp-lejeune` (NC), `best-neighborhoods-nas-jacksonville-military-families` (Jacksonville FL), `best-neighborhoods-near-nas-jrb-fort-worth` (Fort Worth TX), `best-places-to-live-near-ft-gordon-augusta-georgia` (Augusta GA), `pcs-to-fort-eisenhower` (Augusta GA), `pcs-to-luke-afb-military-guide-to-phoenix` (Phoenix AZ), `your-complete-guide-to-mcas-yuma` (Yuma AZ). Several of these were inbound link targets from sub-batch A; they still need their own CTA + outbound links.
  - **Before writing, check the latest `VPCS Web Analytics` dated folder** for decay/traffic to reorder priority; low-population states without an active agent fall back to a generic `/contact-agent` link + `stateSlug` (Batch 1 TN/checklist precedent). Same B1 rules: links/CTA/`updatedAt` only, no body rewrites, no `publishedAt` change, ≤~8 posts/PR.
  - **Heads-up (avoid program overlap):** several orphans are also B6 consolidation targets — do NOT backfill the four `va-loan-assumption*` posts here (`va-loan-assumption-guide-...`, `va-loan-assumptions-a-hidden-strategy-...`, `va-loan-assumptions-the-hidden-entitlement-rule-...`, `veterans-skip-the-hustle-...`); leave them for B6. The Castle Rock luxury cluster (~10 posts) is low-priority/off-core — defer.

## B3 — Finish the 50-state "what-military-bases-are-in-{state}" cluster — Status: `[ ]`
22 missing states. Priority first: TX, VA, WA, MD, SC, OK. Reconcile `alabama-military-bases` /
`tennessee-military-bases-*` to the canonical slug/format (note any needed 301 for the code track;
don't implement redirects here). ≤5–6 posts/PR, weekday-staggered dates, cited `.mil` facts only.
- [ ] TX · [ ] VA · [ ] WA · [ ] MD · [ ] SC · [ ] OK
- [ ] Remaining 16: OH, NV, MO, … (fill in as you go)
- PRs: —

## B5 — "PCS to {base}" guides for uncovered installations — Status: `[ ]`
Best-converting format. ≤5 posts/PR.
- [ ] Fort Bliss · [ ] Fort Cavazos · [ ] MCB Quantico · [ ] NS Norfolk · [ ] Fort Carson
- [ ] Wright-Patterson · [ ] Fort Sill · [ ] Fort Leonard Wood · [ ] Parris Island · [ ] Fort Drum · [ ] Travis AFB
- PRs: —

## B4 — State military/veteran property-tax series — Status: `[ ]`
~50 pages, almost no competition. Financial/legal-adjacent — cite state `.gov`, add "consult a
professional" + "verify with the county/state" caveats; set `reviewBy` to next year.
- [ ] TX · [ ] VA · [ ] FL · [ ] CA · [ ] NC · [ ] GA · [ ] WA · [ ] CO · [ ] HI
- [ ] Remaining states (fill in as you go)
- PRs: —

## B2 — BAH-by-base data pages — Status: `[BLOCKED]`
Use **committed snapshots only** (`content/_data/bah-snapshots/{base}/{year}.json`). Never hand-enter
a rate table or call DTMO live.
- [ ] Fort Bliss 2025 (snapshot present — runnable) · PR: —
- [BLOCKED] All other bases — need a code/data PR to add the target + snapshot via
  `scripts/build-bah-snapshots.mjs` first. Do not publish a BAH page without its committed snapshot.

## B6 — Consolidate cannibalizing `va-loan-assumption*` posts — Status: `[ ]` (coordinate with B6-code)
Draft ONE canonical "VA Loan Assumptions" pillar; **list the retired slugs + inbound links** for the
code track. Do NOT delete files or add redirects in Cowork.
- [ ] Canonical draft + retired-slug list · PR: —

---

## Session Log (newest first)
<!-- Append one line per batch/PR: YYYY-MM-DD · program/batch · PR #/link · posts touched · notes -->
- 2026-06-19 · B1 Batch 3 sub-batch A (pre-2026 geo + base orphans) · PR https://github.com/VeteranPCS/vpcs-nextjs-website/pull/101 · 8 posts: `what-military-bases-are-in-north-carolina` (CTA Lillian Tackett, Spring Lake/Fort Liberty `0014x00000L4LoY`), `what-military-bases-are-in-colorado` (Jason Anderson, Colorado Springs `0014x00000HWTqI`), `what-military-bases-are-in-arizona` (Andrea Parker, Glendale/Luke AFB `001Rg00000VbQJX`), `best-places-to-live-near-fort-hood` (Maria Barrientos, Killeen `001Rg00000V9YOr`), `buying-a-home-near-joint-base-san-antonio-top-5-things-to-know` (kept Lissa Zapata `001Rg000006e4fo`), `best-places-to-live-near-fort-benning` (kept Bobby Haskin `0014x00000IFGiR`), `discover-the-best-places-to-live-near-hill-air-force-base-utah` (kept Jeffrey Morris `0014x000019ewED`), `best-places-to-live-near-eglin-air-force-base-veteranpcs` (kept Mike Marston `0014x00000IFGiO`). Each: +4–5 contextual `/blog/` internal links, state-matched `<AgentContactLink>`+`<AgentCTA>`, top-level `stateSlug` set, `updatedAt`→2026-06-19, `publishedAt` unchanged. Notes: (1) All 8 CTAs are ACTIVE agents (`isAgent__pc=true AND Active_on_Website__pc=true`), city-matched where possible (Spring Lake↔Fort Liberty, Glendale↔Luke, Killeen↔Fort Hood, Columbus↔Fort Benning, Bountiful/West Point↔Hill, Crestview/Jacksonville↔Eglin/FL). (2) Byline handling: NC/CO/AZ were `VeteranPCS` byline → set `author.salesforceId` to the matched agent. JBSA/Fort Benning/Hill/Eglin already had ACTIVE state-matched agents as byline (Hill & Eglin feature them first-person; JBSA is built around the agent) → kept byline + CTA, no re-attribution (mirrors Batch 2 Erica-Lehmkuhl precedent). (3) **Fort Hood byline = Kelli Malace `0014x00001uLvPH` is active but a Huntsville ALABAMA agent, not named in the body — geographic mismatch on a TX post. Per "don't re-attribute," left the byline intact and pointed the inline link + `<AgentCTA>` card at an active Killeen TX agent (Maria Barrientos) — mirrors the Batch 2 Larry-Gonzales handling. Recommend a future byline reconciliation.** (4) Emoji stripped from NC/CO/AZ/Fort Benning/Eglin (mechanical, no prose rewrite) to clear the medium emoji finding. (5) **Eglin was a 439-word thin legacy post below the 800-word floor; the B1 closing section alone reached only ~595. Per Harper's direction, a sub-agent researched + expanded the body (now 1105 words) with cited Okaloosa/Santa Rosa school ratings, gate commute times, a Crestview Zillow figure labeled "typical value, not a median sale price," DTMO BAH guidance, and eglin.af.mil base facts — the ONLY post here with a body expansion; the other 7 are links/CTA/updatedAt only.** (6) Registry regenerated (`internal-links.json` committed). (7) Reconcile: PR #100 (Batch 2) confirmed MERGED on `main` → ticked `[x]`; rest of `docs/blog-updates/` stays untracked, this PR commits the tracker only. Gate: editorial audit clean for all 8 touched slugs (0 high/0 medium; only pre-existing LOW meta findings remain — out of B1 scope, owned by the high-impression metas program) · Mac `lint`+`type-check`+`build` green.
- 2026-06-19 · B1 Batch 2 (zero-converting traffic leaders) · PR https://github.com/VeteranPCS/vpcs-nextjs-website/pull/100 · 5 posts: `what-military-bases-are-in-hawaii` (CTA: Ryan Adams, Ewa Beach/Oahu `0014x00001028NW`), `what-military-bases-are-in-florida` (Rob Hastings, Jacksonville `0014x00001qLsoq`), `what-military-bases-are-in-new-york` (Jean Da Silva, Ft. Drum `0014x00001uKJdN`), `pcs-to-hawaii-what-active-duty-service-members-need-to-know-about-buying-a-home` (kept existing first-person author Erica Lehmkuhl `0014x00000IFGiV` — active HI agent), `pcs-to-hawaii-with-pets` (CTA Chip Lewis, Kailua/Oahu `0014x00001BMfsr`). Each: +4–5 contextual `/blog/` internal links, state-matched `<AgentContactLink>`+`<AgentCTA>`, top-level `stateSlug` set, `updatedAt`→2026-06-19, `publishedAt` unchanged. No emoji in any touched post. Notes: (1) all 5 CTAs sourced from ACTIVE agents (`isAgent__pc=true AND Active_on_Website__pc=true`), city-matched to the base metro (Oahu for HI, Jacksonville for FL's NAS Jax/Mayport, Ft. Drum for NY). (2) `pcs-to-hawaii-with-pets` byline **Larry Gonzales** (`001Rg000006QuG4`) is `active=true` but `isAgent=false`; left the byline intact (body is neutral VeteranPCS voice) and pointed the CTA card at an active Oahu agent — no re-attribution, mirrors the Grant-Thompson handling from Batch 1. (3) Pre-existing LOW meta-length findings remain on the two `pcs-to-hawaii-*` posts (`metaTitle`/`metaDescription` over band) — left as-is: out of B1 scope (links/CTA/updatedAt only, no body/meta rewrite) and owned by the dedicated high-impression metas program (PR #73 lineage). (4) Registry regenerated (`internal-links.json` committed). (5) Reconciliation: PR #99 (Batch 1) is now MERGED → ticked `[x]`; the rest of the `docs/blog-updates/` tree stays untracked, this PR commits the tracker only. Gate: editorial audit clean for all 5 touched slugs (0 high/med, 0 new findings) · Mac `lint`+`type-check`+`build` green.
- 2026-06-19 · B1 Batch 1 (GA4 decayers) · PR https://github.com/VeteranPCS/vpcs-nextjs-website/pull/99 · 5 posts: `what-military-bases-are-in-california` (CTA: Jacob Mahaffey, San Diego `0014x000027YATG`), `alabama-military-bases` (Kelli Malace, Huntsville `0014x00001uLvPH`), `what-military-bases-are-in-georgia` (Trista Allen, Columbus `0014x0000298nbK`), `tennessee-military-bases-*` (generic CTA — see note), `the-ultimate-pcs-checklist-*` (national, generic CTA). Each: +4–5 contextual `/blog/` internal links, state-matched `<AgentContactLink>`+`<AgentCTA>` (geo posts) or generic `/contact-agent` (TN + checklist), top-level `stateSlug` set on the 4 geo posts, `updatedAt` bumped to 2026-06-19, `publishedAt` unchanged. Stripped pre-existing emoji from CA + AL to clear the editorial audit (no prose rewrite). Notes: (1) **Grant Thompson** (the in-body author of the TN post) is `Active_on_Website__pc=false`, so a matched-agent CTA would contradict the body — used a generic `/contact-agent` link + `stateSlug` instead; recommend a future body refresh to reconcile the byline. (2) Registry regenerated (`internal-links.json` committed). (3) Reconciliation finding: the `docs/blog-updates/` tree (this tracker + `execution-cowork.md` + `claude-opus-4.8-plan*.md`) is **untracked** in git on `main`; this PR commits the tracker only. Gate: editorial audit clean on all 5 slugs · Mac `lint`+`type-check`+`build` green.
