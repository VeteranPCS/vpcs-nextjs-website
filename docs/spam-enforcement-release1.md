# Release 1 lead admission runbook

Status on November 26, 2026. The admission package and submission-ID uniqueness are deployed in
Salesforce WebDev. The ten live form controls, 11-case routing rehearsal, native claim and
notification arbitration, and 22 direct backstop cases reconciled. Both read-only Previews
were checked. WebDev retired the legacy exact-match rule after blocklist reconciliation. The
post-retirement set of 22 direct rejection controls also passed. The protected Preview passed
with dedicated OAuth. Production has the optional hash field and verified wire IDs. Dedicated
identity provisioning, Production activation and the website release remain open. The
[proposal](spam-enforcement-plan.md) covers the original
rationale and the separate Release 2 CAPTCHA work.

## What the release changes

All ten website form families use the same admission service. After validation and a bounded
rate check, it inspects an existing attempt and applies the current policy before partner enrichment
or dispatch. A filled honeypot or blocked identity is rejected. Invalid or fast timing and links
in configured free-text fields can require review. A rate or verification failure returns a
recoverable result before dispatch. The UI retains values for a recoverable result and reuses the
same opaque attempt ID across recoverable retries and reload. A definitive rejection or review
closes that reference, offers the existing VeteranPCS support address, and a corrected submission
uses a new attempt ID. After an uncertain submission, the form shows the original reference and
prevents a resend in that tab, including after reload.

For a new allowed attempt, Salesforce atomically claims the UUID with its normalized payload
fingerprint and rechecks the blocklist before dispatch. Only the claim holder can POST once. A
definitive rejection or review reserves the UUID as declined at the same boundary. If dispatch
was already claimed, reconcile the prior attempt to confirmed or unconfirmed instead. An existing
UUID with a conflicting payload remains unconfirmed and cannot be sent using that reference.
Website success, Slack and conversion telemetry require exact ID and payload readback, with an
additional atomic claim for the website notifications. A provider response, empty 2xx or redirect
cannot establish persistence. A lost claim or Web-to-Lead response can leave an unconfirmed result.
An unconfirmed POST may already have created a Lead and started native email or SMS. Investigate
by exact attempt and Lead reference. Keep the original attempt, and avoid automatic replay,
manual resend or duplicate website notifications. If the process stops after the notification claim,
use the exact Lead and attempt evidence to investigate a missed website notification.

The Salesforce before-save guard checks every new Lead and changes to an existing Lead’s email
against a private blocklist. Regression tests cover historical blanks, unrelated edits and conversion. The existing Salesforce honeypot rule stays active. Release 1 blocks known
identities and filled honeypots in direct Salesforce submissions. Other unauthenticated producers
can omit the honeypot or use a new identity. Mandatory native reCAPTCHA v2 and producer compatibility
belong to Release 2. Preserve the Concierge approval-history guard and keep working hours,
countdowns, routing and reminder cadence outside this release.

## Configuration

| Setting | Operating requirement |
|---|---|
| `VPCS_LEAD_BINDING_KEY` | Server-only, 32 random bytes encoded as exactly 64 lowercase hexadecimal characters. Provide distinct WebDev and Production values using the existing environment boundaries. Use the same value across eligible server deployments within a target so the same UUID and payload produce the same HMAC-SHA-256 fingerprint. Keep the values out of source, logs, command arguments exposed to others, and evidence. |
| Production lead rate limiter | The approved Production Upstash REST URL and write token use the canonical or Vercel integration variable names in [CLAUDE.md](../CLAUDE.md). Verify presence, target and access without printing values. |
| WebDev lead rate limiter | The approved Vercel Preview connection uses the generated `VPCS_WEBDEV_LEAD_REDIS_KV_REST_API_URL` and `VPCS_WEBDEV_LEAD_REDIS_KV_REST_API_TOKEN` pair. The connection is Preview-only with the approved $20 cap. Manual or local WebDev configuration uses `VPCS_WEBDEV_LEAD_REDIS_URL` and `VPCS_WEBDEV_LEAD_REDIS_TOKEN`. Hosted WebDev uses a dedicated HTTPS Upstash endpoint. Local WebDev can use the isolated loopback wrapper below. Mixed, partial or conflicting write pairs fail closed. Generated Redis protocol URLs and read-only tokens are ignored. Keep the backend and credentials separate from Production and the WebDev notification budget. Ordinary Preview continues with writes off. |
| `LEAD_SPAM_ENFORCED` | `0` holds new intake through a recoverable result. Unset or another value leaves admission enforced. Use the independent Vercel POST fence and producer coordination for cutover. |
| `config/salesforce/intake.json` | Verify both org-specific wire IDs for the Lead honeypot and submission HMAC field in the intended org. Both org mappings are verified. Production wire IDs are honeypot `00NRg00000BBSQr` and hash `00Njf000000GsNp`. |
| Dedicated intake OAuth | Set server-only `VPCS_SALESFORCE_INTAKE_CLIENT_ID`, `VPCS_SALESFORCE_INTAKE_CLIENT_SECRET` and `VPCS_SALESFORCE_INTAKE_USER_ID` (expected 15- or 18-character Salesforce `005` ID) for every environment that performs real intake. Production uses a different OAuth client from directory REST and a dedicated nonadmin run-as user. WebDev may reuse the restricted workflow app after explicitly setting all three variables. Client credentials are sent only to the selected org's My Domain. Verify the OAuth response's user and org and the exact Organization query. Missing or invalid settings fail closed with no directory fallback. Mock remains credential-free. |
| `VPCS_Intake_API` | Assign only to the verified website intake runtime principal in that org. The permission set grants class and custom permission access for policy, inspection, claim, reconciliation and notification. In Production, verify the actual intake token is denied direct CRM and private-object REST access and unrelated Apex endpoints. In WebDev, the restricted workflow app retains limited Lead readback for rehearsals. Verify protection of the blocklist and attempt objects and the Lead honeypot and submission-hash fields. Verify ordinary Preview is denied the intake API. |

Rate limiting permits five requests per ten minutes per applicable bucket. It uses the canonical
email, or a normalized phone for phone-only intake, and includes IP only from the verified platform
single-value `x-vercel-forwarded-for` header when available. There is no shared anonymous bucket. The website retains the original
contact address. Matching folds email case and whitespace and removes dots and plus suffixes for
consumer `gmail.com` only. Keep private SHA-256 blocklist identity keys distinct from the secret
HMAC used for binding an attempt to its actual business payload. Rate counters contain hashed
identity or IP keys. Missing backend or required policy yields retry guidance and zero dispatch
for that invocation.

The earlier proposal deferred a Redis purchase. The subsequent approval covers the dedicated
Preview-only Upstash connection under a $20 cap. Production and the WebDev notification
budget remain separate. The local isolated Redis workflow remains available.

Treat binding-key rotation as a separate coordinated change. A new key cannot reproduce a previous
fingerprint. Fence and drain intake, reconcile earlier attempts and notifications with the old key,
and verify any new key across all eligible deployment snapshots before reopening. Keep the old key
securely available for authorized recovery while outstanding records rely on it. Never rerun an old
attempt under a new key to resolve an ambiguous outcome.

Local only, with an isolated real Redis backend on a random loopback port:

```sh
node scripts/with-isolated-lead-redis.mjs dev
node scripts/with-isolated-lead-redis.mjs rehearsal
```

Rehearsal defaults to no writes. Add `--execute` only for a separately authorized marked WebDev run
after verifying the website OAuth principal, org identity, capture and fixture limits. See the
[WebDev environment runbook](salesforce-webdev-environment.md). Credential-free local mock checks
exercise the form and admission path with side effects suppressed. Opt-in browser PostHog SDK checks
need a separate fixture because the current mock deployment profile disables initialization.
Client conversion and privacy behavior is covered by the instrumented component tests.

For the bounded `--routing --execute` rehearsal, pass two approved clean sinks with repeated
`--email` flags and a distinct reserved honeypot sink with `--negative-email`. The ten clean
controls use five submissions per clean address. The reserved address is used only for the
honeypot case. Verify all three exact addresses against the approved WebDev capture allowlist
before executing. Keep the negative case on its own identity so it can exercise honeypot
admission within the limiter budget. The direct Web-to-Lead backstop uses its own harness and
fixture controls.

## Website function budget

The `(site)` layout sets a 60-second function budget for site pages because shared lead forms post
their Server Actions from the hosting page. This covers dispatch, bounded Salesforce readback and
the post-confirmation work within the same request. The application keeps its separate upstream
deadlines. API handlers outside the site layout keep their existing function configuration.
After building, cross-check the lead action workers in `server-reference-manifest.json` against
`functions-config-manifest.json`. Verify the applied budget for the exact hosted candidate before
opening the protected verification window or promoting Production.

## Org and website release gates

1. **WebDev first.** Use the reviewed [Salesforce intake package](../salesforce/spam-intake/README.md).
   Keep capture and ordinary website writes off. Explicitly bind the restricted workflow app for
   intake. Verify the actual token identity and permitted intake operations. Verify denial for the
   blocklist and attempt objects, the Lead honeypot and submission-hash fields, and ordinary
   Preview intake. Audit active and soft-deleted Leads for nonblank IDs,
   including case-folded equivalents. Use the separate field-only uniqueness package from a fresh org
   retrieval. Validate with existing affected tests, deploy the field alone under the producer hold,
   and wait for index finalization. Verify live uniqueness and run the unchanged index regression
   afterward. Check-only cannot prove a post-commit index. Require duplicate and case-variant
   rejection plus multiple permitted historical blank IDs before reopening. Record metadata
   deployment and live behavior separately.
2. **Reconcile policy per org.** Privately export the existing exact rule inventory, canonicalize
   its entries, reconcile all ten original entries to active blocklist rows and account for
   canonical collisions. Verify manual insert, import and API paths, unrelated historical edits,
   and conversion. Leave the legacy rule active while an entry is missing. Retire only
   `Block_Predatory_Email` through a separately reviewed rule-only package built from that org’s
   fresh baseline. Keep the original rule and any private migration output outside source control.
3. **Prove WebDev behavior.** Run both Apex test classes and relevant native workflow regressions.
   Exercise independent HTTP sessions against the same UUID with matching and conflicting bodies
   race a policy decline against a same-attempt dispatch, and race two notification claims. Test direct Web-to-Lead blocked and filled-honeypot cases
   across real sources and record types. Run ten approved positive website controls and check the
   exact persisted records. Include CO/Beth and FL/Stephanie selected paths, unselected routing,
   reminders, escalation, statuses, email and SMS containment. Use native schedule/Flow evidence for
   timing assertions. Capture is the default delivery evidence. Record provider acceptance and
   confirmed recipient arrival separately for any authorized real-delivery check.
4. **Stage the website.** Prove access denial for anonymous clients and the ordinary Preview
   principal. Run the protected WebDev Preview with expiring access, approved recipients and
   capture. Reconcile persistence and notifications. Restore capture, disable test writes, revoke
   temporary grants and replace or retire the write-enabled artifact after the run.
5. **Production preparation.** Confirm the target org separately, refresh its private baseline,
   verify required egress and configure a dedicated nonadmin intake OAuth identity. Confirm the token
   belongs to that user, prove permitted operations and verify denial of direct CRM access.
   Keep the existing directory REST credentials on their existing path. Validate the
   reviewed Salesforce admission, field uniqueness and rule-only packages with the required
   tests and coverage. Keep automatic Vercel Production domain assignment disabled. The immutable
   Production website candidate needs verified wire IDs from deployed fields. If the hash field
   must first be created, coordinate its additive deployment and verify its wire ID before
   building the candidate. Keep any early metadata change separately reviewed and compatible
   with live intake. Do not activate the new policy early.
6. **Production cutover.** Hold and drain website intake using the
   [routing cutover procedure](customer-regional-routing.md#required-gates-and-release-sequence).
   Separately coordinate and drain non-website producers before global Salesforce policy changes.
   Recheck the uniqueness audit under the drain. Deploy only the validated Salesforce packages and
   reconcile policy and mappings before retiring the old rule. Build the candidate from `main`
   with the verified mappings and Production-scoped settings if it could not be staged in advance.
   Verify the immutable candidate with nonmutating checks.
   Promote the exact tested website candidate. Verify old hosts and pinned Server Actions are
   contained and restore the approved Skew Protection window before reopening intake. Exercise only
   the separately authorized Production positive and negative canaries with approved recipient
   controls. Reconcile Lead, website telemetry and Salesforce native side effects before ending
   the verification window. Close test records, restore capture/test controls and revoke
   temporary access.

## Rollback and evidence

Keep intake fenced if the website and org packages are incompatible or if claim, reconciliation,
policy or rate checks fail. Roll back only to a tested website and compatible metadata that retain
admission, UUID and approved wire mappings. The pre-release website did not send the honeypot to
Salesforce. Preserve the unique-ID and attempt evidence and coordinate any rule rollback against
the verified private inventory. Reconcile unseen outcomes before deciding what to restore.
There is no automatic claim expiry or replay.

This first admission release has no earlier Production artifact with the new contract. If its
candidate fails, keep the platform intake fence in place while preparing a compatible correction.
Restoring the previous website for read-only availability does not authorize reopening its older
submission actions. Retain the blocklist, finalized unique index and attempt evidence; do not
remove those safeguards to make an older artifact accept forms.

| Gate | Result recorded through November 26, 2026 |
|---|---|
| Local Vitest | The latest local suite passed 1,681 tests and skipped four by default. The four isolated Redis opt-in tests passed separately. |
| Isolated real Redis | Four opt-in tests passed. This confirms local Redis behavior. Hosted backend verification is separate. |
| Mock build, startup and function budget | The standard credential-free Turbopack build passed after moving the cached artifact from the earlier port failure. The mock network block remained in effect. Six mock-start HTTP route checks returned 200. Local manifests showed a 60-second budget for 23 lead action hosts across 33 site pages and matched the baseline outside that scope. The exact protected hosted candidate `dpl_4k3wNGp73hyK7wSMEM9o5Dz39MpH` confirmed a 60-second function budget. |
| Pull request checks | PR #244 CI, Semgrep and Vercel checks passed at exact revision `e60e941f3da6f0c2dbec9040a162171f9bd20b04`. The mock startup smoke returned HTTP 200 on six routes. |
| Browser | 42 isolated mock cases passed at 360px and 1440px. After the atomic decline update, 22 affected cases passed again, including fresh IDs after correction on both listing forms and an unconfirmed guide lock after reload. |
| Immutable v3 review | SHA-256 `12e481452f4644de8ec986ecc6006b1a68a530a7e97e6ae1ea533859cd37561b`. The 105-file patch applied cleanly to the reviewed base. The source review found that v3 addressed the prior findings and recommended holding for hosted, native notification and Production evidence. |
| WebDev admission package | Initial deployment `0Afjg0000004vNtCAI` passed eight Apex tests, with admission trigger and class coverage at 100% and intake API coverage at 92%. Atomic decline deployment `0Afjg0000004vXZCAY` passed nine of nine Apex tests. The revised intake API covered 114 of 124 lines. |
| WebDev Lead uniqueness | Field-only deployment `0Afjg0000004vPVCAY` enabled case-insensitive submission-ID uniqueness. The separate index regression passed in `0Afjg0000004vR7CAI`. |
| WebDev affected Apex | All 63 affected Apex tests passed in run `707jg000000aItT`. |
| Live WebDev website | All ten real synthetic form controls passed in 22.48 seconds. Each matched a persisted Lead with its submission hash and capture evidence. All ten synthetic Leads were closed afterward. With dedicated OAuth, run `spam-r1-dedicated-forms-20261126-02` started at 00:12:49 UTC and passed all ten controls in 21.58 seconds. Each matched an exact persisted Lead and a Slack capture. Native log `07Ljg0000005VT1EAM` at 00:18 UTC matched the two eligible Customer Leads by exact Lead and attempt IDs with completed welcome actions and zero logged errors. All ten Leads were closed and their two Tasks completed. An earlier invocation stopped before OAuth or submission because local `LEAD_DRY_RUN` was set to `1`. The successful run used an explicit runtime value of `0` and a fresh run ID. |
| WebDev blocklist and legacy rule retirement | All ten legacy entries and one synthetic control matched active blocklist rows. Rule-only validation `0Afjg0000004vanCAA` and deployment `0Afjg0000004uoQCAQ` each passed nine of nine Apex tests. Tooling readback confirmed `Block_Predatory_Email` inactive and the existing honeypot rule active. |
| Direct WebDev backstop | Both sets of 22 cases, before and after legacy-rule retirement, completed. No matching Lead persisted and no native SMS or reminder-email capture appeared over either bounded observation window. With no matching Lead, absence of linked work is an inference. The backstop harness did not directly inspect queue records. Capture returned to its baseline label after the second run. |
| Native claim and notification arbitration | The second WebDev concurrency run passed against the updated intake API. A separate native check confirmed the exact persisted Lead and one notification claim winner. In four additional native allow-versus-decline races, claim won three and decline won one. Each UUID had exactly one durable row and the race harness sent zero Web-to-Lead POSTs. Dedicated WebDev OAuth passed the native claim checks and four denial probes covering the blocklist object, attempt object, Lead honeypot field and Lead submission-hash field. |
| Native routing and capture | The 11-case WebDev rehearsal passed with ten persisted controls and one honeypot rejection. Four SMS captures and six expected Tasks reconciled. Ten welcome email paths were scheduled for 22:27 UTC. The two older welcome entries were unchanged. This run verified scheduling and capture. Actual email delivery was not verified. |
| Read-only Preview | Ordinary `dpl_Ddh6L7FqrwfcUtbp5y8eZtreUrFc` and workflow `dpl_6Z8v39af1U6hFrVdV8Z7giKe387c` at `0477329` each returned three anonymous Vercel SSO redirects and produced 22 authenticated render receipts across 360px and 1440px. Both rendered all ten form families and the alternate VA question form. Workflow used existing CLI automation access after Development OIDC received 403. The Contact form fit both viewports. The existing reviews carousel caused a separate intermittent document overflow. No Server Action was sent during that render check. Exact-head replacements at `e60e941` are workflow `dpl_5r41tunSXCTWuJrvMiYtdwvDKwj5` (`l0k0l55aw`) and ordinary `dpl_697ns1hz98HceUx6zzk7TDyZyQme` (`9iizh7vj1`). The two hosts and protected `test.veteranpcs.com` workflow alias each returned anonymous SSO redirect 302, authenticated GET 200 and authenticated inert POST 403. Writes were off and capture was active. |
| Protected Preview writes | Batch 02 passed on `c01fde3` candidate `dpl_CRYcDrhmNQ48KzhbEstVHFKpkwxp`. The browser recorded two accepted controls, three rejections and one rate retry. Dedicated-auth window 03, batch `b02`, passed on `f013726` candidate `dpl_7RHypyipUaYSarWnxu9h4Yi7Tbmj` with two accepted, three rejected and one bounded rate result. Independent reconciliation found two Confirmed and three Declined attempts and no attempt for the rate result. Two INITIAL SMS rows were captured for the correct regional paths to Tech, with null provider IDs and zero Tasks. Both accepted Leads completed the native welcome in log `07Ljg0000005VrBEAU` at 00:35:45 UTC, each correlated by exact Lead and attempt IDs with zero logged errors. Both Leads were closed afterward. Their two captured SMS receipts were preserved. The dedicated Redis connection remains scoped to Preview under the approved $20 cap. |
| Production | The optional hash field and its wire mapping are verified. Admission, policy and uniqueness activation remain pending, along with the dedicated identity, grants, credentials, website promotion and live verification. The approved API-only intake identity and app are provisioned. Actual OAuth and the mandatory Organization query now verify the exact Production org, user and sandbox flag after the separately approved setup-read grant. Direct Lead, Account, Contact and Opportunity reads are denied. Final private-object and scoped intake API checks remain pending until the coordinated metadata activation. Elements is not an intake dependency; the earlier speculative profile-exclusion prerequisite was removed after native WebDev comparator evidence and the user’s explicit reassessment direction. |

### Follow-up verification

- Native welcome log `07Ljg0000005TxSEAU` started at 22:27:45 UTC. All ten exact Lead and submission references matched separate completed interviews, each with one `SE_Welcome_Video` action and no logged Flow errors. Email remained System email only; this is execution evidence, not mailbox receipt. The ten synthetic routing Leads were subsequently closed with expected-state guards and their six routing tasks completed. Captured SMS receipts were preserved.
- Production check-only validation `0Afjf0000003mL3CAI` passed 66 tests with zero component errors, test failures or coverage warnings. Intake API coverage was 114 of 124 lines (91.94%), admission class coverage was 43 of 43, and trigger coverage was one of one. It applied no metadata or record changes. The fresh uniqueness audit found 892 nonblank IDs, 464 soft-deleted Leads and zero case-folded duplicate groups. Repeat the audit under the intake hold. Admission deployment, policy seed/reconciliation, uniqueness activation and website cutover remain pending.
- Combined index/test validation `0Afjf0000003mT7CAI` failed its unchanged `isUnique()` assertion, with zero metadata component errors. This is consistent with Salesforce's documented post-commit index creation. The release now follows the already-passed WebDev sequence: validate/deploy the field alone with adjacent regressions, wait for terminal success and verify the live index, then run the unchanged duplicate/blank-history regression while intake stays held. The failed validation applied no Production changes. [Salesforce deployment lifecycle](https://developer.salesforce.com/blogs/2025/09/take-a-deep-dive-into-metadata-api-deployments)
- The separate field-only Production check-only validation `0Afjf0000003mUjCAI` passed all 57 tests across the 12 affected existing classes, with zero test or component errors. Live index finalization and the subsequent unchanged native uniqueness regression remain cutover gates.
- Rule-only Production check-only validation `0Afjf0000003mZZCAY` also passed those 57 tests with zero component errors. It left the Production rule active. All ten Production blocklist entries must be seeded and reconciled before any actual retirement.
- The first protected Preview browser control stopped on an unconfirmed UI result. The original alternate-host firewall rule denied the POST before it reached the application. There was no matching Salesforce Lead or durable attempt. Preserve that reference without resending. The later batch 02 controls used a fresh candidate. After batch 02, the firewall was restored, an inert POST returned 403, and six temporary branch variables were removed. The two accepted Leads were closed after their two native welcome actions, recorded in log `07Ljg0000005VCrEAM` at 00:06 UTC. The log establishes execution. In dedicated-auth window 03, batch `b01` stopped before HTTP when the rate-bucket time was too short. It produced zero matching Leads or attempts, and its UUIDs were not reused. After batch `b02`, the published firewall restoration was verified with 403 responses on both checked paths, and six temporary branch variables were removed. The two synthetic partners’ original empty contact fields were restored, pending SMS was zero, and capture remained `Capture` / `baseline-capture`. The temporary WebDev policy-operator grant was revoked and its trace expired. The fresh writes-disabled Preview replacements passed the three-host access checks recorded above.
- Production additive hash deployment `0Afjf0000003n4DCAQ` succeeded with one component and zero errors after the exact 57-test check-only validation `0Afjf0000003mmTCAQ`. Independent readback confirmed Production org `00D4x000003yaV2EAI` with `IsSandbox=false`, nullable Text(64), no default, no index and no field-level access changes. The existing honeypot and the new hash wire ID were read back before verifying the Production mapping.
- Production intake app preparation is limited to an API-only external client app header and empty allowlist. Deployment `0Afjf0000003nqbCAA` succeeded after validation `0Afjf0000003nozCAA` passed ten of ten tests. The disabled app has the client-credentials plugin configured and has no run-as user, runtime grants or usable intake credentials. REST access to consumer secrets remains disabled; no org-wide secret API setting was changed. The sensitive Production-only HMAC variable was provisioned in Vercel. The temporary Elements inspection grant was revoked and its absence verified after the account-access blocker was identified. Provisioning settings require an Elements sign-in and the inspected account could not access them. Policy validation `0Afjf0000003ntpCAA` passed ten of ten tests and deployment `0Afjf0000003nvRCAQ` succeeded with one component. The app is disabled and requires admin-preauthorized membership; the allowlist is empty and no run-as user is set. The live site and routing remain on their existing baseline.

- November 27 identity setup: one approved Integration user (`005jf000000NfGzAAK`) was created on the minimum API-only profile using native user-email suppression. Readback showed no extra permission sets, package licenses, Elements identity, or unexpected Elements job. App-policy validation `0Afjf0000003rFtCAI` passed ten tests; deployment `0Afjf0000003rHVCAY` succeeded with one component. The dedicated app is enabled, admin-preauthorized to only that user, and has a 60-minute session policy. Its three credentials/identity variables are sensitive and scoped exclusively to Vercel Production; none was written to local dotenv or evidence. Actual OAuth returned the expected org/user and My Domain. The subsequent Organization query returned `INVALID_TYPE`, so the website connection is not yet verified or released. The runtime API grant remains unassigned. Existing directory/DocuSign connections and the public website remain unchanged.
- Elements reassessment: the same managed package and protected User trigger exist in WebDev, where two API-only integration users were successfully created and authenticated without Elements identities or package grants. This supports the bounded creation/readback procedure; it does not prove identical external settings or historical absence of callouts. No Elements connection or provisioning setting was changed. Preserve the administrator access Harper added himself; the earlier operator-created temporary inspection grant was separately revoked.

- The isolated org-access diagnostic deployed to WebDev as `0Afjg00000050aUCAQ` and passed its three rollback-only user cases; a synchronous rerun also passed. License-only and roles-only access could not query Organization. The setup/roles pair allowed the exact query while denying direct read/create/update/delete for Lead, Account, Contact, Opportunity and the two private intake objects. Log `07Ljg0000005lMTEAY` records the roles-only comparison; its temporary trace was removed. The one-permission-set Production package validated as `0Afjf0000003rKjCAI` with ten passing tests and zero errors. Harper approved assignment only to the dedicated intake user. Production deployment `0Afjf0000003rMLCAY` succeeded; the included API license and `VPCS_Intake_Org_Identity` were assigned to that user. A fresh real OAuth session passed the exact Organization query and denied fixed no-row Lead, Account, Contact and Opportunity queries. Salesforce’s expected profile-owned permission row was separately reconciled, rather than treated as an extra grant. [Reproducible package and test](../salesforce/spam-intake/identity-access/README.md)

- Final pre-cutover retrieval `09Sjf000000tdtZEAQ` matched all 84 scoped baseline files byte for byte. Exact-head CI, Semgrep and Vercel checks passed for `c7b285967962b7f224ac7af702f2d3ef2546a090`. The immutable review found no new source defect and retained the remaining operational gates. Automatic Production domain assignment remains disabled; the live routing deployment and 12-hour Skew Protection setting remain unchanged. The outstanding producer-coordination question must be resolved before starting the intake pause.
