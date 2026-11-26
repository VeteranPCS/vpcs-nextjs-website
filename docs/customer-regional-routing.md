# Customer regional routing

Implementation ledger, November 26, 2026. **Production routing cutover and open-work migration are pending.** The earlier PR #240 website environment release is live. This release coordinates website promotion with Salesforce deployment. [Environment release evidence](salesforce-webdev-environment.md)

## Policy and ownership

The reviewed source is [Admin Responsibilities by State](https://docs.google.com/spreadsheets/d/1epLoEN9CIF0zeTwfjXCM11nvFCcLn4oSBMnm03KUdXc/edit), `Sheet1!B4:B27` and `Sheet1!D4:D31`. The maintained policy is [`config/routing/customer-admins.json`](../config/routing/customer-admins.json). The website and generated Salesforce policy read this committed configuration; Google Sheets is not a runtime dependency.

| Admin | Jurisdictions | Verified Quo sender |
|---|---|---|
| Beth Soldner | AK AZ AR CA CO HI ID IA KS LA MN MO MT NE NV NM ND OK OR SD TX UT WA WY | +17192495359 |
| Stephanie Guree | AL CT DE DC FL GA IL IN KY ME MD MA MI MS NH NJ NY NC OH PA PR RI SC TN VT VA WV WI | +17192494757 |

The thirteen changed assignments are AR, LA, OK, TX and MN to Beth; AL, FL, GA, NC, SC, KY, MS and TN to Stephanie. Unknown destinations go to Stephanie with a triage task. Normalize “Deleware” to Delaware. Destination means `Destination_State__c`; do not reinterpret legacy location fields.

Org-specific users, email recipients, portal URLs and provider bindings are separate from territory policy. Jessica/Tara keys stay in environment manifests temporarily so existing validators remain compatible; no active customer territory selects them. The previously hardcoded 5065 sender belongs to Jessica. Harper's verified Tech/Primary recipient is +17194153014, not a fallback sender or partner.

Customer Leads and Opportunities are in scope. Partner Account ownership, onboarding, existing Person Account owners, converted Leads, closed Opportunity history and completed tasks are preserved. Spam admission, working hours, urgent countdowns and reminder cadence are separate releases.

## Runtime contracts

1. Intake validates and serializes the same Web-to-Lead fields, selected partner, attribution, spam marker and `sid`. It retains Slack, analytics and visitor success/error behavior. Website owner PATCHes and all website OpenPhone delivery paths are removed.
2. Salesforce resolves Customer ownership before downstream notification work. The active assignment rule is generated from the same policy so native Web-to-Lead cannot overwrite the regional result.
3. Initial partner notifications, portal reminders and status texts enter the existing `SMS_Message_Queue__c`. Each regional row relates to a Lead or Opportunity and its selected partner. Missing/invalid partners produce regional exceptions instead of fallback SMS.
4. Unique event keys identify record, partner and event. Portal keys include the existing attempt number. Status keys include the persisted `Routing_Status_Sequence__c` and daily cycle, so retries deduplicate while existing daily follow-ups remain daily. Re-enqueue never resets a settled or uncertain message.
5. A transaction persists the dispatch claim and job ID before a separate worker performs a provider callout. Dispatch checks current customer eligibility, partner, phone, state, sender and status sequence. Changes hold the message for review. An uncertain provider response is held, never blindly retried.
6. Regional exception tasks are reused by record and category. Missing bindings remain visible in Salesforce logs; they do not select another sender. A queue status is not proof of delivery: provider correlation and recipient arrival are separate evidence.

The existing suspected-spam marker in `Additional_Comments__c` suppresses referral SMS. No new spam scoring or admission policy is introduced. Ownership still follows the regional policy.

## Sandbox and package boundaries

Local and Preview use `webdev`, org `00Djg000000EK8YEAW`, with capture by default. Ordinary Preview writes remain off. The routing build has no website SMS transport or website Quo credentials. Salesforce controlled-delivery acceptance remains a separate gate. [Salesforce development skill](../.claude/skills/vpcs-salesforce-dev/SKILL.md) · [Environment runbook](salesforce-webdev-environment.md)

`vpcs-webdev` is the sandbox CLI alias. Production operator access uses a separately authorized alias, `vpcs-production-routing`, never a default org or local website credential. Read `Organization.Id, IsSandbox` before operating on either environment. Production org identity is `00D4x000003yaV2`.

Retrieve current metadata privately before preparing a release. Build the WebDev overlay from its actual capture-modified baseline. Build Production from the current Production baseline. Never promote WebDev capture adapters, recipient overlays, fixture records, credentials or sandbox portal URLs to Production. A merge to `main` only builds the website; it does not deploy Salesforce metadata.

The additive schema phase is recorded independently and activates no message-producing logic. The initial apparent missing-field failures were traced to API 67's new user-mode database defaults, not absent schema. Internal routing and queue operations explicitly declare system mode where native workflows need it. The migration requires its custom permission, exact org and expected-state guards. Do not downgrade the API version to hide permission failures. [Salesforce access-mode documentation](https://developer.salesforce.com/docs/platform/apex-dev/references/apex-dev/apex-classes-perms-enforcing.html)

## Existing open-work migration

The [routing operator CLI](../salesforce/routing-migration/salesforce-routing-operator.mjs) captures a read-only Salesforce snapshot, plans from that local snapshot, and runs explicitly attested apply or rollback against the reviewed manifest. Use the [offline planner and verifier](../salesforce/routing-migration/customer-routing-cli.mjs) for local plan and parity checks. Keep snapshots, manifests and receipts private and ignored. The report includes old/new owner, destination, current status, last modified timestamp, related incomplete referral tasks, pending messages and timer values. Never commit customer exports.

Eligibility uses the explicit open Lead statuses and terminal Opportunity stages in the policy. Account rows, converted/closed history and completed tasks are excluded. Only known referral task subjects and verified prior regional owners are eligible; unrecognized incomplete tasks are reported for review. Unknown destinations transfer to Stephanie and retain a triage reason.

The Apex adapter under `salesforce/routing-migration/apex/` requires an explicit org identity, manifest fingerprint, run ID, temporary migration permission and expected current state. It locks the parent and record, compares owner/last-modified/eligibility, updates ownership only, checks protected fields and observable effects, then writes a durable receipt in the same transaction. Concurrent changes become exceptions. Rollback requires the original receipt and the matching post-migration state.

Native Flow suppression and pending scheduled work are separate gates. Apex assertions cannot establish that a native timer survived. Rehearse owner changes with immediate notifications, pending portal reminders and relevant Opportunity scheduled paths. Compare original due times, reminder counts, related tasks and queue rows before/after. Stop on unexpected outreach, timer movement, duplicate tasks or business-field changes. The temporary operator permission must not remain assigned after the serialized migration window.

Pause affected dispatch during reconciliation. Legacy queue rows without record relationships cannot be assigned to a customer by this adapter. Reconcile each separately; retain provider IDs and terminal states, and never replay an uncertain send. Apply small resumable batches, reconcile each batch, then produce one administrative summary.

### Pause and resume regional SMS dispatch

In the verified target org, edit the two `Vpcs_Regional_Admin__mdt` records for Beth and Stephanie. Regional dispatch requires `Dispatch_Enabled__c` to be checked on both. Clear it on both for maintenance. Confirm the stored values in that org and wait for the active regional claim and dispatch jobs to finish before attesting that dispatch is paused. Reconcile remaining managed `Processing` rows. A callout already in flight can still complete.

New managed messages can accumulate during the pause, including portal reminders and scheduled status updates. Workers leave these rows in `New` without a claim. A worker that observes the pause after claiming a row holds it for review. Legacy and non-Customer dispatch continue under their existing controls and must be reconciled separately.

To reopen regional dispatch, check both flags and wake only managed `New` rows whose claim ID is blank. Use small batches and wait for each batch before selecting more. For a verified target org, the following Apex selects up to 200 eligible row IDs. The worker rechecks current eligibility before sending.

```apex
Set<Id> waiting = new Map<Id, SMS_Message_Queue__c>([
    SELECT Id FROM SMS_Message_Queue__c
    WHERE Event_Key__c != null AND Status__c = 'New' AND Claim_Job_Id__c = null
    WITH SYSTEM_MODE ORDER BY CreatedDate LIMIT 200
]).keySet();
if (!waiting.isEmpty()) {
    VpcsRegionalSmsWake.enqueue(waiting, false);
}
```

Leave held records in `Held` for reconciliation. Resuming dispatch does not replay them or reset their claim evidence.

## Required gates and release sequence

| Gate | Evidence required |
|---|---|
| Policy | All 52 jurisdictions, aliases, DC/PR, thirteen moves and unknown triage independently asserted; generated metadata matches source |
| Website | All ten forms remain compatible; agent/lender in both regions, selected/unselected partner, missing phone, deep links and concierge paths |
| Native assignment | Real Web-to-Lead owner, regional task/email and sender with website PATCH absent |
| Conversion | New/existing Person Account conversion, regional new Opportunity owner, existing Account owner preserved |
| Queue | Duplicate enqueue and concurrent claims; provider rejection/timeout; changed partner, phone, destination, sequence and missing configuration |
| Native timing | Affected reminder execution and pending scheduled work retain cadence and due times |
| Migration | Eligibility, manual mismatches, concurrency and rollback; no outreach, task duplication, business-field changes or timer resets |
| Regression | Lint, TypeScript, Vitest, isolated production-mode build/start, affected browser tests, Apex tests and deployment coverage |
| Delivery | Verify both regional lines through an approved WebDev queue exception to Tech at `+17194153014`, then repeat the bounded verification after the Production cutover gates. Correlate each queue row, provider receipt and handset arrival. |

Use `npm run verify:salesforce-sandbox-leads -- --routing` to preview the 11 routing rehearsal cases without Salesforce requests. The default mode retains the ten-form compatibility rehearsal. A separately authorized routing execution adds `--execute --email <approved test sink>` to the routing command. The guarded launcher reserves the run ID once for either mode. The routing run submits selected and unselected Agent and Lender forms for Colorado and Florida, then checks two Concierge submissions and one suspected-spam marker. Readback uses the WebDev workflow app's Lead access. An operator separately reconciles queue, exception-task and capture evidence. An unconfirmed submit stops the run after readback without retrying the POST.

WebDev capture is the default. The approved exception allows four selected website cases at most, with the two existing regional senders and the exact Tech recipient `+17194153014`. Use `tech@veteranpcs.com` for synthetic email. Run `npm run verify:salesforce-sandbox-leads -- --routing-delivery` to list the four cases. An explicitly authorized execution adds `--execute --email tech@veteranpcs.com` and uses the local WebDev workflow app. Website delivery stays in capture. The harness reserves a fresh run ID, verifies both Salesforce dispatch bindings are paused and reconciles each marked Lead to one unclaimed regional queue row.

A separate sandbox overlay may arm only those exact pending queue identities for up to 30 minutes. Before arming, reconcile the four receipts against the live queue and verify the recipient and expiry controls. Record queue and provider receipts and Tech handset arrival for the synthetic messages. Restore capture and close the fixtures when the window ends or an outcome is uncertain. A later, bounded Production verification uses the same existing regional lines and Tech recipient after cutover. The website Quo path and deferred Redis purchase are outside these checks. The approval establishes scope for testing. Delivery evidence belongs in the ledger after execution.

After sandbox and protected-Preview gates:

1. Freeze and review the exact website patch and scoped Salesforce package. Retain rollback artifacts and private pre-change ledger.
2. Validate Production metadata with required tests/coverage. Keep automatic Vercel Production domain assignment disabled; stage a fresh Production build from `main`.
3. Rehearse a platform boundary POST fence, including old deployment URLs and stale Server Actions. Pause intake for cutover and drain in-flight work. A new website-only flag is insufficient to fence old artifacts.
4. Deploy Salesforce, promote the verified Production website, set the Skew Protection threshold and verify old pinned clients cannot execute the retired website SMS/owner code. Keep obsolete endpoints protected, then reopen intake.
5. Apply/reconcile open-work migration under its scoped controls. Restore the existing schedules and dispatch state; verify both regional delivery paths and monitor mismatches, held/failed queue rows and duplicate keys.

On failure, keep intake paused and preserve delivery evidence. Roll back only to a compatible website with direct SMS disabled. Do not restore the former website sender while Salesforce sends. Reverse migrated owners only where the receipt still matches. A website rollback does not undo records or delivered messages.

## Evidence ledger

| Check | Result |
|---|---|
| Clean implementation baseline | `codex/customer-regional-routing` from `cee4a9275204c7be43392af0b013b4193f5cf4f0`; original dirty checkout preserved |
| PR #240 Production baseline | Main `cee4a9275204c7be43392af0b013b4193f5cf4f0` went live on `dpl_HuocbTbnicLJyqBrQkqLxrQ4AofC` with automatic domain assignment disabled. This was the environment release preceding routing; the later blog-only baseline is recorded below. |
| Local website OAuth | WebDev target verified; capture configuration and writes-off retained |
| Website focused checks | 173 tests after transport retirement; TypeScript/targeted ESLint passed; Agent 8 browser checks and Lender mobile/desktop dry-run checks passed |
| Full website unit suite | 1,351 tests across 134 files passed before Salesforce source integration |
| Fresh WebDev retrieval | `09Sjg000000C1zdEAC`, 138 metadata components |
| First code check-only | `0Afjg0000004jTBCAY`: compiled, 16 tests failed. Follow-up established API 67 user-mode access as the missing-field cause; not a pass or deployment |
| Additive schema validation | `0Afjg0000004jWPCAY`: passed existing queue regression tests |
| Additive schema deployment | `0Afjg0000004jY1CAI`: WebDev only, succeeded with zero component/test errors |
| Routing and migration sandbox validation | `0Afjg0000004hzHCAQ`: all 57 Apex tests passed, no component errors or coverage warnings. Managed worker 76.47%, legacy batch 90.43%, portal reminder batch 93.81%, migration adapter 85.45%. |
| Routing and migration sandbox deployment | `0Afjg0000004jrNCAQ`: WebDev only; all 57 tests passed again. Native Time-Based Automations retained all three fixture paths and their original due times after activation. |
| Dispatch-pause validation/deployment | `0Afjg0000004jwDCAQ` validation and `0Afjg0000004jzRCAQ` WebDev deployment: all 59 Apex tests passed, including migration rejection while dispatch is enabled; no coverage warnings. Native pause and resume were verified independently. |
| Native owner migration | Two marked Lead/Opportunity fixtures transferred, resumed as already applied, and rolled back. All three native Opportunity scheduled paths retained their original due times through both operations. Temporary migration permission was revoked. |
| Native conversion | New and existing Person Account paths created actual Customer Opportunities with CO/Beth ownership. New Person Account retained native Beth ownership; the existing synthetic Person Account retained its Tech owner. No linked SMS or provider receipts. |
| Routing forms, missing phone | Eleven real WebDev cases persisted with correct ownership, partner/attribution fields and existing spam behavior. The original synthetic partners had no usable phone; all ten nonspam selected, unselected and Concierge cases created regional exception tasks and no SMS. The spam-marked case created no SMS or task. |
| Native claim defect and correction | A subsequent selected-partner run exposed four successful worker jobs whose queue rows remained Processing: enqueue stored 15-character job IDs, while worker contexts used 18-character IDs. Corrected dispatch/finalizer/expiry comparisons use typed Salesforce IDs. The original four synthetic rows are held and never replayed. `0Afjg0000004kNdCAI` validation and `0Afjg0000004kPFCAY` WebDev deployment passed 27 affected tests with coverage. Fresh native send evidence remains required. |
| Independent bulk review and authorization | Review identified per-record status template queries, per-insert queue wakes and cumulative provider timeout risk. Automatic approval review initially rejected applying that broader correction. Harper subsequently explicitly authorized the queue correction and bounded WebDev/Production delivery checks. The earlier check-only `0Afjg0000004kQrCAI` failed its 200-record test with a queueable stack-depth error; that result remains failed evidence. The corrected implementation separates bulk enqueue from ten-message workers and independent scheduled pickup, and preserves existing assigned-Agent intake outside exact contact-form URLs. |
| Corrected queue validation and deployment | WebDev validation `0Afjg0000004plVCAQ` and scoped deployment `0Afjg0000004pqLCAQ` passed all 76 Apex tests with zero component/test errors and no coverage warnings. Selected coverage: regional worker 80.7%, wake 95.2%, recovery 89.7%. Earlier checks caught a batch-interface compile error and the Apex test runner's single-batch restriction; the 200-record producer test and bounded dispatcher tests are now separate. The native multi-scope capture and scheduled occupied-slot results are recorded below. |
| November 26 website regression | 1,354 tests across 134 files, TypeScript and lint passed on the integrated worktree. Lint reports the same two existing test-image warnings. The first mock build hit the local execution sandbox's port restriction; its authorized rerun passed. Six mock production-mode routes returned 200 and rendered headings; 36 phone/desktop Playwright checks and two additional selected-Lender dry runs passed with no skips. Both contact forms were visually inspected and local servers stopped. |
| Independent immutable review corrections | The frozen first patch received `revise`: mixed regional/legacy inserts could strand legacy New rows when an enqueue slot was unavailable, and status messages did not notice a changed next-contact date. Scheduled recovery now also wakes the existing guarded legacy dispatcher, and status rows persist an explicit next-contact snapshot checked at dispatch. Changed, cleared or absent snapshots are held for review. WebDev core v21 check-only `0Afjg0000004qBJCAY` and deployment `0Afjg0000004qEXCAY` each passed all 79 affected tests with zero errors or coverage warnings. A new immutable review remains required. |
| Controlled delivery adapter validation | Sandbox-only adapter validation `0Afjg0000004o4gCAA` passed 69 tests, including both approved senders through HTTP mocks, immutable one-use permits, durable queue reservations, recipient/expiry rejection and live-before-capture ordering. The adapter must be regenerated and validated against the deployed worker before activation; its restoration package must match that worker byte-for-byte. This is mocked provider evidence, not actual API acceptance or handset delivery. |
| Native portal reminders and daily status | At 15:45 UTC, the CO initial reminder advanced from 0 to 1 and the FL fourth reminder advanced from 3 to 4 and marked the Lead Urgent. The spam control stayed at 0. The independent 15:50 recovery schedule picked up both queued reminders. At 16:00, the FL Lead and CO Opportunity daily Flows each queued one status SMS. Next Contact and its queue snapshot advanced from November 26 to 27, with the Lead and Opportunity status sequences preserved. Final readback found exactly four Captured rows with correct regional senders and no provider message IDs. |
| Native bulk status queue | 51 distinct synthetic Leads produced 51 Captured status rows through one producer wake and six claims of 10, 10, 10, 10, 10, and 1. No provider receipts were recorded. The 51 marked Leads were closed as duplicates and their next-contact dates cleared. Capture evidence was retained. |
| Native mixed recovery with occupied enqueue slot | The regional and unlinked legacy queue rows both committed as New and unclaimed while the producer occupied its enqueue slot. The 16:05 independent schedule recovered both. Regional and legacy jobs completed, both rows were Captured with attempt count 1, neither stored a provider receipt or sent timestamp, and the aggregate capture count reached 57. No manual wake or retry was needed. Fixture check `0Afjg0000004qRRCAY` and deploy `0Afjg0000004qT3CAI` passed three Apex tests. |
| Controlled WebDev live SMS overlay | Check-only `0Afjg0000004qeLCAQ` passed 70 Apex tests with no coverage warnings. Both exact synthetic base values and the two-null service fixture case passed. Mixed and altered values were rejected. This overlay validation recorded no provider send or handset delivery. |
| Controlled native email delivery | On November 26 at 16:12 UTC, four distinct messages reached `tech@veteranpcs.com`: the CO regional exception, FL fourth-reminder escalation, FL Lead status request and CO Opportunity status request. Gmail headers/body and Salesforce log request `0IVjg00000000RR` correlated all four Message-IDs. The unfiltered 16:11–16:13 UTC outbound log contained 22 rows, no failure events and only Tech recipients plus documented Salesforce internal warmup hops. [Salesforce warmup log explanation](https://help.salesforce.com/s/articleView?id=004397549&language=en_US&type=1) Recipient containment covered all 53 reachable alerts and nine direct email actions. System email only was restored before 16:13 UTC. |
| Email test scope and restoration | An exact-one-Lead WebDev escalation overlay passed 23 tests in validation `0Afjg0000004qknCAA` and deployment `0Afjg0000004qsrCAA`; the exact baseline reminder class was restored by `0Afjg0000004quTCAQ` with 20 passing tests. The escalation used the native composer with a temporary Tech-only recipient; status email receipts used the exact active child Flows. Native reminder and daily schedule execution is independently recorded above. Five timed fixtures were closed with their four capture rows unchanged; a first cleanup rolled back on the existing required Opportunity loss reason, then passed with that required field supplied. |
| Native referral Task migration | One recognized incomplete Task transferred Stephanie → Beth with an unchanged correctly owned parent; resume returned already applied and rollback restored Stephanie. A separate stale-owner Lead transferred and rolled back while its nonregional Task stayed excluded and unchanged. Temporary migration permissions were revoked after each window. |
| Native pending-path observation | The first original Opportunity path, due `2026-11-26T03:52:48Z`, disappeared from Time-Based Automations between 03:53 and 03:56 UTC. The other two kept their original due times. Readback retained Tracking, the original owner/Account owner, next-contact date and timer anchor, with zero related Tasks/SMS. No execution trace was available, so this records dequeue and no-action evidence rather than a precise execution timestamp. |
| November 25 end-of-window containment | All 32 marked form-rehearsal Leads were closed as duplicates and next-contact dates cleared; records and evidence were retained. The two synthetic partner phone/email fields were restored to their original null values. Four uncertain rehearsal queue rows were held and were not replayed. Dispatch was paused with capture active at the end of that window. November 26 native rehearsals use separate marked fixtures and reserved fiction phones; capture remains the default. |
| Vercel version safeguard | Skew Protection was disabled; enabled and saved with its 12-hour maximum age and no cross-site domains. Automatic Production domain assignment remains disabled. The threshold for the eventual routing deployment and stale-client checks remain cutover gates. No routing website promotion or Salesforce Production deployment has occurred. |
| Updated main baseline | Worktree fast-forwarded over the independently merged blog-only PR #239 to `2cd1a2fcff6ab0a31b5e255ef7d14ec0437f5e3f`. This does not alter routing scope. Current live baseline is `dpl_GSgnCYN1T8gCoiDNgx8gBJaHdi4i`; automatic domain assignment remains disabled. |
| Protected Preview | Draft PR #241 commit `4a5bdff96ebe6ba9ad6f9f9374723b7a22b60252`, Preview `dpl_5M9LurHkL7XjhHspMnKMV6WDDZWt`, and CI run `45853238950`. The read-only browser run passed all 20 desktop and phone checks with zero failed or blocked transports and zero non-read or cross-origin requests. Anonymous access redirected to Vercel authentication. Selected Colorado Agent mobile and Florida Lender desktop forms were checked for readable, contained layout. |
| Preview intake fence | The Preview WAF rule denied POST to the current immutable deployment, the older immutable deployment, and an invalid Server Action. Authenticated GET still returned 200. Firewall metrics recorded three denies attributed to the exact rule. The rehearsal rule was disabled after verification and the existing bypass stayed in place. Production intake stayed available. |
| Full website regression | 1,351 tests/134 files, TypeScript, lint (two pre-existing warnings), mock build (1,062 pages), six production-mode route checks and 38 Playwright checks passed before the blog baseline advance. Ten telemetry cases were explicitly skipped; two additional mobile/desktop Lender dry runs passed. Final exact-head checks remain required. |
| Read-only rehearsal access | `0Afjg0000004jubCAA`: exactly five Lead read fields added to the WebDev workflow app; Preview unchanged. Both real app access verifiers passed afterwards. |
| Real ten-form compatibility | `routing-ten-20261125-01`: ten persisted Leads reconciled through website OAuth; contact owners match Beth for CO and Stephanie for FL with website PATCH absent. Outbound Slack captured; email restricted. |
| Production baseline/access | Separate operator connection verified `00D4x000003yaV2EAI`, `IsSandbox=false`. November 26 retrieval `09Sjf000000rM7GEAU` matched all 205 prior baseline files byte-for-byte, including the manifest. Local website OAuth independently reverified WebDev. No routing Production edits. |
| Private Production report | November 26 at 16:12 UTC: 231 open Customer Leads, 130 open Customer Opportunities and 84 incomplete related Tasks examined. Candidate writes remain 22 known-state transfers plus 80 blank-destination transfers to Stephanie, totaling 102. Another 89 blank-destination Leads already belong to Stephanie. The one newly eligible Lead is already Stephanie-owned. 74 Tasks have nonregional owners and six have unrecognized subjects; excluded for review. No legacy pending SMS at snapshot time; existing terminal queue rows were not replayed. This pre-schema report is not executable. |
| Remaining business gates | Controlled website-to-WebDev-to-Quo SMS with Tech handset receipt remains pending; the separate WebDev Quo credential still requires its secure user handoff. Production still needs final immutable review, metadata validation, intake-fence and stale-client checks, and actual cutover, migration, and approved delivery verification. The Salesforce and website routing changes have yet to be deployed to Production. |

Update this ledger with exact immutable heads, deployment/test IDs, coverage, native timestamps and delivery receipts as each gate finishes. Do not convert planned checks into passing evidence.
