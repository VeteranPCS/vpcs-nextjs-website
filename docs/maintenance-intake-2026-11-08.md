# November 8, 2026 website intake pause

Prepared locally October 17, 2026. **Not deployed or enabled in production.** Salesforce settings, credentials and Vercel configuration have not changed. This is a temporary refusal to accept new requests, not a queue or a promise of later follow-up.

## Switch and timing

Server-only environment variable: `LEAD_INTAKE_MAINTENANCE`.

| Value | Behavior |
|---|---|
| Unset, empty or `off` | Normal intake; default. No Redis read. |
| `on` | Pause immediately, regardless of the reopening flag. No Redis read. |
| `scheduled` | Normal intake until **November 8 at 07:45 UTC / November 7 at 11:45 p.m. PST**; then pause until explicitly reopened through the shared flag in production. |
| Any other nonempty value | Pause immediately, regardless of the flag, to fail closed on configuration typos. |

The vendor's announced maintenance window is November 8, 08:00–09:00 UTC / midnight–1 a.m. PST. The 15-minute earlier pause is our buffer. There is **no automatic reopening at 1 a.m.**

In production scheduled mode after the cutoff, only the exact Redis string `open` at this fixed key permits intake:

```text
vpcs:production:maintenance:2026-11-08:reopened
```

Missing keys, other values (including `OPEN`, whitespace and a JSON-quoted string), missing credentials, Redis errors and timeouts all keep intake paused. Each check makes an uncached GET with a fresh one-second timeout and no automatic retry. There is no process-level decision cache or successful-value fallback. Logs contain only `missing_credentials`, `read_failed` or `timeout`, never provider errors or secrets. The existing Upstash dependency and canonical/Vercel-alias environment resolver are reused. The SDK's explicit retry count is zero; regression tests verify exactly one HTTP attempt because this installed version treats `retry: false` as one retry.

Redis reads occur only with `VERCEL_ENV=production`. Preview/development submissions are rejected before maintenance reads, spam checks, service calls or conversion telemetry; local scheduled mode remains paused after the cutoff without Redis. The later release-preparation patch adds a separately authenticated, read-only diagnostic described in the [release plan](maintenance-release-plan-2026-11-08.md). It adds no flag-changing endpoint, browser storage or submission transport; its dedicated token must be provisioned only during an authorized release.

Deploy `scheduled` ahead of the window in a separately authorized release, then **freeze production releases through maintenance and reopening**. The same running build observes flag changes; reopening needs no deployment or environment change. Patched builds sharing the production Redis connection and scheduled mode agree even when Server Actions stay pinned to an older patched build. This does not retrofit pre-patch tabs or make arbitrary redeployments compatible.

## What visitors and concierge see

All nine form services return a plain, serializable `{ success: false, outcome: 'not_sent', reason: 'maintenance', maintenanceMessage }` result when paused. It intentionally has no legacy `message` or `redirectUrl` success indicator. The guard runs before remote spam checks, CRM lookup, Web-to-Lead, owner updates, notifications and conversion capture, and checks again immediately before the Web-to-Lead POST after asynchronous preflight. Requests already sent before the pause must still be reconciled.

All website callers handle that result before clearing fields, navigating or downloading a guide. The notice says:

> Your request was not sent. Requests are paused for maintenance. Your details are still in this open form; they have not been saved or queued. Please keep this page open and try again after maintenance.

Entered details remain in the mounted form and listing-step state; this patch does not add localStorage, sessionStorage or a server-side draft store. Closing/reloading the page can lose those details. Listing applications save current step values before Back navigation, including incomplete edits, and allow an explicit retry after a blocked submission. Accepted listing submissions remain locked while navigating, even if navigation fails, to prevent duplicate creation. There is no automatic replay after reopening.

An uncached read-only `GET /api/v1/intake-status` exposes only `active` and public notice text. A client provider refreshes it every 30 seconds and on window focus, so pages opened before the pause can display the notice without reloading or replacing inputs. Each browser status request aborts after five seconds so one stalled request cannot stop later polling. Status fetch failures do not bypass the independent server guard. The advisory wording changes after 1 a.m. to say maintenance remains in progress; intake stays paused. Submit controls remain usable to obtain a fresh authoritative server response. After a rejected attempt, a successful status read **started after that rejection** showing intake open changes the notice to “Intake has reopened. Your earlier request was not sent. Your details are still in this open form; submit when you are ready.” A failed read or a late response to an earlier request cannot announce reopening.

All four concierge submission tools keep their approval requirements. During the pause they return an error explicitly saying no request was sent or queued, retain the conversation, and instruct the assistant not to retry automatically. Read-only browsing and chat can continue. The shared service guard also rejects trusted internal calls, so concierge cannot bypass maintenance.

## Proposed operating procedure — requires later release authorization

1. Before release, review the patch, browser rehearsal and latest authenticated notice. Confirm the primary technical operator (Harper), a technically capable backup and escalation contacts. Jason is a coordination contact. **October 17, 2026, 19:00 PDT read-only observation:** Vercel's authenticated Redis console returned `GET=null`, `TTL=-2` for the dated key; the database is connected to production and preview. `tech@veteranpcs.com` is the sole confirmed Owner; console access succeeded after MFA. Actual writes, deployed credential validity and production read latency remain unverified. Leave the absent key absent; no initialization write is needed. Establish the operator's authorized recovery route and verify the key is still absent/closed with no expiry before release. Do not expose credentials in logs or chat.
2. Follow the [release plan](maintenance-release-plan-2026-11-08.md): after separate approval, provision the diagnostic token and deploy the approved patch with `scheduled` well before November 7 at 11:45 p.m. PST. Verify diagnostic reads, the public status endpoint, production build and Redis binding; freeze releases through reopening. Tabs opened on today's older release cannot receive this protection retroactively. Do not smoke-test a live submission without separate authorization.
3. At the cutoff, verify `GET /api/v1/intake-status` reports `active: true` and a page shows the notice. Track requests already in flight for reconciliation. Leave the flag closed if maintenance runs long.
4. After Salesforce reports recovery, verify authenticated reads and the expected instance. Any write canary requires separate explicit approval, controlled recipients and a cleanup/reconciliation plan; confirm the persisted Lead, owner and downstream results. A green deployment or notification is insufficient.
5. The authorized operator changes **only the dated Redis key** to the exact string `open`, without redeploying. Verify the value, absence of expiry and public status `active: false`. Check an already-open patched page updates its notice without reload; visitors must explicitly retry. Nothing is automatically replayed.
6. To pause again, delete the key or set it to `closed`. Verify `active: true`. Existing open pages update on focus or within 30 seconds; authoritative submission checks block immediately on their next Redis read. A request already sent cannot be undone.
7. Reconcile submissions around the boundary for delayed creation, incorrect ownership, duplicates and notification failures. Correct the missing step; do not resubmit an existing Lead to fix its owner. Retain the dated key until an approved later cleanup removes the gate; do not set automatic expiry.

These are **future operator commands**, not commands executed during this local work. Use the authorized Redis console; do not paste connection secrets into shell history:

```text
GET vpcs:production:maintenance:2026-11-08:reopened
TTL vpcs:production:maintenance:2026-11-08:reopened
SET vpcs:production:maintenance:2026-11-08:reopened closed

# Only after verified recovery and authorization:
SET vpcs:production:maintenance:2026-11-08:reopened open

# Emergency re-pause:
DEL vpcs:production:maintenance:2026-11-08:reopened
```

Use SET without expiry options; it replaces any old expiry. TTL must be `-1` for an existing key or `-2` for an absent key. A positive TTL needs correction before relying on the flag. Missing/read-failing Redis causes a pause, including after reopening. Diagnose credentials/connectivity and restore the authorized flag; do not bypass the guard by changing `off` and redeploying during the window.

If a release problem requires rollback while Salesforce is unavailable, retain a guarded, scheduled build pointing at the same closed flag. Rolling back to unguarded code reopens intake. Escalate rather than silently removing the protection. A final read immediately before Web-to-Lead narrows the race, but changing the flag cannot cancel a POST that has already started.

## Verification

Mocked coverage includes scheduled boundary timing, continued blocking after 1 a.m., manual reopening, uncached status, all nine service entry points, trusted concierge calls, four concierge tools, a pause beginning during asynchronous preflight, serializable customer-action outcomes, field retention, no redirects/downloads/conversion events on blocked requests, and explicit retry of listing forms with the same retained data. Status-provider tests cover already-open pages and failed status requests without storing personal data in browser storage.

Browser/build evidence and final check results are recorded in the Salesforce readiness report's maintenance implementation addendum. No live lead, notification, token revocation, revalidation, deployment or Salesforce configuration change is part of this verification.

## Review fixes and deployment rehearsal

The local follow-up fixes three review findings:

- Both listing pages keep accepted requests locked while navigation is pending or fails. A maintenance refusal still unlocks for an explicit retry; Back cannot move away during an accepted/in-flight submission.
- Every listing step with a Back button saves its current values without validation before unmounting. This includes incomplete edits; returning to the step restores the draft instead of an older submitted value.
- A blocked form announces reopening only after a newer successful status read reports intake open. It retains the earlier not-sent outcome and asks for an explicit submission; failed polling does not imply reopening.

Run the isolated rehearsal with `node scripts/verify-maintenance-reopening.mjs`. It creates temporary source copies without `.env` files, uses synthetic encryption keys and mock server actions, and builds distinct Next.js releases. The real maintenance resolver, environment resolver and Redis SDK run against a synthetic HTTP transport backed by one shared local flag file. Fixture processes use a clock shifted past the cutoff; application code has no test-clock or administrative override. Server outbound sockets are blocked and browser requests are limited to the fixture origin. Its ledger records only synthetic accepted submissions.

The rehearsal tests ten form surfaces at 390px and 1440px twice: first while the original page and server build stay running, then with status reads on a second patched build and actions pinned to the first. Changing only the mock flag must update the notice, retain inputs (including every listing step when navigating Back/Next), produce no automatic submission and accept exactly one deliberate retry. Both server processes independently report the same shared status. Unit tests cover all nine real service entry points and all four concierge tools, including re-pausing during asynchronous preflight and preview/development rejection before Redis reads.

The incompatible-action negative probe remains: a new-key build rejects an older action ID even with the flag open. This is a documented limit, not a supported reopening procedure. [Next.js action compatibility documentation](https://nextjs.org/docs/messages/failed-to-find-server-action). The pinned-action case that previously remained paused is resolved only when both patched builds use the shared scheduled flag. [Vercel Skew Protection routing documentation](https://vercel.com/docs/skew-protection).

The harness stops local servers and the browser on completion; its printed temporary directory retains logs, screenshots and results. Final evidence and verification limits are recorded in the readiness report's shared-flag addendum. Live Redis connectivity, operator permissions, Vercel routing, Salesforce persistence and downstream automation are not established by mocked tests. Do not force an unsaved form to reload or imply that refused submissions will be recovered later. No hosting, Redis or Salesforce configuration was changed.
