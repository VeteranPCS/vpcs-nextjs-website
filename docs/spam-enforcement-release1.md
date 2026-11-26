# Release 1 lead admission runbook

Status on November 26, 2026. The admission package and submission-ID uniqueness are deployed in
Salesforce WebDev. The ten live form controls, 11-case routing rehearsal, native claim and
notification arbitration, and 22 direct backstop cases reconciled. Both read-only Previews
were checked. Protected Preview writes, actual email delivery for this run, and Production
gates remain open. The [proposal](spam-enforcement-plan.md) covers the original
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
| `config/salesforce/intake.json` | Verify both org-specific wire IDs for the Lead honeypot and submission HMAC field in the intended org. WebDev entries are verified. The Production entry stays unverified until its metadata and field IDs are ready. |
| `VPCS_Intake_API` | Assign only to the verified website intake runtime principal in that org. The permission set grants class and custom permission access. Verify it cannot query broad Lead, blocklist or attempt records. Verify ordinary Preview is denied the admission API. |

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
   Keep capture and ordinary website writes off. Assign the restricted website permission and verify
   positive and denied API access separately. Audit active and soft-deleted Leads for nonblank IDs,
   including case-folded equivalents. Use the separate field-only uniqueness package from a fresh org
   retrieval. Verify a duplicate insert fails and multiple historical blank IDs remain allowed. Record metadata deployment and live behavior separately.
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
   timing assertions. Distinguish capture, provider acceptance and confirmed recipient arrival.
4. **Stage the website.** Prove access denial for anonymous clients and the ordinary Preview
   principal. Run the protected WebDev Preview with expiring access, approved recipients and
   capture. Reconcile persistence and notifications. Restore capture, disable test writes, revoke
   temporary grants and replace or retire the write-enabled artifact after the run.
5. **Production preparation.** Confirm the target org separately, refresh its private baseline,
   verify required egress and least-privilege OAuth, and prepare scoped secrets. Validate the
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

| Gate | Result recorded November 26, 2026 |
|---|---|
| Local Vitest | 139 files passed and one isolated Redis file was skipped by default. 1,659 tests passed and four were skipped. |
| Isolated real Redis | Four opt-in tests passed. This confirms local Redis behavior. Hosted backend verification is separate. |
| Mock build, startup and function budget | The standard credential-free Turbopack build passed after moving the cached artifact from the earlier port failure. The mock network block remained in effect. Six mock-start HTTP route checks returned 200. Local manifests showed a 60-second budget for 23 lead action hosts across 33 site pages and matched the baseline outside that scope. Hosted budget confirmation remains pending. |
| Pull request checks | PR #244 CI passed for revision `0477329d0f8e01f5d14c5569e54956229a651649`. |
| Browser | 42 isolated mock cases passed at 360px and 1440px. After the atomic decline update, 22 affected cases passed again, including fresh IDs after correction on both listing forms and an unconfirmed guide lock after reload. |
| Immutable v3 review | SHA-256 `12e481452f4644de8ec986ecc6006b1a68a530a7e97e6ae1ea533859cd37561b`. The 105-file patch applied cleanly to the reviewed base. The source review found that v3 addressed the prior findings and recommended holding for hosted, native notification and Production evidence. |
| WebDev admission package | Initial deployment `0Afjg0000004vNtCAI` passed eight Apex tests, with admission trigger and class coverage at 100% and intake API coverage at 92%. Atomic decline deployment `0Afjg0000004vXZCAY` passed nine of nine Apex tests. The revised intake API covered 114 of 124 lines. |
| WebDev Lead uniqueness | Field-only deployment `0Afjg0000004vPVCAY` enabled case-insensitive submission-ID uniqueness. The separate index regression passed in `0Afjg0000004vR7CAI`. |
| WebDev affected Apex | All 63 affected Apex tests passed in run `707jg000000aItT`. |
| Live WebDev website | All ten real synthetic form controls passed in 22.48 seconds. Each matched a persisted Lead with its submission hash and capture evidence. All ten synthetic Leads were closed afterward. |
| Direct WebDev backstop | All 22 cases completed. No Lead persisted and no SMS or reminder email was observed over the bounded observation window. With no matching Lead, absence of linked work is an inference. The check did not directly inspect queue records through the restricted principal. |
| Native claim and notification arbitration | The second WebDev concurrency run passed against the updated intake API. A separate native check confirmed the exact persisted Lead and one notification claim winner. |
| Native routing and capture | The 11-case WebDev rehearsal passed with ten persisted controls and one honeypot rejection. Four SMS captures and six expected Tasks reconciled. Ten welcome email paths were scheduled for 22:27 UTC. The two older welcome entries were unchanged. This run verified scheduling and capture. Actual email delivery was not verified. |
| Read-only Preview | Ordinary `dpl_Ddh6L7FqrwfcUtbp5y8eZtreUrFc` and workflow `dpl_6Z8v39af1U6hFrVdV8Z7giKe387c` at `0477329` each returned three anonymous Vercel SSO redirects and produced 22 authenticated render receipts across 360px and 1440px. Both rendered all ten form families and the alternate VA question form. Workflow used existing CLI automation access after Development OIDC received 403. The Contact form fit both viewports. The existing reviews carousel caused a separate intermittent document overflow. No Server Action was sent. |
| Protected Preview writes | Pending. The approved dedicated Redis connection was provisioned for Preview only under the $20 cap. Its generated, prefixed REST write credentials are sensitive Preview variables. The exact write-enabled candidate still needs HMAC binding, Redis isolation, ordinary Preview application-level denial, and bounded protected submissions verified. |
| Production | Pending. No Production configuration, promotion, live form verification or policy activation is recorded for this release. |

### Follow-up verification

- Native welcome log `07Ljg0000005TxSEAU` started at 22:27:45 UTC. All ten exact Lead and submission references matched separate completed interviews, each with one `SE_Welcome_Video` action and no logged Flow errors. Email remained System email only; this is execution evidence, not mailbox receipt. The ten synthetic routing Leads were subsequently closed with expected-state guards and their six routing tasks completed. Captured SMS receipts were preserved.
- Production check-only validation `0Afjf0000003mL3CAI` passed 66 tests with zero component errors, test failures or coverage warnings. It applied no metadata or record changes. Actual deployment, policy seed/reconciliation, uniqueness activation, mappings and website cutover remain pending.
- The first protected Preview browser control stopped on an unconfirmed UI result. The existing alternate-host firewall rule still denies all Preview POSTs. The exact candidate host recorded one firewall denial, no application POST log, and no matching Salesforce Lead or durable attempt. Preserve the original reference and do not resend it. A draft exception for only the immutable protected test host is awaiting authorization; it does not open Production or other Preview hosts. Hosted admission remains unverified until the bounded controls pass after that fence is resolved.
