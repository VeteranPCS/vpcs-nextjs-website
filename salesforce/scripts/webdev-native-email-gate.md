# WebDev native email canary gate

Keep WebDev Deliverability at **System email only** while verifying these controls. Use a separate synthetic Customer Lead, created once by the verified WebDev administrator through the Salesforce API, for the native timer canary. Its exact approved mailbox is `tech@veteranpcs.com`. The successful website rehearsal proved that the generic Contact Form persists with `WebToLead__c=false`. Preserve that website behavior and set the field explicitly to true only on the separate native fixture.

The Lead must persist with the Customer record type, `WebToLead__c=true`, a status starting with `New`, no partner, no referrer, no buying/selling or destination base, and no download or partner-contact URL. With those fields, the retrieved immediate Flow falls through. The expected native action is `Lead.Welcome_Video_Alert_to_Customer` in `Lead_WebToLead_Customer_Scheduled_AfterInsert`, five minutes after insert. Use the [recipient overlay runbook](prepare-webdev-email-overlay.md#first-native-delivery) for the action and inbox receipts.

## November 25 result

The canary Lead `00Qjg000000UUVJEA4` was created at 20:49:11 UTC. Its pending path was due at 20:54:11, and the approved inbox received the welcome at 20:55:01. The operator restored **System email only** before 20:56 UTC.

Salesforce Email Log Files for 20:50–20:57 UTC showed two receipt rows and two successful SMTP delivery rows. All four rows used one Message-ID matching the inbox and one recipient, `tech@veteranpcs.com`. Both SMTP deliveries were at 20:55:01, with zero temporary or permanent failures. The two internal IDs for the same Message-ID are consistent with the configured compliance BCC to the same inbox. The evidence establishes one native welcome. It does not establish the other scheduled or portal email paths. The private evidence is under `salesforce/retrieved-private/native-welcome-20261125/`. The verified email-log ZIP SHA-256 is `28745e9a3d31347d72d65d406a640f44c9adcb8887666b0bb5008ab0a6b55fd7`.

## Experience Cloud scope

The two active Site records share one sandbox host. The retrieved `VeteranPCS` Network links `site=VeteranPCS` at the root and `picassoSite=VeteranPCS1` at `/s`. Its metadata reports `UnderConstruction`, `selfRegistration=false`, `sendWelcomeEmail=true`, and Designer overrides for login, forgot password and self-registration. It lists the administrator profile as the sole member group. The root CustomSite still names `CommunitiesSelfReg` and `CommunitiesLogin`. [Network metadata reference](https://developer.salesforce.com/docs/platform/api-metadata/references/meta-types/metadata-network.html)

The live November 25 query returned one Network in `UnderConstruction` and the same active guest user and VeteranPCS Site Profile for both Site records. The baseline contained 16 guest Visualforce pages. Sandbox validation `0Afjg0000004eWjCAI` and deployment `0Afjg0000004eYLCAY` each passed four tests. The post-deploy readback removed only `SiteRegister`, `CommunitiesSelfReg` and `MicrobatchSelfReg`. The other 13 pages still include the login and reset pages. The sole guest Apex class, `AgentPortalController`, remained granted.

| Entry | What the retrieved code does | Reachability to verify |
| --- | --- | --- |
| `ForgotPasswordController` | Calls `Site.forgotPassword` with the provided username. Redirects to the confirmation page when accepted. | Published Designer Forgot Password and Reset Password settings, and any guest-enabled legacy Visualforce page wired to this controller. |
| `CommunitiesSelfRegController` | Passes the supplied email to `Site.createExternalUser`. The retrieved profile and Account configuration are placeholders. | Self-registration flag, current handler and settings, and direct guest access to the legacy Visualforce registration page. A placeholder alone does not establish platform behavior. |
| `MicrobatchSelfRegController` | Passes the supplied email to `Network.createExternalUserAsync` with new Contact and Account data. | Selected micro-batch or custom handler, linked guest page, and pending micro-batch work. |
| `SiteRegisterController` | Calls `Site.createPortalUser` with the supplied email and a placeholder portal Account ID. | Legacy `SiteRegister` page and any custom registration pages reusing the controller. |
| Signed-in profile and password change | `MyProfilePageController` rejects guests and can save the signed-in User. `ChangePasswordController` changes the current user's password. | Verify who can sign in during the window. Keep User changes, membership changes and identity tests out of the Lead canary. |

System email mode still allows password resets and new-user email. Salesforce sends Experience Cloud reset and verification email directly. Experience Cloud welcome emails also omit the compliance BCC recipient. A safe sender or compliance BCC setting does not restrict these original recipients. [Email deliverability](https://help.salesforce.com/s/articleView?id=platform.data_sandbox_email_deliverability.htm&type=5), [System email relay behavior](https://help.salesforce.com/s/articleView?id=005132427&language=en_US&type=1), [Experience Cloud email options](https://help.salesforce.com/s/articleView?id=000248073&language=en_US&type=1)

## Operator checks

Run the following as the authorized sandbox administrator. Keep IDs and enabled page lists in private evidence. These queries do not retrieve email address values.

```sh
sf data query --target-org vpcs-webdev --query \
  "SELECT Id, IsSandbox FROM Organization"
sf data query --target-org vpcs-webdev --query \
  "SELECT Id, Name, Status, SiteType, UrlPathPrefix, GuestUserId FROM Site WHERE Name IN ('VeteranPCS','VeteranPCS1')"
sf data query --target-org vpcs-webdev --query \
  "SELECT Id, Name, Status, UrlPathPrefix FROM Network ORDER BY Name"
sf data query --target-org vpcs-webdev --query \
  "SELECT Id, ProfileId, Profile.Name, IsActive, UserType FROM User WHERE Id IN ('<root guest user>','<builder guest user>')"
sf data query --target-org vpcs-webdev --query \
  "SELECT Id, ProfileId, Name FROM PermissionSet WHERE IsOwnedByProfile = true AND ProfileId IN ('<root guest profile>','<builder guest profile>')"
sf data query --target-org vpcs-webdev --query \
  "SELECT AssigneeId, PermissionSetId FROM PermissionSetAssignment WHERE AssigneeId IN ('<root guest user>','<builder guest user>')"
sf data query --target-org vpcs-webdev --query \
  "SELECT ParentId, SetupEntityId, SetupEntityType FROM SetupEntityAccess WHERE ParentId IN ('<guest profile-owned and assigned permission set IDs>') AND SetupEntityType IN ('ApexPage','ApexClass')"
sf data query --use-tooling-api --target-org vpcs-webdev --query \
  "SELECT Id, Name, NamespacePrefix FROM ApexPage WHERE Id IN ('<enabled ApexPage IDs>')"
sf data query --use-tooling-api --target-org vpcs-webdev --query \
  "SELECT Id, Name, NamespacePrefix FROM ApexClass WHERE Id IN ('<enabled ApexClass IDs>')"
```

List each actual ID separately inside `IN` and skip lookups for empty result sets. Compare the count of active users with email to the approved or nondeliverable subset. For site users, derive the relevant user IDs from actual Network membership and check those IDs. WebDev's User query rejected `IsPortalEnabled`, so avoid that filter. Verify any difference without exposing the original addresses.

```sh
sf data query --target-org vpcs-webdev --query \
  "SELECT COUNT() FROM User WHERE IsActive = true AND Email != null"
sf data query --target-org vpcs-webdev --query \
  "SELECT COUNT() FROM User WHERE IsActive = true AND (Email = 'tech@veteranpcs.com' OR Email LIKE '%.invalid')"
```

The live counts were 16 and 12. The remaining four were two Automated Process users, one Cloud Integration user and one Sales Insights integration user. Verify their effective eligibility for identity email and their recipient routing before treating the difference as contained. Keep the private query evidence under `salesforce/retrieved-private/native-email-gate/`.

- In **Digital Experiences → All Sites → Workspaces → Administration**, verify **Settings** and published status, **Members**, **Login & Registration** and **Emails**. Inspect the actual Forgot/Reset paths and any enabled headless registration, passwordless login or forgot-password endpoints. A configured email template alone establishes neither an enabled endpoint nor a recipient restriction. [Login and password settings](https://help.salesforce.com/s/articleView?id=experience.networks_customize_login.htm&language=en_US), [Headless and membership metadata](https://developer.salesforce.com/docs/platform/api-metadata/references/meta-types/metadata-network.html)
- In the root **Site → Public Access Settings** and the Experience Builder **Settings → General** guest profile, inspect **Enabled Visualforce Page Access** and **Enabled Apex Class Access**. Map the enabled page markup to its controller or extension. Salesforce permits a Visualforce page to invoke its controller without a separate class grant. Include legacy registration, confirmation and forgot-password pages, as well as custom replacements identified by the live configuration. [Salesforce guest-profile guidance](https://help.salesforce.com/s/articleView?id=sf.networks_guest_profile_best_practices.htm&language=en_US&type=5)
- For a private metadata retrieve, list live full names for `Network`, `CustomSite`, `Profile`, `ApexPage` and `ExperienceBundle`. Request `Network:VeteranPCS`, `CustomSite:VeteranPCS`, both exact guest `Profile` members, each enabled account-entry `ApexPage`, and corresponding `ApexClass` members in the same retrieve. Start with `CommunitiesSelfReg`, `CommunitiesSelfRegConfirm`, `SiteRegister`, `SiteRegisterConfirm`, `ForgotPassword`, `ForgotPasswordConfirm`, `CommunitiesLogin` and `ChangePassword` when they exist. Use the listed Builder bundle full name if already available. The `picassoSite` name does not establish a second `CustomSite` metadata member. Inspect the Builder routes in Setup if the bundle is unavailable. [Profile metadata](https://developer.salesforce.com/docs/platform/api-metadata/references/meta-types/metadata-profile.html), [ExperienceBundle metadata](https://developer.salesforce.com/docs/platform/api-metadata/references/meta-types/metadata-experiencebundle.html)

## Minimum containment before the window

Keep unused self-registration paths disabled. If guest signup pages are still exposed and the sandbox does not use them, remove only their guest page grants after verifying the route and preserve the saved settings. Leave authenticated portal business pages, existing membership and working Flows in place. Keep the reset path only when the reachable active sandbox accounts resolve to the approved mailbox or verified nondeliverable addresses. Where an unapproved recipient remains reachable, use a narrowly scoped sandbox identity or route restriction and verify it before opening **All Email**.

Recheck the Lead auto-response default, Apex exception and package recipients, pending jobs, Flow interviews and SMS work immediately before the window. Keep User creation, membership changes, resets and portal activation out of the window. A site activation or new member assignment can issue welcome messages. Restore **System email only** immediately after the canary window and retain the exact Lead, pending path, Salesforce email log and inbox receipt. [Experience Cloud email options](https://help.salesforce.com/s/articleView?id=000248073&language=en_US&type=1)
