# Salesforce intake admission package

Deploy `metadata/` to verified WebDev with capture restored and ordinary website writes off. The package
adds a private blocklist, a before-save Lead trigger, a private intake attempt registry, the website
API, and the submission payload hash. The existing honeypot validation and native notification
metadata stay as deployed. Production metadata validation uses the same scope after WebDev gates.

## Policy data and permissions

Assign `VPCS_Intake_API` only to each verified website intake runtime principal. The permission
set grants class access and a custom permission. The endpoint uses exact parameterized lookups and
returns decisions or claim state. It has no raw Lead, blocklist, or enumeration response. The
permission set grants no object access. Verify denial from the ordinary Preview principal and
verify ordinary REST object queries remain denied for the restricted website principal. Keep the
separate workflow fixture permissions in WebDev only.

The blocklist stores lowercase SHA-256 hex of UTF-8 canonical email and a non-personal reason.
Use a private operator workflow and restrict blocklist record access. Existing exact rule
entries must be canonicalized and reconciled as active rows before retiring `Block_Predatory_Email`.
Check canonical collisions in the inventory and account for each original entry; preserve the
legacy rule if any identity is missing. Build deactivation from a fresh private retrieval of the
specific rule and change only its active flag. Keep that metadata, the original rule, and the
migration sheet outside version control. Record counts and test outcomes without disclosing
addresses or hashes. Keep `Block_Spam_Submission` active and verify both Web-to-Lead field IDs
against the selected target.

## Submission IDs and release order

Before enabling website admission, audit active and soft-deleted Lead rows for duplicate nonempty
submission IDs, including case-folded equivalents. Resolve collisions through the approved
operator procedure and preserve historical blank IDs. Retrieve only the selected org's
`Lead.VPCS_Submission_ID__c` field; build a separate scoped package using
`prepare_submission_uniqueness.py <retrieved-field-or-Lead.object> <new-private-output-directory>`.
Review the result against the retrieved baseline. It preserves Text(128), nullability and other
field properties, and sets the unique check to case-insensitive. Never deploy the retrieval's
other Lead metadata. Recheck the audit and validate the uniqueness change during the coordinated
hold and producer drain. Test that a duplicate insert fails and multiple blank IDs still work.
Run the isolated `uniqueness-regression/metadata` package and
`VpcsLeadSubmissionUniquenessTest` after the index is active, or with the index change in a
combined validation package. The website serializer also needs the org-specific wire ID of
`VPCS_Submission_Hash__c`.

The private attempt row's unique UUID arbitrates dispatch. Row locking serializes reconcile and
notification claims. `inspect` returns registry state, while `reconcile` verifies the current
persisted Lead. A missing readback following a dispatch claim is unconfirmed. Dispatch claims
have no automatic expiry or replay. No website Slack or accepted conversion event may run without
a confirmed Lead and a successful notification claim. An interruption after the notification
claim can omit the website notification; investigate it using the exact attempt and Lead evidence.

Run `VpcsIntakeAttemptApiTest` and `VpcsLeadEmailAdmissionTest`, plus affected routing, status
and reminder tests. Exercise concurrent requests from separate HTTP sessions in WebDev: two claims
for one UUID, a conflicting payload on that UUID, and two notification claims on one verified
Lead. Verify exact row/count readback and run the direct Web-to-Lead honeypot and blocked-identity
negatives before naming the Salesforce backstop verified. Record native outreach evidence for
accepted controls through the protected workflow, with capture as the default.
