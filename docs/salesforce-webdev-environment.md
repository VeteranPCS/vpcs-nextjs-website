# Salesforce webdev environment runbook

**Status** · WebDev OAuth, Vercel variable scopes, rendering data, all ten form persistence checks, one native welcome email and Salesforce SMS capture verified. Protected-preview acceptance, broader workflow delivery checks and release validation remain open. Updated 2026-11-25.

This runbook establishes the website's isolated Salesforce development connection. Salesforce remains cloud-hosted. Spam enforcement, regional routing corrections, new working hours, and timer policy changes are separate releases.

## Execution ledger

| Item | Observed state |
|---|---|
| Implementation baseline | `3a8875166e9741aee3bc10449310c269cb32dbd2`, branch `codex/salesforce-webdev-environment`; existing uncommitted work preserved |
| Pre-change tests | 134 Vitest files / 1,298 tests passed |
| Toolchain | Node 24.1.0; Salesforce CLI 2.159.7 installed from the official npm package |
| Local configuration | Active `.env.local` changed to `webdev` / `capture`, writes off; production integration credentials removed from this active file, original retained in private temporary backup |
| Sandbox request | Developer `webdev`, source Production, 200 MB. Requested 2026-11-25 12:09 as displayed in Salesforce Setup. Status Completed. |
| Sandbox access | `Webdev Sandbox Access` public group, no added members, hierarchy access off; creation user retained by Salesforce |
| Actual sandbox identity | `00Djg000000EK8YEAW` at `https://veteranpcs--webdev.sandbox.my.salesforce.com`. The approved CLI login is authenticated as `vpcs-webdev`. The Organization query returned this ID and `IsSandbox=true`. |
| Salesforce baseline | Metadata retrieval `09Sjg000000BrfJEAS` stored 257 files in ignored `salesforce/retrieved-private/`. Separate inventory queries returned 14 record types and 12 scheduled jobs. Capture deployment `0Afjg0000004c58CAA` passed 66 tests; native email overlay `0Afjg0000004azOCAQ` passed 28 tests. Detailed receipts remain private. |
| Vercel Production variables | Verified all nine existing Salesforce variables are scoped to Production. Added the explicit production profile, org ID, `password` grant, Web-to-Lead URL and `live` delivery controls. |
| Vercel Development and Preview variables | Both environments now have the `webdev` profile, `client_credentials` grant, `capture` delivery, writes `0`, isolation attestation `0`, and API version `v62.0`. Verified org/mappings and separate credentials are saved: workflow app for Development, read-only app for Preview. The test-branch override is pending a reviewed remote branch; Vercel rejected the nonexistent branch, and the unsaved import was discarded. |
| Production deployment | `DaKuhAE5WYSTv8tPgFfM4vGFzKf4` still serves `main` at `3a8875166e9741aee3bc10449310c269cb32dbd2`. Existing deployment URL is `vpcs-nextjs-website-2rsx54rie-veteranpcs.vercel.app`. |
| Deployment protection | Standard Vercel Authentication enabled. Anonymous HEAD returned `200` for `www.veteranpcs.com` and `302` to `vercel.com` for the deployment URL. Workflow-test preview deployment and its protection check are pending. |
| Test email | The marked native Customer Lead `00Qjg000000UUVJEA4` was created at 20:49:11 UTC and its welcome action was due at 20:54:11. The approved inbox and Salesforce delivery log both recorded 20:55:01. One unique Message-ID matched the inbox across four log rows, all for `tech@veteranpcs.com`, with zero failures. Deliverability returned to System email only before 20:56. Sandbox deployment `0Afjg0000004eYLCAY` removed three unused guest signup grants and retained the remaining 13 pages and portal controller. |
| Test SMS | The real Salesforce queue worker made one attempt per fixture. The normal row ended `Captured`. The credential override ended `Error` with provider status `SandboxBlocked`. Both had empty `Sent_At__c` and `Message_Id__c`, and no provider receipt. The temporary operator permission assignment was revoked. Live Quo and handset checks still need a dedicated sender and exact approved phone. |
| Automated verification | Lint, type-check and 1,439 Vitest tests passed with external sockets blocked. Mock build generated 1,062 pages. Production-mode mock passed 189 browser checks and the development fixture passed six Concierge viewport checks. Offline fallback fonts differed from the pixel-exact screenshot baselines. |
| App access | Separate API-only users passed 13 Preview and 19 workflow probes before and after the rendering seed. Both verified Organization identity and could select the marked partner records. Preview denied Lead reads and restricted Contact/Person Account phone and email fields. Read-only ViewRoles and ViewSetup enabled the identity query. View All Data and Modify All Data are off. Permission deployment `0Afjg0000004cwMCAQ` passed 11 tests. Local `verify:salesforce-target` passed. |
| Rendering seed | Run `webdev-initial-20261125` reconciled all seven primary records and three `AccountRevalidation` captures. The receipt confirms the Agent, Lender, Customer, Colorado Area, two assignments and closed-lost Customer Opportunity. Read-only app queries found the seeded data. Browser verification is a separate gate. |
| Real WebDev browser | Build `BI7fG5eYi9zDVy2rvTT8Z` accepted the matching `http://127.0.0.1:3100` start and rejected port 3101. The browser passed 30 of 41 assertions, including six fixture image-to-form checks and both 1,200×630 social PNGs. The 11 reproduced baseline failures were two area slug round trips returning 404, six fixed-header heading clips and three impact hydration cases. The browser issued no external or non-read requests and submitted no forms. |
| Live form rehearsal | Run A persisted one marked Contact Agent Lead and stopped on an HTTP 400 owner transfer. Guard fix deployment `0Afjg0000004cbPCAQ` passed 12 tests. The workflow app retried the owner update on the existing Lead, received HTTP 204 and confirmed the approved owner. Fresh Run B passed all ten form persistence and readback checks, including both contact owner assertions. |
| Production side effects | Existing OpenPhone sender/key, Slack webhook and the production Upstash connection now apply only to Vercel Production. Future Preview builds use sandbox credentials. Previous artifacts are not retroactively changed. |
| Production release | Commit, merge, deployment and promotion are pending. |

Do not replace unknowns with plausible IDs. `config/salesforce/webdev.example.json` deliberately contains null mappings and `verified: false`. The application rejects it.

## Runtime contract

| Context | Profile | Writes | Delivery |
|---|---|---|---|
| Local dev, any Git branch | `webdev` | Off until explicit test gate | Capture |
| Local build/start | `webdev` | Same gate | Capture |
| Automated tests/build/browser | `mock` | Synthetic mocks | Capture, external Node sockets blocked |
| Ordinary Vercel Preview | `webdev` | Off; read-only integration user | Capture |
| Protected `codex/salesforce-workflow-test` Preview | `webdev` | Explicit bounded test gate | Capture, later approved controlled delivery |
| Vercel Production from `main` | `production` | Existing production behavior | `live` |

`NODE_ENV` never selects an org. Local `main` is still sandbox. The production profile requires all of `VERCEL=1`, `VERCEL_ENV=production`, `VERCEL_GIT_COMMIT_REF=main` and an explicit production profile. These checks supplement credential separation; manually forged environment variables are not a credential boundary.

The shared validator in `lib/salesforce/environment.mjs` is usable by Node scripts; `lib/salesforce/server-config.ts` is the server-only application boundary. It validates exact hosts before credentials/bearer tokens, checks `Organization.Id` and `IsSandbox` after OAuth through a low-level transport, rejects redirects, and guards Web-to-Lead independently. Production Web-to-Lead keeps its independent unauthenticated transport: validated manifest/host/oid, without a new OAuth availability dependency. Webdev requires a verified OAuth org session before its test POST. The final server serialization translates legacy custom-field wire keys through the selected manifest. Existing production field formats and owner roles remain unchanged.

Local outputs are `.next-sandbox` and `.next-mock`. Vercel uses `.next`. A build marker binds the artifact to the target configuration and build ID. `start` refuses incompatible artifacts. CRM token and data caches include the profile, org and a fingerprint of the verified mappings. Mock builds use deterministic partner fixtures and local fallback fonts. Live Salesforce permissions, native workflow behavior and exact production typography require separate verification.

## Developer setup

1. Use Node 24 and `npm ci`. Read `CLAUDE.md`; never pull Production variables into a local active env file.
2. Install the official Salesforce CLI. On the current Mac its executable is `/Users/harperfoley/.local/share/vpcs-tools/bin/sf`; add that directory to your terminal PATH if desired.
3. On a fresh workstation, authenticate with `sf org login web --instance-url https://veteranpcs--webdev.sandbox.my.salesforce.com --alias vpcs-webdev`. Use explicit `--target-org vpcs-webdev` on every command. That alias is already authenticated on the current Mac.
4. Run `sf data query --target-org vpcs-webdev --query "SELECT Id, IsSandbox FROM Organization"`. Require ID `00Djg000000EK8YEAW` and `IsSandbox=true`. CLI login and website OAuth are independent.
5. Complete the containment and app-access sections below before enabling lead writes.
6. Fill one audited ignored `.env.local`, using separate sandbox client credentials and the verified manifest. Remove manual `NODE_ENV`. Conflicting local production configuration must fail before network activity.
7. Run `npm run verify:salesforce-target` before starting the website.

Implemented commands:

```sh
npm run dev:sandbox
npm run build:sandbox
npm run start:sandbox
npm run build:mock
npm run start:mock
npm run verify:salesforce-target
npm run verify:salesforce-sandbox-leads
```

Plain `dev`, `build`, and `start` select webdev locally and stop with an actionable error if incomplete. `build:mock` needs no credentials, ignores active integration credentials and does not read local dotenv files. `verify:salesforce-sandbox-leads` is a dry rehearsal unless explicitly invoked with `--execute`.

To synchronize Vercel Development, pull into a **new ignored staging file**, inspect names/scopes without logging values, validate, then merge approved values into `.env.local`. Never pull over the active file, never pull Production for local use, and never source untrusted dotenv as shell code. Preserve unrelated settings. Secret placeholders require secure entry through the intended local credential channel.

## Configuration inventory

| Name | webdev | Production |
|---|---|---|
| `VPCS_SALESFORCE_PROFILE` | `webdev` | `production` |
| `VPCS_SALESFORCE_ORG_ID` | `00Djg000000EK8YEAW` | Existing production ID from versioned manifest |
| `VPCS_SALESFORCE_METADATA_JSON` | Verified JSON matching the example schema | Not used; committed production manifest |
| `SALESFORCE_LOGIN_BASE_URL` | Verified webdev My Domain | Existing approved production login origin |
| `VPCS_SALESFORCE_BASE_URL` | Verified webdev My Domain | Existing production My Domain |
| `SALESFORCE_API_VERSION` | Explicit supported version, currently `v62.0` fixtures | Preserve existing supported version |
| `SALESFORCE_AUTH_GRANT` | `client_credentials` | Existing `password` path until separate migration |
| `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET` | Dedicated sandbox app/user | Production-only credentials |
| `SALESFORCE_USERNAME`, `SALESFORCE_PASSWORD`, `SALESFORCE_TOKEN` | Absent | Existing production-only values |
| `VPCS_SALESFORCE_WEB_TO_LEAD_URL` | Exact sandbox-generated form action | Existing `webto.salesforce.com` form action |
| `VPCS_SANDBOX_LEAD_WRITES` | `0` normally | Not a production control |
| `VPCS_WEBDEV_ISOLATION_ATTESTED` | `0` until all paths are contained | Not used |
| `VPCS_DELIVERY_MODE` | `capture`; controlled mode requires further gates | Explicit `live` |
| `VPCS_SANDBOX_PREVIEW_PROTECTED` | `1` only after verifying test-preview protection | Not used |
| `NEXT_PUBLIC_API_BASE_URL`, `MAGIC_LINK_BASE_URL` | Local or protected-preview origin | Existing production origin |
| `VPCS_WEBDEV_SALESFORCE_WEBHOOK_SECRET` | Protected-preview callback only; no production-secret fallback | Not used |
| Webhook/magic-link/cron secrets | New sandbox-only secrets | Existing production-only secrets |
| Slack/OpenPhone/Redis/PostHog/AI | Capture or dedicated sandbox resource only | Existing production-only resources |

No secret belongs in `NEXT_PUBLIC_*`, version control, browser bundles or logs. Rebuild after changing public variables. Website analytics and ingest rewrites are disabled outside the explicit production context.

In dotenv, enclose the compact single-line `VPCS_SALESFORCE_METADATA_JSON` value in single quotes. Preserve all six members and every mapping key from the manifest schema. Use the exact generated Web-to-Lead URL and quote the whole value if it includes `&orgId=`. The validator checks the optional URL org ID and the submitted `oid` against the configured org.

Website concierge requests are disabled outside production. The offline browser fixture can render the widget with a mocked response while the server route stays disabled. Manual concierge evals use the dedicated `VPCS_EVAL_AI_GATEWAY_API_KEY` from the shell or `.env.evals.local`.

## Containment and workflow inventory

The initial private baseline is available in ignored `salesforce/retrieved-private/` using the scope in `salesforce/manifest/environment-inventory.xml`. Review it for secrets and dependencies before copying required source into `force-app`. Build fixtures from synthetic records and start with empty test queues.

Before inserting records, inventory active Lead/Account/Opportunity/portal Flows and subflows, Apex messaging/worker/refresh classes, email alerts/templates/literal recipients, org-wide senders, copied user emails, Named Credentials, remote sites, custom settings/metadata, managed packages, callback URLs and provider jobs. Existing reports under `docs/hubspot-migration/` and `docs/salesforce-readiness-2026-10-17.md` are starting evidence, not proof of the current org.

Keep sandbox application email restricted while inventorying every reachable recipient path. The approved controlled email test uses direct Salesforce delivery to `tech@veteranpcs.com`. Before enabling it, verify the resolved To, Cc and Bcc recipients for email alerts, templates, Apex, scheduled jobs, merged record fields and managed integrations. Redirect eligible test messages to the exact approved inbox and block all other recipients and any path with unresolved routing. Use an expiring run and a bounded send count. Record the negative-recipient checks and confirm arrival in the approved inbox before attesting delivery.

The Experience Cloud audit mapped both active Site records to the same guest identity and profile under one Under Construction Network. A verified sandbox-only permission change removed unused signup access and retained the login and reset page grants and the portal controller grant. Keep **System email only** outside a separately approved send window. The native welcome inbox receipt matched Salesforce Email Log Files. Portal account email and other workflow branches need separate evidence. [Native email gate](../salesforce/scripts/webdev-native-email-gate.md)

The website now has a separate controlled Quo transport requiring `VPCS_WEBDEV_OPENPHONE_API_KEY`, `VPCS_WEBDEV_OPENPHONE_FROM_NUMBER`, `VPCS_WEBDEV_OPENPHONE_TO_NUMBER`, `VPCS_WEBDEV_OPENPHONE_MAX_SENDS`, and dedicated `VPCS_WEBDEV_UPSTASH_REDIS_REST_URL` / `VPCS_WEBDEV_UPSTASH_REDIS_REST_TOKEN`. It has no production-key fallback, requires a distinct sender and exact approved recipient, atomically reserves attempts against the expiring run, and records the provider message ID. Failed or ambiguous sends consume their attempt and are never automatically replayed. Quota keys are retained to prevent reopening a prior run; do not delete them to reset a limit. Slack remains capture-only in this mode. These controls are implemented but not yet provisioned or delivery-tested.

Keep real Salesforce SMS services, queues and workers executing after redirecting the final provider transport to capture. Controlled SMS requires a dedicated sender, exact approved numbers, a bounded run and a durable send limit. Website Quo/OpenPhone and Salesforce SMS are separate send paths and require separate evidence. Do not regard a queue status of Sent as proof of handset delivery.

The Salesforce worker evidence is in ignored `salesforce/retrieved-private/sms-live-capture-20261125/completed.json`. The operator added two marked queue rows, observed one capture, one blocked override, zero provider receipts and no worker errors, then verified revocation of the temporary operator permission. The capture marker returned to its baseline in deployment `0Afjg0000004emrCAA`. Live provider timing and the dedicated handset remain separate checks.

Configure sandbox callbacks and generated links to the protected preview, with dedicated callback secrets and authenticated access through Vercel protection. Never use the production website as the sandbox callback destination.

Inventory each schedule's class/Flow, expression, execution user, timezone and next-fire time. Recreate missing Apex jobs only after containment; scheduled Flow behavior must be checked separately. Preserve current timings. Test native five-minute/daily schedules with actual timestamps; fake clocks are supplementary.

## App access, mappings and fixtures

Create separate sandbox External Client Apps/integration users for ordinary-preview reads and local/workflow-test access. Grant exact object/field permissions used by the application; do not copy administrator access. Client credentials must use the sandbox My Domain and an explicit run-as user.

Run the [app access verifier](../salesforce/access/README.md#run-as-oauth-evidence) with each actual app and use `npm run verify:salesforce-target` for the active website environment. Both app sessions need `API Enabled` and successful reads of `Organization.Id` and `Organization.IsSandbox`. The seeded reports are under the ignored `webdev-app-access-evidence/` directory, `2026-11-25-preview-yjeyP7` and `2026-11-25-workflow-UhzSpC`.

Bind record types by object and developer name. Generate the sandbox Web-to-Lead form and map every custom field, including attribution. Resolve the regional roles to test identities. `config/salesforce/webdev.json` is the verified current manifest; every record type and owner was matched in the actual sandbox, and all 39 wire mappings were checked against Tooling API fields. The generated Web-to-Lead action is `https://test.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8&orgId=00Djg000000EK8Y`. The manifest requires all fields even if only one form is being tested; this prevents partial accidental fallback to production IDs.

The retrieved inventory includes Lead developer names `Agent`, `Customer`, `Intern`, and `Lender`, plus Opportunity `Customer`. Account includes separate `Agent` and `PersonAccountAgent` types alongside `Person_Account_Customer` and `Person_Account_Lender`. Verify Person Account fixture types and required fields before seeding. The website's agent, lender and customer role flags still govern directory queries. Keep the source inventory and IDs in the ignored baseline while building the verified app manifest.

The sandbox seed uses synthetic partner and customer Person Accounts, a Colorado Area, two area assignments and one Customer Opportunity. It reuses a verified sandbox regional owner. The completed write and reconciliation are under ignored `salesforce/retrieved-private/rendering-fixture-attempts/`. Re-run [the read-only reconciliation](../salesforce/fixtures/README.md#execute-and-reconcile-the-prepared-rendering-bundle) when rechecking those records.

The directory uses the committed neutral SVGs for the reconciled synthetic agent and lender IDs in `config/salesforce/webdev-fixtures.json`. The mapping applies only to the matching partner role in the verified WebDev org.

### Browser verification against the rendering seed

Keep sandbox website writes off. Verify the active target, then start a local WebDev production-mode artifact or a fresh, protected, read-only preview using the exact reviewed tree. For the current Next.js font build issue, use the command-scoped font fallback for local functional checks. Check typography on a genuine-font build separately. [Local WebDev build notes](salesforce-webdev-build-notes.md)

| Read-only routes | Expected result |
| --- | --- |
| `/agents`, `/lenders`, `/colorado` | The two marked partners appear in the correct Colorado lists and state-page cards. Their neutral role images load locally. Each card leads to the correct `/contact-agent` or `/contact-lender` route with its role, verified fixture ID and Colorado selection. Open the forms without submitting. |
| `/api/v1/areas?state=CO`, `/api/v1/states/colorado/area-agent?area=<returned fixture slug>` | The seeded area appears in coverage, and the scored area returns the marked agent and the Colorado contact link. |
| `/api/v1/states/colorado/image` | The response resolves the Colorado map to a repo-backed image on the verified website origin. Confirm the image returns 200. |
| `/impact`, `/api/v1/impact` | The API reports `available: true`. Compare the values to the sandbox Customer Opportunity aggregate. The seeded record contributes `123.45` payout, `45.67` charity and `300000` volume. The UI rounds dollars to whole amounts and volume to millions. |
| `/blog/what-military-bases-are-in-new-hampshire` | Verify the article and VeteranPCS author fallback when its Salesforce author is absent from WebDev. The seeded app probes separately confirmed positive author lookups by ID and name. |

Repeat the reads on the same runtime after caches warm and verify state, asset and author results remain correct. Save the route outcomes and applicable browser evidence privately. A local pass does not establish hosted preview protection, the hosted build, or mail/SMS delivery.

### Live form rehearsal

For a real website rehearsal, the current guard requires:

- Synthetic name prefix `[VPCS WEBDEV TEST]`.
- `VPCS_WEBDEV_TEST_RUN_ID`, a unique run marker, and `VPCS_WEBDEV_TEST_EXPIRES_AT`, an ISO expiry no more than 24 hours away.
- Exact `VPCS_WEBDEV_TEST_EMAILS` and `VPCS_WEBDEV_TEST_PHONES`; reserved fixture numbers are capture-only.
- Both write/isolation flags, a verified sandbox OAuth identity, and verified sandbox partner IDs.
- A local session or the exact protected workflow-test preview branch.

After fixtures and transport evidence exist:

```sh
npm run verify:salesforce-sandbox-leads -- --execute --email tech@veteranpcs.com
```

The harness reconciles all ten forms by unique synthetic markers and bounded creation windows. It records a write-once local attempt marker and refuses an already-used remote run marker. Runs are serialized through a single operator: the local reservation plus remote query is not an atomic cross-machine reservation. HTTP acceptance is not persistence evidence; do not blindly retry uncertain submissions. Preserve the attempt ledger and reconcile before any subsequent action.

Preserve Run A alongside the successful Run B. The successful run validated one marked Lead per form and the expected owner for each contact form. Its generic Contact Form Lead persisted with `WebToLead__c=false`. The native canary used a separate marked admin-created Customer Lead with the flag explicitly true, so the website payload behavior stayed the same. [Native email gate](../salesforce/scripts/webdev-native-email-gate.md)

## Vercel sequence

1. Project `vpcs-nextjs-website`, team VeteranPCS, production branch `main`, and the current deployment are verified. See the execution ledger for the baseline.
2. The nine existing Salesforce variables are scoped to Production. Verify the scope of other side-effecting production credentials separately and keep secrets out of logs and chat.
3. The Production profile, org ID, grant, Web-to-Lead URL and live delivery settings are in place for a future approved build.
4. Development and Preview have sandbox targets, verified mappings and separate app credentials. Apply the workflow-test branch override after the reviewed branch exists remotely; leave write gates off until protection and containment are verified.
5. Verify unauthenticated requests to the workflow preview are denied before enabling its write flag. A configuration assertion is not proof that deployment protection works.
6. Provision separate test Redis and callback/delivery resources. Build fresh deployments after env changes; existing deployment variables do not change retroactively. Inventory prior Preview deployments/aliases that retained production credentials and remove their availability through the supported project controls before declaring preview isolation complete. Merely changing the environment scope does not retrofit an old artifact.
7. Pass real local and protected-preview tests, restore capture mode, and review the immutable patch. **Before merging to main**, verify automatic Production domain assignment is disabled or an equivalent enforced release gate is in place. A Git-triggered Production deployment must not activate ahead of staged validation. Then merge the approved website change to main.
8. Stage a **Production** build without domain assignment, validate nonmutating production routes, then promote that tested Production artifact. A sandbox Preview artifact is not a production release candidate.

### Git handoff

Preserve the existing dirty checkout and the private manifest of the 71 initial paths. The original working-tree patch failed at ten overlapping paths against clean `3a8875166e97`. The rebuilt clean candidate resolves those overlaps and retains the committed baseline's intake behavior. The maintenance modules remain on the separate `codex/november-maintenance-readiness` branch.

Apply the reviewed clean patch in the separate worktree at the verified base. The clean port carries the typed Salesforce token error needed by the recovery code. The original 71 paths stay in the dirty checkout. Record the reviewed base and patch SHA and run the local gates before pushing the workflow-test branch.

## Required evidence and release gates

Use the [workflow verification matrix](salesforce-webdev-workflow-matrix.md) to select eligible and ineligible Lead, Opportunity, portal and SMS cases and record their native timing evidence.

| Gate | Evidence required |
|---|---|
| Isolation | Local main and local production-mode builds reject production settings; ordinary previews cannot write; mixed/missing config fails before network |
| OAuth/REST | Correct org accepted; wrong ID, wrong sandbox flag, unexpected instance host, redirect, revoked token and concurrent 401 cases tested |
| Payloads | Production characterization preserved; all sandbox field/owner/type IDs verified |
| Ten forms | Agent contact, lender contact, agent listing, lender listing, keep-in-touch, contact, VA guide, homebuyer guide, Colorado guide, internship persist expected records |
| Spam baseline | Existing reject/review behavior characterized; no new spam policy hidden in setup |
| Rendering | State/directory/detail/image/impact/blog-author paths with cold and warm sandbox caches |
| Workflows | Eligible/ineligible immediate alerts, five-minute welcome, daily follow-ups, SMS workers/refresh, portal reminders, Opportunity scheduled paths |
| Timing/delivery | Scheduled and actual timestamps, capture entries, provider receipts and actual approved inbox/handset arrival; negative recipients receive nothing |
| Website regression | Lint, typecheck, Vitest, offline build/start and Playwright; record exact patch identity |
| Salesforce | Relevant Apex/Flow tests, coverage and deployment results for every changed component; sandbox first |

Maintain a baseline defect ledger with observed behavior, expected behavior, evidence and follow-up owner. A pre-existing failure is neither silently fixed nor counted as a passing workflow. The environment is complete only when another developer can verify identity, submit a synthetic lead and trace its isolated workflow.

## Rollback and refresh

Rollback restores the previous compatible website artifact. Never restore production credentials into local development. Disable new sandbox writes, preserve the attempt ledger and reconcile pending jobs; rollback cannot retract delivered messages or undo created records.

After sandbox refresh: invalidate isolation attestation, stop writes, re-verify org ID/domain/CLI alias, rotate sandbox-specific access as needed, regenerate field/record/owner mappings, reapply transport containment, inspect scheduled Flows, recreate approved Apex schedules, seed fresh synthetic fixtures, and repeat all release gates. Replace the directory fixture manifest with the refreshed org ID and the reconciled synthetic partner IDs. Do not reuse old pending queues or a previous test-run marker.

## Authoritative references

- [Salesforce CLI setup](https://developer.salesforce.com/docs/platform/sfdx-setup/guide/sfdx-setup-install-cli.html)
- [Salesforce sandbox types](https://help.salesforce.com/s/articleView?id=platform.data_sandbox_environments.htm&language=en_US&type=5)
- [Vercel system variables](https://vercel.com/docs/environment-variables/system-environment-variables)
- [Vercel environment CLI](https://vercel.com/docs/cli/env)
- [Vercel deployment protection](https://vercel.com/docs/deployment-protection)
- [Vercel promotion](https://vercel.com/docs/deployments/promoting-a-deployment)
- [Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables)
- [Quo send message API](https://www.quo.com/docs/mdx/api-reference/messages/send-a-text-message)
- [Upstash atomic script execution](https://upstash.com/docs/redis/sdks/ts/commands/scripts/eval)
