# Sanity Repo-Migration Plan

**Status:** APPROVED (2026-07-13, Harper). Executes the DECIDED outcome of [sanity-migration-decision.md](sanity-migration-decision.md).
**Branch:** `feat/sanity-repo-migration`, one PR, one commit per section.
**Plan review:** adversarially reviewed by Codex (2026-07-13, 7 findings); resolutions are folded in below and summarized in the PR body.

## Architecture

- Scalar/structured content: `content/_data/site/<type>.json`, one file per live document type, exported verbatim-but-cleaned (drop `_rev`/system noise in the committed JSON, keep `_id` for traceability; the export manifest records `_rev` for drift detection).
- Typed loaders: `lib/content/` with React `cache()` and import-time validation that throws (pattern: `lib/blog/components.ts`). Services keep their exported signatures so components don't churn.
- Rich text (18 Portable Text docs: 8 `member_info` bios, 6 FAQ answers, 4 `support_veterence` blurbs, of which one orphan is dropped): typed `.tsx` content modules colocated with consumers, rich fields as JSX ReactNode so links/bold/lists stay freely editable. Parity unit tests compare each module's rendered output (text, hrefs, strong/em, lists, headings) against the exported Portable Text JSON.
- Block-shaped fields outside those 18 docs (how_veterence_pcs_works sections, moveInBonus requirements, video_success_stories descriptions) stay as JSON blocks rendered by the existing component renderers: byte-identical data, no transcription risk.
- Images: `public/images/content/<section>/`, state maps in `public/images/states/`, deterministic filenames. Committed manifest per image: Sanity asset id, sha256, local path, alt, crop/hotspot, materialized rendered URL where crop/hotspot affects output (cropped renditions downloaded in that case).
- Export tooling: `scripts/export-sanity-content.mjs`, idempotent, `--dry-run`/`--force`/`--check` (drift scan on `_id`/`_rev` sets), warnings fatal, machine-readable zero-error report (count/id/rev parity, reference closure, 1:1 asset mapping, HTTP/MIME/dimensions/sha256).

## Commit sequence

0. Decision doc to DECIDED plus this plan doc.
1. Export script, full content/asset export, manifest. No component changes.
2. About (`aboutService`; bios to `components/About/teamBios.tsx`).
3. How-it-works + internship (`howItWorksService` incl. deleting the dead broken query, `internshipPageService`, moveInBonus).
4. Military-spouse + PCS-resources (incl. `SquaredAwaySlider` client-fetch refactor to server props).
5. Impact + stories (`impactService`, `storiesService`, FAQ to `faqContent.tsx`; `VideoReview` refactored to a shared server wrapper across all 7 consumer routes).
6. Homepage + /spanish (support content module, testimonials, FeaturedLogos, inline renderer removed).
7. state_list (stateService, [state] pages, sitemap, llms.txt, MCP + concierge tools, OG/Twitter absolute-URL normalizer, state-images script retired).
8. Media accounts plus any remaining live types (reconciled against the decision-doc appendix).
9. Removal sweep. Hard gate first: `--check` drift scan, full `npx sanity dataset export` outside the repo, tarball verified, restore command recorded.
10. CLAUDE.md updates and PR body.

## QA per section (before its commit)

Playwright drive of affected routes vs production baseline (text, images, metadata, OG/Twitter tags); type-check and build green with expected static-route markers; `npm test`; Codex review of the diff; drift `--check` before every commit. Failing QA blocks the commit.

## Rollback

Verified full dataset export retained outside the repo before any deletion. Sanity project stays read-only for ~30 days post-merge with explicit rollback triggers (visual/SEO regression, missing content; owner: Harper); repo content edits during that window are mirrored into Sanity; restore via `sanity dataset import` (command in the PR body). Archive after the window runs clean.
