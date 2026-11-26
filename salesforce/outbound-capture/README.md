# WebDev outbound capture package

This sandbox-only overlay replaces the WebDev callback and changes the Quo and scheduled reminder boundaries. It leaves the production deployment untouched. The generated callback has no HTTP code, endpoint, or shared secret. A protected-preview callback needs a separate reviewed change with a dedicated credential and endpoint.

The SMS queue, launcher, and worker still run. WebDev records a capture before resolving a sender or using a Named Credential. Captured queue rows move to the terminal `Captured` state, with no provider message ID or sent timestamp. The package adds that value to the existing queue status field. Queue credential overrides are blocked. Scheduled sender enumeration records a capture and keeps the registration records. The Apex reminder batch captures its direct email operation while retaining the rest of the worker. Native Flow email, portal account email, email deliverability, and managed integrations have separate containment requirements.

`Webdev_Outbound_Capture__c` stores an action category, count, run ID, digest of audit metadata, and Salesforce `CreatedDate`. It does not store a record ID, recipient, sender, body, provider payload, or credential. Set the `VPCS_Webdev_Capture_Run_Id` label in WebDev to a nonsecret run marker before a rehearsal. The initial label is `baseline-capture`. Quo delivery remains disabled by this package.

## Prepare and validate

Run from the repository root with Python 3 and the verified Salesforce CLI on `PATH`.

```sh
node salesforce/scripts/prepare-outbound-capture.mjs
node --test salesforce/scripts/__tests__/outbound-capture.test.mjs
node salesforce/scripts/deploy-outbound-capture.mjs --archive
node salesforce/scripts/deploy-outbound-capture.mjs --validate
```

Preparation fingerprints the reviewed retrieved baseline and writes only to the ignored `salesforce/retrieved-private/webdev-outbound-capture-deploy` directory. The old callback is checked by fingerprint without copying it. An existing package with different contents must be moved aside before generating a new one.

`--archive` is offline. It builds a read-only, SHA-256-addressed Metadata API ZIP from the exact reviewed files under `salesforce/retrieved-private/outbound-capture-archives`. The archive has `package.xml` at its root. Validation and deployment both submit that ZIP as a single package and recheck its SHA-256 immediately before invoking the CLI. A digest sidecar accompanies each private deployment report.

Validation contacts Salesforce and must be run by the authorized operator. The deployment wrapper checks the exact CLI alias, instance URL, org ID, and `Organization.IsSandbox`. It rejects unexpected metadata files and runs a dry-run deployment with explicit Apex tests, requiring Salesforce to report at least 75 percent coverage for every changed non-test class. Full deployment results are retained under the ignored `salesforce/retrieved-private/outbound-capture-deploy-evidence` with mode `0600`. The terminal displays only sanitized component and test diagnostics. The CLI identity response is never saved. Record the run ID, test report, and coverage before continuing.

```sh
node salesforce/scripts/deploy-outbound-capture.mjs --apply
```

`--apply` repeats the validation before deploying the same package. It checks the org again before the deployment. The Apex trigger integration tests depend on the verified WebDev org and the baseline Person Account and Area metadata. Existing Quo tests use HTTP mocks to characterize production behavior. The new capture tests set the guard mode explicitly for unit cases and exercise the real org guard through Account and Area triggers. Offline tests check package contents and deploy gates. They do not compile or execute Apex.
