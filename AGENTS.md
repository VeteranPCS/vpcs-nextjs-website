# AGENTS.md — VeteranPCS

Operational guide for Codex (and any other AI assistant) working in this repo. Keep this short and load-bearing; long-form context lives in `docs/ai-first/PROJECT.md`.

> See [docs/ai-first/PROJECT.md](docs/ai-first/PROJECT.md) for the AI-first reimagining: phase status, key decisions, bugs fixed, and what's next.

## What this product is

VeteranPCS is a Next.js site that connects active-duty service members, veterans, and military spouses doing a PCS (Permanent Change of Station) move to vetted, military-experienced real estate agents and VA-loan lenders. The site is read-mostly marketing surface (state pages, blog) plus form-driven lead capture; Phase 2 is layering an LLM concierge on top of that.

- Source of truth for agents/lenders/customers/deals: **Salesforce** (Person Account model with `__pc` custom fields; Customer `RecordTypeId = '0124x000000Z7G3AAK'`).
- Source of truth for marketing content (states, blog, headshots, copy): **Sanity CMS** + `public/images/`.
- Lead intake: server actions → Salesforce REST + Slack notification + OpenPhone SMS.

## Tech stack

- **Framework:** Next.js 16 App Router (Turbopack), React 19.2, Node runtime.
- **CMS:** Sanity (`next-sanity`, GROQ). Studio mounted at `/studio`.
- **CRM:** Salesforce REST (SOQL); token retrieval via `services/salesForceTokenService.tsx`, queries via `services/api.tsx` + `services/stateService.tsx`.
- **AI:** Vercel AI SDK v6 (`ai`, `@ai-sdk/react`) routed through **Vercel AI Gateway** (model id `anthropic/Codex-sonnet-4-6` in `lib/ai/models.ts`). No direct provider SDK is wired up — use the Gateway.
- **Telemetry:** PostHog is the primary funnel telemetry source; GA/GTM is a comparator. Taxonomy and troubleshooting live in `docs/analytics/telemetry-taxonomy.md`.
- **Rate limit + bot defense:** `@upstash/ratelimit` + Upstash Redis, `botid` (Vercel BotID), both applied in `app/api/chat/route.ts`.
- **Notifications:** Slack webhook (`actions/sendToSlack.ts`), OpenPhone SMS (`actions/sendOpenPhoneMessage.ts`). No Resend on this branch.
- **Test runner:** Vitest 3 (Node env, `**/__tests__/**/*.test.ts`). Pre-commit does NOT run tests yet — run `npm test` before pushing AI-touching changes.
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
    v1/                public REST: areas, bah, impact, revalidate
    mcp/               MCP server entry
lib/
  ai/                  concierge: models.ts, session.ts, system-prompt.ts, tools/
  bah-scraper.ts       DTMO BAH lookup (see "BAH year format" gotcha)
  feature-flags.ts     NEXT_PUBLIC_CONCIERGE_ENABLED + future gates
  email.ts             (legacy on other branches; not wired here)
services/
  stateService.tsx     Sanity state list + Salesforce agent/lender fetch
  agentService.tsx     agent detail
  api.tsx              SOQL builder + REST wrappers
  salesForceTokenService.tsx
  loggingService.tsx
actions/               server actions (Slack, OpenPhone, form submits)
components/
  Concierge/           Phase 2 widget (Provider, Widget, MessageRenderer, cards)
  Forms/               lead-capture forms
sanity/                Studio config + schemas
scripts/               Node scripts (audits, ingest, headshot classify, etc.)
emails/                React Email templates (other branches; unused here)
docs/
  ai-first/PROJECT.md  AI-first journal — read this for current goals/status
  analytics/           PostHog taxonomy, GA/GTM comparator, Salesforce joins
  REVERSION-PLAN.md    why we stayed on Salesforce (vs. the Attio migration)
  salesforce-schema/   Salesforce field reference
```

## Conventions and gotchas

### Salesforce / SOQL

- Customer queries **must** filter `WHERE RecordTypeId = '0124x000000Z7G3AAK'`. Person Account fields use the `__pc` suffix (`Current_location__pc`, `Military_Status__pc`, `Have_you_personally_PCS_d__pc`, etc.).
- Role flags are booleans: `isAgent__pc`, `isLender__pc`, `isCustomer__pc`.
- License-state filters use **2-letter codes**, not full names: `State_s_Licensed_in__pc LIKE '%TX%' OR Other_States__pc INCLUDES ('TX')`.
- `stateService.fetchAgentsListByState` / `fetchLendersListByState` expect a 2-letter state code (`short_name`), **not** the full state name or slug. They accept an optional `{ requireHeadshot?: boolean }`; the concierge tools pass `false` so the LLM still gets matches when a headshot is missing, while SSR pages keep the `true` default.
- Scripts that talk to Salesforce use **inline API helpers** (not `import { attio }`-style top-level imports) so env vars are read after `dotenv` runs.

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

### Env vars

The current `ai/phase-2-concierge` branch uses:

- Salesforce: `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`, `SALESFORCE_USERNAME`, `SALESFORCE_PASSWORD`, `SALESFORCE_TOKEN`, `SALESFORCE_LOGIN_BASE_URL`, `SALESFORCE_API_VERSION`, `VPCS_SALESFORCE_BASE_URL`, `SALESFORCE_WEBHOOK_SECRET`
- Sanity: `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`, `NEXT_PUBLIC_SANITY_API_TOKEN`, `SANITY_REVALIDATE_KEY`
- AI: `AI_GATEWAY_API_KEY` (Vercel AI Gateway), `NEXT_PUBLIC_CONCIERGE_ENABLED`
- **Rate limit / bot:** Upstash Redis REST env can use either the canonical pair `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` or the Vercel integration pair `UPSTASH_REDIS_REST_KV_REST_API_URL` / `UPSTASH_REDIS_REST_KV_REST_API_TOKEN`. The app intentionally does **not** use read-only token or Redis-protocol URL vars for write paths. `LEAD_SPAM_ENFORCED` (`LEAD_SPAM_ENFORCED='0'` is the kill-switch that disables lead-spam quarantine — any other value or unset = enforced). BotID is auto-wired on Vercel and now guards **only** the concierge chat route (`/api/chat`), not the lead forms. `BOTID_FORMS_ENFORCED` is retired.
- **Guardrails:** `GUARDRAILS_ENFORCED` (`'0'` = disable all concierge input guardrails; any other value or unset = enforced). Mirrors `LEAD_SPAM_ENFORCED`. Guardrails run in `app/api/chat/route.ts` via `lib/ai/guardrails/evaluateInput`.
- Notifications: `SLACK_WEBHOOK_URL`, `OPEN_PHONE_API_KEY`, `OPEN_PHONE_FROM_NUMBER`, plus per-partner `*_PHONE_NUMBER`
- Misc: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID`, Google Reviews / GA4 / GSC creds

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
