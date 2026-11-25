# Salesforce webdev workspace

This Salesforce DX workspace supports WebDev provisioning and sandbox-tested changes. `force-app` is a scaffold. The retrieved baseline is in the ignored `retrieved-private/` directory pending review for secrets and dependencies.

Use the explicit `vpcs-webdev` alias on every command. Do not configure a production default org. The website uses separate External Client App credentials; CLI authentication does not configure the website.

## Bootstrap

The official CLI is installed on the current Mac at `/Users/harperfoley/.local/share/vpcs-tools/bin/sf` (2.159.7). Add that directory to your own terminal PATH or use the full path. Other developers should install the official CLI, then verify `sf version`.

WebDev is provisioned. The approved CLI session on the current Mac is authenticated as `vpcs-webdev`. On a fresh workstation, authenticate against the verified My Domain, then run the identity query.

```sh
sf org login web --instance-url https://veteranpcs--webdev.sandbox.my.salesforce.com --alias vpcs-webdev
sf data query --target-org vpcs-webdev --query "SELECT Id, IsSandbox FROM Organization"
```

The identity query returned `Id=00Djg000000EK8YEAW` and `IsSandbox=true`. Require both values before a scoped command. The two website OAuth apps also verified the sandbox and passed 13 Preview and 19 workflow read and denial checks against the seeded data. Verified Web-to-Lead and owner mappings are in the WebDev manifest. [App access and evidence](access/README.md)

The rendering run reconciled seven synthetic primary records and three account revalidation captures. The first Contact Agent rehearsal created a Lead and hit an owner-transfer error. The deployed guard fix was verified on that record. A fresh sandbox run passed all ten form persistence checks, including the two contact owner readbacks. Keep website writes off outside approved capture runs. The protected workflow-test branch is absent remotely. [Rendering fixture operator guide](fixtures/README.md)

## Inventory before test data

Metadata retrieval `09Sjg000000BrfJEAS` produced 257 files using `manifest/environment-inventory.xml`. Separate private inventory queries also returned 14 record types and 12 scheduled jobs. Use that baseline to review active Flow versions, email actions and indirect recipients, queue workers, Named Credentials, remote sites, custom settings and metadata, callback configuration, and managed integrations. Retrieve referenced email template folders and required permission sets separately as the dependency review identifies them. Keep unreviewed material in `retrieved-private/`.

Record each scheduled job's class, expression, execution user, timezone, and next-fire time. No production record or historical SMS backlog is copied/replayed as a fixture. Developer sandbox metadata does not supply the representative business records or prove scheduler readiness.

Keep Deliverability at **System email only** outside an approved send window. The guest-profile change removed three unused signup routes and retained the login and reset grants. The five-minute native welcome reached `tech@veteranpcs.com` and matched Salesforce Email Log Files. The Salesforce SMS queue captured the normal fixture and blocked a credential override without provider receipts. Dedicated sender and handset checks are pending. [Native email gate](scripts/webdev-native-email-gate.md)

Review retrieved source for embedded secrets before copying the narrowly scoped files into `force-app`. Sandbox-only transport settings must not enter a production deployment manifest.

## Verification and promotion

- Test changed Apex with meaningful assertions and callout mocks. Record test run IDs, failures, and coverage; run the relevant existing regression suite as well.
- Deploy changes to `vpcs-webdev` first. No direct production Apex edits.
- Validate Flow behavior with eligible and ineligible synthetic records; capture native scheduling and final delivery evidence.
- No production metadata deployment is part of the initial website environment switch. Later Salesforce releases require a separate reviewed manifest, sandbox evidence, production validation/test coverage, and explicit target selection.
- A sandbox refresh invalidates the previous identity/mapping/isolation attestation. Recheck credentials, recipient controls, schedules, and fixture relationships before re-enabling writes.

See [the environment runbook](../docs/salesforce-webdev-environment.md) for current execution status and handover requirements.
