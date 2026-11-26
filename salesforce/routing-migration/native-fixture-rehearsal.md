# WebDev owner migration rehearsal

Use the two marked fixtures from the verified WebDev seed. The seed ran before the Customer routing triggers were activated, with Apex capture enabled and Salesforce deliverability set to System email only.

| Fixture | Salesforce ID | Starting owner | Reviewed owner |
| --- | --- | --- | --- |
| Customer Lead for TX | `00Qjg000000UcRHEA0` | Stephanie | Beth |
| Customer Opportunity for NC | `006jg00000074GbAAI` | Beth | Stephanie |

The Opportunity used a synthetic Customer Person Account. Its first Interviewing path was due at **2026-11-26 03:52:48 UTC**. The Customer record is a timing control for these record-field paths, whose reminder decisions target the applicable onboarding records. The Lead had Web-to-Lead disabled and no scheduled welcome was expected.

## Record the baseline

1. Verify `vpcs-webdev` points to Organization `00Djg000000EK8YEAW` with `IsSandbox=true`. Confirm System email only and the reviewed capture transport. Use a dedicated operator window.
2. In Setup, open **Time-Based Automations**. Filter on Opportunity and the synthetic record name. Record each visible path and due timestamp before activation and again after activation. Use the same filters, timezone and date bounds at each step.
3. For the marked IDs, record current OwnerId, Lead status and Opportunity stage, the original destination, next contact dates, the Opportunity Interviewing timestamp, related Tasks, linked SMS queue rows and the synthetic Account owner. Compare pending SMS IDs and statuses and the configured reminder cron separately. Existing Due Time rows in Setup are the native queue evidence.
4. Set `Dispatch_Enabled__c=false` on both verified regional admin bindings in a separate metadata-only pause. Confirm both values and verify no unlinked pending SMS. The Apex CAS rejects owner changes while regional dispatch is enabled. Preserve native schedules. The timer eligibility, timer-source field values and Automation queue rows must stay comparable during the window.

## Limit the manifest to the two fixtures

Use a private directory outside the checkout. Set `fixture_run_dir` to that directory, then run from the repository root.

```sh
umask 077
node salesforce/routing-migration/salesforce-routing-operator.mjs snapshot \
  --target-org vpcs-webdev --org-id 00Djg000000EK8YEAW --sandbox true \
  --output "$fixture_run_dir/all-current.json"

jq '
  .records |= map(select(
    .id == "00Qjg000000UcRHEA0" or .id == "006jg00000074GbAAI"
  ))
' "$fixture_run_dir/all-current.json" > "$fixture_run_dir/fixtures.json"

node salesforce/routing-migration/salesforce-routing-operator.mjs plan \
  --snapshot "$fixture_run_dir/fixtures.json" \
  --output "$fixture_run_dir/manifest.json"
```

Review the private manifest and confirm it includes exactly the two expected transfers and no Task, Account, unknown state or terminal record. Confirm both ownership expectations from the table and verify the captured original destination, timer fields, pending SMS and manifest fingerprint.

## Apply, verify and roll back

The operator CLI expects evidence that native timer preservation was already verified. For the first measurement, use a separately authorized two-record WebDev canary through the permission-gated Apex CAS adapter, with the same fixture manifest and exact org checks. Capture the Time-Based Automations evidence before and after that canary. An Apex unit test and an initial queue listing do not establish preservation.

1. After the native containment and dispatch checks have passed, temporarily assign `VPCS_Routing_Migration_Operator` to the dedicated WebDev operator. Keep ordinary Salesforce edits out of this window because the native Flow permission guard also applies to direct owner changes by that user.
2. Prepare an apply attestation bound to the exact org, run ID, action and reviewed manifest fingerprint. Record the operator window start and expiry. Attest native Flow containment, timer preservation checks, paused dispatch and reconciliation of unlinked legacy SMS with the observations from this run.
3. Run apply against the fixture-only manifest.

```sh
node salesforce/routing-migration/salesforce-routing-operator.mjs apply \
  --target-org vpcs-webdev --org-id 00Djg000000EK8YEAW --sandbox true \
  --manifest "$fixture_run_dir/manifest.json" --run-id customer-routing-cas-20261125-01 \
  --attestation "$fixture_run_dir/apply-attestation.json" \
  --output "$fixture_run_dir/apply-result.json"
```

4. Confirm two durable applied receipts. Re-read the two CRM records and the original Time-Based Automations rows while the first path is still pending. OwnerId and Salesforce ownership audit fields may differ. Require unchanged destination, statuses, timer values, due rows, task counts, queue rows and Account owner. Check capture and Workflow traces for any new notification or enrollment attributable to the transfer.
5. For rollback, use the same manifest and run ID and a separately reviewed attestation with action `rollback`. Change the command from `apply` to `rollback`, the attestation path to `rollback-attestation.json`, and the output path to `rollback-result.json`. Require two durable rollback receipts and recheck the pinned values and native queue. After an uncertain result, resume the same run and reconcile the durable receipts.
6. Revoke the temporary operator permission and restore both verified dispatch flags in a separate metadata-only resume. The regional worker claims only `New` queue rows. Keep `Held` rows in operator review. At the natural due time, record the scheduled path execution or the expected no-action decision for the marked Customer fixture. Record the outcomes of the readback and permission removal. Any fixture cleanup must target only the explicitly marked records.

If a scheduled row has already fired, use the preserved baseline and matching execution trace and keep the pending-row comparison unresolved. A comparison of the Source Date field alone cannot establish that a native pending row survived. [Salesforce scheduled paths](https://help.salesforce.com/s/articleView?id=sf.flow_concepts_trigger_scheduled_path.htm&language=en_US&type=5)
## Native referral Task control

The one-Task WebDev control mirrors the four Production baseline Task candidates. Each has a Lead parent already owned by the reviewed regional admin.

Use the latest validated Task CAS code. With the synthetic outbound capture enabled, System email only, and both regional dispatch flags false, the authorized WebDev operator may run the separately reviewed fixture seed. It creates one marked TX Customer Lead owned by Beth and one incomplete `Reach out to new Lead` Task owned by Stephanie. It prints the two synthetic IDs as `VPCS_NATIVE_TASK_CAS_SEED`. Keep the seed and raw output private.

Capture a fresh current-schema snapshot. Filter its records to the exact synthetic IDs and generate a private manifest with the operator CLI. Require an unchanged Beth-owned Lead and one Task transfer from Stephanie to Beth in the same manifest. The parent must be included so both Task operations have a reviewed and locked comparison. Compare the Lead timer values and Task relation, subject, open status and due date before writes.

Use the bounded WebDev operator permission and separate apply and rollback attestations for this exact manifest and run ID. Apply should yield one Task receipt, and a resumed apply should yield `already-applied`. Confirm the Task now belongs to Beth while the parent and activity values remain pinned. Rollback should restore Stephanie, leave the same Lead snapshot in scope, and produce one rollback receipt. A second rollback should report `already-rolled-back`.

Any parent edit invalidating its expected state must stop the Task operation. A failed Task rollback in a run that also transferred its parent must defer the parent rollback. Do not refresh a reviewed capture with current values to force a rollback past a conflict. Reconcile the record with the operator instead.

Revoke the temporary migration permission before restoring both regional dispatch flags. Leave `Held` queue rows unchanged. Clean up the two synthetic fixtures only within the authorized WebDev scope.
