---
name: vpcs-verify
description: Use before claiming any UI, form, or route change is done in the VeteranPCS repo. Covers what lint/type-check/build cannot see, how to drive the dev server safely, and the hard rule against submitting real lead forms. Trigger phrases include "verify", "is it working", "check the page", "done?", "confirm the fix", "test in the browser", "screenshot it".
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
| `npm test` (602 tests, 79 files) | pure functions, route handlers, data shapes | **all DOM rendering** |

`vitest.config.ts` sets `environment: 'node'` for the whole suite and the repo has no jsdom,
happy-dom, or Testing Library dependency. **No test in this repo renders a component.** A green
suite says nothing about whether a page looks right.

Tailwind widens the gap further. Tailwind 3 JIT silently drops any class it does not recognize,
with no warning at any stage. `text-leeft`, `lg:w-[600ox]`, and `items-cenetr` all compiled clean
and shipped. The ESLint Tailwind rule in `eslint.config.mjs` now catches part of this class of bug,
but not all of it. Assume typos survive to the browser.

**Therefore: for any change touching a component, a page, a layout, or a Tailwind class, running the
four gates is necessary and not sufficient. You must look at the rendered result.**

## The safety rule that has no exceptions

**Never submit a lead form against a live backend.**

`services/salesForcePostFormsService.tsx` posts to Salesforce Web-to-Lead, then fires a Slack
webhook and an OpenPhone SMS. The submit helper is deliberately non-idempotent; its own comment
reads "Retrying after any response can create duplicate Leads, so this helper intentionally performs
exactly one POST." Local `SALESFORCE_LOGIN_BASE_URL` does not match the `test.salesforce.com`
sandbox pattern, so **local dev appears to point at the production org.** A single naive "click
Submit to check it works" creates a real Lead, a real Slack message, and a real SMS to a real person.

To exercise a form path, set the dry-run flag:

```bash
LEAD_DRY_RUN=1 npm run dev
```

`lib/lead-dry-run.ts` returns false whenever `NODE_ENV === 'production'`, so the flag cannot be
enabled in a deployed environment even if the variable is set. That production check lives inside
the single `isLeadDryRun()` helper that every guard calls, so a guard added later cannot forget it.
Never read `process.env.LEAD_DRY_RUN` anywhere else.

In dry-run the full payload is still constructed, and five outbound side effects are skipped: the
Salesforce Web-to-Lead POST, the Slack webhook, the OpenPhone SMS, `routeSalesforceLeadOwner` (which
also writes to the org), and the PostHog `lead_conversion_created` capture. That last one is the
easiest to miss and the most damaging: PostHog is the primary funnel telemetry source, so an
unguarded verification run pollutes conversion data. The result carries `dryRun: true` and the
caller walks the identical success path. All three guards log under the `[LEAD_DRY_RUN]` prefix:

```
[LEAD_DRY_RUN] Skipping Salesforce Web-to-Lead POST
[LEAD_DRY_RUN] Skipping lead notifications
[LEAD_DRY_RUN] Skipping lead_conversion_created PostHog capture
```

If you add a new outbound sink to the lead path, guard it with `isLeadDryRun()` and add a line here.

Read the logged payload to confirm field mapping. It uses `console.log` rather than `logInfo` on
purpose: `services/loggingService.ts` sanitizes `first_name`, `last_name`, `email`, `mobile`, and
`message`, which are exactly the fields you need to see. This is safe only because the line is
unreachable in production.

If you find yourself about to click Submit without that flag set, stop.

## Driving the app

```bash
LEAD_DRY_RUN=1 npm run dev     # binds 127.0.0.1:3000, not localhost:3000
```

Use **Playwright MCP**, not claude-in-chrome. Harper's Chrome tabs are frequently
visibility-hidden, which makes screenshots unreliable and silently wrong. Playwright MCP is
available as a plugin at the agent level; note the repo itself has no Playwright npm dependency, so
there is nothing to `npm install` and no test file to write against it.

For the generic mechanics of driving a browser and what counts as sufficient evidence, use the
global `agent-browser` and `superpowers:verification-before-completion` skills. This file only
covers what is specific to VeteranPCS.

Kill the dev server when the task is done. Global rule, and a stray server on 3000 breaks the next run.

### If the dev server throws TS2307 on modules that clearly exist

Stale Turbopack dev cache. Not a real error, and not worth debugging:

```bash
rm -rf .next/dev && npm run dev
```

Do not delete all of `.next`; that forces a full rebuild for no benefit.

## Route checklist

Whatever you changed, check the routes it can reach. These six cover the distinct rendering paths;
a change to shared layout or global CSS should be checked against all of them.

| Route | Why it is on the list |
|---|---|
| `/` | homepage, includes the large `StateMapSvg` component |
| `/texas` | the `[state]` dynamic segment, agent and lender partner rendering |
| `/contact-agent` | lead form, needs `LEAD_DRY_RUN=1` |
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

- `npm test` finishing in under two seconds is expected, not a sign the suite was skipped. It is
  fast because nothing renders.
- `npm run lint:content` (`scripts/audit-blog-editorial.mjs`) is a separate gate from `npm run lint`
  and is not run by the pre-commit hook. Run it after any change under `content/blog/`.
- The pre-commit hook runs lint, type-check, test, and build. It is slow. That is deliberate, since
  content loaders throw at module load and only `build` catches malformed content JSON.
- CI (`.github/workflows/ci.yml`) runs the same gates plus a model-id consistency check. A change
  that passes locally still has to pass that.
