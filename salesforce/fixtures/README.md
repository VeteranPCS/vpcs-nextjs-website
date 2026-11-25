# WebDev synthetic fixtures

`generate.py` reads the private sandbox snapshots and writes deterministic, reviewable Salesforce Composite REST requests. It validates record types against both Describe and the retrieved inventory, checks required fields and active restricted picklists, and resolves composite relationship references against the described target types. Generation runs entirely offline.

Generate a new bundle from the repository root. Reuse a run ID only to regenerate identical files. The default output directory is ignored by Git.

```sh
python3 salesforce/fixtures/generate.py --run-id qa-20261125 --close-date 2026-11-25
```

| File | Purpose |
|---|---|
| `plan.json` | Expected sandbox identity, record type and copied owner checks, duplicate queries, reconciliation queries, and local headshot needs |
| `template-contact-create.json` | One private standalone Contact with the exact approved `tech@veteranpcs.com` inbox and no Account, phone, or other recipient |
| `rendering-create.json` | Three Person Accounts, one Colorado Area, two assignments, and one Customer Opportunity in a single all-or-none request |

## Fixture choices

- `PersonAccountAgent`, `Person_Account_Lender`, and `Person_Account_Customer` drive the actual read-only role formulas. The agent and lender are active on the website and licensed in `CO`. All three have synthetic names. The Accounts and Opportunity reuse the verified, active copied Colorado owner instead of creating another user.
- Account brokerage and managing broker fields are blank. In the retrieved active `Account_AfterUpsert`, setting a brokerage name can create or link a company, and managing broker fields can invoke a subflow. The Account and Area Assignment triggers still request revalidation on fixture writes, so verified HTTP capture is required even for these rendering fixtures.
- The Customer Opportunity starts `Closed - Lost` with the active `Decided not to buy/sell` reason required by its validation rule. It leaves Agent and Lender relationships blank so the current immediate create Flow skips converted-customer partner alerts. The stage also keeps it outside open, under-contract, transaction-closed, paid, and Agent/Lender onboarding paths. Its synthetic 300,000 sale price, 123.45 payout, and 45.67 charity values exercise the website’s Customer aggregate query. Check the persisted stage and values afterward.
- The retrieved baseline contained no active Contact-start Flow or Apex Contact trigger. Keep Salesforce set to **System email only** for the standalone Contact insert. The Contact supplies the approved recipient identity to the native email overlay. Verify it before configuring that overlay.
- The rendering records intentionally omit email and phone. Use separate marked cases for eligible notification, schedule, and delivery tests once containment is proven. Keep provider phone and email changes out of this rendering bundle.

## Prepared November 25 rendering bundle

The reviewed bundle is `salesforce/fixture-exports/webdev-initial-20261125`. Check its exact request and plan against the private snapshots before use. The seed command defaults to this bundle and runs offline unless a mode is provided. Pass another generated directory under `salesforce/fixture-exports/` to use a different run.

```sh
python3 -B salesforce/fixtures/seed.py
```

The WebDev capture deployment and native recipient overlay have separate successful deployment receipts. The existing standalone template Contact has already been verified with the approved email and no Account. Reuse that identity for template email. The rendering request contains no standalone Contact or Lead inserts. Creation of Person Accounts also creates underlying Contacts.

Before the first rendering write, record the following in the private attempt evidence.

- Verify `Organization.Id`, `IsSandbox`, and the instance URL. Check that the copied owner is active and the three Account record types are active Person Account types. Verify the Opportunity record type is active and is `Customer`. Confirm the acting operator can write the exact fields in this packet.
- Reopen **Deliverability** and confirm **System email only**. Confirm the deployed capture-only Webhook, Quo and Apex reminder code and the current native Flow and Workflow Alert recipient overlay. [Review the remaining platform routing checks](../scripts/prepare-webdev-email-overlay.md#platform-routing-outside-the-overlay).
- Compare live active Flow and Apex trigger namespaces for Account, Contact, Area, Area Assignment, Opportunity and related writes with the reviewed baseline. Resolve any changed or managed integration that can run for the fixture before writing. Leaving recipient fields blank does not prevent an unrelated trigger from resolving its own destination.
- Reserve an idle window and set the sandbox capture label `VPCS_Webdev_Capture_Run_Id` to the exact bundle run ID. Record the start time, make sure the run ID has no capture rows, and inspect pending Apex jobs, Flow interviews and provider queues. Avoid unrelated writes while the marker is active. The label is org-wide. Restore the preceding label after the asynchronous work settles.

The reviewed Account Flow requires populated brokerage or managing broker fields to take those branches. The reviewed immediate Customer Opportunity Flow falls through at `Closed - Lost` with neither partner set. Scheduled Opportunity starts can still enqueue interviews; the reviewed send and update decisions require different record types or stages. Check any pending interview against its active version and record instead of assuming it sends or deleting it. A valid rendering attempt should produce only `AccountRevalidation` captures for the reserved marker. Independent Agent and Lender assignments each reach capture; the Account trigger can contribute more.

### Supplemental automation review

- **Rollup Helper.** The live All Rollups view displayed one active rule, in **Manual Run Only** mode. It counts Opportunity rows through `Opportunity.AccountId` into `Account.No_of_Opportunities_Closed_Won__c`. Keep the manual action out of the fixture window. The page displayed a permission advisory, so retain the visible one-row evidence alongside the API snapshots. The retrieved audit, queue, active job, and matching object realtime settings queries returned no rows. The company settings row has `rh2__Run_Realtime_Rollup__c=false`. The package labels that field **Allow Disable Realtime By Script**, so the field value alone cannot establish whether a rule runs in real time.
- **Managed email.** The saved Rollup Helper company settings now route exception mail to `tech@veteranpcs.com` and opt out of vendor exception forwarding. Keep the private `rh2-contained-settings.json` receipt with the pre-flight review. Check for changed settings, new jobs and queued notifications if the rendering or email window shifts.
- **Ad hoc scheduler.** The additional live Flow `Adhoc_Schedule_Run_Now` is an on-demand record action. The separate `AdhocSchedule` trigger runs on `AdhocSchedule__c` and delegates its record lifecycle. The rendering composite has no writes to that object, and the current query returned zero schedule records. The schedulable class can retain its configured Apex when it is scheduled and later forward it through `AdhocToolingApiService`. Keep unresolved existing jobs outside the fixture window and identify their class and scope before relying on them for any broader workflow test. The two unidentified 07:00 America/Denver schedules remain separate from the fixture's known capture path.

## Sandbox operator sequence

1. Deploy and verify the [HTTP capture overlay](../outbound-capture/README.md) in WebDev. Confirm Salesforce Deliverability is **System email only** before any fixture write.
2. Generate and review the bundle. Verify the target, copied owner, and active Person Account record types. Review any existing Contact with the same address against the duplicate rules. If the exact standalone fixture already exists, reconcile and reuse it. Keep the native email overlay pending until the Contact has been verified.
3. Insert the standalone Contact as described below. Confirm its persisted email is exactly `tech@veteranpcs.com` and its `AccountId` is null. Supply only that Contact ID for the native template or overlay recipient configuration.
4. Deploy and verify the native email overlay against the exact Contact and recipient controls. Keep **System email only** for the first rendering seed. Moving to **All Email** requires the separate approved direct-delivery window and negative-recipient evidence.
5. Seed the initial rendering bundle. Confirm the records and capture evidence before any stage changes or later eligible workflow cases.

### Execute and reconcile the prepared rendering bundle

Use the reviewed Salesforce CLI on `PATH` and its authorized `vpcs-webdev` alias. This rendering command reuses the existing template Contact through the deployed native email overlay. A separate Contact creation uses `template-contact-create.json` and the plan's duplicate and reconciliation queries, with its own target and deliverability review.

After confirming the gates above and setting the sandbox capture label, write a mode `0600` JSON attestation under `salesforce/retrieved-private/`. Use current UTC ISO values for `checkedAt` and `expiresAt`, no more than 30 minutes apart. Record the values below for this bundle.

| Key | Value |
| --- | --- |
| `orgId` | `00Djg000000EK8YEAW` |
| `instanceUrl` | `https://veteranpcs--webdev.sandbox.my.salesforce.com` |
| `runId` | `webdev-initial-20261125` |
| `renderingSha256` | `cc32a6dfb65020f3c720e372d73570271a37ca644cdda5778c922f283cfcce50` |
| `captureDeploymentId` | `0Afjg0000004c58CAA` |
| `emailDeploymentId` | `0Afjg0000004azOCAQ` |
| `deliverability` | `System email only` |
| `liveAutomationReviewed`, `idleWindowConfirmed` | JSON boolean `true` for each |

```sh
python3 -B salesforce/fixtures/seed.py --execute \
  --attestation salesforce/retrieved-private/rendering-fixture-attestation.json
```

Execution checks both completed deployment receipts, the exact org and instance, the copied owner and record types, all three duplicate marker queries, the capture marker, and the live async Apex, SMS and Flow interview queries. It verifies the existing capture label through the Tooling API. The one POST uses the reviewed request copied into the private journal. The journal reserves the run before posting and keeps the timestamp, request hash, and even an empty or partial response. Treat seven successful composite subresponses as acceptance. Verify persisted results and capture activity separately.

After the fixture async jobs settle, reconcile the persisted markers and capture records using the same bundle. This mode performs read-only Salesforce queries and stores their results and any prior composite receipt under `salesforce/retrieved-private/rendering-fixture-attempts/`. The verifier checks the role flags, Opportunity values, related records and captures. If a receipt is available, it also compares all seven created IDs with the persisted results.

```sh
python3 -B salesforce/fixtures/seed.py --reconcile
```

If the outcome is uncertain, preserve the attempt directory and use the read-only reconciliation. Seven matching persisted primary records are grounds to reuse the fixture. Investigate partial matches, mismatched IDs, failed or malformed responses, and unexpected captures. An empty query during an uncertain request can precede a commit. If Salesforce confirms a definite failure with no records or effects, record what happened and prepare a new reviewed run ID.

For the partner directory, the website looks up local WebP files by the persisted `AccountId_15__c`. The bundle records the existing synthetic SVG assets and expected paths. In an isolated browser verification checkout, create the two temporary WebPs using the reconciled Account IDs and the repository’s `sharp` dependency. Keep those sandbox-ID assets outside a production change. Directory verification should show both partners and their shared Colorado area. Confirm the synthetic Opportunity contributes the three expected amounts.
