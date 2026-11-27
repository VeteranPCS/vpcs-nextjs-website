# Website intake Organization access

The dedicated website intake OAuth identity reads `Organization.Id` and `Organization.IsSandbox` to verify its Salesforce target. On the minimum-access API-only profile, this query requires the scoped permission pair demonstrated below. The Salesforce API Integration permission set license supplies the tested entitlement. The site's separate intake API permission set supplies Apex class and custom permission access.

## Packages

- `metadata/` contains the Metadata API manifest and `VPCS_Intake_Org_Identity` permission set. The set contains only `ViewRoles` and `ViewSetup`. `ViewSetup` provides setup visibility beyond the Organization query. Keep the assignment scoped to the dedicated website intake user.
- `webdev-diagnostic/` contains the same pair, the roles-only diagnostic set, and a WebDev-pinned Apex test. Keep this package out of Production. Its three synthetic minimum-access users, license assignments, and permission set assignments exist only within the rolled-back test transaction.

Each directory is a standalone Metadata API package. ZIP the contents of the selected directory with `package.xml` at the archive root. For the WebDev diagnostic, select `VpcsIntakeOrgAccessTest` under RunSpecifiedTests. The two roles-only debug booleans are recorded at ERROR level.

## Verified behavior

WebDev deployment `0Afjg00000050aUCAQ` passed the native test, and a synchronous rerun passed. The Salesforce API Integration license alone did not expose Organization. Adding `ViewRoles` alone still denied the query and did not implicitly enable `ViewSetup`, as shown by log `07Ljg0000005lMTEAY`. The earlier WebDev OAuth check with `ViewSetup` alone also failed. With the pair, the Apex user-mode query returned the exact Organization ID and sandbox flag. All three diagnostic actors lacked direct CRUD and query access to Lead, Account, Contact, Opportunity, the private blocklist, and the intake-attempt registry.

The files match the archived WebDev diagnostic and the separately staged permission package byte for byte. The Apex result covers user-mode behavior. Verify a fresh OAuth token for the assigned Production intake user by querying the exact expected Organization ID and sandbox flag and checking direct query denial on the same CRM and private objects.

## Production verification

The one-set package validated as `0Afjf0000003rKjCAI` with ten passing tests and deployed as `0Afjf0000003rMLCAY`. Harper explicitly approved the pair and the included API permission-set license only for `tech+salesforce-intake@veteranpcs.com` (`005jf000000NfGzAAK`). Its fresh client-credentials token verified that user, the Production My Domain, and `Organization.Id=00D4x000003yaV2EAI` with `IsSandbox=false`. Fixed no-row queries for Lead, Account, Contact and Opportunity each returned `INVALID_TYPE`. The final private-object and intake API checks remain separate release gates after their metadata activation.

Salesforce may materialize a profile-owned `PermissionSetAssignment` after licensing. Reconcile its `IsOwnedByProfile` and exact `ProfileId`; do not mistake the verified minimum-profile row for a separate explicit grant. The dedicated identity has no broad data, setup-edit, policy-operator or messaging permission.
