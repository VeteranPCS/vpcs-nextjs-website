---
name: vpcs-verify
description: Use before claiming any UI, form, or route change is done in the VeteranPCS repo. Covers what lint/type-check/build cannot see, how to drive the dev server safely, and the rule against production test submissions and the guarded sandbox workflow. Trigger phrases include "verify", "is it working", "check the page", "done?", "confirm the fix", "test in the browser", "screenshot it".
---

# VeteranPCS: verify before claiming done

## Why this exists

On 2026-07-06 a responsive audit of this repo found 1 Critical, 8 High, and roughly 26 Medium
defects. Every one of them had shipped green through `lint`, `type-check`, and `build`. Six PRs
(#155 to #160) were needed to clean it up.

That is not a discipline failure, it is a tooling gap. Know exactly what our gates do and do not cover:

| Gate | Catches | Blind to |
|---|---|---|
| `npm run lint` | syntax, import rules, our custom `no-restricted-syntax` rules | anything visual |
| `npm run type-check` | type errors | every runtime and layout bug |
| `npm run build` | bad content JSON (loaders throw at module load), broken imports | every visual bug |
| `npm test` | pure functions, route handlers, data shapes, selected jsdom form interactions | **browser layout and visual rendering** |

`vitest.config.ts` defaults to `environment: 'node'`. Customer-form interaction tests opt into
jsdom per file and use Testing Library. Those tests exercise focus and retry behavior, not real
browser layout. A green suite still says nothing about whether a page looks right.

Tailwind widens the gap further. Tailwind 3 JIT silently drops any class it does not recognize,
with no warning at any stage. `text-leeft`, `lg:w-[600ox]`, and `items-cenetr` all compiled clean
and shipped. The ESLint Tailwind rule in `eslint.config.mjs` now catches part of this class of bug,
but not all of it. Assume typos survive to the browser.

**Therefore: for any change touching a component, a page, a layout, or a Tailwind class, running the
four gates is necessary and not sufficient. You must look at the rendered result.**

## Lead verification boundaries

**Never submit test leads against production.** Automated browser checks use the isolated mock
launcher (`npm run test:e2e:server`) with `E2E_LEAD_DRY_RUN=1`. The Salesforce profile is `mock`,
external Node sockets are blocked, and notifications/analytics are captured. `build:mock` and
`start:mock` also exercise a production-mode Next build without a Salesforce credential.

Local `dev`, `build` and `start` target `webdev`, including on local main. They intentionally
fail before network access if the sandbox profile is incomplete. Do not restore production
credentials to make tests work. `NODE_ENV=production` never authorizes production Salesforce.

Real sandbox submissions are allowed only when explicitly within the user's authorized test
scope and the environment runbook's gates are satisfied: verified sandbox org ID/IsSandbox,
complete field/owner mappings, contained Salesforce and website outbound transports, marked
synthetic records, exact approved recipients, an expiring run, and explicit write/isolation
flags. Ordinary previews cannot write. A protected workflow-test preview must independently
prove unauthenticated access is denied before its assertion flag is enabled.

`npm run verify:salesforce-sandbox-leads` rehearses all ten forms; `--execute` is a deliberate
live sandbox operation. Reconcile actual persisted records using unique markers and bounded
creation windows. Web-to-Lead acceptance alone is not success. Never blindly retry an uncertain
submission: one POST can create a lead and start asynchronous workflows.

`LEAD_DRY_RUN` remains the existing local-development shortcut and is false in Next production
mode. It is supplementary, not the environment boundary. Read it through `isLeadDryRun()`.
Do not log raw lead payloads, contact data, credentials or bearer tokens. Verify mapping with
synthetic fixtures and assertions, and record sanitized capture evidence instead.

Salesforce queue/Flow/timer tests must exercise the real workflow with a capture transport.
Disabling the workflow does not count as testing it. When controlled delivery is in scope, require
provider receipts plus actual inbox/handset arrival, with negative-recipient and expired-run checks.
Capture-only environment changes do not require all legacy multi-day timers or live SMS. Select
affected business cases when spam, routing, schedules or delivery behavior changes.

Use [vpcs-salesforce-dev](../vpcs-salesforce-dev/SKILL.md) for target selection, protected Preview
runs and the separate website/metadata release procedures.

See [the environment runbook](../../../docs/salesforce-webdev-environment.md) for current
provisioning status, commands, prerequisites and release evidence.

## Driving the app

```bash
npm run test:e2e:server       # isolated mock; set E2E_BASE_URL for a nondefault loopback port
```

Use **Playwright MCP** when available, or the repository's pinned Playwright runner. Harper's
Chrome tabs are frequently visibility-hidden, which makes screenshots unreliable. The repo now
includes responsive and interaction specifications under `e2e/`; select the isolated local origin
with `E2E_BASE_URL`. `npm run test:e2e:server` starts a dry-run preview and `npm run test:e2e` runs
the suite. Set `E2E_LEAD_DRY_RUN=1` only after confirming the selected server uses dry-run mode.
Keep screenshot fixtures confined to tests and also smoke-test normal application data paths.

For the generic mechanics of driving a browser and what counts as sufficient evidence, use the
global `agent-browser` and `superpowers:verification-before-completion` skills. This file only
covers what is specific to VeteranPCS.

Kill the dev server when the task is done. Global rule, and a stray server on 3000 breaks the next run.

### If the dev server throws TS2307 on modules that clearly exist

Stale Turbopack dev cache. Not a real error, and not worth debugging:

```bash
rm -rf .next-sandbox/dev && npm run dev:sandbox
```

Do not delete all build outputs; that forces a full rebuild for no benefit.

## Route checklist

Whatever you changed, check the routes it can reach. These six cover the distinct rendering paths;
a change to shared layout or global CSS should be checked against all of them.

| Route | Why it is on the list |
|---|---|
| `/` | homepage, includes the large `StateMapSvg` component |
| `/texas` | the `[state]` dynamic segment, agent and lender partner rendering |
| `/contact-agent` | lead form; submit only through isolated mock or the authorized sandbox gates above |
| `/contact-lender` | second lead form with different field mapping |
| `/blog/[slug]` | MDX rendering path, pick any real post from `content/blog/` |
| `/how-it-works` | static marketing page, catches global layout regressions |

Check at a narrow mobile width as well as desktop. The July defects were overwhelmingly
mobile-only: horizontal overflow, tap targets, and text clipping that are invisible at 1440px.

## Evidence

A claim of "done" on a visual change must be backed by a screenshot you actually looked at, plus a
sentence naming what you confirmed in it. "Looks the same" is not evidence and has produced
regressions in this repo before. If you could not verify something, say which part and why rather
than rounding up to done.

## Gotchas

- `npm test` is mostly fast Node tests, with selected jsdom interaction tests. Its runtime is
  not evidence that browser rendering was verified.
- `npm run lint:content` (`scripts/audit-blog-editorial.mjs`) is a separate gate from `npm run lint`
  and is not run by the pre-commit hook. Run it after any change under `content/blog/`.
- The pre-commit hook runs lint, type-check, test, and build. It is slow. That is deliberate, since
  content loaders throw at module load and only `build` catches malformed content JSON.
- CI (`.github/workflows/ci.yml`) runs the same gates plus a model-id consistency check. A change
  that passes locally still has to pass that.
