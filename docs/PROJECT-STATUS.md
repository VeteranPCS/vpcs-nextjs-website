# VeteranPCS project status

**Last verified: 2026-08-30 (against `git log` @ `e8234d4`, which is level with `main`).**

Tracked, agent-facing orientation map. Operational rules live in [`../CLAUDE.md`](../CLAUDE.md); this
file is the phase/decision snapshot. Narrative history lives in the untracked local journal
`docs/ai-first/PROJECT.md` (gitignored via `.gitignore:66`, so it does not exist in worktrees, fresh
clones, or CI). Treat that journal as history only; where it disagrees with this file or the code, it
is wrong.

## Phase status

| Phase | What | Status |
|---|---|---|
| 1 | LLM citation infrastructure (sitemaps, `llms.txt` routes, schema.org) | Shipped 2026-05-20 (PR #78); still being extended, e.g. `RealEstateAgent` JSON-LD fix PR #176 (2026-07-20) |
| 2 | On-site AI concierge (`/api/chat`, `lib/ai/`, `components/Concierge/`) | Code on `main`; `NEXT_PUBLIC_CONCIERGE_ENABLED` defaults **off** in `lib/feature-flags.ts`. Production env value is not readable from the repo: **unverified**. Extended since the journal with guardrails (`lib/ai/guardrails/`), evals (`evals/`, `npm run eval`), and deterministic area routing (`lib/ai/routing/`) |
| 3 | Autonomous back-office agent workforce (Anthropic Agent SDK) | Not started. Verified: no Agent SDK dependency, no back-office agent code |
| 4 | Slack as operator interface | Not started. Slack is outbound lead notification only (`actions/sendToSlack.ts`) |
| 5 | Sanity removal / editorial migration | **Shipped 2026-07-14** (PR #172, merge `ab60324`). No Sanity client, config, or studio remains; content is repo JSON in `content/_data/site/` read through `lib/content/`. Leftovers below |
| 6 | Cross-cutting: privacy, retention, observability | Partial. BotID, Upstash rate limit, PostHog funnel telemetry, and per-PR CI (`.github/workflows/ci.yml`) are in place. No retention policy exists for chat sessions or lead data |

A 22-item AI-codegen remediation roadmap (CI workflow, test hardening, model-id consistency check) was
executed and fully merged via PRs #150 to #154; the local ledger is `docs/ai-first/ai-codegen-remediation-status.md`.

## Current state of play

Shipped since 2026-07-20:

- **State pages hardened (PR #182, 2026-08-24).** Partner rendering now survives Salesforce errors instead
  of blanking; agent/lender headshot ids match case-sensitively. CI builds the dynamic state routes with
  `SKIP_SALESFORCE_PRERENDER=1` because GitHub Actions holds no Salesforce credentials; Vercel and
  credentialed local builds still prerender every state and fail closed.
- **How It Works restructured** with parity tests (PR #177), plus an SEO CTR title/meta pass on 10 state guides.
- **Weekly auto-blog cadence is running**: PRs #178, #179, #180, #181, #183, plus a national-CTA follow-up (#184).
- Continuous agent headshot and state-map content commits throughout August.

In flight or unmerged:

- Branch `auto-blog/2026-08-30` holds one unmerged commit, `7944c10` "Weekly blog 2026-08-30: 4 new posts
  + 2 refreshes". Branch `auto-blog/2026-08-22` also sits one commit ahead of `main`.
- Branch `attio-migration` is 69 commits ahead and is retained only as a cherry-pick source; see
  [`REVERSION-PLAN.md`](REVERSION-PLAN.md).
- A weekly auto-blog automation shares this working directory and can switch branches mid-session.
  Re-verify the branch and fetch before committing.

## Active decisions

- **Stay on Salesforce.** The Attio migration was reverted; portal and SMS features get cherry-picked back.
  ([`REVERSION-PLAN.md`](REVERSION-PLAN.md))
- **No CMS.** Structured content is repo JSON validated at module load; rich text is typed `.tsx` modules
  with parity tests. ([`sanity-migration-decision.md`](sanity-migration-decision.md))
- **PostHog is the primary funnel telemetry source**; GA4/GTM is a comparator, Salesforce is the conversion
  source of truth. ([`analytics/telemetry-taxonomy.md`](analytics/telemetry-taxonomy.md))
- **Vercel AI Gateway, not a provider SDK.** Model ids live in `lib/ai/models.ts`; CI fails if `CLAUDE.md`
  stops naming the chat model id.
- **Phase 2 uses the Vercel AI SDK, Phase 3 will use the Anthropic Agent SDK.** Keep the runtimes separate.

## Open questions

- **Sanity grace window has expired.** Memory records the ~30-day read-only window as ending ~2026-08-13,
  but the deliberate leftovers are all still present: `@sanity/image-url` (`package.json:60`),
  `scripts/export-sanity-content.mjs`, and `scripts/__tests__/export-sanity-content.test.ts`. Nothing in the
  app runtime imports Sanity; `@sanity/image-url` is imported only by that export script. **Operator
  decision needed:** confirm the old Sanity project is archived and its token revoked, then delete all three
  and update the "Deliberate leftovers" bullet in `CLAUDE.md`. Do not delete before that confirmation; the
  backup at `~/VPCS/sanity-backup-2026-07-13/` is the only other copy.
- **`blog.sanityId` is not vestigial.** It is still read at `app/(site)/blog/[slug]/page.tsx:185` and fed as
  `contentId` into the PostHog `content_id` property (`components/Analytics/Trackers.tsx`). Renaming the
  field is a telemetry-taxonomy change, not a cleanup. Open: rename to `contentId` or leave it.
- **Concierge production activation.** Still no decision to flip the flag. The activation checklist (env
  vars, preview smoke test) is in the local journal.
- **No retention policy** for chat sessions or lead data. Should be scoped before concierge general availability.
- **Contact-agent and contact-lender Web-to-Lead POSTs send the same Salesforce recordType**, distinguished
  only by which custom field is populated. Latent lender-to-agent misrouting risk; open with the SF admin.
- **Local dev appears to target the PRODUCTION Salesforce org.** `SALESFORCE_LOGIN_BASE_URL` does not match
  the `test.salesforce.com` sandbox pattern, and the Web-to-Lead submit path is deliberately non-idempotent.
  Mitigated for verification work by `LEAD_DRY_RUN=1` (`lib/lead-dry-run.ts`, inert in production), but the
  underlying config is unchanged. **Operator decision needed:** point local dev at a sandbox org.
- Resolved 2026-08-30: tests now run in `.husky/pre-commit` (`lint && type-check && test && build`), closing
  the local-versus-CI gap.
- Resolved and dropped from the old list: the eval harness (shipped 2026-06-05) and the hardcoded BAH year
  (`app/api/v1/bah/route.ts` derives it from `new Date().getFullYear()`; no `BAHCalculator` component exists).

## Where knowledge lives

- [`../CLAUDE.md`](../CLAUDE.md) is the single operational source of truth. `AGENTS.md` is a thin pointer to it.
- [`salesforce-schema/`](salesforce-schema/) has committed `.md` field summaries; the `raw/` dumps are gitignored.
- [`analytics/telemetry-taxonomy.md`](analytics/telemetry-taxonomy.md) is the PostHog event taxonomy.
- [`REVERSION-PLAN.md`](REVERSION-PLAN.md), [`sanity-migration-decision.md`](sanity-migration-decision.md),
  [`concierge-area-routing-release-notes.md`](concierge-area-routing-release-notes.md) hold the standing decisions.
- **The freshest source is not in this repo.** Per-project agent memory lives at
  `~/.claude/projects/-Users-harperfoley-VPCS-vpcs-nextjs-website/memory/` (23 files plus `MEMORY.md`,
  current to 2026-07-20). It carries root-cause writeups, Salesforce field mappings, and gotchas that exist
  nowhere else. Read `MEMORY.md` first. It is local to Harper's machine and is not available in CI or to a
  fresh clone.
- `docs/ai-first/` is gitignored in full: the journal, remediation ledgers, and PR-body drafts are local only.

## How to keep this current

Update this file when a phase changes state or a durable decision is made, then re-stamp the "Last verified"
line with today's date and the short SHA you reconciled against. Keep it under 120 lines: point outward
rather than restating. If this file contradicts the codebase, the codebase wins; fix this file.
