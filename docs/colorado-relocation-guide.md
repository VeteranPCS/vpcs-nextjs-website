# Colorado relocation guide: implementation and acceptance

## Behavior and provenance

The Colorado page promotes Tyler Parker's 22-page Colorado Relocation Guide in its own section immediately below the lending-support banner. Download Now opens the shared guide dialog and requires first name, last name, and email. An accepted Salesforce Web-to-Lead response starts the PDF download; the success state shows Tyler's portrait and agent card with Contact Tyler as the primary next step. A subordinate Download again link handles a blocked or missed download without another submission. Contact Tyler is a separate action using his existing VeteranPCS agent record (`001Rg00000pmUUk`). A download does not request an agent introduction. Clicking Contact Tyler from the success card carries the accepted first name, last name, and email into his contact form through a one-time, target-scoped sessionStorage handoff that expires after 15 minutes. It is written only on that explicit click, never placed in a URL or analytics, and never submits the contact form automatically.

- New asset: `/downloads/colorado-relocation-guide-tyler-parker-v7.pdf`.
- Source: `Colorado_Relocation_Guide_Tyler_Parker_V7.pdf`, provided by Jason Anderson on November 20, 2026. The PDF is unchanged.
- SHA-256: `b816103bade949338238a93ec77ad930f95a65a04128fbb04d95aa4bf95227e1`.
- Cover: a reduced WebP rendering of the supplied PDF's first page; no redrawn cover artwork.
- Previous `/downloads/colorado-pcs-guide.pdf` remains unchanged for existing links (SHA-256 `de08483cf591ba9f8dcad0436c12894423726258491ac20cbdefed554530db76`).
- Shared metadata: `lib/guides/colorado-relocation.ts`.
- Storage is the existing public downloads directory. The form is a marketing gate, not private-file authorization. There is no emailed attachment or delivery-email promise.

## Salesforce contract

The dedicated action creates a Customer Lead using the existing one-POST submission engine. Names and email are required and bounded to the verified Salesforce field lengths (40/80/80). The server fixes LeadSource to `Colorado Relocation Guide`, WebFormURL to `https://www.veteranpcs.com/colorado`, and Description to the guide, author, V7, Colorado/CO, and source path. It appends the existing visitor/submission IDs. Colorado is not written as the person's residential address.

The existing spam, Slack, and dry-run handling is retained. There is no selected-agent assignment, partner owner-routing call, partner SMS, or newly enabled `WebToLead__c` workflow flag. Account and Opportunity conversion is downstream CRM behavior. The source picklist is unrestricted; existing guides likewise use source names outside the displayed standard picklist.

A successful HTTP response and `lead_conversion_created` mean the Web-to-Lead endpoint accepted the request. Neither proves that Salesforce persisted the expected record. Read-back is mandatory for live acceptance.

## Automated local verification

Use an isolated loopback dev server. Never run these submissions against a live deployment. Keep Google and PostHog ingestion intercepted in browser tests; local dry-run suppresses CRM writes, notifications, owner routing, server conversion events, and shared Redis lead rate-limit writes. Other spam signals remain evaluated; production rate limiting is unchanged.

```sh
E2E_BASE_URL=http://127.0.0.1:3107 npm run test:e2e:server
```

In another terminal, after confirming the server started with dry-run enabled:

```sh
E2E_BASE_URL=http://127.0.0.1:3107 E2E_LEAD_DRY_RUN=1 npm run test:e2e -- e2e/colorado-guide-download.spec.ts --project=phone-narrow --project=tablet --project=desktop
npm run lint
npm run type-check
npm test
npm run build
```

Also run the existing Resources capture tests after changing the shared dialog. Inspect the saved promotion, dialog, and success screenshots. Checks include validation and focus, retry after a known failed request, pending duplicate suppression, complete PDF bytes and hash, fallback download without resubmission, narrow-screen overflow, personal-data exclusion, and zero PostHog requests. The loopback Colorado flow links to the general Colorado agent form and leaves its contact fields blank. The component tests cover the event sequence and the production Contact Tyler link with its one-time prefill.

## One user-run live acceptance

This is a human-operated acceptance step under `.claude/skills/vpcs-verify/SKILL.md`, which prohibits agents from submitting live lead forms. The user performs the one real submission; the agent can inspect resulting records and events read-only. A normal guide Slack notification is expected. No partner SMS should be sent.

1. Complete the automated checks, stop the dry-run server, and confirm the worktree is on `codex/colorado-relocation-guide`. If newer intake-maintenance work has merged, retain its guard and confirm intake is open; do not bypass a maintenance pause.
2. Start a separate branch-local server with the production integration credentials, explicitly enable localhost PostHog capture, and disable dry-run only for this supervised test:

   ```sh
   LEAD_DRY_RUN=0 NEXT_PUBLIC_POSTHOG_ENABLE_LOCAL_CAPTURE=1 npm run dev
   ```

3. The user opens `http://127.0.0.1:3000/colorado` in a normal browser with analytics allowed, opens Download Now, and submits once using a controlled inbox and clearly marked test name. Use Tag Assistant for GA DebugView. Do not retry an uncertain submission until its Salesforce result is checked.
4. Record the submission ID from the server's `Form submission successful [ID]` log or the server-action result. Do not paste credentials or full contact details into reports.
5. Query Salesforce read-only using that exact submission ID:

   ```sql
   SELECT Id, FirstName, LastName, Email, LeadSource, WebFormURL__c,
          Description, OwnerId, Status, IsConverted,
          VPCS_Visitor_ID__c, VPCS_Submission_ID__c, CreatedDate
   FROM Lead
   WHERE VPCS_Submission_ID__c = 'SUBMISSION_ID'
   ```

   Require exactly one record with matching test details and guide attribution. If ingestion is delayed, poll reads only; do not repeat the POST. Inspect normal guide ownership, not automatic Tyler assignment.
6. In PostHog project 480186, find exactly one `lead_conversion_created` by `submission_id`. Verify `form_id`/`guide_id=colorado_relocation_guide`, `state_code=CO`, `state_slug=colorado`, and `source_page_path=/colorado`. Use the visitor ID to inspect the client CTA, form, and download events. No email or personal name should be present in event properties.
7. In GA4 property 289589120, confirm receipt of one `conversion_download` with `content=Colorado Relocation Guide` and the Colorado page path. The current GTM container maps `content`; it does not forward extra guide/state custom parameters. DataLayer presence alone is insufficient evidence of ingestion.
8. Click the success-state manual download once: PDF download succeeds, PostHog reports `download_trigger=manual_link`, and there is no additional Salesforce request or GA conversion.
9. Stop the live-test server. Use dry-run again for further automated work. Record sanitized evidence (submission ID, record ID, timestamps, event counts, and pass/fail), keeping actual test contact values out of committed artifacts.

Vercel previews are visual-review surfaces for this task. They are not Salesforce sandboxes: `LEAD_DRY_RUN` is disabled in production builds, and client PostHog is intentionally disabled on preview hosts. Do not submit preview forms or treat absent preview PostHog events as a production defect.

## Release boundary

This change starts from committed main, leaving the original checkout's maintenance/form work untouched. Rebase and reconcile any intake changes before a production release. Production deployment is separate from branch implementation; the acceptance evidence below records the user-run check and its remaining analytics limitations.

## Automated verification recorded November 21, 2026

- Lint passed with two existing warnings in the unrelated homepage test image mock; type-check and production build passed.
- Vitest: 125 files, 1,127 tests passed after the placement and prefill revision.
- Colorado browser flow: 360px, 768px, and 1440px passed, including actual PDF hashes, both analytics envelopes, keyboard/focus, duplicate suppression, error/retry, and Contact Tyler navigation with one-time name/email prefill. The card uses the verified Tyler headshot; the guide section follows the intact lending banner. A reload leaves the contact fields empty, and no contact-form POST occurs during handoff. No uncaught browser errors.
- Existing Resources guide regressions: all five VA/homebuyer entry points passed at 360px and 1440px (10 cases).
- Revised promotion, form, and success screenshots were visually reviewed at phone, tablet, and desktop sizes. The dedicated light section is distinct from the navy lending banner; Contact Tyler is primary on the success card, with Download again subordinate. Labels, buttons, and fallback delivery are readable without clipping or horizontal overflow.
- All automated submissions used local dry-run and intercepted analytics. Live Salesforce persistence and real PostHog/GA ingestion are not claimed by these checks.

## User-run live acceptance recorded November 21, 2026

The user submitted once from the local branch at 20:49 UTC (12:49 PM Pacific). The assistant performed read-only verification. Test contact values are omitted.

- Submission ID: `mwqvs0jt-k3z89p`.
- Salesforce: exactly one Lead, `00Qjf000000XcphEAC`, created at `2026-11-21T20:49:02Z`; first name, last name, and email populated; LeadSource `Colorado Relocation Guide`; WebFormURL `https://www.veteranpcs.com/colorado`; V7/author/CO description correct. Status `New:_Not_Contacted`; unconverted; visitor/submission IDs persisted.
- PostHog project 480186: one `guide_download_requested` at `20:49:00.844Z` and one `guide_download_started` at `20:49:02.688Z`, joined by the Salesforce visitor ID. Both carry `colorado_relocation_guide`, `/colorado`, `CO`, `colorado`, and `download_trigger=form_submission`.
- The server log recorded `rate-limit` quarantine, so the existing spam rule intentionally suppressed `lead_conversion_created`. No server conversion receipt is claimed. The automated dry-run checks had consumed shared Redis buckets; this branch now skips those writes only during local dry-run, with a regression test proving production still enforces rate limits even when the dry-run variable is set. The follow-up user-run acceptance below, after the rate window, proved server conversion ingestion.
- GA4 property 289589120: realtime API returned exactly one `conversion_download` in the test minute. Live guide-specific `content`/page-path attribution is not yet proven by this result; realtime does not expose that event-scoped custom dimension. Automated browser tests verify the exact outgoing `content=Colorado Relocation Guide` payload.
- The live server was stopped before further changes and automated testing. No replay of the lead POST or synthetic production conversion was performed.

## Final user-run acceptance after the revision

The user tested the committed revised flow at `2026-11-21T20:59:07Z` (12:59 PM Pacific), after the earlier submission's 10-minute window. They confirmed the flow worked and separately tested the fallback download successfully. The assistant did not submit either form.

- Submission ID: `mwqw50zv-e49btp`.
- Salesforce: exactly one matching Lead, `00Qjf000000XdNZEA0`, created at `20:59:08Z`. Required contact fields are populated, guide/page/CO attribution is correct, and the record remains unconverted with normal guide ownership. The server recorded one guide submission and no spam quarantine for this test.
- PostHog: exactly one `lead_conversion_created` at `20:59:08.927Z`, joined to that Salesforce submission ID, with `form_id=guide_id=colorado_relocation_guide`, `/colorado`, `CO`, `colorado`, `has_email=true`, and no partner assignment.
- PostHog automatic download: requested `20:59:08.021Z`, started `20:59:10.315Z`. Fallback download: requested `20:59:15.978Z`, started `20:59:15.979Z`; both fallback events have `download_trigger=manual_link`. All four events carry the guide and Colorado page/state attribution.
- GA4 realtime read at `20:59:32Z`: one new `conversion_download` in the test minute, plus the earlier test's one event ten minutes before. The fallback did not add a GA conversion. Exact received `content`/page-path remains a standard-report follow-up; receipt of the event and the automated outgoing-payload checks are separately verified.
- The revised Contact Tyler prefill, keyboard focus, no automatic contact submission, and exclusion of contact values from URLs/analytics passed the browser tests at all three widths. No live contact-form submission was required.
- Live server stopped after verification. No server is left running. Branch work was not pushed or deployed.
