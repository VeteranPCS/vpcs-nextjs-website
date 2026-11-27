# Spam enforcement proposal

Status: research and proposal only, November 26, 2026. No spam policy, application runtime,
Salesforce metadata, environment settings or notification timing changed for this proposal.
Baseline: main `5e8b5f7`; live application code `2845562`. The Production Jason test is recorded
separately in [its verification ledger](verification/2026-11-26-jason-production.md).

## Recommendation

Make admission a real decision **before creating a Salesforce Lead**, then enforce the same
known-bad identity and honeypot rules in Salesforce. An empty honeypot permits the remaining
checks to run; it is not evidence that a submission is legitimate. Merely forwarding the
honeypot will not stop bots that omit it, bypass the website, or use a new email alias.

Use two bounded releases: first enforce existing signals and repair the Salesforce denylist;
then restore a mandatory challenge across every Web-to-Lead entry point. Do not combine either
with working hours, urgent/countdown timing, reminder frequency, regional ownership or a CRM migration.

## Verified findings

| Finding | Evidence and effect |
|---|---|
| Current website quarantine is advisory | `lib/spam-protection.ts:evaluateLeadSpam` explicitly returns a soft decision. `services/salesForcePostFormsService.tsx:submitWebToLead` tags selected comments, then still POSTs to Salesforce and sends Slack. Existing tests explicitly expect that behavior. |
| All ten current website form families collect the honeypot and timing values | `components/common/honeypot.tsx` supplies `company_website` and `form_rendered_at`. Agent/lender forms merge them in `components/common/useCustomerSubmission.ts`; listing-page aggregators and the remaining form components also merge them. Customer action validation preserves these extra fields. This is not a missing hidden input in the current website. |
| The Salesforce honeypot is disconnected | Payload builders and `serializeWebToLeadParams` do not map either browser signal to `Lead.Honeypot__c`. Current Production rule `Block_Spam_Submission` is active and rejects `NOT(ISBLANK(Honeypot__c))`, but the website does not populate that field. |
| The predatory-email rule misses current website sources | Current Production `Block_Predatory_Email` is active with ten exact email entries, gated by `ISPICKVAL(LeadSource, 'Website')`. None of the ten current form builders uses `Website`. Adding an email there therefore does **not** protect these current form sources. The formulas were freshly read through Tooling API on November 26, not inferred solely from old exports. |
| Alias handling is weak | Current rate keys only trim/lowercase email. The Salesforce rule compares literal addresses. Neither canonicalizes Gmail dots or plus suffixes. |
| Several forms lose the Salesforce spam marker entirely | Keep-in-touch and the three guide configs have no `spamFreeTextField`. Their Slack heading can say spam while the created Lead lacks that marker. Listing/internship markers use the “tell us more” field, outside the regional Customer SMS helper's two inspected fields. |
| SMS suppression is not complete intake isolation | The routing release checks `[SPAM-SUSPECTED]` in `Additional_Comments__c` or `Description` for Customer SMS. The native initial email and five-minute welcome Flows do not use that same admission condition. Preventing record creation avoids starting any of them. |
| Rate-limit failures currently allow submission | Limit is five per ten minutes for each IP/email key. Missing Redis creates an unlimited-success limiter; Redis errors are caught and treated as clean. This is source behavior, not evidence that Production Redis is currently unavailable. |
| Internal tool definitions bypass every spam check | The unforgeable in-process token authenticates the caller, but user data passed by those tools bypasses deny signals and rate limits. Current `app/api/chat/route.ts` deliberately strips the approval handshake, disabling actual browser Concierge Lead execution until signed/server-held history exists. Do not re-enable it as part of this release. |
| No active CAPTCHA verification in the website intake | All builders send empty `g-recaptcha-response` and `captcha_settings`. The approved Production test persisted using this path. A library dependency or schema token field is not verification. |
| HTTP success is insufficient for admission accounting | The current response parser accepts empty or unrecognized 2xx responses. A future Salesforce validation/CAPTCHA rejection must not produce a normal Slack lead alert or accepted-conversion event just because the HTTP request completed. |

The original [Slack report](https://veteranpcs-workspace.slack.com/archives/C096Q1RFR8D/p1795613862882159)
and adjacent messages describe repeated spam, four overnight alerts, and a separate problem with
agents acting on old closed/converted records. That last portal problem needs its own investigation;
this proposal does not count it as fixed by regional routing or spam enforcement.

## Complete form coverage

All rows must use the same admission service. Test every alternate component and entry point, not
just one page per server action.

| Form family | Current Salesforce LeadSource | Current marker location |
|---|---|---|
| Contact agent | Contact Agent | Additional Comments |
| Contact lender | Contact Lender | Additional Comments |
| Agent listing | Agent Listing Request | Tell us more |
| Lender listing | Lender Listing Request | Tell us more |
| Keep in touch | Keep in Touch | None |
| General contact / VA question | Contact Form | Additional Comments |
| VA loan guide, including PCS resources/download dialogs | VA Loan Guide | None |
| Homebuyer guide | First Time Home Buyer Guide | None |
| Colorado relocation guide | Colorado Relocation Guide | None |
| Internship | Internship Application | Tell us more |

Four Concierge tool definitions invoke these actions internally; their browser execution is currently
disabled by the approval-history guard. Preserve that guard and test direct internal service calls.
Include selected/unselected partners, deep links,
query-derived state, multi-step listing aggregation, email-only/phone-only customer inputs, and mobile
autofill/accessibility in regression. Do not change destination/current-location semantics.

## Release 1 — enforce admission and repair known-bad checks

1. Replace `quarantine: boolean` with an explicit, tested result: `allow`, `reject`, `retry_later`,
   or `review_required`, with bounded reason codes and a policy version. Only `allow` may reach
   Salesforce, normal Slack notifications or accepted-conversion telemetry. Evaluate before partner
   enrichment and Web-to-Lead. Keep validation errors, known rejection and uncertain submission distinct.
2. Reject nonempty honeypots and confirmed blocked identities. Rate exhaustion returns a temporary
   failure with a bounded retry time. Link-only and timing-only signals require review/challenge,
   rather than permanently labeling a person as spam. In the first release, unresolved review has
   **no Lead creation** and a clear assistance/retry path. Do not silently display a success page.
   A durable review inbox is a separate feature if required; do not improvise one using active Leads.
3. Type- and length-check the honeypot/timestamp envelope before using it. Missing, malformed,
   future or replayed client timestamps are not proof of a human. Avoid server exceptions on object
   or array values. Preserve keyboard/screen-reader exclusion and test password-manager autofill.
4. Keep the existing thresholds initially; enforce their outcome. Production must not silently
   switch to an unlimited limiter on missing configuration. On an unavailable limiter, return a
   recoverable verification failure with **zero Lead/outreach side effects**, retaining entered data.
   Verify the platform's trustworthy client-IP source before making an IP-based hard block. Shared
   military-base networks make IP-only denial a false-positive risk. Do not use an arbitrary forwarded
   header as authenticated identity. Never hard-limit the shared `anonymous` fallback: when no trusted
   IP is available, omit the IP bucket and apply the canonical-email bucket, or a normalized-phone
   bucket for phone-only intake. Treat these as abuse counters, not proof of identity. Document and
   test that phone fallback as an explicit policy addition, including distinct callers, shared numbers,
   missing/malformed contact data and concurrent requests. Reject invalid contact data through normal
   validation; never collapse unrelated callers into a shared missing-value bucket.
   Replace an unrestricted kill-switch with a documented intake hold
   or narrowly scoped override, not a general return-to-live-spam switch.
5. Keep original email addresses for contact. For matching/rate keys, trim and normalize case;
   for consumer `gmail.com` only, remove local-part dots and `+suffix`. Do not apply Gmail dot rules
   to arbitrary domains or Google Workspace. Add other provider/domain equivalences only after
   verifying them and testing collision cases. Never infer identity from names or block all Gmail.
6. Maintain one private Salesforce blocklist with canonical identity, reason, active state and audit
   history. Import/reconcile all ten existing exact entries before retiring the legacy formula, so
   removal from the new authority cannot still be blocked by a stale second rule. Query only keys
   relevant to the batch, once per Apex transaction, rather than loading an unbounded table. The website needs an explicitly
   scoped read/sync contract with version/expiry and no public exposure of raw blocked addresses;
   use matching hash keys where practical. Fail closed to a recoverable result when required policy
   is unavailable. Avoid a second manually edited JavaScript list. Test additions, removal and cache
   invalidation, including a stricter Salesforce decision arriving after a cached website allow.
7. Enforce blocked identity for **new Leads regardless of LeadSource or record type**, and when an
   existing Lead's email is changed to a blocked identity. Preserve unrelated edits/conversion on
   existing historical records; explicitly test those paths. Do not key the guard solely on a
   client-supplied WebToLead checkbox or source label. This deliberately broadens the present policy:
   inventory manual entry, imports and authenticated integrations; agree any narrowly audited operator
   exception before activation. Use a bulk-safe before-save resolver plus
   validation/addError, developed and tested in WebDev. Keep the existing honeypot validation and
   add verified org-specific `Honeypot__c` wire mappings to all ten serializers/profiles. The normal
   website blocks filled honeypots locally; a direct sandbox transport test proves the Salesforce backstop.
8. Keep admission decisions separate from transport/persistence outcomes: `not_attempted` means no
   POST occurred; `rejected` after POST requires authoritative Salesforce rejection evidence;
   `confirmed` requires the matching persisted record; otherwise use `unconfirmed`. Reconcile a unique
   `VPCS_Submission_ID__c` after any Web-to-Lead POST before normal Slack or success-conversion events.
   Use bounded reads and match the exact new record. A timeout or failed readback after POST is
   `unconfirmed`, never an invitation to automatically resend. **A Lead may already exist and its
   native Salesforce email/SMS may already have started.** Readback gates website Slack and accepted
   telemetry; it cannot retroactively prevent Salesforce outreach. Do not count unknown outcomes as
   rejected or zero-outreach. No negative inference from HTTP 200 or a generic redirect. Preserve one
   correlation identifier through the website, Salesforce and audit record. **Prerequisites:** listing
   agent/lender and internship currently omit attribution; extend all ten builders and verified org
   mappings. Existing IDs are minted per action invocation and the Salesforce field is not unique.
   Define a stable attempt ID bound to the normalized payload and its retry lifecycle, audit existing
   nonempty duplicates before a uniqueness change, and implement/test an atomic duplicate/dispatch
   claim. A correlation string or in-memory map alone does not prevent concurrent submissions.
   Production readback also adds an OAuth/FLS dependency deliberately avoided by current intake:
   verify least-privilege exact-ID reads, token expiry/refresh, rate bounds and outage behavior before
   adopting it. If those prerequisites are not ready, defer activation while the existing Production
   website remains open. Resolve development dependencies before starting the bounded cutover hold;
   do not call a 2xx proof of acceptance.
   Include client GTM events: several guide/keep-in-touch components currently emit conversions before
   the request completes. Move accepted conversions after confirmation or label them as attempts.
   Extend distinct rejected/unconfirmed UI handling to guide dialogs and listing forms, preserving the
   attempt handle instead of inviting blind resubmission. Internal tool handlers must inspect the typed
   outcome rather than treating every fulfilled promise as a completed Lead.
9. Keep existing marker suppression as defense in depth. Inventory every remaining notification,
   portal listing/action and scheduled path before adding any Lead-based review state. Already
   queued suspect work requires a private report and approved scoped reconciliation; do not replay
   uncertain messages or mass-delete old Leads as part of this code release.

Salesforce documents that invalid Web-to-Lead field validation prevents record creation.
[Salesforce Web-to-Lead considerations](https://help.salesforce.com/s/articleView?id=sales.leads_gen_considerations.htm&language=en_US&type=5)
Gmail documents [dot equivalence](https://support.google.com/mail/answer/7436150?hl=en) and
[plus aliases](https://support.google.com/mail/answer/22370?hl=en).

## Release 2 — close unauthenticated intake bypasses

Website-only admission cannot protect a direct POST to Salesforce's public Web-to-Lead endpoint.
Require a verified challenge there as well. The smallest transport-preserving option is native
**reCAPTCHA v2**, with a working widget/token path on all forms and Salesforce's org-level
`Require reCAPTCHA Verification` enabled. Salesforce supports v2, not v3, for this interface.
[Supported version](https://help.salesforce.com/s/articleView?id=000394922&language=en_US&type=1)

Before activation, inventory other Web-to-Lead producers, including old embedded forms,
Concierge, LinkedIn and any partner integration. Do not assume only this website uses the endpoint.
Salesforce's documentation notes integration limitations when mandatory reCAPTCHA is enabled.
[Setup and integrations](https://help.salesforce.com/s/articleView?id=sales.setting_up_web-to-lead.htm&language=en_US)

For the native v2 option, **Salesforce owns token verification**. Pass the real token and server-owned,
org-bound generated captcha settings; never accept client overrides of fallback/key settings. Do not
consume the same token first at Google's `siteverify` endpoint. Google
tokens expire after two minutes and can be verified once. Reset expired/used challenges without
resubmitting an uncertain Lead. Use separate sandbox/Production key pairs and approved hostnames;
leave automatic server fallback off if it would admit unverified traffic. Test mismatch, replay,
expiry, missing token and provider outage. [Google verification contract](https://developers.google.com/recaptcha/docs/verify)

Keep the current Concierge execution guard. If enabling Lead submission in a later authorized release,
first implement server-bound, single-use approval history and a browser challenge handoff without
exposing secrets/tokens to the model, while still applying the shared blocklist/rate policy. If an
essential server-only producer cannot supply v2, resolve that dependency **before** turning on the
org setting. A separately authenticated, least-privilege intake API is the alternative; it requires
its own design/review, attribution/assignment tests and retirement of the bypassable public path.
Do not add a forgeable hidden `trusted=true` field or a broad CAPTCHA exemption.

Update `next.config.mjs` with the exact provider script/frame/connect origins required for the chosen
widget and approved hostname registrations. WebDev/Preview currently disallows remote challenge
scripts and frames, and Production's script origins do not include the required reCAPTCHA loaders.
Verify the rendered challenge under each real CSP; do not broaden to wildcard script permissions.

Release 1 can ship first for immediate containment. It must not be described as preventing direct
Web-to-Lead abuse until Release 2's bypass tests pass. CAPTCHA reduces automated abuse; it does not
prove that a human submission is legitimate or replace the blocklist and rate policy.

## Testing, dependencies and release order

Current characterization: **134 existing tests passed** in `spam-protection.test.ts` and
`salesForcePostFormsService.test.ts`. They demonstrate the present soft behavior, not the proposed fix.

| Gate | Required evidence before release |
|---|---|
| Decision contract | For each of ten actions, filled/missing/malformed honeypot, blocked email, Gmail alias, rate exhaustion, Redis error and weak-only signals. Every pre-POST non-allow admission result yields zero Web-to-Lead calls, normal Slack alerts and accepted-conversion events. Only bounded security telemetry may be recorded. |
| Identity matching | Case/whitespace, dots/plus on consumer Gmail; unchanged custom-domain dots and plus; phone-only forms; missing trusted IP without a shared `anonymous` bucket; normalized-phone fallback and shared-number false positives. No broad domain or household blocking. Same independent canonical-email vectors in TypeScript and Apex. |
| Direct Salesforce bypass | Native WebDev POSTs for every actual source and record type; altered/omitted source/WebToLead flags; blocked canonical identities; filled honeypot. Assert zero persisted Leads and zero downstream outreach. Repeat missing/invalid/replayed CAPTCHA tests for Release 2. |
| Healthy intake | All ten real synthetic WebDev forms persist correct records. CO/Beth and FL/Stephanie selected Agent/Lender paths still generate exactly one correct queue message; no-partner routing, conversion and Account ownership remain compatible. |
| Notifications/timers | Native immediate email, five-minute welcome, initial SMS, portal reminder/escalation, daily status jobs and related tasks have no work for rejected intake. For accepted controls, current timing and recipients stay unchanged. Existing pending work must not be reset. |
| Delivery distinction | Capture by default. Any bounded real verification uses approved Tech recipients; record queue, provider and actual inbox/handset evidence separately. No new Jason or other partner test is implied by this proposal. |
| Response/retry | Salesforce validation failure with a 2xx/redirect; persistence-read delay/failure both with and without an already-created Lead/native outreach; user double-click; concurrent requests; expired challenge; browser back/refresh. Distinguish not-attempted, authoritative rejection, confirmation and uncertainty. Never automatically repeat an uncertain POST or label it zero-outreach. |
| Forms and environments | Desktop/mobile and accessibility checks; listing multi-step persistence; guide dialogs; deep links; Concierge confirmation. Local and Preview stay WebDev; ordinary Preview writes off; mock tests block network. |
| Regression/release | Lint, type-check, Vitest, credential-free production-mode build/start and affected Playwright suite; meaningful Apex assertions, affected existing tests and deployment coverage. Review exact immutable website and Salesforce packages. |

Use the existing `vpcs-salesforce-dev` and `vpcs-verify` skills, Salesforce schema guidance,
Vercel environment/deployment guidance and immutable patch-risk assessment. Parallel implementation
can assign one Sol agent the website decision/UI work, one Salesforce policy/backstop work, and one
independent negative-test matrix; one operator serializes shared-org changes. Freeze the admission
contract and canonicalization vectors before those agents start. This proposal does not start that work.

The deferred test Redis purchase remains deferred. Unit tests may use a deterministic limiter, but
they are not evidence of distributed-provider behavior. Select an approved isolated backend/local
test harness before claiming those integration cases passed; do not borrow Production credentials
for WebDev or buy a service under this proposal. Verify actual Production limiter configuration and
the current enforcement flag during implementation preflight; this review did not reveal secrets.

Sequence:

1. Refresh the Production metadata baseline and identify every intake producer and notification entry.
   Agree reject/review/retry user behavior, blocklist ownership and the CAPTCHA verification owner.
2. Implement/test on a clean `codex/` worktree and WebDev with capture. Verify Salesforce negatives
   independently from website mocks. Stage mappings and policy as compatible additive changes.
3. Pass protected-Preview, native sandbox and relevant coverage gates. Review false-positive cases
   before allowing broad review/retry signals to affect customers. Prepare a compatible rollback artifact.
4. Validate the scoped Salesforce package in Production. Keep automatic Vercel Production domain
   assignment disabled. Stage the website artifact; do not activate a sandbox-built Preview as Production.
5. Use the rehearsed bounded POST hold/drain for coordinated enforcement changes. This Vercel hold
   only covers website traffic: independently coordinate/pause direct Salesforce and other producers
   for org-wide policy/CAPTCHA activation, and reconcile arrivals during the boundary. Deploy the validated
   Salesforce backstop, promote the exact tested Production website, and confirm obsolete endpoints and
   pinned clients cannot invoke an older permissive action. Apply mandatory CAPTCHA only when all
   producers and the staged website are ready. Reopen after nonmutating checks.
6. Perform one separately authorized positive canary and bounded negative checks with approved test
   identities. Reconcile persistence and all notification paths; then restore capture/test controls and
   revoke temporary grants. Monitor blocked/review counts, legitimate acceptance, rule/cache errors,
   duplicate submissions and queue failures without logging raw emails/comments.

For Release 1 rollback, the restored website must retain admission enforcement and required mappings:
the old website does not forward the honeypot, so the Salesforce rule alone is insufficient. For
Release 2, use a verified challenge-capable rollback artifact; the old website's blank tokens fail
mandatory native CAPTCHA. Otherwise keep intake held until a separately approved org-setting rollback
and affected producer recovery have been verified. Never restore pass-through behavior with intake open.
Do not replay uncertain submissions
or queue items. Preserve rejection/persistence evidence and reconcile any already-created work.

Completion means pre-POST non-allow decisions and authoritative Salesforce rejection produce no
Lead/outreach, all ten legitimate paths remain usable, and direct Web-to-Lead bypasses are demonstrably
covered. Unconfirmed POSTs remain explicitly unresolved until reconciled; they cannot satisfy a
zero-outreach assertion. Working-hours rules,
countdowns, reminder cadence, closed-history portal actions and the legacy email footer are separate work.
