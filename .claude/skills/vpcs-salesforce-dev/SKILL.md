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

For real lead intake, bind the server-only `VPCS_SALESFORCE_INTAKE_CLIENT_ID`, `VPCS_SALESFORCE_INTAKE_CLIENT_SECRET`, and `VPCS_SALESFORCE_INTAKE_USER_ID` to the approved org and expected `005` run-as user. WebDev may explicitly reuse the restricted workflow app. Production requires a dedicated OAuth client and a separate nonadmin identity with `VPCS_Intake_API`. Missing or invalid intake settings fail closed with no directory fallback. The website uses the intake session only for the five admission operations. Directory REST keeps its existing authentication.

The minimum API-only profile can authenticate while denying the Organization query. Do not remove
that identity check or fall back to the directory session. Use the reviewed
[intake org-access package](../../../salesforce/spam-intake/identity-access/README.md) and its
WebDev diagnostic to establish the needed setup-read scope. `ViewSetup`/`ViewRoles` expose setup
and role configuration; they are broader than reading two Organization fields. Obtain the scoped
Production access approval when the existing authorization does not cover them, then verify the
actual OAuth session and direct CRM/private-object denials. The permission-set license is an
entitlement, not a substitute for explicit permissions. Keep the org-read set separate from the
intake API grant and exclude the sandbox diagnostic sets/test from the Production package.

Before real intake writes, verify that the actual intake token binds to the approved user, passes the exact Organization query and reaches the scoped Apex endpoint. In WebDev, verify denial for the blocklist and attempt objects and for the Lead honeypot and submission-hash fields. The workflow app retains limited Lead readback for the rehearsal harness. In Production, verify the dedicated identity is denied direct CRM and private-object access. Verify separately that the ordinary Preview principal is denied the Apex intake endpoint. Record the identity, scope and denial evidence without printing tokens or credentials. Follow the [lead admission runbook](../../../docs/spam-enforcement-release1.md#org-and-website-release-gates).

## Real sandbox and protected Preview tests

Read the runbook's live form rehearsal and containment sections before writes. Confirm the sandbox identity, synthetic partner IDs, exact recipient controls, contained website and Salesforce outbound paths, expiring run marker and both write/isolation gates. Check anonymous denial and authorized access on the exact hosted deployment before enabling workflow-test submissions. Ordinary Preview stays read-only.

`npm run verify:salesforce-sandbox-leads` defaults to rehearsal; `--execute` writes real sandbox records. Serialize fixture runs and shared-org changes. Reconcile persisted records and capture evidence; never blindly retry an uncertain POST. A welcome Flow trace, a queue capture and a delivered message are different evidence. Record the actual outcome and any correlation limits.

After a bounded run, close/neutralize its fixtures as specified by the runbook, restore capture and write gates, remove temporary credentials/grants and verify the final Preview. Existing build snapshots retain their environment values; rebuild and retire temporary write-enabled artifacts as needed within the authorized scope.

For the routing exception, keep `QuoWebdevRoutingApiKey` only in the dedicated Salesforce external credential; Apex keeps the `OpenPhone` Named Credential identifier. Follow the [controlled-delivery procedure](../../../salesforce/outbound-capture/controlled-delivery/README.md) for exact-slot activation and the complete restoration test selection. Record provider acceptance, provider delivery status, recipient-inbox observation and the user's handset confirmation separately. Provider outbound and recipient inbox copy IDs may differ. Correlate the exact run marker, sender, recipient and timestamps. Verify both saved metadata and runtime state after restoring the capture label; a stale audit tag is distinct from an active provider transport.

Capture is the WebDev default. For the approved regional routing check, prepare the four selected Web-to-Lead cases with dispatch paused using `--routing-delivery`. The separate sandbox delivery overlay permits up to four exact pending queue rows for up to 30 minutes, from Beth and Stephanie to Tech at `+17194153014`. The synthetic email sink is `tech@veteranpcs.com`. Prove the recipient and expiry checks, correlate native queue and provider receipts with arrival, and restore capture on completion or uncertainty. The website remains in capture mode throughout. Follow the same exact-recipient scope for the separately gated Production verification after cutover. Close the synthetic Leads, clear the inactive partner’s temporary contact fields, preserve Sent queue receipts and verify revocation of temporary access. [Routing delivery procedure](../../../docs/customer-regional-routing.md#required-gates-and-release-sequence)

Use the [routing release sequence](../../../docs/customer-regional-routing.md#required-gates-and-release-sequence) to check staged Production artifacts. With automatic domain assignment off, an immutable candidate can still receive public framework requests pinned to its deployment ID. Verify the actual response fingerprint, and use a temporary Skew Protection OFF window only with approval and all three pin carriers checked against the live baseline. An authenticated 404 on an inert POST path proves the selected application answered; edge denial requires its own WAF evidence. Restore the approved Skew Protection maximum age and set the promoted deployment's boundary while the global POST hold is active. Verify the old pins and alternate-host rule separately before completing the cutover.

For open-work owner migration, verify that a direct Lead transfer can mark Salesforce’s `IsUnreadByOwner` from false to true. The guard permits only that platform-generated transition on the directly moved Lead. Preserve the remaining field checks, and account for the unread flag when verifying an owner rollback. After an interrupted receipt read, resume with the same manifest and idempotency keys. Reconcile excluded records separately and distinguish derived Task classifications from stored field changes. Accept a native converted referral Task only when the verified Customer Lead conversion lineage matches its Contact and Opportunity and satisfies the timestamp checks. Keep ambiguous conversions out of the migration. [Salesforce Lead read status](https://help.salesforce.com/s/articleView?id=000385207&language=en_US&type=1)

Use the build-time partner portrait inventory in state directories and coverage routes. Public image files are served outside Vercel’s function filesystem. Verify exact-case paths for real Agent and Lender records and exercise a dynamic cache miss, since synthetic fixture portraits and cached state pages can pass while the cold server fails.

## Select tests by the change

Use the runbook's [release-gate classification](../../../docs/salesforce-webdev-environment.md#required-evidence-and-release-gates). Environment changes require isolation, auth, mapping, form, rendering and containment regression. They do not automatically require every legacy multi-day timer or live SMS certification.

Changes to spam rules, routing, countdowns or schedules require the affected business cases and native workflow evidence from the [workflow matrix](../../../docs/salesforce-webdev-workflow-matrix.md), including ineligible records and actual scheduled execution where timing is changed. Do not disable the workflow and call it tested, or count an unexecuted scenario as a pass. Review shared dependencies to select adjacent regression cases.

## Website and Salesforce releases are separate

For lead admission, follow the [Release 1 runbook](../../../docs/spam-enforcement-release1.md).
Use the isolated WebDev rate backend and separate HMAC key. Reconcile by exact submission ID and
fingerprint. Distinguish rejection before dispatch, confirmed persistence, and unconfirmed outcomes.
Validate scoped admission, Lead uniqueness, and legacy-rule packages for each org from its current
metadata. Keep the honeypot rule active and reconcile the private blocklist before retiring the old
email rule. Verify the website's restricted API grant separately in WebDev and Production. For a
rollback, retain compatible admission and readback and preserve uncertain attempts.

Release 1 is active in Production. Its completion ledger includes the exact deployment, native tests, policy reconciliation, canary and cleanup. For policy maintenance, a separately authorized temporary `VPCS_Intake_Policy_Operator` assignment supplies the new-field access; broad administrative Apex access alone does not. Verify the complete expected policy set and revoke that temporary assignment after the operation. CAPTCHA is a separate release and must preserve the existing attempt/HMAC and no-replay contract.

For CAPTCHA work, read the [Release 2 runbook](../../../docs/spam-enforcement-release2.md). Release 2 is active in Production. Use its completion ledger to distinguish verified cutover controls from delivery evidence. Native Salesforce is the sole verifier of the single-use token. Confirm the sandbox-generated org/key/fallback settings, test an actual provider challenge and all ten form paths, and distinguish intercepted browser results from native persistence. Verify real image challenges in modal forms. Keep the legacy secret in Salesforce and preserve ambiguous attempts. Mandatory native enforcement and the compatible website must activate together under the intake hold, after scoped tests/review and stale-client containment. Never treat fallback-off as proof of undocumented over-quota behavior. Tech checks provider errors, assessment volume and billing daily during launch week. Hold intake on billing loss, provider quota errors or unexpected spend and keep Release 1 enforcement active.

For an existing field's new unique index, validate the field-only package with existing affected
tests, deploy under the producer hold, and wait for terminal success including finalization.
Then verify the live index and run the unchanged uniqueness regression before reopening intake.
An index-dependent assertion cannot establish the post-commit index during check-only validation.
Do not weaken that assertion to pass a combined package. See the [intake package sequence](../../../salesforce/spam-intake/README.md).

For Customer routing work, also read [the routing runbook](../../../docs/customer-regional-routing.md).
The fixed Beth/Stephanie map lives in `config/routing/customer-admins.json`; generate and verify
its Salesforce policy/assignment criteria rather than hand-editing another territory list.
Keep org user IDs, notification inboxes, provider numbers and portal URLs in the separate bindings.
There is no runtime spreadsheet lookup. Customer destination means `Destination_State__c`.

The routing release removes website owner PATCHes and website SMS transports. Salesforce ownership
must be proven before native notifications on the same submission. A website-only deployment is not
a complete routing release. Validate the scoped metadata in WebDev with its capture overlay; build
Production from its own fresh baseline and exclude all sandbox overlays. Preserve partner and existing
Person Account owners, closed history, spam policy and existing timing.

Open-work transfers require a private report/old-owner ledger, temporary migration permission,
expected-current-state comparisons, durable receipts and native pending-timer evidence. Pause affected
dispatch and reconcile legacy unlinked/uncertain queue rows before batches. Permission-based Flow guards
are broader than a single Apex invocation: keep the operator window exclusive and revoke the grant
afterwards. Never treat a passing owner update or queue `Sent` value as proof of timer preservation or
recipient delivery.

Coordinate Salesforce/website cutover with a rehearsed platform POST fence covering stale deployment
URLs and pinned Server Actions. Keep automatic Production domain assignment disabled, validate the
fresh staged artifact, deploy Salesforce, promote the tested website and set the Skew Protection threshold
before reopening intake. Rollback must retain a website with direct SMS disabled. Record completed gates
and remaining limitations in the routing runbook.

For the first website environment release, verify an effective hold on automatic Production domain assignment **before merging**. Git-triggered `main` deployments otherwise activate automatically. Review the exact head and its CI, merge within the authorized release scope, build fresh with Production variables, run nonmutating Production identity/route checks, then promote that same tested Production artifact. Do not submit synthetic Production leads. Local `main` remains connected to webdev. Follow the runbook for the current hold and rollback procedure.

Merging website code does not deploy Apex or Flows. For later Salesforce changes, follow [salesforce/README.md](../../../salesforce/README.md): scoped manifest, sandbox deployment and relevant tests/coverage, Production validation with required tests, then the authorized metadata deployment to an explicit target. Never directly edit Production Apex or bulk-promote sandbox capture adapters, credentials, recipient overlays or synthetic fixtures.

On refresh, invalidate prior isolation evidence and follow the runbook's recovery sequence before restoring writes. Record sanitized deployment/test IDs and known defects in the runbook; keep raw exports, authentication state and secrets ignored.
