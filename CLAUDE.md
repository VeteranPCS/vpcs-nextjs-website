# CLAUDE.md — VeteranPCS

Operational guide for Claude (and any other AI assistant) working in this repo. Keep this short and load-bearing; long-form context lives in `docs/PROJECT-STATUS.md`.

> See [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md) for phase status, active decisions, open questions, and what's next.
> (`docs/ai-first/` is a gitignored local journal: not present in worktrees, fresh clones, or CI. Do not rely on it.)

## What this product is

VeteranPCS is a Next.js site that connects active-duty service members, veterans, and military spouses doing a PCS (Permanent Change of Station) move to vetted, military-experienced real estate agents and VA-loan lenders. The site is read-mostly marketing surface (state pages, blog) plus form-driven lead capture; Phase 2 is layering an LLM concierge on top of that.

- Source of truth for agents/lenders/customers/deals: **Salesforce** (Person Account model with `__pc` custom fields). Person-Account customers are identified by the `isAgent__pc` / `isLender__pc` / `isCustomer__pc` booleans, **not** by an Account record-type filter. (`0124x000000Z7G3AAK` is the **Opportunity** "Customer" record type, used only in Opportunity queries.)
- Source of truth for marketing content (states, blog, headshots, copy): **the repo itself** — structured content in `content/_data/site/*.json`, rich text as typed `.tsx` modules colocated with their consumers, images under `public/images/`. (Sanity CMS was fully removed 2026-07-13 — see `docs/sanity-migration-decision.md`.)
- Lead intake: server actions → Salesforce REST + Slack notification + OpenPhone SMS.

## Tech stack

- **Framework:** Next.js 16 App Router (Turbopack), React 19.2, Node runtime.
- **Content:** repo-committed JSON (`content/_data/site/`) read through typed loaders in `lib/content/` (server-only, validated at module load — bad data fails the build). No CMS.
- **CRM:** Salesforce REST (SOQL); token retrieval via `services/salesForceTokenService.tsx`, queries via `services/api.tsx` + `services/stateService.tsx`.
- **AI:** Vercel AI SDK v6 (`ai`, `@ai-sdk/react`) routed through **Vercel AI Gateway** (model id `anthropic/claude-sonnet-4.6` in `lib/ai/models.ts`). No direct provider SDK is wired up — use the Gateway.
- **Telemetry:** PostHog is the primary funnel telemetry source; GA/GTM is a comparator. Taxonomy and troubleshooting live in `docs/analytics/telemetry-taxonomy.md`.
- **Rate limit + bot defense:** `@upstash/ratelimit` + Upstash Redis, `botid` (Vercel BotID), both applied in `app/api/chat/route.ts`.
- **Notifications:** Slack webhook (`actions/sendToSlack.ts`), OpenPhone SMS (`actions/sendOpenPhoneMessage.ts`). No Resend on this branch.
- **Test runner:** Vitest 4, `environment: 'node'` for the whole suite, `**/__tests__/**/*.test.ts`. Tests run in pre-commit and CI. **Nothing in the suite renders a component** (no jsdom, no Testing Library), so a green run says nothing about how a page looks.
- **Hosting:** Vercel. Use `vercel env` for env management. Prefer Fluid Compute defaults; do not assume edge runtime.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server at `http://127.0.0.1:3000` |
| `npm run build` | Production build (runs in pre-commit hook) |
| `npm run lint` | ESLint (pre-commit) |
| `npm run type-check` | `tsc --noEmit` (pre-commit) |
| `npm test` | Vitest one-shot (pre-commit) |
| `npm run lint:content` | Blog editorial audit (`scripts/audit-blog-editorial.mjs`); **not** in pre-commit |
| `npm run test:watch` | Vitest watch mode |
| `npm run eval` | Concierge eval suites (`vitest run -c vitest.eval.config.ts`); on-demand, not in `npm test` |

Pre-commit hook (`.husky/pre-commit`) runs `lint && type-check && test && build`, ordered fastest-failing first. The full suite is ~2s, so tests are cheap; `build` is the slow step and stays because content loaders throw at module load, catching bad JSON the unit suite misses. `npm run lint:content` is **not** in the hook: run it manually after `content/blog/` changes. Never use `--no-verify` to bypass the hook unless the user explicitly asks.

## Repo layout

```
app/
  (site)/              marketing pages (homepage, about, partners, etc.)
  [state]/             state landing pages (repo content + Salesforce)
  blog/                MDX-driven blog
  api/
    chat/              concierge streaming endpoint (Phase 2)
    v1/                public REST: areas, bah, impact, media-accounts, revalidate, states
    mcp/               MCP server entry
content/
  _data/site/          site content JSON, one file per former Sanity type + _manifest.json
lib/
  ai/                  concierge: models.ts, session.ts, system-prompt.ts, tools/
  content/             typed content loaders (server-only, throw-on-invalid at import)
  bah-scraper.ts       DTMO BAH lookup (see "BAH year format" gotcha)
  feature-flags.ts     NEXT_PUBLIC_CONCIERGE_ENABLED + future gates
services/
  stateService.tsx     state list (repo content) + Salesforce agent/lender fetch
  agentService.tsx     agent detail
  api.tsx              SOQL builder + REST wrappers
  salesForceTokenService.tsx
  loggingService.ts
actions/               server actions (Slack, OpenPhone, form submits)
components/
  Concierge/           Phase 2 widget (Provider, Widget, MessageRenderer, cards)
  ContactAgents/       agent lead-capture form
  ContactLender/       lender lead-capture form
  GetListedAgents/     agent get-listed form
  GetListedLenders/    lender get-listed form
  Internship/          internship application form
scripts/               Node scripts (audits, ingest, headshot classify, etc.)
evals/                 on-demand concierge eval suites (npm run eval)
docs/
  PROJECT-STATUS.md    phase status, decisions, open questions (tracked; start here)
  ai-first/            gitignored local journal, narrative history only
  analytics/           PostHog taxonomy, GA/GTM comparator, Salesforce joins
  REVERSION-PLAN.md    why we stayed on Salesforce (vs. the Attio migration)
  salesforce-schema/   Salesforce field reference (committed .md summaries; raw/ dumps gitignored)
```

## Skills

Project skills live in `.claude/skills/`. `.agents/skills/` is a **symlinked mirror** for Codex, not a
second copy: edit `.claude/` only. Adding a skill means adding the mirror symlink too.

| Skill | Use it when |
|---|---|
| `vpcs-verify` | Before claiming any UI, form, or route change is done. Also carries the lead-form safety rule. |
| `vpcs-blog` | Writing, refreshing, or auditing posts under `content/blog/`. |
| `vpcs-state-maps` | Processing a state-map update ticket (Linear + Drive + repo). |
| `vpcs-agent-headshots` | Processing an agent headshot ticket. |

Project subagents live in `.claude/agents/`: `salesforce-schema-researcher`, `blog-corpus-researcher`.

## Conventions and gotchas

### Salesforce / SOQL

- Person-Account customers are identified by the boolean flags `isAgent__pc` / `isLender__pc` / `isCustomer__pc`, **not** by an Account record-type filter. (`0124x000000Z7G3AAK` is the **Opportunity** "Customer" record type, used only in Opportunity queries — see `services/salesforceImpactService.tsx`, `FROM Opportunity`.) Person Account fields use the `__pc` suffix (`Current_location__pc`, `Military_Status__pc`, `Have_you_personally_PCS_d__pc`, etc.).
- Role flags are booleans: `isAgent__pc`, `isLender__pc`, `isCustomer__pc`.
- License-state filters use **2-letter codes**, not full names: `State_s_Licensed_in__pc LIKE '%TX%' OR Other_States__pc INCLUDES ('TX')`.
- `stateService.fetchAgentsListByState` / `fetchLendersListByState` expect a 2-letter state code (`short_name`), **not** the full state name or slug. They accept an optional `{ requireHeadshot?: boolean }`; the concierge tools pass `false` so the LLM still gets matches when a headshot is missing, while SSR pages keep the `true` default.
- Scripts that talk to Salesforce use **inline API helpers** (not top-level module imports) so env vars are read after `dotenv` runs.
- Schema reference: use the committed `.md` summaries in `docs/salesforce-schema/`. The deeper `raw/` dumps (`sobjects.json`, `*-describe.json`) are **gitignored** — not present in a fresh clone. Regenerate them (and refresh the `.md` summaries) with `node --env-file=.env.local scripts/recon-salesforce.mjs` (needs the Salesforce env vars). If present, **never `Read` them whole** — `sobjects.json` is ~1.35 MB (~350K tokens) and will blow the context window; grep or jq them instead.

### Repo content (`content/_data/site/`)

- **Editing structured content:** edit the type's JSON in `content/_data/site/` directly. Loaders in `lib/content/` validate at module load and **throw** — a typo'd field fails the build, not silently at runtime. Keep `_id` stable; bump `_updatedAt` when you edit (the sitemap's `lastModified` reads it).
- **Editing rich text** (team bios, FAQ answers, support blurbs): edit the typed `.tsx` content modules colocated with their consumers (`components/About/teamBios.tsx`, FAQ `faqContent.tsx`, `supportVeterenceContent.tsx`). Links/bold/lists are plain JSX. Each module has a parity test that derives its expectations from the exported Portable Text JSON in `content/_data/site/` — for a deliberate content change, update **both** the JSX and its matching JSON document; never weaken the test itself.
- **State images:** drop the file in `public/images/states/`, update the state's `state_map` entry (path/alt/width/height) in `content/_data/site/state_list.json`, and bump that doc's `_updatedAt`. A test in `lib/content/__tests__/states.test.ts` verifies every `state_map.path` exists on disk; it runs in `npm test`, which is now part of the pre-commit hook and CI.
- **Deliberate leftovers (grace window EXPIRED ~2026-08-13):** `scripts/export-sanity-content.mjs` (+ its test, + the `@sanity/image-url` devDependency) were retained only for rollback re-exports. The window has closed but the files are still present. Delete all three once the operator confirms the old Sanity project is archived and its token revoked; see `docs/PROJECT-STATUS.md`. Nothing in the app runtime imports Sanity. Note `blog.sanityId` is **not** a leftover: it is live, feeding `contentId` to PostHog `content_id`. Do not delete it.
- Headshot routing convention: `scripts/classify-headshot-ids.mjs` plus the `public/images/agents/` vs `public/images/lenders/` folders.

### Concierge (Phase 2)

- Entry point: `POST /api/chat` (`app/api/chat/route.ts`). It runs BotID first, then Upstash rate-limit, then `streamText` with the tools from `lib/ai/tools/index.ts`. Errors from `streamText` are caught and returned as JSON 500 — do not let it silently fail.
- Session: cookie `vpcs_concierge_sid`, 30-day, httpOnly, sameSite lax, secure in prod (`lib/ai/session.ts`). No DB; memory is cookie-scoped only for Phase 2.
- Feature flag: `NEXT_PUBLIC_CONCIERGE_ENABLED` (`'1'` or `'true'`). Off by default.
- System prompt and brand voice live in `lib/ai/system-prompt.ts`. Three words: **Trusted. Patriotic. Helpful.** No emoji, no hype, 5th–7th grade reading level.
- Tools must never invent agents, lenders, or BAH rates — always go through the tool layer.

### BAH scraper

- DTMO endpoint expects a **2-digit year on the wire** (`YEAR=25`), but the rest of the app uses a 4-digit year. `lib/bah-scraper.ts` has `toDtmoYear` / `toFourDigitYear` helpers for the round trip. If you change the year handling, run `lib/__tests__/bah-scraper.test.ts`.
- DTMO caps officer rates at `O-7/O-7+`. `lib/ai/tools/calc-tools.ts` aliases `O-8`/`O-9`/`O-10` to the same rank id.
- The scraper exports `__testables.fetchPage` so Vitest can `vi.spyOn` it without monkey-patching `node:https`. Only import `__testables` from tests.

### Forms & lead routing

- Lead-capture forms write to **both** the Salesforce Person Account (Customer record type) and the appropriate Opportunity. `destination_city` and `current_location` mappings are documented in the per-project memory directory `~/.claude/projects/-Users-harperfoley-VPCS-vpcs-nextjs-website/memory/` (the freshest source of project history; read its `MEMORY.md` index first). Ask before changing them.
- Default blog byline is `VeteranPCS`, never `The VeteranPCS Team`.

### Middleware (proxy.ts)

- Next.js 16 middleware lives at the repo-root file `proxy.ts` (exporting `proxy`), **not** `middleware.ts`. Don't create a `middleware.ts` — Next won't pick it up here; edit `proxy.ts` instead.

### TypeScript & code placement

- **`noUncheckedIndexedAccess` is on.** Array/record index access (`arr[i]`, `obj[key]`) is typed `T | undefined`. Handle the `undefined` in priority order: (1) restructure so it can't arise (`str.charAt(i)` over `str[i]`, `map[k] ??= []`, iterate `Object.values(map)`); (2) guard (`if (!x) return …`) or default (`?? fallback`) when it's genuinely reachable; (3) assert with `!` **only** where control flow proves the index is in-bounds (immediately after a `.length` check, inside a bounded `for` loop, a mandatory regex capture group, or a `toHaveBeenCalledTimes(n)` in tests) — and leave a one-line why. Never `!` to silence a genuinely-possible `undefined`; that reintroduces the silent-failure class this flag exists to catch.
- **Where shared code goes:** framework-agnostic helpers and pure functions live in `lib/`, grouped by feature (`lib/ai/`, `lib/blog/`, `lib/content/`); external-system access (Salesforce) lives in `services/`. Don't add a top-level `utils/` or `constants/` catch-all — colocate with the feature that owns it.
- **`.ts` vs `.tsx`:** new files with no JSX get a `.ts` extension; reserve `.tsx` for modules that return JSX. This is a going-forward rule for **new files only** — do not mass-rename the existing JSX-free `.tsx` files (e.g. `services/*.tsx`).

### Env vars (on `main`)

The env vars used on `main`:

- Salesforce: `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`, `SALESFORCE_USERNAME`, `SALESFORCE_PASSWORD`, `SALESFORCE_TOKEN`, `SALESFORCE_LOGIN_BASE_URL`, `SALESFORCE_API_VERSION`, `VPCS_SALESFORCE_BASE_URL`, `SALESFORCE_WEBHOOK_SECRET`
- AI: `AI_GATEWAY_API_KEY` (Vercel AI Gateway), `NEXT_PUBLIC_CONCIERGE_ENABLED`
- **Rate limit / bot:** Upstash Redis REST env can use either the canonical pair `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` or the Vercel integration pair `UPSTASH_REDIS_REST_KV_REST_API_URL` / `UPSTASH_REDIS_REST_KV_REST_API_TOKEN` (resolved in `lib/upstash-env.ts`). The app intentionally does **not** use read-only token or Redis-protocol URL vars for write paths. `LEAD_SPAM_ENFORCED` (`LEAD_SPAM_ENFORCED='0'` is the kill-switch that disables lead-spam quarantine — any other value or unset = enforced). BotID is auto-wired on Vercel and now guards **only** the concierge chat route (`/api/chat`), not the lead forms. `BOTID_FORMS_ENFORCED` is retired.
- **Guardrails:** `GUARDRAILS_ENFORCED` (`'0'` = disable all concierge input guardrails; any other value or unset = enforced). Mirrors `LEAD_SPAM_ENFORCED`. Guardrails run in `app/api/chat/route.ts` via `lib/ai/guardrails/evaluateInput`.
- Notifications: `SLACK_WEBHOOK_URL`, `OPEN_PHONE_API_KEY`, `OPEN_PHONE_FROM_NUMBER`, plus per-partner `*_PHONE_NUMBER`
- Misc: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID`, Google Reviews creds
- **Local verification only:** `LEAD_DRY_RUN` (`'1'`/`'true'`) short-circuits every outbound lead side effect (Web-to-Lead POST, Slack, OpenPhone SMS, lead-owner routing, PostHog `lead_conversion_created`) while still building and logging the payload. `lib/lead-dry-run.ts` forces it false when `NODE_ENV === 'production'`, so it is inert in any deployed environment. Read it only via `isLeadDryRun()`; never read `process.env.LEAD_DRY_RUN` directly.

No `RESEND_*` keys on this branch — transactional email is off here. Don't add Resend-based code without checking `docs/PROJECT-STATUS.md` first.

## Working agreements

- **Diagnose root cause before fixing.** Don't paper over symptoms; trace through `services/`/`lib/` until you understand why.
- **Verify before recommending.** A memory or plan that names a file/flag may be stale; `grep` or `Read` it before suggesting it to the user.
- **Don't bypass the pre-commit hook.** Lint, type-check, test, and build must all pass.
- **Green gates are not verification.** No test in this repo renders a component (`vitest.config.ts` sets `environment: 'node'`, and there is no jsdom or Testing Library). For any UI, layout, or Tailwind change, use the `vpcs-verify` skill and look at the rendered page before claiming done.
- **Never submit a lead form against a live backend.** Local Salesforce config points at the production org and the submit path is non-idempotent. Use `LEAD_DRY_RUN=1 npm run dev`; see `vpcs-verify`.
- **Use TodoWrite for non-trivial work** — branch state should always reflect a clear punch list.
- **Force-push requires explicit per-task authorization** (don't reuse a prior session's authorization).
- **Never commit `.env*` files or anything containing secrets.** Stage files by name rather than `git add -A`.
- **Default blog byline:** `VeteranPCS`. Default tone everywhere user-facing: calm, direct, plain.
