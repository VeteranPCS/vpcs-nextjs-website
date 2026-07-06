# CLAUDE.md — VeteranPCS

Operational guide for Claude (and any other AI assistant) working in this repo. Keep this short and load-bearing; long-form context lives in `docs/ai-first/PROJECT.md`.

> See [docs/ai-first/PROJECT.md](docs/ai-first/PROJECT.md) for the AI-first reimagining: phase status, key decisions, bugs fixed, and what's next.

## What this product is

VeteranPCS is a Next.js site that connects active-duty service members, veterans, and military spouses doing a PCS (Permanent Change of Station) move to vetted, military-experienced real estate agents and VA-loan lenders. The site is read-mostly marketing surface (state pages, blog) plus form-driven lead capture; Phase 2 is layering an LLM concierge on top of that.

- Source of truth for agents/lenders/customers/deals: **Salesforce** (Person Account model with `__pc` custom fields). Person-Account customers are identified by the `isAgent__pc` / `isLender__pc` / `isCustomer__pc` booleans, **not** by an Account record-type filter. (`0124x000000Z7G3AAK` is the **Opportunity** "Customer" record type, used only in Opportunity queries.)
- Source of truth for marketing content (states, blog, headshots, copy): **Sanity CMS** + `public/images/`.
- Lead intake: server actions → Salesforce REST + Slack notification + OpenPhone SMS.

## Tech stack

- **Framework:** Next.js 16 App Router (Turbopack), React 19.2, Node runtime.
- **CMS:** Sanity (`next-sanity`, GROQ). Studio mounted at `/studio`.
- **CRM:** Salesforce REST (SOQL); token retrieval via `services/salesForceTokenService.tsx`, queries via `services/api.tsx` + `services/stateService.tsx`.
- **AI:** Vercel AI SDK v6 (`ai`, `@ai-sdk/react`) routed through **Vercel AI Gateway** (model id `anthropic/claude-sonnet-4.6` in `lib/ai/models.ts`). No direct provider SDK is wired up — use the Gateway.
- **Telemetry:** PostHog is the primary funnel telemetry source; GA/GTM is a comparator. Taxonomy and troubleshooting live in `docs/analytics/telemetry-taxonomy.md`.
- **Rate limit + bot defense:** `@upstash/ratelimit` + Upstash Redis, `botid` (Vercel BotID), both applied in `app/api/chat/route.ts`.
- **Notifications:** Slack webhook (`actions/sendToSlack.ts`), OpenPhone SMS (`actions/sendOpenPhoneMessage.ts`). No Resend on this branch.
- **Test runner:** Vitest 4 (Node env, `**/__tests__/**/*.test.ts`). Pre-commit does NOT run tests yet — run `npm test` before pushing AI-touching changes.
- **Hosting:** Vercel. Use `vercel env` for env management. Prefer Fluid Compute defaults; do not assume edge runtime.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server at `http://127.0.0.1:3000` |
| `npm run build` | Production build (runs in pre-commit hook) |
| `npm run lint` | ESLint (pre-commit) |
| `npm run type-check` | `tsc --noEmit` (pre-commit) |
| `npm test` | Vitest one-shot |
| `npm run test:watch` | Vitest watch mode |
| `npm run eval` | Concierge eval suites (`vitest run -c vitest.eval.config.ts`); on-demand, not in `npm test` |

Pre-commit hook (`.husky/pre-commit`) runs `lint && type-check && build`. **It does not run tests** — run `npm test` manually for AI/scraper changes. Never use `--no-verify` to bypass it unless the user explicitly asks.

## Repo layout

```
app/
  (site)/              marketing pages (homepage, about, partners, etc.)
  [state]/             state landing pages (SSR from Sanity + Salesforce)
  blog/                MDX-driven blog
  studio/              Sanity Studio
  api/
    chat/              concierge streaming endpoint (Phase 2)
    v1/                public REST: areas, bah, impact, media-accounts, revalidate, states
    mcp/               MCP server entry
lib/
  ai/                  concierge: models.ts, session.ts, system-prompt.ts, tools/
  bah-scraper.ts       DTMO BAH lookup (see "BAH year format" gotcha)
  feature-flags.ts     NEXT_PUBLIC_CONCIERGE_ENABLED + future gates
services/
  stateService.tsx     Sanity state list + Salesforce agent/lender fetch
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
sanity/                Studio config + schemas
scripts/               Node scripts (audits, ingest, headshot classify, etc.)
evals/                 on-demand concierge eval suites (npm run eval)
docs/
  ai-first/PROJECT.md  AI-first journal — read this for current goals/status
  analytics/           PostHog taxonomy, GA/GTM comparator, Salesforce joins
  REVERSION-PLAN.md    why we stayed on Salesforce (vs. the Attio migration)
  salesforce-schema/   Salesforce field reference (committed .md summaries; raw/ dumps gitignored)
```

## Conventions and gotchas

### Salesforce / SOQL

- Person-Account customers are identified by the boolean flags `isAgent__pc` / `isLender__pc` / `isCustomer__pc`, **not** by an Account record-type filter. (`0124x000000Z7G3AAK` is the **Opportunity** "Customer" record type, used only in Opportunity queries — see `services/salesforceImpactService.tsx`, `FROM Opportunity`.) Person Account fields use the `__pc` suffix (`Current_location__pc`, `Military_Status__pc`, `Have_you_personally_PCS_d__pc`, etc.).
- Role flags are booleans: `isAgent__pc`, `isLender__pc`, `isCustomer__pc`.
- License-state filters use **2-letter codes**, not full names: `State_s_Licensed_in__pc LIKE '%TX%' OR Other_States__pc INCLUDES ('TX')`.
- `stateService.fetchAgentsListByState` / `fetchLendersListByState` expect a 2-letter state code (`short_name`), **not** the full state name or slug. They accept an optional `{ requireHeadshot?: boolean }`; the concierge tools pass `false` so the LLM still gets matches when a headshot is missing, while SSR pages keep the `true` default.
- Scripts that talk to Salesforce use **inline API helpers** (not top-level module imports) so env vars are read after `dotenv` runs.
- Schema reference: use the committed `.md` summaries in `docs/salesforce-schema/`. The deeper `raw/` dumps (`sobjects.json`, `*-describe.json`) are **gitignored** — not present in a fresh clone. Regenerate them (and refresh the `.md` summaries) with `node --env-file=.env.local scripts/recon-salesforce.mjs` (needs the Salesforce env vars). If present, **never `Read` them whole** — `sobjects.json` is ~1.35 MB (~350K tokens) and will blow the context window; grep or jq them instead.

### Sanity

- `state_list` documents drive state pages. The GROQ projection in `services/stateService.tsx` must include `state_name` (it was silently dropped before — see PROJECT.md "Bugs fixed").
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

- Lead-capture forms write to **both** the Salesforce Person Account (Customer record type) and the appropriate Opportunity. `destination_city` and `current_location` mappings are documented in auto-memory; ask before changing them.
- Default blog byline is `VeteranPCS`, never `The VeteranPCS Team`.

### Middleware (proxy.ts)

- Next.js 16 middleware lives at the repo-root file `proxy.ts` (exporting `proxy`), **not** `middleware.ts`. Don't create a `middleware.ts` — Next won't pick it up here; edit `proxy.ts` instead.

### TypeScript & code placement

- **`noUncheckedIndexedAccess` is on.** Array/record index access (`arr[i]`, `obj[key]`) is typed `T | undefined`. Handle the `undefined` in priority order: (1) restructure so it can't arise (`str.charAt(i)` over `str[i]`, `map[k] ??= []`, iterate `Object.values(map)`); (2) guard (`if (!x) return …`) or default (`?? fallback`) when it's genuinely reachable; (3) assert with `!` **only** where control flow proves the index is in-bounds (immediately after a `.length` check, inside a bounded `for` loop, a mandatory regex capture group, or a `toHaveBeenCalledTimes(n)` in tests) — and leave a one-line why. Never `!` to silence a genuinely-possible `undefined`; that reintroduces the silent-failure class this flag exists to catch.
- **Where shared code goes:** framework-agnostic helpers and pure functions live in `lib/`, grouped by feature (`lib/ai/`, `lib/blog/`, `lib/bah/`); external-system access (Salesforce, Sanity) lives in `services/`. Don't add a top-level `utils/` or `constants/` catch-all — colocate with the feature that owns it.
- **`.ts` vs `.tsx`:** new files with no JSX get a `.ts` extension; reserve `.tsx` for modules that return JSX. This is a going-forward rule for **new files only** — do not mass-rename the existing JSX-free `.tsx` files (e.g. `services/*.tsx`).

### Env vars (on `main`)

The env vars used on `main`:

- Salesforce: `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`, `SALESFORCE_USERNAME`, `SALESFORCE_PASSWORD`, `SALESFORCE_TOKEN`, `SALESFORCE_LOGIN_BASE_URL`, `SALESFORCE_API_VERSION`, `VPCS_SALESFORCE_BASE_URL`, `SALESFORCE_WEBHOOK_SECRET`
- Sanity: `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`, `NEXT_PUBLIC_SANITY_API_TOKEN`, `SANITY_REVALIDATE_KEY`
- AI: `AI_GATEWAY_API_KEY` (Vercel AI Gateway), `NEXT_PUBLIC_CONCIERGE_ENABLED`
- **Rate limit / bot:** Upstash Redis REST env can use either the canonical pair `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` or the Vercel integration pair `UPSTASH_REDIS_REST_KV_REST_API_URL` / `UPSTASH_REDIS_REST_KV_REST_API_TOKEN` (resolved in `lib/upstash-env.ts`). The app intentionally does **not** use read-only token or Redis-protocol URL vars for write paths. `LEAD_SPAM_ENFORCED` (`LEAD_SPAM_ENFORCED='0'` is the kill-switch that disables lead-spam quarantine — any other value or unset = enforced). BotID is auto-wired on Vercel and now guards **only** the concierge chat route (`/api/chat`), not the lead forms. `BOTID_FORMS_ENFORCED` is retired.
- **Guardrails:** `GUARDRAILS_ENFORCED` (`'0'` = disable all concierge input guardrails; any other value or unset = enforced). Mirrors `LEAD_SPAM_ENFORCED`. Guardrails run in `app/api/chat/route.ts` via `lib/ai/guardrails/evaluateInput`.
- Notifications: `SLACK_WEBHOOK_URL`, `OPEN_PHONE_API_KEY`, `OPEN_PHONE_FROM_NUMBER`, plus per-partner `*_PHONE_NUMBER`
- Misc: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID`, Google Reviews creds

No `RESEND_*` keys on this branch — transactional email is off here. Don't add Resend-based code without checking PROJECT.md first.

## Working agreements

- **Diagnose root cause before fixing.** Don't paper over symptoms; trace through `services/`/`lib/` until you understand why.
- **Verify before recommending.** A memory or plan that names a file/flag may be stale; `grep` or `Read` it before suggesting it to the user.
- **Don't bypass the pre-commit hook.** Lint, type-check, and build must pass.
- **Tests are not in pre-commit yet.** Run `npm test` manually for changes to `lib/ai/**`, `lib/bah-scraper.ts`, or `services/**`.
- **Use TodoWrite for non-trivial work** — branch state should always reflect a clear punch list.
- **Force-push requires explicit per-task authorization** (don't reuse a prior session's authorization).
- **Never commit `.env*` files or anything containing secrets.** Stage files by name rather than `git add -A`.
- **Default blog byline:** `VeteranPCS`. Default tone everywhere user-facing: calm, direct, plain.
