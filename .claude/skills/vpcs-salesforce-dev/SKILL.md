---
name: vpcs-salesforce-dev
description: Develop and verify VeteranPCS Salesforce integrations using local webdev, protected Vercel previews, and staged Production releases. Use for Salesforce environment setup, credential or mapping changes, sandbox workflows, and release preparation.
---

# VeteranPCS Salesforce development

Read [CLAUDE.md](../../../CLAUDE.md) first. Use the [environment runbook](../../../docs/salesforce-webdev-environment.md) for current org identity, variable scopes, fixture commands and evidence. This skill supplies the workflow; it does not authorize a deployment or expand the user's task.

## Choose the target

| Work | Target and boundary |
|---|---|
| Local development, including local `main` | `webdev`; separate sandbox credentials; capture by default |
| Automated tests and production-mode regression | `mock`; blocked external Node sockets; captured side effects |
| Ordinary Vercel Preview | `webdev` with read-only app credentials and writes off |
| Protected workflow-test branch | `webdev`; bounded marked synthetic runs after protection and containment checks |
| Website release from `main` | Fresh Vercel Production build using Production-scoped variables |

`NODE_ENV=production` describes the Next.js runtime, not the Salesforce target. CLI login and website OAuth are independent. Never fix a local authentication error by restoring Production credentials, pulling Production dotenv, or weakening the identity guard. Pull Vercel Development into a fresh ignored staging file and validate before updating `.env.local`; do not print secrets.

## Local and automated work

Use Node 24 and `npm ci`. Before starting the website or its guarded network scripts, run `npm run verify:salesforce-target`. For CLI operator work, independently query `Organization.Id, IsSandbox` using an explicit `--target-org vpcs-webdev` and compare both values with the runbook. Integrated website/operator rehearsals require both checks; CLI-only work does not require website OAuth. Do not set a Production default org.

- `npm run dev:sandbox` starts local development.
- `npm run build:sandbox` then `npm run start:sandbox` exercise production-mode Next.js against webdev. Start with the same configuration used to build.
- `npm run build:mock` then `npm run start:mock` exercise the isolated credential-free artifact.
- Normal hooks run lint, type-check, tests and the mock build. Use [vpcs-verify](../vpcs-verify/SKILL.md) for affected rendered routes and forms.

Use `getSalesforceConfig()` and the selected org manifest for runtime record types, owners and destinations. `lib/salesforce/ids.ts` holds legacy production payload aliases; Web-to-Lead translates them at the final server serialization boundary. Preserve that distinction when changing forms. Reuse checked transports rather than adding an independent OAuth or fetch helper.

## Real sandbox and protected Preview tests

Read the runbook's live form rehearsal and containment sections before writes. Confirm the sandbox identity, synthetic partner IDs, exact recipient controls, contained website and Salesforce outbound paths, expiring run marker and both write/isolation gates. Check anonymous denial and authorized access on the exact hosted deployment before enabling workflow-test submissions. Ordinary Preview stays read-only.

`npm run verify:salesforce-sandbox-leads` defaults to rehearsal; `--execute` writes real sandbox records. Serialize fixture runs and shared-org changes. Reconcile persisted records and capture evidence; never blindly retry an uncertain POST. A welcome Flow trace, a queue capture and a delivered message are different evidence. Record the actual outcome and any correlation limits.

After a bounded run, close/neutralize its fixtures as specified by the runbook, restore capture and write gates, remove temporary credentials/grants and verify the final Preview. Existing build snapshots retain their environment values; rebuild and retire temporary write-enabled artifacts as needed within the authorized scope.

Live SMS is currently disabled. The user deferred isolated Redis; do not provision paid resources or reuse Production SMS/Redis credentials to complete a capture test. Live delivery requires its own resources and evidence, including provider receipts, approved inbox/handset arrival, and negative-recipient/expiry checks.

## Select tests by the change

Use the runbook's [release-gate classification](../../../docs/salesforce-webdev-environment.md#required-evidence-and-release-gates). Environment changes require isolation, auth, mapping, form, rendering and containment regression. They do not automatically require every legacy multi-day timer or live SMS certification.

Changes to spam rules, routing, countdowns or schedules require the affected business cases and native workflow evidence from the [workflow matrix](../../../docs/salesforce-webdev-workflow-matrix.md), including ineligible records and actual scheduled execution where timing is changed. Do not disable the workflow and call it tested, or count an unexecuted scenario as a pass. Review shared dependencies to select adjacent regression cases.

## Website and Salesforce releases are separate

For the first website environment release, verify an effective hold on automatic Production domain assignment **before merging**. Git-triggered `main` deployments otherwise activate automatically. Review the exact head and its CI, merge within the authorized release scope, build fresh with Production variables, run nonmutating Production identity/route checks, then promote that same tested Production artifact. Do not submit synthetic Production leads. Local `main` remains connected to webdev. Follow the runbook for the current hold and rollback procedure.

Merging website code does not deploy Apex or Flows. For later Salesforce changes, follow [salesforce/README.md](../../../salesforce/README.md): scoped manifest, sandbox deployment and relevant tests/coverage, Production validation with required tests, then the authorized metadata deployment to an explicit target. Never directly edit Production Apex or bulk-promote sandbox capture adapters, credentials, recipient overlays or synthetic fixtures.

On refresh, invalidate prior isolation evidence and follow the runbook's recovery sequence before restoring writes. Record sanitized deployment/test IDs and known defects in the runbook; keep raw exports, authentication state and secrets ignored.
