# Sanity CMS: Stay or Migrate Into the Repo

**Status:** DECIDED (2026-07-13, Harper) — migrate fully into the repo. Execution plan: [sanity-migration-plan.md](sanity-migration-plan.md).
**Scope:** Whether to keep Sanity as the CMS for marketing content, or bundle all content into this repo (JSON in `content/_data/`, MDX for rich text, images in `public/images/`) and remove the Sanity dependency entirely.

**Gate resolution (2026-07-13, Harper):** The three open questions below are resolved as follows. (1) External `agent`-doc sync: the Salesforce→Sanity sync is being abandoned; its owner will be notified post-merge that it can be shut off. Headshots were audited 2026-07-13: the runtime serves only local `public/images/{agents,lenders}/` files, the only Sanity reader is the hand-run `scripts/migrate-agent-images-from-sanity.mjs` (vestigial, deleted in the migration), and Harper confirmed no needed headshots exist only in Sanity. (2) Editors: Harper is the editor; the repo (file edit + PR + deploy) is the workflow. (3) Token scope: Step 1 hardening is superseded by full removal; the token is revoked post-merge.
**Review:** This document was adversarially reviewed by Codex (2026-07-13). Its objections reshaped the recommendation into the two-step form below and are addressed inline; the original single-step "migrate now" framing compared migration only against today's unhardened configuration, which was the reviewer's strongest criticism.

## Recommendation: Harden now, migrate as the end-state

**Step 1, do immediately regardless of the CMS decision (roughly half a day):**

1. Verify whether `NEXT_PUBLIC_SANITY_API_TOKEN` is write-capable and whether it lands in shipped JS. Its scope is currently unverified. Check the token's role at sanity.io/manage, and after a build run a grep for the token value under `.next/static/`. Rotate to a read-only token, or remove it entirely if the dataset is public. Because `sanity/env.ts` (which references the token) is imported by `sanity.config.ts`, which the `'use client'` Studio page imports, inlining into a client chunk is the expected Next.js behavior, but it must be confirmed rather than assumed.
2. Set `useCdn: true` (`sanity/env.ts:14`) and add route-level `revalidate` to the CMS-backed pages. This moves API consumption from the fail-closed 250k/month live pool to the 4x-larger cached CDN pool and cuts request volume by orders of magnitude.
3. Fix the Google reviews fetch (`utils/googleBusinessProfile.ts:89`, `next: { revalidate: 0 }`) so `/`, `/impact`, `/stories`, `/military-spouse`, `/pcs-resources` can leave per-request rendering. Independent of the CMS decision.

Step 1 removes the two urgent risks (quota blackout, token exposure) for a few hours of work. After it, staying on Sanity is a safe steady state, and the migration decision is about strategy, not firefighting.

**Step 2, recommended end-state: migrate into the repo.** After hardening, the remaining case for migration is exactly the two costs Harper has said he wants gone:

- **Dependency and vendor surface.** Sanity contributes 4 direct packages and the largest transitive tree in the app: it drove most of the July 2026 Dependabot sweep (31 alerts), carries the permanently unfixable `decompress` critical (dismissed as unreachable), forces the `glob`/`prismjs` override pins, and has a logged 3-major-version upgrade (sanity 3.x to 6.x) waiting. Hardening does not shrink any of that; only removal does. It also keeps `/studio` (a live authenticated CMS under a deliberately relaxed CSP) and the webhook endpoint in production.
- **Operational simplicity.** One content source (the repo), one deploy pipeline, no CMS account to secure, no quota to think about, no external service whose compromise can alter the site.

Migration is gated on the three open questions below (external sync ownership, editor inventory, token scope). If those surface a hard blocker, or if the effort budget is zero, hardened-stay is a defensible place to remain; the matrix below makes that comparison explicit.

## Evidence

### Runtime surface (code audit)

- 14 service files query Sanity through one shared client (`sanity/lib/client.ts`) with `useCdn: false` (`sanity/env.ts:14`) and no `next: { revalidate }` or cache tags anywhere.
- 25 live document types feed ~12 routes: `/`, `/about`, `/spanish`, `/impact`, `/stories`, `/how-it-works`, `/military-spouse`, `/internship`, `/pcs-resources`, `/agents`, `/lenders`, `/[state]`.
- Freshness relies on the Sanity webhook calling `revalidatePath` (`app/api/v1/revalidate/sanity/route.ts`); most CMS pages set no route-level `revalidate`.
- Dead weight found during the audit: schema types `veterence_logo` and `howItWorks` are never queried; `services/initService.tsx` has zero callers; `howItWorksService.tsx:68` queries a `_type` (`howVeterencePCSServiceWorks`) that matches no registered schema, so it always resolves empty; the webhook path map carries stale entries (`review`, `veterence_logo`); `components/Blog/BlogListing.tsx` and `BlogDetail.tsx` are orphaned Sanity-era blog code.

### Dataset audit (live query, 2026-07-13, project `1y9pm0mb`)

2,263 documents total: 1,041 content docs plus 1,222 image assets (179.7 MB). The "content is static" premise needed correction, but the churn is concentrated in types the site never reads:

| Activity | Types | Read by the site? |
|---|---|---|
| Weekly automated writes (batched weekday 19:00/20:00 UTC) | `agent` (589 docs) | **Not by the website**, but the headshot import workflow (`scripts/migrate-agent-images-from-sanity.mjs:253`) reads `agent` docs to pull new headshots into `public/images/`. The writer itself is external to this repo (likely a Salesforce integration) and unidentified. It cannot simply be switched off; see Open questions. |
| Edits through 2026-04-17, then stopped | `blog` (139), `author` (43) | No. The MDX blog migration superseded these. |
| Legacy, untouched since 2024 to early 2025 | `city_list`, `category`, `review`, `post`, `agents`, `client` | No. |
| Script-driven batches, latest 2026-07-10 | `state_list` (54) | **Yes.** Written by `scripts/update-state-images-from-folder.mjs` (repo-side, controllable). |
| Occasional human edits: June 2026 (`internship_offer`, `trusted_resources`, `how_veterence_pcs_works`), May 2026 (`member_info`), then a long tail back to Dec 2024 | live page-component types | **Yes.** This is the real editing workload a repo workflow must absorb: a few edits per quarter, editor identity unconfirmed. |

Assets: 980 of 1,222 are referenced by some document (~144.5 MB), but that includes assets belonging to the dead types above. The subset referenced by live types was **not measured**; the migration plan requires an exact export manifest (see outline) rather than the "low tens of MB" estimate this analysis started with.

### Rendering and performance delta

Post-migration, with CMS data imported from repo files:

| Route | Today | After migration |
|---|---|---|
| `/about`, `/how-it-works`, `/internship`, `/spanish` | Dynamic, 2 to 8 uncached Sanity fetches per request | **Fully static at build** |
| `/`, `/impact`, `/stories`, `/military-spouse`, `/pcs-resources` | Dynamic, 2 to 9 Sanity fetches per request | Still dynamic until the Google reviews fix lands (Step 1.3); then ISR |
| `/agents`, `/lenders` | ISR 86400 | ISR unchanged (Salesforce data) |
| `/[state]` | Already static via `generateStaticParams`; refreshed by the Salesforce webhook | Static; state list/copy/maps from local JSON; Salesforce still queried at build/revalidate time |

Note: hardened-stay (useCdn plus revalidate) captures most of the same latency win; migration's marginal performance gain over hardened-stay is small. The performance argument favors leaving today's config, not staying-vs-migrating.

Image serving is near cost-neutral: every Sanity image except one raw CSS background (`components/About/aboutherosection/AboutHeroSection.tsx:23`) already renders through `next/image`/Vercel image optimization, and no code uses Sanity's on-the-fly resizing dimensions (`urlForImage` is `.auto('format').fit('max')` only; zero `.width()` calls in the repo). Two fidelity caveats for the export (from adversarial review): (a) crop/hotspot metadata on image objects can affect the URL the builder emits, so the export must materialize the *rendered* URLs, not raw originals, wherever crop/hotspot is set; (b) alt text stored in Sanity must be carried into the exported data. Expect a one-time transformation wave after the origin switch (cache keys change), then steady state identical to today ([image optimization pricing](https://vercel.com/docs/image-optimization/limits-and-pricing)).

Repo/build impact is trivial: `public/` is already 368 MB and `.git` is ~1 GB; adding the exported assets changes nothing against Vercel's verified limits (45-minute builds, 32 GB build disk, no upper limit on build output files; [limits](https://vercel.com/docs/limits)). Static files serve from Vercel's CDN with no function invocations ([CDN cache](https://vercel.com/docs/cdn-cache)). Whether Git-based deploys have a separate total-size cap is not stated in the docs (unverified), but the margin is enormous.

### Attack-surface comparison

Today, a compromised Sanity account (or the bundled token, **if** it proves write-capable) can rewrite content that goes live immediately on the 9 dynamic routes. The hand-written Portable Text serializer (`components/Blog/BlockContent.tsx`) emits only structured elements (no raw HTML), but it passes `markDefs.href` to links unvalidated, so phishing links and click-activated `javascript:` URIs are injectable (the site CSP carries `script-src 'unsafe-inline'`). The webhook secret only enables cache-busting.

Hardened-stay closes the token exposure and slows injection latency (cached/ISR pages), but keeps the Sanity account itself, `/studio` with its relaxed CSP, the webhook endpoint, and the full dependency tree as live surface. Post-migration, content changes require a GitHub write plus a Vercel deploy, gated by PR review and the pre-commit lint/type-check/build chain, and all Sanity surface disappears.

Deletable after migration: env vars `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`, `NEXT_PUBLIC_SANITY_API_TOKEN`, `SANITY_REVALIDATE_KEY`; the `/studio` route, `sanity/` directory, `sanity.config.ts`/`sanity.cli.ts`/`sanity.types.ts`, typegen scripts and the CI typegen drift check; packages `sanity`, `next-sanity`, `@sanity/image-url`, `@sanity/vision`; the `glob`/`prismjs` override pins; `cdn.sanity.io` from CSP `img-src` and `images.remotePatterns`; the entire `studioCsp` header block.

## Trade-off matrix

| Dimension | Stay as-is | Stay + harden (Step 1 only) | Migrate into repo |
|---|---|---|---|
| Cost | $0 | $0 | $0; one-time image-transformation wave |
| Quota/outage risk | 250k/month hard cap, fails closed; per-request burn | Effectively removed (CDN pool + caching) | None (no runtime CMS calls) |
| Security surface | Token of unverified scope inlined in client bundle; immediate-live injection channel; `/studio` relaxed CSP; webhook; full dependency tree | Token fixed; injection latency raised by caching; `/studio`, webhook, account, and dependency tree remain | All Sanity surface removed; content gated by GitHub + deploy |
| Dependency weight | 4 direct deps, largest transitive tree, unfixable `decompress`, 2 override pins, pending 3-major upgrade | Unchanged | Removed |
| Performance | Dynamic per-request CMS pages | Near-static (ISR) | Marginally better (true SSG on 4 routes) |
| Editorial workflow | Studio UI | Studio UI | File edit + PR + deploy; editors must be identified first |
| Effort | None | ~0.5 day | ~4 to 5 focused dev-days (outline below) |
| Reversibility | n/a | Trivial | **Moderate, not high**: reverting code restores reads of a Sanity dataset frozen at cutover; repo edits made after cutover must be manually backfilled. Low edit cadence keeps divergence small, but it is not free. |

## Migration outline (if approved; separate plan required)

Revised per adversarial review to make export fidelity and rollback verifiable rather than assumed.

1. **Gates (before any content work):** token scope verified and rotated (Step 1.1); external `agent`-doc sync identified, its owner and downstream consumers mapped, and a replacement for the headshot pipeline designed (most likely: pull headshots directly from Salesforce, which is already the system of record, removing Sanity as the middle hop); every Studio editor identified and the file-based workflow walked through with them.
2. **Export with manifest (1 day):** script patterned on `migrate-agent-images-from-sanity.mjs` + `recon-blog-migration.mjs`. Outputs: `content/_data/*.json` for live types; MDX (or structured JSON matching the existing `BlockContent` shapes) for the handful of Portable Text documents; every referenced live-type asset downloaded with a manifest recording asset id, checksum, filename, alt text, crop/hotspot, and the materialized rendered URL; a report of unresolved references. The manifest makes the export reproducible and auditable.
3. **Swap reads (1 to 1.5 days):** replace `client.fetch` in the 14 services with typed loaders mirroring `lib/blog/` (React `cache()`, import-time validation like `lib/blog/components.ts`). Component props stay identical where possible; `urlForImage` fields become local paths.
4. **Delete (0.5 day):** everything in the "Deletable after migration" list, plus the dead weight (initService, broken how-it-works query, orphaned components/schemas).
5. **Verify (1 day):** build output shows the expected static routes; for **every** CMS-backed and state route, diff rendered HTML, metadata, and OG/Twitter card images against production, plus Playwright screenshots; lint/type-check/build/test green; `npm ls` confirms the tree shrank; Vercel preview deploy inspected before merge.
6. **Rollback discipline:** take a final verified full export (dataset + assets) before cutover and retain it indefinitely; keep the Sanity project read-only during a grace period with explicit rollback triggers (visual/SEO regression, missing content, editor blocker); mirror any repo content edits into Sanity during that window so a revert stays clean; only archive the project after the new path has run clean for the agreed period.

## Open questions (gates for Step 2)

1. **Who or what operates the external `agent`-doc sync writing to Sanity weekly?** Not in this repo. The website never reads those docs, but the headshot import workflow does, and other consumers outside this repo may exist. Its owner, credentials, and downstream consumers must be mapped before it is touched. Retiring it without a replacement would silently break new-agent headshot propagation.
2. **Does anyone besides Harper edit content in Studio?** The May/June 2026 singleton edits suggest occasional editing. If a non-technical teammate needs to publish urgently, the repo workflow needs a tested answer for them before Studio is removed, not after.
3. **Token scope** (Step 1.1): if it proves read-only and absent from shipped chunks, the security case above weakens accordingly and should be re-stated from verified facts.

## Appendix: live document types (the actual migration payload)

Only **~152 of the 1,041 content documents** belong to types the site reads. Everything else is legacy or feeds systems outside the website.

| Type | Docs | Last `_updatedAt` | | Type | Docs | Last `_updatedAt` |
|---|---|---|---|---|---|---|
| state_list | 54 | 2026-07-10 | | additionalSuccessStories | 4 | 2024-12-11 |
| trusted_resources | 14 | 2026-06-17 | | support_veterence | 4 | 2025-09-16 |
| real_state_agents | 13 | 2025-04-12 | | media_account | 4 | 2025-01-10 |
| member_info | 8 | 2026-05-17 | | aboutUsPage | 3 | 2025-06-23 |
| how_veterence_pcs_works | 7 | 2026-06-16 | | internship_action | 3 | 2024-12-12 |
| approved_company_list | 7 | 2024-12-18 | | military_spouse_employment | 3 | 2024-12-18 |
| users | 7 | 2024-12-05 | | moving_your_life | 3 | 2025-10-09 |
| frequently_asked_questions | 6 | 2025-06-12 | | video_success_stories | 3 | 2024-12-19 |
| life_resources | 6 | 2025-10-09 | | impact_page, video_review, stories_poster, moveInBonus, internship_benefits, internship_offer, military_spouse_approved, aboutSupportComponent | 1 each | 2024-12-11 to 2026-06-17 |

## Sources

- Sanity Free plan quotas and overage policy: https://www.sanity.io/pricing, https://www.sanity.io/docs/platform-management/plans-and-payments, https://www.sanity.io/docs/content-lake/technical-limits
- Vercel limits and caching: https://vercel.com/docs/limits, https://vercel.com/docs/cdn-cache, https://vercel.com/docs/image-optimization/limits-and-pricing
- Dataset audit script and raw output (session scratchpad, not committed): `sanity-audit.mjs`, `audit-out.json`
- Dependency-security context: PR #171 (July 2026 Dependabot sweep), `docs/REVERSION-PLAN.md` precedent for decision docs
- Adversarial review: Codex, 2026-07-13 (six findings; all incorporated above, principally the hardened-stay option, the unverified token scope, the agent-sync consumer mapping, export fidelity manifest, and the rollback rewrite)
