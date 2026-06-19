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
- [PR] Batch 2 — zero-converting traffic leaders: `what-military-bases-are-in-hawaii` / `-florida` / `-new-york`, `pcs-to-hawaii-*` · PR: https://github.com/VeteranPCS/vpcs-nextjs-website/pull/100
- [ ] Batch 3+ — remaining pre-2026 orphans (zero outbound `/blog/` links) · PRs: —
  - **Pool as of 2026-06-19: 104 posts** (pre-2026 `publishedAt`, zero `](/blog/` or `veteranpcs.com/blog/` links in body, excluding the 9 Batch 1+2 slugs). Regenerate the list anytime by scanning `content/blog/*.mdx` bodies for internal `/blog/` links (image paths `/images/blog/` don't count).
  - **Recommended Batch 3 first sub-batch (≤8, geo — easiest state-matched CTAs + dense cross-links):** `what-military-bases-are-in-north-carolina` (Fort Liberty/Bragg), `what-military-bases-are-in-colorado` (Carson/Peterson/USAFA), `what-military-bases-are-in-arizona` (Luke/Davis-Monthan), `best-places-to-live-near-fort-hood` (TX), `buying-a-home-near-joint-base-san-antonio-top-5-things-to-know` (TX), `best-places-to-live-near-fort-benning` (GA), `discover-the-best-places-to-live-near-hill-air-force-base-utah` (UT), `best-places-to-live-near-eglin-air-force-base-veteranpcs` (FL). All have active agent pools (HI/FL/NY/CA/GA/AL already proven; TX/CO/AZ/UT confirmable via the same `isAgent__pc=true AND Active_on_Website__pc=true` + state-code query).
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
- 2026-06-19 · B1 Batch 2 (zero-converting traffic leaders) · PR https://github.com/VeteranPCS/vpcs-nextjs-website/pull/100 · 5 posts: `what-military-bases-are-in-hawaii` (CTA: Ryan Adams, Ewa Beach/Oahu `0014x00001028NW`), `what-military-bases-are-in-florida` (Rob Hastings, Jacksonville `0014x00001qLsoq`), `what-military-bases-are-in-new-york` (Jean Da Silva, Ft. Drum `0014x00001uKJdN`), `pcs-to-hawaii-what-active-duty-service-members-need-to-know-about-buying-a-home` (kept existing first-person author Erica Lehmkuhl `0014x00000IFGiV` — active HI agent), `pcs-to-hawaii-with-pets` (CTA Chip Lewis, Kailua/Oahu `0014x00001BMfsr`). Each: +4–5 contextual `/blog/` internal links, state-matched `<AgentContactLink>`+`<AgentCTA>`, top-level `stateSlug` set, `updatedAt`→2026-06-19, `publishedAt` unchanged. No emoji in any touched post. Notes: (1) all 5 CTAs sourced from ACTIVE agents (`isAgent__pc=true AND Active_on_Website__pc=true`), city-matched to the base metro (Oahu for HI, Jacksonville for FL's NAS Jax/Mayport, Ft. Drum for NY). (2) `pcs-to-hawaii-with-pets` byline **Larry Gonzales** (`001Rg000006QuG4`) is `active=true` but `isAgent=false`; left the byline intact (body is neutral VeteranPCS voice) and pointed the CTA card at an active Oahu agent — no re-attribution, mirrors the Grant-Thompson handling from Batch 1. (3) Pre-existing LOW meta-length findings remain on the two `pcs-to-hawaii-*` posts (`metaTitle`/`metaDescription` over band) — left as-is: out of B1 scope (links/CTA/updatedAt only, no body/meta rewrite) and owned by the dedicated high-impression metas program (PR #73 lineage). (4) Registry regenerated (`internal-links.json` committed). (5) Reconciliation: PR #99 (Batch 1) is now MERGED → ticked `[x]`; the rest of the `docs/blog-updates/` tree stays untracked, this PR commits the tracker only. Gate: editorial audit clean for all 5 touched slugs (0 high/med, 0 new findings) · Mac `lint`+`type-check`+`build` green.
- 2026-06-19 · B1 Batch 1 (GA4 decayers) · PR https://github.com/VeteranPCS/vpcs-nextjs-website/pull/99 · 5 posts: `what-military-bases-are-in-california` (CTA: Jacob Mahaffey, San Diego `0014x000027YATG`), `alabama-military-bases` (Kelli Malace, Huntsville `0014x00001uLvPH`), `what-military-bases-are-in-georgia` (Trista Allen, Columbus `0014x0000298nbK`), `tennessee-military-bases-*` (generic CTA — see note), `the-ultimate-pcs-checklist-*` (national, generic CTA). Each: +4–5 contextual `/blog/` internal links, state-matched `<AgentContactLink>`+`<AgentCTA>` (geo posts) or generic `/contact-agent` (TN + checklist), top-level `stateSlug` set on the 4 geo posts, `updatedAt` bumped to 2026-06-19, `publishedAt` unchanged. Stripped pre-existing emoji from CA + AL to clear the editorial audit (no prose rewrite). Notes: (1) **Grant Thompson** (the in-body author of the TN post) is `Active_on_Website__pc=false`, so a matched-agent CTA would contradict the body — used a generic `/contact-agent` link + `stateSlug` instead; recommend a future body refresh to reconcile the byline. (2) Registry regenerated (`internal-links.json` committed). (3) Reconciliation finding: the `docs/blog-updates/` tree (this tracker + `execution-cowork.md` + `claude-opus-4.8-plan*.md`) is **untracked** in git on `main`; this PR commits the tracker only. Gate: editorial audit clean on all 5 slugs · Mac `lint`+`type-check`+`build` green.
