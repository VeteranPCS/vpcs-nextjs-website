# CLAUDE.md — VeteranPCS

Operational guide for Claude (and any other AI assistant) working in this repo. Keep this short and load-bearing; long-form context lives in `docs/PROJECT-STATUS.md`.

> See [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md) for phase status, active decisions, open questions, and what's next.
> (`docs/ai-first/` is a gitignored local journal: not present in worktrees, fresh clones, or CI. Do not rely on it.)

## What this product is

VeteranPCS is a Next.js site that connects active-duty service members, veterans, and military spouses doing a PCS (Permanent Change of Station) move to vetted, military-experienced real estate agents and VA-loan lenders. The site is read-mostly marketing surface (state pages, blog) plus form-driven lead capture; Phase 2 is layering an LLM concierge on top of that.

- Source of truth for agents/lenders/customers/deals: **Salesforce** (Person Account model with `__pc` custom fields). Person-Account customers are identified by the `isAgent__pc` / `isLender__pc` / `isCustomer__pc` booleans, **not** by an Account record-type filter. (Customer is an **Opportunity** record type used only in Opportunity queries; resolve its ID from the selected org configuration.)
- Source of truth for marketing content (states, blog, headshots, copy): **the repo itself** — structured content in `content/_data/site/*.json`, rich text as typed `.tsx` modules colocated with their consumers, images under `public/images/`. (Sanity CMS was fully removed 2026-07-13 — see `docs/sanity-migration-decision.md`.)
- Lead intake: server actions → Salesforce Web-to-Lead + Slack. The regional routing release moves ownership and referral SMS into Salesforce; see its release ledger before activating this branch.

## Tech stack

- **Framework:** Next.js 16 App Router (Turbopack), React 19.2, Node.js 24 runtime (pinned in `package.json` for local, CI, and Vercel builds).
- **Content:** repo-committed JSON (`content/_data/site/`) read through typed loaders in `lib/content/` (server-only, validated at module load — bad data fails the build). No CMS.
- **CRM:** Salesforce REST (SOQL); token retrieval via `services/salesForceTokenService.tsx`, queries via `services/api.tsx` + `services/stateService.tsx`.
- **AI:** Vercel AI SDK v6 (`ai`, `@ai-sdk/react`) routed through **Vercel AI Gateway** (model id `anthropic/claude-sonnet-4.6` in `lib/ai/models.ts`). No direct provider SDK is wired up — use the Gateway.
- **Telemetry:** PostHog is the primary funnel telemetry source; GA/GTM is a comparator. Taxonomy and troubleshooting live in `docs/analytics/telemetry-taxonomy.md`.
- **Rate limit + bot defense:** `@upstash/ratelimit` + Upstash Redis, `botid` (Vercel BotID), both applied in `app/api/chat/route.ts`.
- **Notifications:** The routing implementation uses the website Slack webhook (`actions/sendToSlack.ts`) and moves referral SMS entirely to Salesforce. Coordinate the website transport retirement with the Salesforce routing deployment. [Cutover runbook](docs/customer-regional-routing.md)
- **Test runner:** Vitest 4, Node by default, `**/__tests__/**/*.test.{ts,tsx}`. Customer-form interaction tests opt into jsdom per file and use Testing Library. Tests run in pre-commit and CI. DOM assertions do not verify browser layout; rendered browser checks remain required.
- **Hosting:** Vercel. Use `vercel env` for env management. Prefer Fluid Compute defaults; do not assume edge runtime.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` / `dev:sandbox` | Validated webdev server at `http://127.0.0.1:3000`; fails closed until sandbox configuration is complete |
| `npm run build` / `build:sandbox` | Local production-mode build targeting webdev; hosted build uses its explicit deployment profile |
| `npm run build:mock` / `start:mock` | Credential-free offline build and production-mode server; CI/pre-commit build uses mock |
| `npm run start:sandbox` | Start the matching sandbox build; rejects another profile’s artifact |
| `npm run verify:salesforce-target` | Read-only OAuth and Organization identity verification |
| `npm run verify:salesforce-sandbox-leads` | Ten-form rehearsal; live sandbox execution requires explicit `--execute` and bounded test gates |
| `npm run lint` | ESLint (pre-commit) |
| `npm run type-check` | `tsc --noEmit` (pre-commit) |
| `npm test` | Vitest one-shot (pre-commit) |
| `npm run lint:content` | Blog editorial audit (`scripts/audit-blog-editorial.mjs`); **not** in pre-commit |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e:server` | Isolated local dry-run preview; select port with `E2E_BASE_URL` |
| `npm run test:e2e` | Playwright responsive/interaction suite; requires local `E2E_BASE_URL` and `E2E_LEAD_DRY_RUN=1` for submissions |
| `npm run eval` | Concierge eval suites (`vitest run -c vitest.eval.config.ts`); on-demand, not in `npm test` |

Pre-commit hook (`.husky/pre-commit`) runs `lint && type-check && test && build:mock`, ordered fastest-failing first. The test suite runs before the slower build; `build:mock` is the slow step and stays because content loaders throw at module load, catching bad JSON the unit suite misses. `npm run lint:content` is **not** in the hook: run it manually after `content/blog/` changes. Never use `--no-verify` to bypass the hook unless the user explicitly asks.

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
actions/               server actions (Slack and form submits)
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
| `vpcs-salesforce-dev` | Salesforce local/sandbox development, protected Preview tests, and staged website or separate metadata releases. |
| `vpcs-verify` | Before claiming any UI, form, or route change is done. Also carries the lead-form safety rule. |
| `vpcs-blog` | Writing, refreshing, or auditing posts under `content/blog/`. |
| `vpcs-state-maps` | Processing a state-map update ticket (Linear + Drive + repo). |
| `vpcs-agent-headshots` | Processing an agent headshot ticket. |

Project subagents live in `.claude/agents/`: `salesforce-schema-researcher`, `blog-corpus-researcher`.

## Conventions and gotchas

### Salesforce / SOQL

- Person-Account customers are identified by the boolean flags `isAgent__pc` / `isLender__pc` / `isCustomer__pc`, **not** by an Account record-type filter. (Customer is an **Opportunity** record type used only in Opportunity queries; resolve its ID from the selected org configuration — see `services/salesforceImpactService.tsx`, `FROM Opportunity`.) Person Account fields use the `__pc` suffix (`Current_location__pc`, `Military_Status__pc`, `Have_you_personally_PCS_d__pc`, etc.).
- Role flags are booleans: `isAgent__pc`, `isLender__pc`, `isCustomer__pc`.
- License-state filters use **2-letter codes**, not full names: `State_s_Licensed_in__pc LIKE '%TX%' OR Other_States__pc INCLUDES ('TX')`.
- `stateService.fetchAgentsListByState` / `fetchLendersListByState` expect a 2-letter state code (`short_name`), **not** the full state name or slug. They accept an optional `{ requireHeadshot?: boolean }`; the concierge tools pass `false` so the LLM still gets matches when a headshot is missing, while SSR pages keep the `true` default.
- Salesforce network scripts use the shared checked sandbox transport in `scripts/lib/salesforce-sandbox.mjs`. They validate the effective environment before OAuth and verify org identity. Never introduce a separate unguarded login helper.
- `scripts/activate-agents.mjs` is retired and makes no network requests. Website OAuth deliberately cannot edit Accounts; use the separately authenticated operator fixture workflow in `salesforce/fixtures/README.md` to seed active synthetic partners.
- Use the committed `.md` summaries under `docs/salesforce-schema/` for the production schema reference. `node scripts/recon-salesforce.mjs` uses the verified WebDev website credentials and writes sandbox summaries and raw dumps under ignored `artifacts/salesforce/webdev/`. Inspect large raw dumps with `rg` or `jq`.

### Repo content (`content/_data/site/`)

- **Editing structured content:** edit the type's JSON in `content/_data/site/` directly. Loaders in `lib/content/` validate at module load and **throw** — a typo'd field fails the build, not silently at runtime. Keep `_id` stable; bump `_updatedAt` when you edit (the sitemap's `lastModified` reads it).
- **Editing rich text** (team bios, FAQ answers, support blurbs): edit the typed `.tsx` content modules colocated with their consumers (`components/About/teamBios.tsx`, FAQ `faqContent.tsx`, `supportVeterenceContent.tsx`). Links/bold/lists are plain JSX. Each module has a parity test that derives its expectations from the exported Portable Text JSON in `content/_data/site/` — for a deliberate content change, update **both** the JSX and its matching JSON document; never weaken the test itself.
- **State images:** drop the file in `public/images/states/`, update the state's `state_map` entry (path/alt/width/height) in `content/_data/site/state_list.json`, and bump that doc's `_updatedAt`. A test in `lib/content/__tests__/states.test.ts` verifies every `state_map.path` exists on disk; it runs in `npm test`, which is now part of the pre-commit hook and CI.
- **Deliberate leftovers (grace window EXPIRED ~2026-08-13):** `scripts/export-sanity-content.mjs` (+ its test, + the `@sanity/image-url` devDependency) were retained only for rollback re-exports. The window has closed but the files are still present. Delete all three once the operator confirms the old Sanity project is archived and its token revoked; see `docs/PROJECT-STATUS.md`. Nothing in the app runtime imports Sanity. Note `blog.sanityId` is **not** a leftover: it is live, feeding `contentId` to PostHog `content_id`. Do not delete it.
- Headshot routing convention: `scripts/classify-headshot-ids.mjs` plus the `public/images/agents/` vs `public/images/lenders/` folders.

### Concierge (Phase 2)

- Entry point: `POST /api/chat` (`app/api/chat/route.ts`). It checks the production profile before running BotID, Upstash rate limits, guardrails or `streamText`. Errors from `streamText` return JSON 500.
- Session: cookie `vpcs_concierge_sid`, 30-day, httpOnly, sameSite lax, secure in prod (`lib/ai/session.ts`). No DB; memory is cookie-scoped only for Phase 2.
- Feature flag: `NEXT_PUBLIC_CONCIERGE_ENABLED` (`'1'` or `'true'`). Off by default.
- System prompt and brand voice live in `lib/ai/system-prompt.ts`. Three words: **Trusted. Patriotic. Helpful.** No emoji, no hype, 5th–7th grade reading level.
- Tools must never invent agents, lenders, or BAH rates — always go through the tool layer.

### BAH scraper

- DTMO endpoint expects a **2-digit year on the wire** (`YEAR=25`), but the rest of the app uses a 4-digit year. `lib/bah-scraper.ts` has `toDtmoYear` / `toFourDigitYear` helpers for the round trip. If you change the year handling, run `lib/__tests__/bah-scraper.test.ts`.
- DTMO caps officer rates at `O-7/O-7+`. `lib/ai/tools/calc-tools.ts` aliases `O-8`/`O-9`/`O-10` to the same rank id.
- The scraper exports `__testables.fetchPage` so Vitest can `vi.spyOn` it without monkey-patching `node:https`. Only import `__testables` from tests.

### Forms & lead routing

- Website lead-capture forms submit to Salesforce Web-to-Lead. The routing implementation establishes Customer Lead and Opportunity ownership in Salesforce before notifications and removes the website owner PATCH and partner SMS. The fixed 52-jurisdiction policy is `config/routing/customer-admins.json`, with unknown destinations assigned to Stephanie for triage. Neither runtime calls Google Sheets. Legacy Jessica/Tara manifest keys remain compatibility entries, not active customer routes. See [the routing runbook](docs/customer-regional-routing.md) for deployment dependencies, migration and evidence.
- Release 1 adds lead admission and exact persisted-Lead confirmation. Follow the [release runbook](docs/spam-enforcement-release1.md) for configuration, WebDev evidence and pending Production gates. An unconfirmed attempt may already have started native notifications. Reconcile its exact reference before considering any recovery.
- The `destination_city` and `current_location` mappings are in the per-project memory directory `~/.claude/projects/-Users-harperfoley-VPCS-vpcs-nextjs-website/memory/`. Read its `MEMORY.md` index and ask before changing those mappings.
- Default blog byline is `VeteranPCS`, never `The VeteranPCS Team`.

### Middleware (proxy.ts)

- Next.js 16 middleware lives at the repo-root file `proxy.ts` (exporting `proxy`), **not** `middleware.ts`. Don't create a `middleware.ts` — Next won't pick it up here; edit `proxy.ts` instead.

### TypeScript & code placement

- **`noUncheckedIndexedAccess` is on.** Array/record index access (`arr[i]`, `obj[key]`) is typed `T | undefined`. Handle the `undefined` in priority order: (1) restructure so it can't arise (`str.charAt(i)` over `str[i]`, `map[k] ??= []`, iterate `Object.values(map)`); (2) guard (`if (!x) return …`) or default (`?? fallback`) when it's genuinely reachable; (3) assert with `!` **only** where control flow proves the index is in-bounds (immediately after a `.length` check, inside a bounded `for` loop, a mandatory regex capture group, or a `toHaveBeenCalledTimes(n)` in tests) — and leave a one-line why. Never `!` to silence a genuinely-possible `undefined`; that reintroduces the silent-failure class this flag exists to catch.
- **Where shared code goes:** framework-agnostic helpers and pure functions live in `lib/`, grouped by feature (`lib/ai/`, `lib/blog/`, `lib/content/`); external-system access (Salesforce) lives in `services/`. Don't add a top-level `utils/` or `constants/` catch-all — colocate with the feature that owns it.
- **`.ts` vs `.tsx`:** new files with no JSX get a `.ts` extension; reserve `.tsx` for modules that return JSX. This is a going-forward rule for **new files only** — do not mass-rename the existing JSX-free `.tsx` files (e.g. `services/*.tsx`).

### Salesforce development isolation

The operational setup and evidence ledger are in [docs/salesforce-webdev-environment.md](docs/salesforce-webdev-environment.md). Use [vpcs-salesforce-dev](.claude/skills/vpcs-salesforce-dev/SKILL.md) for the daily local → Preview → staged Production workflow and its scope-specific test gates. The [routing release ledger](docs/customer-regional-routing.md#evidence-ledger) distinguishes capture, protected Preview checks, provider acceptance, recipient arrival and Production cutover. Local development and local production-mode builds use `webdev`, including on `main`. Only an explicit `production` profile on Vercel Production from `main` can use production Salesforce. `NODE_ENV` never selects an org. CLI authentication and website OAuth are separate.

WebDev is provisioned at `https://veteranpcs--webdev.sandbox.my.salesforce.com`. The `vpcs-webdev` CLI alias and both website OAuth apps verified `00Djg000000EK8YEAW` and `IsSandbox=true`. Preview passed 13 access checks and Workflow passed 19. The rendering seed reconciled seven records and three revalidation captures. The first Contact Agent owner transfer failed and was verified after the guard update. A fresh sandbox run passed ten form persistence checks and both contact owner readbacks. The browser and hosted deployment have separate gates.

Sandbox HTTP/SMS and Apex reminder capture, the native recipient overlay and the guest signup restriction are deployed. The native five-minute welcome reached `tech@veteranpcs.com` and matched Salesforce Email Log Files. Salesforce returned to **System email only** after the canary. The Salesforce SMS worker captured the normal fixture and blocked the credential override with zero provider receipts. The temporary operator grant was revoked. Keep website Lead writes off outside approved capture runs. WebDev defaults to capture. The approved WebDev delivery exception covers up to four exact Salesforce queue rows, for up to 30 minutes, from Beth and Stephanie to Tech at `+17194153014`. Use `tech@veteranpcs.com` for synthetic email and restore capture after the window. Production verification uses the same verified lines and Tech recipient after the routing cutover gates. The deferred Redis purchase belonged to the former website test transport. [Routing delivery procedure](docs/customer-regional-routing.md#required-gates-and-release-sequence) The published `codex/salesforce-workflow-test` branch has separate OAuth credentials. Its deployment is Ready and serves the protected `test.veteranpcs.com` alias. Anonymous access is redirected. The hosted HTTP smoke and all 26 browser checks passed on `c8db80acdc93`. All 29 original Previews are retired. The native Salesforce callback succeeded on `0512600bbae6` after a first attempt received `409` on the state-slug check. Capture is restored and temporary callback credentials and grants have been removed. A hosted Contact Agent submission with writes disabled reached thank-you with zero matching Salesforce Leads. The write-enabled Contact Agent canary persisted one marked Lead with the expected agent and owner. The PR #240 website build captured one Slack notification and one OpenPhone notification. The hosted Lead's welcome Flow was correlated by the sole eligible Lead and its due time. Its SMS queue readback was zero. The fixture is closed, temporary access is cleared, and the protected test alias serves the verified capture-only Preview with writes off. PR #240 completed the website environment release. Main commit `cee4a9275204c7be43392af0b013b4193f5cf4f0` went live on Vercel deployment `dpl_HuocbTbnicLJyqBrQkqLxrQ4AofC` with automatic Production domain assignment disabled. The regional routing release followed its own Salesforce, website and migration gates. [Environment evidence](docs/salesforce-webdev-environment.md)

WebDev restored the four quarter-hour portal reminder schedules and two sender refresh schedules in `America/Denver` after the 25-test scheduler run passed. The first native portal batch advanced the synthetic Lead's count to one and captured one reminder. The next native batch confirmed the one-hour debounce. The fixture was closed and the capture label reset to baseline. The native 22:05 hourly sender refresh recorded a capture with zero items. Daily and multi-day timer scenarios remain baseline characterization work. Exercise the cases affected by regional routing for that release. Spam admission, working hours and countdown changes have separate release gates. See the [native workflow matrix](docs/salesforce-webdev-workflow-matrix.md).

The November 26 regional routing browser run persisted four CO/FL Agent/Lender Leads and delivered their four Salesforce queue messages to Tech from Beth and Stephanie. Quo receipts, the Tech inbox and Harper's handset confirmation are separate recorded evidence. Capture classes and the original provider binding were restored, temporary grants revoked and fixtures closed. The sandbox credential parameter is `QuoWebdevRoutingApiKey`; its encrypted value stays in Salesforce and has no website variable. Follow the [controlled-delivery restoration tests](salesforce/outbound-capture/controlled-delivery/README.md) and [routing ledger](docs/customer-regional-routing.md#evidence-ledger), including runtime capture-label verification. The original WebDev audit label converged after restoration.

Regional routing code went live on November 26. Salesforce routing deployment `0Afjf0000003keDCAQ` is active. The live website is `dpl_Fc5eq1NANZKPxZJZ1KovFs9PSqxx` from main `2845562edab4b7d331f01ca05f32b2a792032b4d`. State pages and the dynamic coverage endpoint resolve case-sensitive Agent and Lender portraits using the build-time inventory. Public intake reopened after the candidate Skew Protection threshold and alternate-host POST protections were verified. Automatic Production domain assignment remains disabled. Salesforce owns SMS delivery and the website's two former Production OpenPhone settings were removed. Both regional dispatch bindings are live. All 104 open-work transfers reconciled with zero eligible owner mismatches, and temporary migration grants were revoked. Quo delivered both authorized Production canaries to the Tech inbox. Canary fixtures were closed and temporary verification access revoked. Harper confirmed both Production messages on the Tech handset. Owner rollback does not restore the prior unread flag. [Routing release ledger](docs/customer-regional-routing.md#evidence-ledger)

The active `.env.local` is sandbox-only; missing identity, credentials or mappings intentionally stop startup. Do not restore production secrets to make development work. Use `build:mock` for offline verification. Never pull Vercel Production into local dotenv; pull Development into a fresh ignored staging file, validate, then merge approved values.

`lib/salesforce/environment.mjs` owns destination validation; `server-config.ts` is the application accessor. Nonsecret org-bound mappings live under `config/salesforce/`; the webdev example is deliberately invalid until verified. Salesforce changes start in the cloud sandbox with relevant tests/coverage, then reviewed deployment; no direct production Apex edits. The scoped DX workspace is `salesforce/`. A website merge to `main` builds with Vercel Production variables after the release hold is established; validate that staged artifact before promotion. This does not change local main or deploy Salesforce metadata. Later Apex/Flow releases require a separate reviewed manifest, sandbox evidence and Production validation tests/coverage; exclude sandbox capture overlays, credentials and fixtures.

### Env vars

The existing integration variables and new explicit controls:

- Salesforce profile controls: `VPCS_SALESFORCE_PROFILE`, `VPCS_SALESFORCE_ORG_ID`, `VPCS_SALESFORCE_METADATA_JSON`, `SALESFORCE_AUTH_GRANT`, `VPCS_SALESFORCE_WEB_TO_LEAD_URL`, `VPCS_SANDBOX_LEAD_WRITES`, `VPCS_WEBDEV_ISOLATION_ATTESTED`, `VPCS_DELIVERY_MODE`. See the runbook for the complete scope/test-window contract.
- Salesforce: `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`, `SALESFORCE_USERNAME`, `SALESFORCE_PASSWORD`, `SALESFORCE_TOKEN`, `SALESFORCE_LOGIN_BASE_URL`, `SALESFORCE_API_VERSION`, `VPCS_SALESFORCE_BASE_URL`, `SALESFORCE_WEBHOOK_SECRET`
- Salesforce lead intake: set server-only `VPCS_SALESFORCE_INTAKE_CLIENT_ID`, `VPCS_SALESFORCE_INTAKE_CLIENT_SECRET`, and `VPCS_SALESFORCE_INTAKE_USER_ID` (the expected Salesforce `005` user ID) for each real intake target. Production uses its own OAuth client and a nonadmin run-as user with direct CRM reads denied. The restricted WebDev workflow app retains limited Lead readback for rehearsals and can be reused by explicitly setting all three intake variables. The five intake operations use client credentials at the selected org's My Domain, verify org and user, and have no directory credential fallback. Directory REST keeps its existing credentials. Mock requires neither credential set. See the [lead admission runbook](docs/spam-enforcement-release1.md#configuration).
- AI: `AI_GATEWAY_API_KEY` (production Vercel AI Gateway), `NEXT_PUBLIC_CONCIERGE_ENABLED`, `VPCS_EVAL_AI_GATEWAY_API_KEY` (dedicated evaluation key in the shell or `.env.evals.local`)
- **Rate limit / bot:** Production Upstash uses `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` or the Vercel integration aliases `UPSTASH_REDIS_REST_KV_REST_API_URL` / `UPSTASH_REDIS_REST_KV_REST_API_TOKEN`. WebDev lead admission uses a dedicated pair. The Vercel Preview connection generates `VPCS_WEBDEV_LEAD_REDIS_KV_REST_API_URL` / `VPCS_WEBDEV_LEAD_REDIS_KV_REST_API_TOKEN`. Manual or local WebDev uses `VPCS_WEBDEV_LEAD_REDIS_URL` / `VPCS_WEBDEV_LEAD_REDIS_TOKEN`. `LEAD_SPAM_ENFORCED='0'` holds new intake with a recoverable result. BotID guards only `/api/chat`. `BOTID_FORMS_ENFORCED` is retired.
- **Lead binding:** `VPCS_LEAD_BINDING_KEY` is a server-only 32-byte HMAC key encoded as 64 lowercase hexadecimal characters. Use a distinct key per Salesforce environment. Coordinate rotation with intake drain and attempt reconciliation. See [the release runbook](docs/spam-enforcement-release1.md#configuration).
- **Guardrails:** `GUARDRAILS_ENFORCED='0'` disables Concierge input guardrails in `app/api/chat/route.ts`. Other values and unset enforce them.
- Notifications: `SLACK_WEBHOOK_URL`. Website OpenPhone API/sender variables are retired by the routing release; remove only confirmed website-only entries during cutover. Salesforce provider credentials remain separate. Legacy admin manifest/phone keys remain temporarily for compatibility.
- Misc: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID`, Google Reviews creds
- **Local verification only:** `LEAD_DRY_RUN` (`'1'`/`'true'`) short-circuits every outbound lead side effect (Redis rate writes, Salesforce admission and Web-to-Lead calls, Slack and PostHog `lead_conversion_created`) while still constructing the payload (never log raw personal data). `lib/lead-dry-run.ts` forces it false when `NODE_ENV === 'production'`, so it is inert in any deployed environment. Read it only via `isLeadDryRun()`; never read `process.env.LEAD_DRY_RUN` directly.

No `RESEND_*` keys on this branch — transactional email is off here. Don't add Resend-based code without checking `docs/PROJECT-STATUS.md` first.

## Working agreements

- **Diagnose root cause before fixing.** Don't paper over symptoms; trace through `services/`/`lib/` until you understand why.
- **Verify before recommending.** A memory or plan that names a file/flag may be stale; `grep` or `Read` it before suggesting it to the user.
- **Don't bypass the pre-commit hook.** Lint, type-check, test, and build must all pass.
- **Green gates are not visual verification.** Customer forms have jsdom interaction tests; most tests use Node. Neither verifies browser layout. For any UI, layout, or Tailwind change, use the `vpcs-verify` skill and look at the rendered page before claiming done.
- **Never submit test leads to production.** Automated UI tests use isolated mock transports. Authorized real sandbox tests require verified webdev identity, all outbound paths contained, bounded marked synthetic runs and reconciled persistence. The submit path is non-idempotent: never blindly retry an uncertain POST. See `vpcs-verify` and the environment runbook.
- **Use TodoWrite for non-trivial work** — branch state should always reflect a clear punch list.
- **Force-push requires explicit per-task authorization** (don't reuse a prior session's authorization).
- **Never commit `.env*` files or anything containing secrets.** Stage files by name rather than `git add -A`.
- **Default blog byline:** `VeteranPCS`. Default tone everywhere user-facing: calm, direct, plain.
