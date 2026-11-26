# Salesforce webdev environment runbook

**Development handoff** · PR #240 merged as `cee4a9275204c7be43392af0b013b4193f5cf4f0` and its verified Production build `dpl_HuocbTbnicLJyqBrQkqLxrQ4AofC` was promoted. Automatic Production domain assignment remains disabled. WebDev and protected `test.veteranpcs.com` are usable in capture mode with writes off. The ledger below preserves the environment setup evidence. The subsequent [regional routing release](customer-regional-routing.md) retires website SMS/owner PATCHes and has separate Salesforce, migration and delivery gates; it has not yet shipped. Updated 2026-11-25.

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
| Vercel Development and Preview variables | Both environments use `webdev`, `client_credentials`, `capture`, writes `0`, isolation attestation `0`, and API version `v62.0`. Development has workflow app credentials and ordinary Preview has read-only app credentials. The two workflow OAuth variables are saved on the published `codex/salesforce-workflow-test` branch. Keep writes off outside an approved protected Preview test window. |
| Production deployment | `DaKuhAE5WYSTv8tPgFfM4vGFzKf4` still serves `main` at `3a8875166e9741aee3bc10449310c269cb32dbd2`. Existing deployment URL is `vpcs-nextjs-website-2rsx54rie-veteranpcs.vercel.app`. |
| Deployment protection | Standard Vercel Authentication is enabled. The `c8db80acdc93` Preview passed two HTTP passes covering seven check groups, three anonymous `302` redirects, and two callback `401` rejection checks. Callback run 01 reached the protected route with `409`. Run 02 on `0512600bbae6` passed three pre-window and three in-window negative checks and one native positive callback. `www.veteranpcs.com` continues to return `200`. |
| Preview cutover and retirement | At 21:48 UTC on November 25, `test.veteranpcs.com` moved to the Ready workflow Preview. Exact alias readback was verified with anonymous `302` and authenticated synthetic `200`. The legacy deployment and the 28 other original Ready Previews have been retired. The domain's persistent Git branch mapping was corrected from `dev` to `codex/salesforce-workflow-test`. The workflow branch mapping is retained. The alias was verified against final capture deployment `dpl_3rGSWimhVVeVVgFavcUXxghd36TX`. Both callback canary artifacts and the write-enabled Contact Agent artifact were retired. The `c8db80acdc93` capture backup is retained. |
| Hosted workflow builds | The first hosted attempt compiled 1,062 pages, then exceeded the 250 MB serverless function limit. The blog function was reported at 266.83 MB. The second hit the Google Fonts URL build error. The build-time portrait manifest reduced the local blog trace to 143.45 MiB. Next.js 16.4.6 and PostCSS 8.5.23 are pinned on `c8db80acdc933a7506f18f919ab1b6eb50f17c3c`. Its third deployment `dpl_7sWE4z9PcraZyKofdny5qunpmQRP` reached Ready. The hosted diagnostic measured 1,069 functions with a maximum of 179.76 MB. The temporary diagnostic environment variable was removed. Runtime `bf5791396d1433af34abbfb5b76256fc9f850cf1` reached Ready as `dpl_AEb1decB1YHjmKkmfGxAeFtPnVaF` and was later retired. Runtime `0512600bbae6cf155f33f03191896ea3fb85bab7` served callback run 02 as `dpl_EmG9zmtWE6DBUBE6EySoFgrTpfHV`. Separate deployment `dpl_7kbZdYW8D4kSYfAW9K5Zc8rdgqdN` served the successful write-enabled Contact Agent canary. The capture-only build of the same commit is Ready as `dpl_3rGSWimhVVeVVgFavcUXxghd36TX`. [Capture-only Preview](https://vpcs-nextjs-website-2p4c7p59y-veteranpcs.vercel.app) · [Build notes](salesforce-webdev-build-notes.md) |
| Hosted browser evidence | Runtime `c8db80acdc93` passed 26 of 26 assertions at 390, 820 and 1,440 pixels. Each viewport loaded four Roboto faces and verified seven WOFF2 responses. Six fixture contacts reached their expected forms, two public 750×750 partner portraits matched repository bytes, and both 1,200×630 social PNGs matched. That browser run made zero form submissions and zero callbacks. Existing rendering diagnostics remain in the [build notes](salesforce-webdev-build-notes.md#baseline-defects-found-in-browser-verification). |
| Hosted Contact Agent write-off check | Attempt 02 dispatched one marked POST, received HTTP `200` and reached thank-you. Salesforce returned zero matches for `ContactAgent-6a71b74f7c223216`. Attempt 01 stopped at a lazy-image harness check before dispatch and also had zero Salesforce matches. The private attempt 02 browser receipt and `contact-agent-preview-20261125/negative-02-after.json` establish the write-off result. |
| Hosted Contact Agent write-on canary | Run 01 used `0512600bbae6` deployment `dpl_7kbZdYW8D4kSYfAW9K5Zc8rdgqdN` in the 22:32:51–22:57:36.274 UTC capture window. Browser submission `mwwpexac-qlq76y` persisted exactly one Lead `00Qjg000000UWKJEA4` at 22:37:30 UTC. All 24 reconciliation checks passed, including Colorado, the selected sandbox agent, mapped fields, browser submission ID, and owner Beth `0054x000005GsUvAAK`. Owner routing was confirmed. Website Slack and OpenPhone each recorded one capture for the same invocation. |
| Hosted Lead native Flow | Salesforce log `07Ljg00000055ThEAI` matched the Lead and run marker. The initial Flow set the agent, entered the agent alert, took the default branch at `Agent_Has_Phone`, set the speed-to-lead timestamp, and entered and completed the customer alert with no fault. Both Agent phone fields were empty and the native SMS queue query returned zero rows. Private receipts are in `contact-agent-preview-20261125/`, including `positive-reconciliation.json`, `positive-native-flow-events.json`, and `positive-native-sms-count.json`. |
| Hosted Lead welcome Flow | Due 22:42:30 UTC. Trace `07Ljg00000055VJEAY` started at 22:42:45, 15 seconds after its due time, with `Is_New_Customer` and `SE_Welcome_Video` start and end events and no fault. The trace omits the Lead ID. Correlation to the canary is inferred from the sole eligible Lead created between 22:37 and 22:38, the Tech context, the expected Flow, and the due time. Receipts are `positive-native-welcome-events.json` and `welcome-window-leads.json`. The earlier inbox canary is the delivery evidence. |
| Hosted Lead canary cleanup | Lead `00Qjg000000UWKJEA4` was set to `Closed: Duplicate` with `Next_Contact_Date__c` cleared. Temporary trace and debug settings were deleted with `204` and absence was verified. The six branch environment rows were removed and the default write and isolation flags read back as `0`. The final Ready capture Preview passed exact alias verification, three anonymous `302` checks, authenticated Colorado fixture `200`, and an empty-body `401` with the old callback secret. Production public HTTP remained `200`. Private evidence is in `/private/tmp/vpcs-preview-acceptance/final-capture-checks.json`. |
| Test email | The marked native Customer Lead `00Qjg000000UUVJEA4` was created at 20:49:11 UTC and its welcome action was due at 20:54:11. The approved inbox and Salesforce delivery log both recorded 20:55:01. One unique Message-ID matched the inbox across four log rows, all for `tech@veteranpcs.com`, with zero failures. Deliverability returned to System email only before 20:56. Sandbox deployment `0Afjg0000004eYLCAY` removed three unused guest signup grants and retained the remaining 13 pages and portal controller. |
| Test SMS | The real Salesforce queue worker made one attempt per fixture. The normal row ended `Captured`. The credential override ended `Error` with provider status `SandboxBlocked`. Both had empty `Sent_At__c` and `Message_Id__c`, and no provider receipt. The temporary operator permission assignment was revoked. Live Quo and handset checks still need a dedicated sender and exact approved phone. |
| Automated verification | The published v5 candidate passed lint, type checking and 1,334 Vitest tests. The follow-up at `c8db80acdc93` passed 1,335 Vitest tests and generated 1,062 pages in the mock build. The normal hooks for both `bf5791396d14` and `0512600bbae6` passed 1,352 Vitest tests and generated 1,062 mock pages. Earlier production-mode mock verification passed 189 browser checks and the development fixture passed six Concierge viewport checks. Offline fallback fonts differed from the pixel-exact screenshot baselines. |
| App access | Separate API-only users passed 13 Preview and 19 workflow probes before and after the rendering seed. Both verified Organization identity and could select the marked partner records. Preview denied Lead reads and restricted Contact/Person Account phone and email fields. Read-only ViewRoles and ViewSetup enabled the identity query. View All Data and Modify All Data are off. Permission deployment `0Afjg0000004cwMCAQ` passed 11 tests. Local `verify:salesforce-target` passed after synchronization of the five reviewed runtime files and `npm ci`. The refreshed local target was verified at 22:32 UTC. |
| Rendering seed | Run `webdev-initial-20261125` reconciled all seven primary records and three `AccountRevalidation` captures. The receipt confirms the Agent, Lender, Customer, Colorado Area, two assignments and closed-lost Customer Opportunity. Read-only app queries found the seeded data. Browser verification is a separate gate. |
| Current local WebDev build/start | Normal Next.js 16.4.6 sandbox build generated 1,062 of 1,062 pages without a font override. On matching loopback port 3000, GET `/`, `/colorado`, `/agents`, `/lenders`, and `/api/v1/states` each returned `200`. Colorado rendered the synthetic Agent. The task server was stopped. [Local build evidence](salesforce-webdev-build-notes.md#current-local-webdev-verification) |
| Real WebDev browser | Build `BI7fG5eYi9zDVy2rvTT8Z` accepted the matching `http://127.0.0.1:3100` start and rejected port 3101. The browser passed 30 of 41 assertions, including six fixture image-to-form checks and both 1,200×630 social PNGs. The 11 reproduced baseline failures were two area slug round trips returning 404, six fixed-header heading clips and three impact hydration cases. The browser issued no external or non-read requests and submitted no forms. |
| Live form rehearsal | Run A persisted one marked Contact Agent Lead and stopped on an HTTP 400 owner transfer. Guard fix deployment `0Afjg0000004cbPCAQ` passed 12 tests. The workflow app retried the owner update on the existing Lead, received HTTP 204 and confirmed the approved owner. Fresh Run B passed all ten form persistence and readback checks, including both contact owner assertions. |
| Production side effects | The operator moved the remaining 11 shared variables to Production-only and removed three Preview AI, Concierge and BotID variables as authorized. OpenPhone, Slack and production Upstash remain Production-only. Deployment snapshots retain the variables present at build time. |
| Sandbox delivery resources | The Upstash `vpcs-webdev-test-limits` database is unconnected at $0 with no website environment variables. The requested $5 cap was rejected and the user declined the $20 minimum. Quo lookup identified the existing Harper Primary and Beth lines, and confirmed Jessica uses the line ending in 5065. A dedicated test sender and approved recipient remain pending. Capture stays active and live SMS stays disabled. |
| Apex schedules | Focused sandbox run `707jg000000YWSK` passed 25 tests. Both scheduling classes and the portal reminder batch reached 100% coverage, and the capture guard reached 93%. The reviewed script restored four portal and two sender jobs at 21:39:55 UTC on November 25. All six read back as waiting under the WebDev Tech user in `America/Denver`. The native 21:45 portal batch completed at 21:45:09 with zero errors, incremented the marked Lead count to one, created one `ReminderEmail` capture and left the SMS queue empty. The 22:00 native batch completed with zero errors and zero chunks. The Lead count and timestamp held and no extra reminder capture or SMS row appeared. The canary Lead was closed and the capture label returned to `baseline-capture`. The 22:05 hourly sender run recorded one `SenderRegistry` capture with zero items. The daily sender schedule and other daily and multi-day scenarios remain open. See the [exact job IDs and canary evidence](salesforce-webdev-workflow-matrix.md#apex-reminders-and-sender-refresh). |
| Salesforce callback canary | Check-only validation `0Afjg0000004fFtCAI` passed 15 tests with 86.8% `WebhookHandler` coverage. Run 01 Future `707jg000000YZ3bAAG` returned `409` on `Colorado` versus `colorado`. Run 02 `webdev-callback-20261125-02` re-saved one existing synthetic `Area_Assignment__c` at 22:30:26 UTC with unchanged `AA_Score__c=90`. Future `707jg000000YXyOAAW` completed at 22:30:28 with zero errors and HTTP `200` in log `07Ljg00000055NFEAY`. Vercel deployment `dpl_EmG9zmtWE6DBUBE6EySoFgrTpfHV` logged one `/colorado` revalidation for the same run at 22:30:28. |
| Callback cleanup | Capture restore `0Afjg0000004fuECAQ` passed ten tests and the normalized capture source matched. Credential material, temporary permission assignment, trace flag, debug level, Named Credential and External Credential cleanup returned `204`. Credential definition readback returned `404`. The branch callback canary environment variables were removed. |
| Production release | PR #240 merged at `cee4a9275204c7be43392af0b013b4193f5cf4f0`; tested Production deployment `dpl_HuocbTbnicLJyqBrQkqLxrQ4AofC` promoted with automatic domain assignment disabled. One explicitly authorized Jason Anderson/Colorado canary persisted Lead `00Qjf000000f2KPEAY` with Beth ownership and received email. OpenPhone returned 202; handset delivery was not established. Do not repeat that canary without new authorization. |

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
| Website Slack/Redis/PostHog/AI | Capture or dedicated sandbox resource only | Existing production-only resources |
| Website OpenPhone on the PR #240 baseline | Capture only | Existing production-only resource until the routing website cutover |

No secret belongs in `NEXT_PUBLIC_*`, version control, browser bundles or logs. Rebuild after changing public variables. Website analytics and ingest rewrites are disabled outside the explicit production context.

In dotenv, enclose the compact single-line `VPCS_SALESFORCE_METADATA_JSON` value in single quotes. Preserve all six members and every mapping key from the manifest schema. Use the exact generated Web-to-Lead URL and quote the whole value if it includes `&orgId=`. The validator checks the optional URL org ID and the submitted `oid` against the configured org.

Website concierge requests are disabled outside production. The offline browser fixture can render the widget with a mocked response while the server route stays disabled. Manual concierge evals use the dedicated `VPCS_EVAL_AI_GATEWAY_API_KEY` from the shell or `.env.evals.local`.

## Containment and workflow inventory

The initial private baseline is available in ignored `salesforce/retrieved-private/` using the scope in `salesforce/manifest/environment-inventory.xml`. Review it for secrets and dependencies before copying required source into `force-app`. Build fixtures from synthetic records and start with empty test queues.

Before inserting records, inventory active Lead/Account/Opportunity/portal Flows and subflows, Apex messaging/worker/refresh classes, email alerts/templates/literal recipients, org-wide senders, copied user emails, Named Credentials, remote sites, custom settings/metadata, managed packages, callback URLs and provider jobs. Existing reports under `docs/hubspot-migration/` and `docs/salesforce-readiness-2026-10-17.md` are starting evidence, not proof of the current org.

Keep sandbox application email restricted while inventorying every reachable recipient path. The approved controlled email test uses direct Salesforce delivery to `tech@veteranpcs.com`. Before enabling it, verify the resolved To, Cc and Bcc recipients for email alerts, templates, Apex, scheduled jobs, merged record fields and managed integrations. Redirect eligible test messages to the exact approved inbox and block all other recipients and any path with unresolved routing. Use an expiring run and a bounded send count. Record the negative-recipient checks and confirm arrival in the approved inbox before attesting delivery.

The Experience Cloud audit mapped both active Site records to the same guest identity and profile under one Under Construction Network. A verified sandbox-only permission change removed unused signup access and retained the login and reset page grants and the portal controller grant. Keep **System email only** outside a separately approved send window. The native welcome inbox receipt matched Salesforce Email Log Files. Portal account email and other workflow branches need separate evidence. [Native email gate](../salesforce/scripts/webdev-native-email-gate.md)

The PR #240 website baseline included a gated Quo transport requiring `VPCS_WEBDEV_OPENPHONE_API_KEY`, `VPCS_WEBDEV_OPENPHONE_FROM_NUMBER`, `VPCS_WEBDEV_OPENPHONE_TO_NUMBER`, `VPCS_WEBDEV_OPENPHONE_MAX_SENDS`, and dedicated `VPCS_WEBDEV_UPSTASH_REDIS_REST_URL` / `VPCS_WEBDEV_UPSTASH_REDIS_REST_TOKEN`. That website path had no production-key fallback and never completed a controlled live test. The routing implementation removes it, including its preflight and Redis quota dependency. Slack remains captured on WebDev. Track subsequent controlled SMS testing through Salesforce in the [routing runbook](customer-regional-routing.md).

Keep real Salesforce SMS services, queues and workers executing after redirecting the final provider transport to capture. Controlled SMS requires exact approved senders/recipients, a bounded run and a durable send limit. PR #240 tested website and Salesforce SMS as separate paths. The routing release moves partner delivery to Salesforce. WebDev defaults to capture. The approved live exception is limited to four exact pending regional queue rows for up to 30 minutes, from Beth and Stephanie to Tech at `+17194153014`. Use `tech@veteranpcs.com` for synthetic email and restore capture after the window. Verify the same regional lines through a bounded Production queue check to Tech after cutover. Verify provider receipts and handset arrival. The deferred Redis purchase is outside both checks. [Routing delivery procedure](customer-regional-routing.md#required-gates-and-release-sequence)

The Salesforce worker evidence is in ignored `salesforce/retrieved-private/sms-live-capture-20261125/completed.json`. The operator added two marked queue rows, observed one capture, one blocked override, zero provider receipts and no worker errors, then verified revocation of the temporary operator permission. The capture marker returned to its baseline in deployment `0Afjg0000004emrCAA`. Live provider timing and the dedicated handset remain separate checks.

Use the protected workflow Preview and dedicated credentials for any sandbox callback. The Salesforce callback runs only during an authorized canary window. Native run 02 verified one HTTP `200` after the Area Assignment save and one matching Preview revalidation for its Account. The operator restored capture and removed temporary access after the canary. Use a separately approved window for other callback scenarios.

Inventory each schedule's class or Flow, expression, execution user, timezone and next fire time. Use the [WebDev schedule restore script](../salesforce/scripts/restore-webdev-schedules.apex) after the live sandbox capture preflight and focused scheduler tests pass. All six jobs were restored and read back. The 21:45 portal capture and the 22:00 debounce are verified. The hourly sender capture is verified. The daily sender schedule and other timer scenarios remain pending. The [workflow matrix](salesforce-webdev-workflow-matrix.md#apex-reminders-and-sender-refresh) records the exact cadence and controls. Verify scheduled Flows separately using their actual timing.

## App access, mappings and fixtures

Create separate sandbox External Client Apps/integration users for ordinary-preview reads and local/workflow-test access. Grant exact object/field permissions used by the application; do not copy administrator access. Client credentials must use the sandbox My Domain and an explicit run-as user.

Run the [app access verifier](../salesforce/access/README.md#run-as-oauth-evidence) with each actual app and use `npm run verify:salesforce-target` for the active website environment. Both app sessions need `API Enabled` and successful reads of `Organization.Id` and `Organization.IsSandbox`. The seeded reports are under the ignored `webdev-app-access-evidence/` directory, `2026-11-25-preview-yjeyP7` and `2026-11-25-workflow-UhzSpC`.

Bind record types by object and developer name. Generate the sandbox Web-to-Lead form and map every custom field, including attribution. Resolve the regional roles to test identities. `config/salesforce/webdev.json` is the verified current manifest; every record type and owner was matched in the actual sandbox, and all 39 wire mappings were checked against Tooling API fields. The generated Web-to-Lead action is `https://test.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8&orgId=00Djg000000EK8Y`. The manifest requires all fields even if only one form is being tested; this prevents partial accidental fallback to production IDs.

The retrieved inventory includes Lead developer names `Agent`, `Customer`, `Intern`, and `Lender`, plus Opportunity `Customer`. Account includes separate `Agent` and `PersonAccountAgent` types alongside `Person_Account_Customer` and `Person_Account_Lender`. Verify Person Account fixture types and required fields before seeding. The website's agent, lender and customer role flags still govern directory queries. Keep the source inventory and IDs in the ignored baseline while building the verified app manifest.

The sandbox seed uses synthetic partner and customer Person Accounts, a Colorado Area, two area assignments and one Customer Opportunity. It reuses a verified sandbox regional owner. The completed write and reconciliation are under ignored `salesforce/retrieved-private/rendering-fixture-attempts/`. Re-run [the read-only reconciliation](../salesforce/fixtures/README.md#execute-and-reconcile-the-prepared-rendering-bundle) when rechecking those records.

The directory uses the committed neutral SVGs for the reconciled synthetic agent and lender IDs in `config/salesforce/webdev-fixtures.json`. The mapping applies only to the matching partner role in the verified WebDev org.

### Browser verification against the rendering seed

Keep sandbox website writes off. Verify the active target, then start a local WebDev production-mode artifact or a fresh, protected, read-only preview using the exact reviewed tree. The pinned Next.js 16.4.6 normal local build passed without a font override. Hosted checks verified genuine font assets; earlier fallback-font evidence is historical. [Local WebDev build notes](salesforce-webdev-build-notes.md)

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
2. The nine existing Salesforce variables and the remaining 11 shared variables are Production-only. The three removed Preview variables were for AI, Concierge and BotID. Verify these scopes on the fresh builds.
3. The Production profile, org ID, grant, Web-to-Lead URL and live delivery settings are in place for a future approved build.
4. Development and Preview have sandbox targets, verified mappings and separate app credentials. The workflow-test branch is published and its OAuth pair is saved. Keep write gates off until hosted protection and containment are verified.
5. Use the verified protection on the current workflow deployment. Recheck anonymous denial and authorized access on each replacement before enabling its write flag.
6. Keep capture mode with the sandbox Redis database disconnected. The callback canary used a separate deployment, isolated credentials and a bounded window. Run 02 verified the native path and completed cleanup. The write-enabled Contact Agent canary verified persistence and owner routing. The welcome Flow trace, fixture closure, temporary settings removal, and final capture Preview checks are recorded in the ledger. Build fresh after environment changes because existing deployment snapshots retain their variables. `test.veteranpcs.com` now points to the protected workflow Preview, and all 29 original Previews are retired.
7. Pass real local and protected-preview tests, restore capture mode, and review the immutable patch. **Before merging to main**, verify automatic Production domain assignment is disabled or an equivalent enforced release gate is in place. A Git-triggered Production deployment must not activate ahead of staged validation. Then merge the approved website change to main.
8. Stage a **Production** build without domain assignment, validate nonmutating production routes, then promote that tested Production artifact. A sandbox Preview artifact is not a production release candidate.

### Git handoff

Preserve the existing dirty checkout and the private manifest of the 71 initial paths. The original working-tree patch failed at ten overlapping paths against clean `3a8875166e97`. The rebuilt clean candidate resolves those overlaps and retains the committed baseline's intake behavior. The maintenance modules remain on the separate `codex/november-maintenance-readiness` branch.

The reviewed clean patch was published at `bbf8e7b0fe89` on `codex/salesforce-workflow-test`. The branch later published `c8db80acdc933a7506f18f919ab1b6eb50f17c3c` for hosted browser verification and `bf5791396d1433af34abbfb5b76256fc9f850cf1` for initial callback validation. The native callback passed on `0512600bbae6cf155f33f03191896ea3fb85bab7`. The clean port carries the typed Salesforce token error needed by the recovery code. The original 71 paths stay in the dirty checkout.

## Required evidence and release gates

### PR #240: environment setup

This classification supersedes the earlier blanket hold for all legacy timers and live SMS. PR #240 changes the website's environment isolation and provisions a capture-only sandbox. It does not deploy Production Apex/Flows, change spam policy or regional routing, or implement new working hours. Unexecuted scenarios remain explicitly open; they are not implied passes.

| Environment requirement | Recorded evidence / remaining action |
|---|---|
| Destination isolation and authentication | Local branch/build matrix, fail-closed hosts/redirects/org identity, token recovery and scoped app access are tested. Local main stays webdev. Preview and Workflow app probes passed 13 and 19 checks. |
| Form and routing compatibility | All 39 sandbox wire mappings verified; all ten forms persisted and both contact owners read back. Production payload characterization and existing spam behavior remain in the regression suite. Hosted write-off and write-on canaries passed. |
| Rendering and regression | Normal local sandbox build/start passed; 1,352 Vitest tests and 1,062 mock pages passed on `221bc26`. Earlier mock browser and hosted 26-assertion evidence are in the ledger. Known visual/route defects stay in the baseline ledger. Rerun normal CI on each later head; rerun browser/native tests when the changed paths warrant them. |
| Sandbox containment and callbacks | Native worker capture/override block, welcome inbox canary, portal reminder/debounce, hourly sender refresh and native protected callback verified. Changed sandbox components have deployment/test/coverage receipts. Final state is capture, writes off, temporary access removed. |
| Credential scopes and Preview protection | Production-only integration scopes and separate sandbox app credentials verified; legacy Previews retired and protected test alias replaced. Confirm these settings have not drifted at release preflight without exposing secret values. |
| Exact patch review | Review the final diff and recorded evidence, including resolved review findings, and confirm green CI/Vercel checks on the exact current head. PR remains draft until release review is complete. |
| Production activation hold — still required before merge | November 25 readback found `autoAssignCustomDomains: true` with Production branch `main`. Disable Auto-assign Custom Production Domains and verify readback, or establish an equivalent enforced hold covering Git-triggered deployments. A one-off CLI `--skip-domain` does not stop the separate Git-triggered deployment from activating. No branch protection rules were applied at this readback; green checks alone do not enforce the release sequence. |

After those pre-merge actions, merge the reviewed website change. **After merge, before public promotion**, verify the resulting main revision has a fresh staged Vercel Production build using Production-scoped variables. Check OAuth and `Organization.Id`/`IsSandbox=false`, read-only state/directory/detail/image/impact/blog routes, and nonwriting lead destination/payload configuration. Check callback rejection without triggering a real revalidation or submitting a Production lead. Confirm domain assignment is still held, then promote that exact tested Production artifact. Record deployment ID, commit, smoke results and rollback target. [Vercel staging and promotion](https://vercel.com/docs/deployments/promoting-a-deployment)

The initial website switch has no Salesforce metadata deployment step. Sandbox containment overlays, test credentials and synthetic records must stay in webdev. Local `main` remains sandbox after the merge; only the Vercel Production build uses Production Salesforce.

### Later behavior changes and optional delivery capability

| Later scope | Required tests when that scope changes |
|---|---|
| Spam enforcement | Honeypot wiring across every entry point, valid-lead negatives, exact/normalized email policy and aliases, review/reject outcomes, and proof rejected leads produce no downstream records, email, SMS or alerts. Preserve submission reconciliation and avoid blind retries. |
| Beth/regional routing and SMS ownership | Resolve sender versus recipient and regional owner data; verify each affected region, fallback/missing-number cases, website versus Salesforce send paths, message attribution and duplicate prevention. A phone-number edit alone is not sufficient evidence. Controlled delivery needs provider and actual recipient receipts when the provider path is in scope. |
| Working hours and urgent countdown | Pacific 09:00–17:00 boundaries, after-hours enqueue, next opening, DST, the explicitly chosen weekend/holiday policy, cancellation/rejection before dispatch, duplicate prevention, and countdown start at actual release. Exercise native schedules and capture scheduled/actual times for affected email, SMS and portal alerts. |
| Routing SMS delivery | WebDev defaults to capture. The approved exception permits at most four exact pending rows for up to 30 minutes from the two verified lines to Tech. Verify the provider and handset evidence, restore capture, and run the bounded Production check after cutover. |
| Legacy daily/multi-day workflows | The [workflow matrix](salesforce-webdev-workflow-matrix.md) remains a baseline characterization backlog. Run affected cases and dependency regressions for later changes; all 5–28 day paths are not blanket PR #240 merge gates. Native timer evidence remains necessary when certifying those schedules. |
| Production Salesforce metadata release | Separate scoped manifest, sandbox tests and coverage for changed Apex/Flow dependencies, required Production validation tests, explicit target, deployment and post-release verification. Website Git merge does not perform this promotion. No direct Production Apex edits. |

The user selected regional routing as the next complete release after environment isolation. Spam enforcement and working-hours/countdown changes follow separately. Research and isolated tests may run in parallel; shared-org deployments and fixture runs stay serialized. Each release needs its own bounded rollback and pending-job reconciliation.

Maintain the baseline defect ledger with observed behavior, expected behavior and evidence. A pre-existing failure is neither silently fixed nor counted as a passing workflow. Another developer should follow the setup guide to verify identity, submit an authorized synthetic lead and trace its isolated workflow; do not claim an independent fresh-workstation onboarding test has happened unless recorded.

## Code and operational change record

[PR #240](https://github.com/VeteranPCS/vpcs-nextjs-website/pull/240) and its commits are the exact code record. This runbook records cloud changes, tests and deployment IDs; raw sensitive receipts stay ignored. `221bc26` contains the development handoff following runtime `0512600`; later documentation changes refine release scope without claiming new runtime evidence.

| Area | Maintained source / evidence |
|---|---|
| Org identity, destinations, mappings | `lib/salesforce/environment.mjs`, `server-config.ts`, `config/salesforce/`; environment matrix tests under `lib/salesforce/__tests__/` |
| OAuth, REST and form serialization | `services/salesForceTokenService.tsx`, `api.tsx`, `salesforceLeadParams.ts`, `salesForcePostFormsService.tsx`; compatibility and recovery tests under `services/__tests__/`. Website owner transfer is retired by the routing release; the pure submission marker is `lib/leads/submission-marker.ts`. |
| Website delivery and test intake | `lib/leads/notification-delivery.ts`, `lib/salesforce/webdev-intake.ts`, notification actions and their tests; website and native Salesforce receipts are separate |
| Launchers, offline builds, scripts and CI | `scripts/next-with-salesforce.mjs`, `scripts/lib/next-environment.mjs`, `scripts/lib/salesforce-sandbox.mjs`, `scripts/verify-salesforce-target.mjs`, `scripts/verify-salesforce-sandbox-leads.mjs`, `.github/workflows/ci.yml`; [hosted build fixes](salesforce-webdev-build-notes.md) |
| Sandbox metadata, permissions, fixtures and capture | `salesforce/README.md`, `salesforce/access/`, `salesforce/fixtures/`, `salesforce/outbound-capture/`, `salesforce/scripts/`; scoped deployment receipts and coverage in this ledger |
| Daily development and release procedure | `CLAUDE.md` is the operational source of truth; [vpcs-salesforce-dev](../.claude/skills/vpcs-salesforce-dev/SKILL.md) routes local → Preview → staged Production; [vpcs-verify](../.claude/skills/vpcs-verify/SKILL.md) covers rendered/form verification. Both are discoverable through `.agents/skills/` symlinks. |

## Rollback and refresh

Rollback restores the previous compatible website artifact. Never restore production credentials into local development. Disable new sandbox writes, preserve the attempt ledger and reconcile pending jobs; rollback cannot retract delivered messages or undo created records.

After sandbox refresh: invalidate isolation attestation, stop writes, re-verify org ID/domain/CLI alias, rotate sandbox-specific access as needed, regenerate field/record/owner mappings, review and rebind exact org/actor IDs in sandbox-only capture and owner guards plus deployment/schedule scripts if identity changed, reapply transport containment, inspect scheduled Flows, recreate approved Apex schedules, seed fresh synthetic fixtures, and repeat the applicable environment acceptance gates before enabling tests. Re-certify affected native schedules; the workflow matrix records remaining baseline scenarios. Replace the directory fixture manifest with the refreshed org ID and the reconciled synthetic partner IDs. Do not reuse old pending queues or a previous test-run marker.

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
