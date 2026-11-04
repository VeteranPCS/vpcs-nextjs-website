# November 8 release review — October 17, 2026

Initially prepared locally for review. The subsequent reconciliation and local commit are authorized; **deployment, live credential provisioning, Redis writes, revalidation and Salesforce changes remain unauthorized and have not been performed.**

## Candidate patch and review

The candidate includes the earlier Salesforce token-generation recovery, directory error propagation and preview submission guard, plus the scheduled maintenance gate, retained form details, explicit reopening, and the read-only diagnostic below. The unrelated headshot skill edit, analytics investigation files and Salesforce investigation report remain outside the candidate release diff.

Review focused on the shared guard before side effects and immediately before Web-to-Lead; all nine form services and four concierge tools; listing-step retention and duplicate locks; explicit retry after reopening; token generation races; and authentication of the new diagnostic. Two additional notice issues were fixed: hung status reads now abort after five seconds and allow later polling, and a response from a request started before a maintenance refusal cannot announce reopening afterward. Both have regression tests. Existing listing fixes retain incomplete Back-navigation edits and keep accepted requests locked if navigation stalls or throws.

The diagnostic is `GET /api/v1/intake-redis-check`. It is disabled outside production and when `INTAKE_REDIS_CHECK_TOKEN` is absent or shorter than 32 characters. Authentication is an exact Bearer header with a constant-time comparison for equal-length values. It does not accept a token through a query string. Generate a dedicated random secret of at least 32 bytes for this token; do not reuse a Salesforce, Redis, webhook or MCP credential. This is a **future release prerequisite**, not a value created during preparation.

One authorized request runs the same `readIntakeReopeningFlag` function used by the maintenance guard: fixed-key GET, existing deployed Redis environment resolver, uncached, one attempt, fresh 1,000 ms abort signal. It runs before the maintenance cutoff and regardless of maintenance mode. No other command, key, host or timeout can be selected by the caller. It invokes no spam limiter, form service, Salesforce call, notification or conversion analytics. The response contains no credentials, Redis hostname, raw stored value or provider error. All responses prohibit browser/CDN caching.

| Response | Meaning |
|---|---|
| 200, `ok:true`, `withinBudget:true` | Authenticated Redis read completed in less than 1,000 ms. |
| `flag:absent` / `closed` / `open` | Missing key / any value other than exact `open` / exact `open`. This is the flag classification, not current intake status. |
| 503, `missing_credentials` | Runtime did not resolve the required Redis pair. |
| 503, `read_failed` | Provider/transport failure, including rejection of credentials; sanitized deliberately. |
| 503, `timeout` | One-second abort fired; no retry. |
| 503, `ok:true`, `withinBudget:false` | Read returned but measured duration was outside the budget. Investigate before release acceptance. |
| 401 / 404 | Wrong/missing Authorization header / diagnostic disabled. No Redis request. |

`elapsedMs` measures the server-side shared read, including resolver/client setup and response decoding. It excludes browser-to-Vercel travel and function startup before handler execution. Timer callbacks can be delayed by the event loop; 1,000 ms is an abort policy, not an absolute wall-clock SLA. A few successful samples cannot prove long-tail latency, every instance, replication propagation, or future availability. The diagnostic remains read-only; it cannot establish write permission or exercise reopening without a separately authorized flag write.

## Proposed release steps — each live action awaits approval

1. Review the final diff and evidence. Resolve the technically capable backup operator and MFA recovery procedure. Keep unrelated edits unstaged. Commit only the reviewed candidate after approval. Rebase/merge against the then-current release branch and rerun required gates if that changes code. Do not deploy the older local `main` blindly over newer production changes.
2. In a separately authorized release, add a production-only Secret named `INTAKE_REDIS_CHECK_TOKEN`, generated randomly, and set `LEAD_INTAKE_MAINTENANCE=scheduled`. Keep existing Redis credentials unchanged. Leave the dated reopening key absent or closed with no expiry. Confirm the authenticated migration notice is still November 8, 08:00–09:00 UTC. Do not provision any diagnostic token into preview/development.
3. Deploy ahead of the window (recommended target: by November 2, leaving several days to diagnose issues). Confirm the exact deployment/revision and `iad1` placement. Do not claim a green build proves Redis access.
4. From a trusted operator terminal, call the diagnostic once, then four more times sequentially. Use the production `www.veteranpcs.com` URL, not a preview. Record HTTP status, sanitized result and elapsed milliseconds. Require all five reads to be successful and below 1,000 ms, with `flag:absent` or `closed`. Treat this as a small sample, not a percentile or SLA. Repeat after an idle interval if useful; do not force cold starts or change configuration. A first request is not proof of a cold start. No form submissions are needed.
5. If the diagnostic fails, stop release acceptance. Investigate existing credentials/binding, region and provider health without displaying secret values. Any credential/configuration fix requires its own approval and a fresh deployment/check. Do not change the reopening key to make a diagnostic pass: absent is a valid successful read.
6. Check `/api/v1/intake-status` is open before the cutoff and the normal pages render. Establish a tested guarded rollback build before the release freeze; a rollback to the current unguarded production build would reopen intake. Freeze deployments through maintenance and reopening. Leave the diagnostic token in place through the window if needed; remove the route/token only in a later approved cleanup release, not by redeploying during reopening.
7. **November 8, 07:45 UTC / November 7, 23:45 PST:** verify public status is paused. **08:00–09:00 UTC / midnight–1 a.m. PST:** vendor window; stay paused if delayed. After verified Salesforce recovery and separate authorization, the operator sets only the dated key to exact `open`, with no expiry. Verify both the flag and public status; an already-open patched form updates without reload and requires deliberate submission. To re-pause, delete the key or set `closed`; do not deploy. Reconcile requests already sent near the boundary.

### Future operator read — do not run before the approved deployment

This prompts privately for the diagnostic token, keeps it out of arguments/history, refuses redirects, and prints only the permitted fields. Run on a trusted interactive terminal; do not paste credentials into chat. It performs five sequential GETs and no writes:

```python
import getpass, json, urllib.request, urllib.error
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None
token = getpass.getpass('Production diagnostic token: ')
opener = urllib.request.build_opener(NoRedirect)
allowed = ('ok', 'flag', 'failure', 'elapsedMs', 'withinBudget', 'budgetMs')
for sample in range(1, 6):
    request = urllib.request.Request(
        'https://www.veteranpcs.com/api/v1/intake-redis-check',
        headers={'Authorization': 'Bearer ' + token}, method='GET')
    try:
        with opener.open(request, timeout=5) as response:
            body = json.load(response)
            print(sample, response.status, {k: body[k] for k in allowed if k in body})
            if body.get('ok') is not True or body.get('withinBudget') is not True:
                break
    except urllib.error.HTTPError as error:
        print(sample, 'HTTP', error.code, '— stop and inspect sanitized diagnostic result')
        break
    except Exception:
        print(sample, 'transport or response failure — stop; no automatic retry')
        break
```

## Validation and limits

Initial pre-reconciliation verification:

- **1,093 tests across 118 files passed**, with external network access blocked. This includes all nine service entry points, four concierge tools, token recovery, directory failures, the 21 diagnostic cases and two new status-poll regressions. No unexpected network attempt was recorded.
- **Type checking passed. Lint passed with zero errors** and two existing image warnings in `components/homepage/StephHomepage/__tests__/interactions.test.tsx`.
- **Three isolated Next.js production fixture builds passed**, including the new diagnostic route. Each built server rejected an unauthenticated diagnostic request and accepted an authenticated fixed-key read without changing the mock flag or submission ledger.
- **40 browser reopening cases passed**: ten surfaces at 390px and 1440px, on the same build and with actions pinned to the older patched build. Every case retained its fields and accepted exactly one deliberate retry. The incompatible-build negative case retained details and rejected the old action as expected.
- Mobile contact-agent and desktop lender-listing screenshots were inspected: the notice wraps legibly, retained synthetic field values remain visible, and the mobile Submit control is available. The harness checked horizontal overflow in every reopening case.
- `git diff --check` passed. The first browser attempt compiled all fixtures but could not bind localhost inside the sandbox; the successful rerun allowed local listeners while retaining the test harness's outbound network block.

Rehearsal evidence: `/var/folders/7n/0qfvmvfd7yqcktt7yldjnz0m0000gn/T/vpcs-reopening-h09sG1/results.json` and the adjacent build logs and 40 screenshots. No normal production-data build or live submission was run. The fixtures copy no `.env` files and use synthetic credentials. Mocked tests establish application behavior, not Salesforce persistence or production readiness.

This patch preserves details only while the form remains mounted. Reloading/closing tabs can lose them; pre-patch tabs cannot be retrofitted. Redis propagation is not guaranteed instantaneous across replicas. A flag change cannot cancel an already-started Web-to-Lead POST. There is no durable queue, general submission idempotency, cross-instance Salesforce token lock, or recovery of delayed Lead ownership. Historical ambiguous submissions still need reconciliation before retry; not-sent maintenance refusals require a new deliberate submission. Arbitrary redeployments can invalidate open-tab Server Action IDs. Native production ISR behavior, Salesforce persistence, downstream automation and live Redis latency remain unverified by mocks.

## Release-branch reconciliation

Reconciled on October 17, 2026 against fetched `origin/main` at `cf98a96094519778bbdf062e1a9b588d7f94c4d5` (PR #216) in the isolated branch `codex/november-maintenance-readiness`. The patch applied without conflicts. The new VeteranPCS Bonus metadata, contact-form brand colors, and updated newsletter wording from the release branch remain intact; no older homepage/design assets are restored. All 56 candidate files remain in scope. The original checkout, headshot-skill edit, analytics investigation files and Salesforce report are untouched.

The reconciled source passed the isolated three-build browser rehearsal: 40 desktop/mobile reopening cases plus the expected incompatible-action rejection, with no external request violations. Evidence: `/var/folders/7n/0qfvmvfd7yqcktt7yldjnz0m0000gn/T/vpcs-reopening-BA6L6P/results.json`. The local commit retains the normal pre-commit hook (`lint`, `type-check`, `test`, `build`). Its credential-free environment uses CI's Salesforce prerender skip, synthetic Salesforce responses from localhost for remaining build-time reads, mocked Google font responses, and an external network guard. These local build artifacts must never be deployed; an authorized release must build fresh with its approved production configuration. No hook is bypassed.

Reconciliation verification also passed all **1,122 tests across 120 files**, lint (the same two existing image warnings), type checking, and the full Turbopack build with **914 generated pages**. The isolated full build served 6 synthetic token requests and 308 synthetic Salesforce reads, with zero rejected fixture requests or unexpected external requests. Build evidence: `/var/folders/7n/0qfvmvfd7yqcktt7yldjnz0m0000gn/T/vpcs-release-gates-ucdIA2/checks.log`. Mobile contact and desktop agent-listing reopening screenshots were inspected on the reconciled source.

## PR #217 CI follow-up — October 18, 2026

The first GitHub CI run failed while prerendering `/agents` because CI has no Salesforce credentials. The earlier local build used synthetic credentials and therefore did not reproduce this environment gap. Vercel's preview build and Semgrep passed at `2cfd213`.

Both nationwide directories now honor the existing `SKIP_SALESFORCE_PRERENDER=1` build mode by awaiting Next.js `connection()` before reading Salesforce. CI emits request-rendered routes instead of fabricated empty directories. With the flag unset, production still prerenders and uses 24-hour revalidation; query failures continue to reject rendering. Six additional mocked cases cover deferral before all reads, framework prerender interruption, and rejection of request-time Salesforce failures.

A full credential-free build matching CI passed locally with mocked fonts and external network blocked; `/agents` and `/lenders` were both emitted as dynamic routes, and no external request was attempted. Evidence: `/var/folders/7n/0qfvmvfd7yqcktt7yldjnz0m0000gn/T/vpcs-release-gates-IjgcNu/checks.log`. Optional author/impact lookups still use their existing credential-free fallbacks; this fix does not alter them. The CI-only build is not a deployable production artifact. See [Next.js connection documentation](https://nextjs.org/docs/app/api-reference/functions/connection).
