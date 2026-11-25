# WebDev SMS capture operator

This standalone package supplements the existing queue object access of the WebDev Tech operator `0054x000008x6NqAAI`. Verify the CLI target is org `00Djg000000EK8YEAW` with `Organization.IsSandbox=true` before validating or applying. Assign the permission set only to this operator for the synthetic capture run. Revoke the assignment after readback. The package grants field access on `SMS_Message_Queue__c` and is separate from the website app permission sets. The queue's retrieved sharing model is internal `ReadWrite`, so read access to these fields is subject to the operator's existing record scope.

The Tech REST describe showed queue object create and read access plus the custom fields `Status__c`, `To_Phone_Number__c`, and `SenderEmail__c`. The retrieved queue schema and deployed batch use other fields hidden from that session. Salesforce applies the current user's object and field access during anonymous Apex compilation. [Salesforce Anonymous Blocks](https://developer.salesforce.com/docs/platform/apex-dev/references/apex-dev/apex-anonymous-block.html)

## Verify and run

1. Confirm the operator's profile and license through the exact sandbox user row. Confirm `SMSMessageQueueTrigger` is active using a Tooling API query and that no queue rows are in `New`, `Processing`, or `Retry`. Confirm no SMS launcher or batch jobs are in progress and the current capture run ID has no SMS capture rows.
2. Validate the exact ZIP with `WebdevOutboundCaptureTest`, `SmsMessageQueueBatchTest`, and `SmsMessageQueueBatchLauncherTest`. Include `SMSMessageQueueTriggerTest` if the current org's Apex class query finds it. After applying and assigning the permission set, re-run REST describe in the same Tech session. Confirm the write inputs are createable and the six outcome fields are visible and read-only. The package adds no Apex, object permissions, or user permissions.
3. In one all-or-none REST create request, insert the two synthetic rows with reserved fictional phone values and synthetic message text. Use `Status__c=New` on both and `Named_Credential__c=OpenPhone` only on the negative row. Omit `Retry_Count__c` from both input rows so the object default applies. Keep the two returned record IDs. The after-insert trigger starts the native launcher and worker.
4. Read back the two queue records by their returned IDs, the matching launcher and worker jobs, and the capture row for the active run marker. The normal row must be `Captured`. The explicit-override row must be `Error` with `Provider_Status__c=SandboxBlocked`. Both should have one attempt, `Success__c=false`, and empty `Message_Id__c` and `Sent_At__c`. Expect exactly one `Sms` capture with item count one and successful batch execution. Record IDs, statuses, counts, and timestamps without copying phone numbers or message bodies into the evidence.

Read-only query shapes for checking the run:

```sql
SELECT Id, IsActive, ProfileId, Profile.Name, Profile.UserLicense.Name
FROM User WHERE Id = '0054x000008x6NqAAI'

SELECT Id, Name, Status, ApiVersion
FROM ApexTrigger WHERE Name = 'SMSMessageQueueTrigger'

SELECT Name FROM ApexClass WHERE Name = 'SMSMessageQueueTriggerTest'

SELECT COUNT()
FROM SMS_Message_Queue__c
WHERE Status__c IN ('New', 'Processing', 'Retry')

SELECT Id, Status, ApexClass.Name FROM AsyncApexJob
WHERE ApexClass.Name IN ('SmsMessageQueueBatchLauncher', 'SmsMessageQueueBatch')
AND Status IN ('Queued', 'Holding', 'Preparing', 'Processing')

SELECT Id, Status, ApexClass.Name, JobType, NumberOfErrors, CreatedDate, CompletedDate
FROM AsyncApexJob
WHERE ApexClass.Name IN ('SmsMessageQueueBatchLauncher', 'SmsMessageQueueBatch')
AND CreatedDate >= <run start UTC>
ORDER BY CreatedDate

SELECT Id, Status__c, Provider_Status__c, Message_Id__c, Sent_At__c,
       Last_Attempt_At__c, Retry_Count__c, Success__c
FROM SMS_Message_Queue__c WHERE Id IN ('<normal ID>', '<override ID>')

SELECT Id, Action__c, Item_Count__c, Run_Id__c, Digest__c, CreatedDate
FROM Webdev_Outbound_Capture__c WHERE Run_Id__c = '<run ID>' AND Action__c = 'Sms'
```

Recreate the immutable ZIP from the repository root. Use the ZIP as the explicit metadata input with `--single-package`.

```sh
node --input-type=module <<'JS'
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createReviewedArchive } from './salesforce/scripts/metadata-archive.mjs';

const paths = ['package.xml', 'permissionsets/VPCS_Webdev_SMS_Capture_Operator.permissionset'];
const files = Object.fromEntries(paths.map(path => [
  path, readFileSync(resolve('salesforce/access/operator-metadata', path), 'utf8'),
]));
console.log(createReviewedArchive(files, 'salesforce/retrieved-private/operator-permission-archives'));
JS
```
