# Prepare the WebDev email recipient overlay

This offline Python 3.10+ command prepares private Metadata API files from the verified `webdev` retrievals. Its direct-email destination is `tech@veteranpcs.com`. Keep the source retrievals and generated XML in `salesforce/retrieved-private/`.

## Read-only inventory

Run from the repository root.

```sh
python3 -B salesforce/scripts/prepare-webdev-email-overlay.py \
  --metadata-dir salesforce/retrieved-private/baseline-2026-11-25/unpackaged/unpackaged \
  --metadata-dir salesforce/retrieved-private/email-settings-2026-11-25/unpackaged/unpackaged
```

The November 25 inputs contain 42 active Flows, 53 reachable Workflow Alerts, and nine direct native Send Email actions. Workflow Alert references come from active Flows and immediate or timed actions on active classic Workflow Rules. Active Flow references to missing subflows or alerts, unknown email action shapes, and conflicting source copies fail validation. The inventory lists recipient binding types, source hashes, unresolved external action dependencies, and the compliance BCC flag. It omits original recipient values and fixture Contact IDs.

## Prepare a candidate

Verify the sandbox identity and the fixture Contact's ID and email in Salesforce. The intended Contact must resolve to `tech@veteranpcs.com`. Pass its verified ID to the command above and select a new private output directory.

```sh
# VPCS_WEBDEV_FIXTURE_CONTACT_ID is the verified sandbox Contact ID.
python3 -B salesforce/scripts/prepare-webdev-email-overlay.py \
  --metadata-dir salesforce/retrieved-private/baseline-2026-11-25/unpackaged/unpackaged \
  --metadata-dir salesforce/retrieved-private/email-settings-2026-11-25/unpackaged/unpackaged \
  --fixture-contact-id "$VPCS_WEBDEV_FIXTURE_CONTACT_ID" \
  --portal-origin https://veteranpcs--webdev.sandbox.my.site.com \
  --output salesforce/retrieved-private/webdev-email-overlay-2026-11-25
```

The candidate contains only the manifest members named in `package.xml`, with Workflow Alert subcomponents and affected active Flows.

- **Workflow Alert.** Replace configured recipients and CCs with a single Additional Emails entry. Keep the native alert, sender and template. Salesforce may resolve recipient merge context differently with no User or Contact recipient, so verify rendering in the canary.
- **Flow without a template or recipient record.** Replace address inputs with one literal address. Clear copied To, Cc, Bcc and recipient-ID variants by removing their inputs.
- **Flow with a template, recipient record, or activity logging.** Bind one fixture Contact via `recipientId`. Supply its verified ID before writing the candidate. Preserve the template, `relatedRecordId`, original activity logging setting and attachments. A logged message can now be associated with the synthetic Contact; verify the expected related activity on the fixture record. Inspect attachment sources using synthetic files.
- **Portal links.** The writer requires the verified sandbox Experience Cloud origin and rewrites six reviewed literals across the Lead SMS message, the daily Lead and Opportunity email subflows, and the Lead Update screen. Existing paths, query parameters and record references are preserved. Other production portal links in active Flow metadata block preparation.
- **Metadata invariants.** Before and after XML projections are compared while excluding only recipient-related nodes. The separate portal step replaces only the origin in six explicitly named elements. Decisions, connectors, timers, templates, senders, activity configuration, and the remaining subject/body content stay intact. The writer accepts only a new directory inside the ignored private retrieval directory.

## Template and label links

The exact November 25 URL plan used both private template retrievals and the private Custom Labels export. It produced `salesforce/retrieved-private/webdev-email-url-overlay-final-2026-11-25` with 57 changed bodies and nine changed Custom Labels out of 60 audited templates. Run with a new output directory to reproduce the candidate.

```sh
python3 -B salesforce/scripts/prepare-webdev-email-overlay.urls.py \
  --template-root salesforce/retrieved-private/email-templates-2026-11-25/unpackaged/unpackaged/email \
  --template-root salesforce/retrieved-private/native-email-templates-2026-11-25/unpackaged/unpackaged/email \
  --labels salesforce/retrieved-private/eca-settings-labels-2026-11-25/unpackaged/unpackaged/labels/CustomLabels.labels \
  --plan salesforce/retrieved-private/webdev-email-url-plan-final-2026-11-25.json \
  --output salesforce/retrieved-private/webdev-email-url-overlay-rebuilt
```

Omit `--plan` and `--output` for an inventory of hosts, image indicators and merge fields. Each plan entry binds one template or label to its exact reviewed source value, approved destination and occurrence count. The writer verifies the resulting template, including links inherited from changed labels. Unknown dynamic links, unapproved remote assets, copied operational links and stale plan values block output. Original EmailTemplate XML metadata stays byte-identical.

Literal Salesforce and Experience Cloud links retain their original path and query on the verified sandbox origins. The candidate inlines the repository PNG for branding, uses the approved inbox for mail links, and uses the verified sandbox `/s` landing page for unresolved form, partner and external-service actions. Those landing links support delivery testing; they do not exercise the final sandbox form, scheduling, paperwork, or partner destination. Bind and test the actual fixture URLs before counting those workflows complete.

The URL preparer accepts only the three exact WebDev Salesforce origins. It rejects every Vercel origin, including one supplied in a private replacement plan. A workflow-preview destination must first be provisioned and independently bound to the exact project, Preview environment, test branch and verified deployment protection before a separate reviewed change can permit it.

## Direct delivery gate

The combined recipient and URL package validated as `0Afjg0000004byhCAA` and deployed to WebDev as `0Afjg0000004azOCAQ`. The deployment completed 127 metadata components and 28 tests with zero component or test errors. The sandbox Apex outbound capture guard was deployed separately. These results establish deployment and test status. Native email receipt and live provider routing remain open.

Deliverability was verified as **System email only**. Compliance BCC was verified enabled with the sole address `tech@veteranpcs.com`. The saved metadata exposes only the enabled flag. Recheck the address in Setup immediately before the window. Web-to-Lead Default Lead Creator was verified as the sandbox VeteranPCS Technology user. Confirm the template From addresses and current fixture Contact email before testing.

The 55 retrieved Workflow Alert template bodies include five literal production Experience Cloud links, four `Opportunity.New_Form_URL__c` links, multiple URL custom labels, one literal production Lightning link, and 50 templates with remote production-hosted branding images. The inspected HTML image tags contained no explicit 1px or pixel-path marker. Remote assets still generate requests when a client loads them. Keep the native templates and replace operational portal, form, and record URLs in the sandbox copies. Resolve URL labels, agent/lender links and Visualforce merge fields using synthetic fixtures. Replace actionable third-party destinations with safe fixture links and use sandbox-hosted or inline branding for the canary.

Seven direct Flow actions use templates. Their five distinct templates, including `AdminNotifications/Admin_Lead_Accepted_Alert`, were retrieved separately and included in the URL audit. Verify sandbox merge values, related record IDs, Visualforce rendering and attachments before exercising their branches.

### Platform routing outside the overlay

| Surface | November 25 evidence and remaining check |
| --- | --- |
| **Process Automation Settings** and **Apex Exception Email** | Setup showed process/Flow error routing through Apex Exception Email Recipients. Reopen the settings to verify Default Workflow User is VeteranPCS Technology and Automated Process User Email Address is `tech@veteranpcs.com`. Verify the saved Apex exception recipient list resolves solely to `tech@veteranpcs.com`. Several active actions have no fault connector, so this route matters even when every normal recipient was patched. The metadata retrieval reported `Settings type: 'Workflow' is unknown`. |
| **Web-to-Lead**, **Lead Auto-Response Rules**, and **Lead Assignment Rules** | The supplemental Lead auto-response file is empty. The active assignment rule `Default` has one User assignment entry, one criterion and no email template. Verify the Web-to-Lead Default Response Template field, the matching assignment and the saved fixture owner. Confirm task assignment notification settings and the actual owner mailbox before any branch that creates a task. |
| **Digital Experiences → All Sites → Workspaces → Administration** | The retrieved `VeteranPCS` Network is Under Construction with self-registration off and Send Welcome Email on. It retains welcome, password-change, forgot-password and headless templates. The active `VeteranPCS` CustomSite still declares `CommunitiesSelfReg`, `CommunitiesLogin` and standard portal pages. Verify Login & Registration and Emails for the Network associated with each active Site, including `VeteranPCS1` at `/s`. Check Site Public Access Settings for accessible guest Visualforce/Apex signup and reset paths. |
| User, password and community notifications | The retrieved `User.workflow` is empty and none of the retrieved active Flows starts on User. The baseline Apex includes `ForgotPasswordController` (`Site.forgotPassword`), `CommunitiesSelfRegController` and `MicrobatchSelfRegController` (external-user creation), and `SiteRegisterController` (portal-user creation). `PostRefresh` invokes a password reset in its sandbox-copy hook. Keep User, membership, registration and reset actions out of the Lead canary. Account for public or concurrent access to those actions during the delivery window. |
| **Installed Packages**, **Named Credentials**, **Remote Site Settings**, and connected email integrations | Review active managed trigger and Flow namespaces on the chosen fixture objects and any related writes. Copied endpoint configuration establishes that destinations exist. Verify reachability and sandbox routing before using a fixture that invokes a package or an external action. Check Gmail/Outlook connected integrations separately. |

The retrieved Workflow files contained no classic Workflow Rules or outbound message declarations. Four retrieved Alerts had no active Flow reference and sit outside the overlay: `Lead.New_Lead_Alert_to_Agent`, `Opportunity.Customer_Anniversary_Email_to_Customer`, `Opportunity.Customer_Opp_Closed_Alert_to_Agent_Assigned` and `Opportunity.TEST_OPP_ALERT`. Compare live active Flow versions, approval actions and pending interviews before assuming those alerts are unreachable. The overlay covers the action versions identified in the retrieval.

Inspect **Time-Based Workflow**, **Paused and Failed Flow Interviews**, **Scheduled Jobs**, **Apex Jobs** and **Outbound Messages** before choosing the delivery window. The scheduled-job snapshot includes daily Opportunity work, four daily jobs at 09:00 America/Denver, and two 07:00 jobs with unresolved identifiers. Compare current names and next-fire times. A pending interview can execute a version that predates the overlay. The deployed SMS queue reads `New` and `Retry` entries. Use counts or sanitized names for the review.

```sh
sf data query --target-org vpcs-webdev --query "SELECT COUNT() FROM SMS_Message_Queue__c WHERE Status__c IN ('New','Retry')"
sf data query --target-org vpcs-webdev --query "SELECT ApexClass.Name, Status, JobType, CreatedDate FROM AsyncApexJob WHERE Status IN ('Holding','Queued','Preparing','Processing')"
sf data query --target-org vpcs-webdev --query "SELECT CronJobDetail.Name, CronExpression, State, NextFireTime, TimeZoneSidKey FROM CronTrigger WHERE State IN ('WAITING','ACQUIRED','PAUSED') ORDER BY NextFireTime"
sf data query --use-tooling-api --target-org vpcs-webdev --query "SELECT Name, NamespacePrefix, TableEnumOrId, Status FROM ApexTrigger WHERE Status = 'Active'"
sf data query --use-tooling-api --target-org vpcs-webdev --query "SELECT DeveloperName, NamespacePrefix, ActiveVersionId FROM FlowDefinition WHERE ActiveVersionId != null"
```

### First native delivery

The live website rehearsal confirmed that the generic Contact Form Lead persists with `WebToLead__c=false`. Use a separate marked synthetic Customer Lead inserted once by the verified WebDev administrator through the Salesforce API, with `WebToLead__c=true` explicitly set, a status starting with `New` and the approved mailbox. Verify that the saved Lead has no partner, referrer, buying/selling, destination base, or download and partner-contact URL. The retrieved immediate Flow falls through for that fixture. The expected native action is `Lead.Welcome_Video_Alert_to_Customer` in `Lead_WebToLead_Customer_Scheduled_AfterInsert`, five minutes after insertion. An unassigned contact-agent or contact-lender fixture adds two immediate alerts and an owner-assigned task. [Native email gate](webdev-native-email-gate.md)

Keep Deliverability restricted until the separate provider paths, platform recipients and pending work have been checked. In the bounded delivery window, tie the marked Lead and scheduled Flow action to an Email Log Files entry addressed solely to the approved mailbox and the received message. Restore **System email only** at the end of the window. Preserve the interview, log and inbox evidence. A delivery canary does not exercise the portal, managed packages, SMS or the later Opportunity branches.

## Offline verification

```sh
python3 -B salesforce/scripts/prepare-webdev-email-overlay.test.py
python3 -B salesforce/scripts/prepare-webdev-email-overlay.urls.test.py
```
