# Colorado relocation guide: implementation and acceptance

## Behavior and provenance

The Colorado page promotes Tyler Parker's 22-page Colorado Relocation Guide. Download Now opens the shared guide dialog and requires first name, last name, and email. An accepted Salesforce Web-to-Lead response starts the PDF download; the success state's manual link downloads again without another submission. Contact Tyler is a separate action using his existing VeteranPCS agent record (`001Rg00000pmUUk`). A download does not request an agent introduction.

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

Use an isolated loopback dev server. Never run these submissions against a live deployment. Keep Google and PostHog ingestion intercepted in browser tests; local dry-run suppresses CRM writes, notifications, owner routing, and server conversion events.

```sh
E2E_BASE_URL=http://127.0.0.1:3107 NEXT_PUBLIC_POSTHOG_ENABLE_LOCAL_CAPTURE=1 npm run test:e2e:server
```

In another terminal, after confirming the server started with dry-run enabled:

```sh
E2E_BASE_URL=http://127.0.0.1:3107 E2E_LEAD_DRY_RUN=1 E2E_POSTHOG_LOCAL_CAPTURE=1 npm run test:e2e -- e2e/colorado-guide-download.spec.ts --project=phone-narrow --project=tablet --project=desktop
npm run lint
npm run type-check
npm test
npm run build
```

Also run the existing Resources capture tests after changing the shared dialog. Inspect the saved promotion, dialog, and success screenshots. Checks include validation/focus, retry after a known failed request, pending duplicate suppression, complete PDF bytes/hash, fallback download without resubmission, Contact Tyler selection, narrow-screen overflow, event sequence, and personal-data exclusion.

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

This change starts from committed main, leaving the original checkout's maintenance/form work untouched. Rebase and reconcile any intake changes before a production release. Production deployment is separate from branch implementation; live acceptance remains pending until the user-run check above is completed.

## Automated verification recorded November 21, 2026

- Lint passed with two existing warnings in the unrelated homepage test image mock; type-check and production build passed.
- Vitest: 122 files, 1,101 tests passed.
- Colorado browser flow: 360px, 768px, and 1440px passed, including actual PDF hashes, both analytics envelopes, keyboard/focus, duplicate suppression, error/retry, and Contact Tyler navigation. No uncaught browser errors.
- Existing Resources guide regressions: all five VA/homebuyer entry points passed at 360px and 1440px (10 cases).
- Promotion, form, and success screenshots were visually reviewed; layout, labels, buttons, and fallback delivery were readable without clipping or horizontal overflow.
- All automated submissions used local dry-run and intercepted analytics. Live Salesforce persistence and real PostHog/GA ingestion are not claimed by these checks.
