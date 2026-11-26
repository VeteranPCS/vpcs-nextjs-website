# WebDev website integration access

This package targets the verified WebDev org `00Djg000000EK8YEAW`. The [field inventory](field-inventory.json) lists the website queries, permissions and Lead owner allowlist. The [Metadata API package](metadata/package.xml) stages the permission sets, Lead guard, and Apex tests separately from `force-app` for sandbox validation.

| Candidate | Intended access |
|---|---|
| `VPCS_Webdev_Read` | Ordinary Preview. Read Account, Contact, Opportunity, Area Assignment, and Area. No Lead access. |
| `VPCS_Webdev_Test` | Local and protected workflow-test sessions. Same reads plus Lead reconciliation. The routing website only reads marked Leads after Web-to-Lead. The candidate retains the PR #240 sandbox Lead Edit permission under the existing owner-only guard. |

Both candidates leave create, delete, object-level view-all, object-level modify-all, and global transfer grants off. Web-to-Lead creates the initial Lead through its separate Salesforce endpoint. Keep metadata reconnaissance, fixture preparation and Account activation under separate operator access. State maps and headshots come from repository assets. The unused authenticated image helper warrants no Salesforce Files or Attachments grants.

## Licensing and identity

Use separate internal users with **Salesforce Integration** licenses and the **Minimum Access - API Only Integrations** profile (`00eRg000002nW0nIAE`). The sandbox snapshot showed four of five Integration user licenses available and all five separate **Salesforce API Integration** permission set licenses available. That capacity covers both planned identities. Verify the expected assignments, that the profile grants `API Enabled`, and that each proposed object grant is supported by the resulting license combination. Review User object automation and account setup email before creating the users.

Configure two server-side External Client Apps for client credentials with their respective run-as users and the `api` OAuth scope. Restrict app access to the dedicated users. Keep credentials and tokens in the approved server-side secret stores.

Both External Client Apps returned OAuth tokens with the sandbox instance URL. With the initial permissions, both sessions received `INVALID_TYPE` for `SELECT Id, IsSandbox FROM Organization`. The verifier stopped before running website queries. An administrator CLI query confirms the target independently of the app users' permissions.

The deployed permission sets include the read-only system permissions `ViewSetup` and `ViewRoles`. These expose setup and role information. Live inspection confirmed both and verified that `ViewAllData` and `ModifyAllData` remain off. The package also excludes `CustomizeApplication` and object-level view-all and modify-all permissions. Deployment `0Afjg0000004cwMCAQ` completed 11 tests. Both actual app sessions then passed the Organization check for `Id=00Djg000000EK8YEAW` and `IsSandbox=true`.

### Run-as OAuth evidence

From the repository root, use the configured local WebDev target and the two private, mode `0600` app credential files under `salesforce/retrieved-private/app-credentials/`. Leave the site’s existing credentials and write flags as configured. The verifier loads the selected app credentials into its own process and uses the shared Salesforce connection to validate OAuth, the instance and the Organization before making bounded read-only queries.

```sh
node salesforce/scripts/verify-webdev-app-access.mjs preview
node salesforce/scripts/verify-webdev-app-access.mjs workflow
```

The verifier exercises the agent and lender selections with nested coverage, author lookups, the impact aggregates and baseline Contact access for both roles. Preview must receive explicit permission errors on Lead and on Contact email/mobile and their Account person aliases. The workflow probes also exercise those fields, selected-partner and revalidation lookups, and the Lead owner and reconciliation queries. The routing reconciliation query verifies read access to `Agent__c`, `Lender__c`, `Additional_Comments__c`, `VPCS_Visitor_ID__c`, and `VPCS_Submission_ID__c` in the workflow app. These grants are read-only and leave the Preview permission set unchanged. Zero rows can establish query acceptance for a lookup. To establish visibility after seeding the exact marked fixtures, repeat with `--account-id <sandbox-marked-Account-ID>` for either role and `--lead-id <sandbox-marked-Lead-ID>` for workflow. Those arguments require the specified record to be visible on the relevant lookup.

Each command saves a separate report under `salesforce/retrieved-private/webdev-app-access-evidence/` and exits nonzero when a required query fails or an expected denial succeeds. Reports contain query names, statuses, counts and recognized Salesforce error codes. They omit query strings, supplied fixture IDs, returned rows and OAuth credentials. A failed Organization check stops all other requests. Lead transfer and write denial use separate guard evidence.

The November 25 reports passed all 13 Preview checks and all 19 workflow checks. Preview's Lead query returned `INVALID_TYPE` and all four phone/email queries returned `INVALID_FIELD`. The post-seed reports `2026-11-25-preview-yjeyP7` and `2026-11-25-workflow-UhzSpC` confirmed partner fixture visibility. Report `2026-11-25-workflow-P1mMKy` also confirmed the marked Lead lookup.

Guard fix deployment `0Afjg0000004cbPCAQ` passed 12 Apex tests. The actual workflow app updated the first marked Lead owner with HTTP 204, and a fresh ten-form run verified both contact owner readbacks. Keep the positive transfer receipts and the Apex negative guard tests linked to the sandbox-only deployment.

## Verify field and relationship permissions

The XML grants read access to fields confirmed permissionable by the eight sandbox administrator Describe snapshots. This includes Account billing fields, the backing Contact fields for Person Account aliases, Area Assignment score, and selected Lead reconciliation fields. The Preview candidate omits partner email and phone. The `describeGates` entries in the field inventory list the fields and relationships that still need effective run-as verification.

For the later sandbox operator, collect describes with explicit target selection. Repeat the relevant queries through each actual run-as OAuth session when verifying effective access.

```sh
sf data query --target-org vpcs-webdev --query 'SELECT Id, IsSandbox FROM Organization'
sf data query --target-org vpcs-webdev --query "SELECT Id, MasterLabel, TotalLicenses, UsedLicenses FROM PermissionSetLicense WHERE MasterLabel = 'Salesforce API Integration'"
for object in Account Contact Area_Assignment__c Area__c Lead Opportunity Organization; do
    sf sobject describe --target-org vpcs-webdev --sobject "$object" --json
done
```

- Account Describe identifies `Area_Assignments__r` as `Area_Assignment__c.Agent__c`. `Area_Assignment__c.Area__c` targets `Area__c`. `AA_Score__c` accepts a field grant. The lookup fields and `Area__c.State__c` are non-permissionable. Verify the exact nested directory query under both users.
- Test Account `__pc` aliases using their described backing Contact grants. WebDev validation `0Afjg0000004cRhCAI` requires Contact Read for Account Read. Verify the Account person name fields and exact `BillingAddress` compound selection, including which constituents the query reveals.
- Lead `OwnerId` is updateable in administrator Describe and has no field permission setting. Verify `Owner.Name` and the standard reconciliation fields. Update access belongs to the retained PR #240 sandbox guard. Keep broad `User` and `Group` directory permissions out of the candidate.
- Workflow-only `Contact.Email` and `Contact.MobilePhone` back the optional selected-partner lookup. Verify access to the corresponding Account aliases and intended fixture records.
- Confirm Opportunity `RecordTypeId` queries and the three aggregate permissions with the actual workflow and Preview users. No record type assignment is part of the candidate. Enable the sandbox Web-to-Lead record types through its separate configuration.

## Verify Lead sharing and the legacy PR #240 owner guard

The retrieved internal sharing models are Account `ReadWrite`, Opportunity `Read`, and Lead `ReadWriteTransfer`. All three external sharing models are `Private`. These are internal API integration users. Public internal sharing can give the users access beyond the rows returned by the website queries. Review actual sandbox records and scope the workflow user to an approved test data set before enabling Lead Edit.

Contact Read allows direct Contact queries within each user's effective record sharing and field access. The Contact sharing model still needs confirmation. Check visibility for a private standalone Contact and a Contact linked to a shared Account before activating either app. Test that Preview cannot read Contact `Email` or `MobilePhone`, including through the Account person aliases. The workflow-only field grants expose those fields on accessible Contact records, so verify the intended synthetic record scope before enabling its credentials.

The PR #240 website used a guarded Lead owner PATCH in WebDev. The routing website removes that write path. The existing sandbox permission and trigger stay in place for transition compatibility. Lead Edit grants object-level update capability. `VpcsWebdevLeadOwnerGuardTrigger` applies only to `tech+webdev-workflow@veteranpcs.com.webdev` in the exact WebDev org with `Organization.IsSandbox=true`. It accepts `OwnerId` assignments to the four verified active regional owners, including a repeated assignment to the current approved owner. The prior Lead must already carry the Web-to-Lead markers. `FirstName` starts with `[VPCS WEBDEV TEST]`. `Description` starts with `[VPCS WEBDEV TEST] ` followed by the run and submission identifiers produced by `markWebdevSubmission`. The guard blocks insert, delete, undelete, unapproved owner assignments, and changes to other business fields, including fields unavailable to field-level permission controls.

The before- and after-update checks compare persisted field values to catch changes regardless of Apex trigger ordering. They skip calculated values, auto-numbers, compound field projections and Salesforce audit timestamps. They still compare compound field components such as `City`. The active `Lead_BeforeUpsert` Flow can set an expected move date or recalculate partner and email fields even for an owner update. Fresh Web-to-Lead fixtures must already have the resulting values. An owner change accompanied by a real change in those business fields fails closed. The approved run-as test must cover fresh fixtures with and without selected partners, including the effect of downstream automation. Keep the workflow write flag off if legitimate owner changes are rejected until the schema or workflow behavior is reconciled without weakening the guard.

When verifying the retained PR #240 guard, use an approved sandbox transfer and requery the final owner. Repeat the assignment after the Lead already has that approved owner. Verify denial for a non-owner field change, an unmarked Lead, an unapproved destination owner, and insert or delete. Confirm the same guard leaves ordinary operators and Web-to-Lead creation paths operational. Keep global transfer rights out of both candidates. If the exact transfer fails, inspect fixture ownership, record sharing and specific Lead transfer behavior before changing permissions.

Sandbox deployment `0Afjg0000004eRtCAI` rolled back after the provisioned workflow user’s owner-only run-as test reported `LastTransferDate` as the sole additional changed field. The guard skips this Salesforce-maintained timestamp by exact API name. `IsUnreadByOwner` remains subject to the same comparison and negative test as other business fields. The captured sandbox REST Lead describe omitted `LastTransferDate`, while the Apex trigger comparison saw it. The reason for that difference in this org is unconfirmed. Salesforce documents the field’s API name and its association with ownership changes. [Lead field reference](https://developer.salesforce.com/docs/platform/field-reference/references/field-reference/salesforce-field-reference-lead.html) and [Lead fields](https://help.salesforce.com/s/articleView?id=leads_fields.htm&language=en_US&type=5).

Validate the package and `VpcsWebdevLeadOwnerGuardTest` in the sandbox after the exact workflow user is provisioned. The Apex test uses `System.runAs` and real trigger DML to verify an approved transfer, same-owner retry, denied Company edit, and denied delete. Separately verify the effective permissions of both OAuth sessions, including profile, permission sets, licenses, and sharing. Preview must run the website reads and fail an authorized negative Lead read or write probe. The workflow user must pass the same website reads and bounded Lead probes. Keep website write flags off until deployment, assignment and outbound-containment checks are complete.

Actual FieldPermissions confirmed `Account.BillingAddress` as the compound permission. Do not deploy separate BillingCity, BillingState or BillingStateCode grants; those remain query fields. Salesforce validation rejected the component grant names in `0Afjg0000004cbNCAQ`.
