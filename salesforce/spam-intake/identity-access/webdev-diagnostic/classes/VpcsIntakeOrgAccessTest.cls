@IsTest
private class VpcsIntakeOrgAccessTest {
    private static final String WEBDEV_ORG = '00Djg000000EK8YEAW';
    private static final String PROFILE_NAME = 'Minimum Access - API Only Integrations';
    private static final String LICENSE_LABEL = 'Salesforce API Integration';
    private static final String SET_NAME = 'VPCS_Intake_Org_Identity';
    private static final String ROLES_ONLY = 'VPCS_Intake_Org_Roles_Diagnostic';
    private static final String ORG_QUERY = 'SELECT Id, IsSandbox FROM Organization';
    private static final List<String> PRIVATE_OBJECTS = new List<String>{
        'Lead', 'Account', 'Contact', 'Opportunity', 'Vpcs_Blocked_Email__c', 'Vpcs_Intake_Attempt__c'
    };

    @IsTest
    static void licenseAloneDoesNotExposeOrganizationAndScopedGrantKeepsDataDenied() {
        Organization org = [SELECT Id, IsSandbox FROM Organization WITH SYSTEM_MODE];
        Assert.isTrue(org.IsSandbox);
        Assert.areEqual(WEBDEV_ORG, String.valueOf(org.Id));
        for (String name : PRIVATE_OBJECTS) {
            Assert.isTrue(Schema.getGlobalDescribe().containsKey(name), 'Required WebDev object missing: ' + name);
        }

        List<Profile> profiles = [
            SELECT Id, PermissionsApiUserOnly, PermissionsViewSetup, PermissionsViewRoles,
                   PermissionsModifyAllData, PermissionsViewAllData
            FROM Profile WHERE Name = :PROFILE_NAME WITH SYSTEM_MODE LIMIT 2
        ];
        Assert.areEqual(1, profiles.size());
        Profile profile = profiles[0];
        Assert.isTrue(profile.PermissionsApiUserOnly);
        Assert.isFalse(profile.PermissionsViewSetup || profile.PermissionsViewRoles ||
            profile.PermissionsModifyAllData || profile.PermissionsViewAllData);
        PermissionSetLicense license = [
            SELECT Id FROM PermissionSetLicense WHERE MasterLabel = :LICENSE_LABEL WITH SYSTEM_MODE LIMIT 1
        ];
        PermissionSet scoped = [
            SELECT Id, PermissionsViewSetup, PermissionsViewRoles, PermissionsModifyAllData, PermissionsViewAllData
            FROM PermissionSet WHERE Name = :SET_NAME WITH SYSTEM_MODE LIMIT 1
        ];
        Assert.isTrue(scoped.PermissionsViewSetup && scoped.PermissionsViewRoles);
        Assert.isFalse(scoped.PermissionsViewAllData || scoped.PermissionsModifyAllData);

        PermissionSet rolesOnly = [
            SELECT Id, PermissionsViewSetup, PermissionsViewRoles, PermissionsModifyAllData, PermissionsViewAllData
            FROM PermissionSet WHERE Name = :ROLES_ONLY WITH SYSTEM_MODE LIMIT 1
        ];
        Assert.isTrue(rolesOnly.PermissionsViewRoles);
        Assert.isFalse(rolesOnly.PermissionsViewAllData || rolesOnly.PermissionsModifyAllData);

        User baseline = fixture(profile.Id, 'base');
        User roleCandidate = fixture(profile.Id, 'roles');
        User pairCandidate = fixture(profile.Id, 'pair');
        insert as system new List<User>{baseline, roleCandidate, pairCandidate};
        insert as system new List<PermissionSetLicenseAssign>{
            new PermissionSetLicenseAssign(AssigneeId = baseline.Id, PermissionSetLicenseId = license.Id),
            new PermissionSetLicenseAssign(AssigneeId = roleCandidate.Id, PermissionSetLicenseId = license.Id),
            new PermissionSetLicenseAssign(AssigneeId = pairCandidate.Id, PermissionSetLicenseId = license.Id)
        };
        insert as system new List<PermissionSetAssignment>{
            new PermissionSetAssignment(AssigneeId = roleCandidate.Id, PermissionSetId = rolesOnly.Id),
            new PermissionSetAssignment(AssigneeId = pairCandidate.Id, PermissionSetId = scoped.Id)
        };

        System.runAs(baseline) {
            assertReadDenied(ORG_QUERY, 'Organization on the license-only account');
            assertPrivateObjectsDenied();
        }
        System.runAs(roleCandidate) {
            Boolean readable = canReadExactOrganization(org);
            System.debug(LoggingLevel.ERROR, 'VPCS_INTAKE_ROLES_ONLY_ORG_READ=' + readable);
            System.debug(LoggingLevel.ERROR, 'VPCS_INTAKE_ROLES_ONLY_AUTO_VIEW_SETUP=' + rolesOnly.PermissionsViewSetup);
            assertPrivateObjectsDenied();
        }
        System.runAs(pairCandidate) {
            Assert.isTrue(canReadExactOrganization(org), 'Expected Organization read with the scoped pair');
            assertPrivateObjectsDenied();
        }
    }

    private static Boolean canReadExactOrganization(Organization expected) {
        List<SObject> readback;
        try {
            readback = Database.query(ORG_QUERY, AccessLevel.USER_MODE);
        } catch (QueryException denied) {
            return false;
        }
        Assert.areEqual(1, readback.size());
        Assert.areEqual(expected.Id, readback[0].get('Id'));
        Assert.areEqual(expected.IsSandbox, readback[0].get('IsSandbox'));
        return true;
    }

    private static User fixture(Id profileId, String variant) {
        String nonce = String.valueOf(System.now().getTime()) + '.' + EncodingUtil.convertToHex(Crypto.generateAesKey(128));
        return new User(ProfileId = profileId, LastName = 'Synthetic Intake Org Check',
            Alias = 'vpcsorg', Username = 'vpcs.' + variant + '.' + nonce + '@example.test',
            Email = 'vpcs.org.fixture@example.test', EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US', LocaleSidKey = 'en_US', TimeZoneSidKey = 'America/Los_Angeles',
            IsActive = true);
    }

    private static void assertPrivateObjectsDenied() {
        Map<String, Schema.SObjectType> types = Schema.getGlobalDescribe();
        for (String name : PRIVATE_OBJECTS) {
            Schema.SObjectType objectType = types.get(name);
            if (objectType != null) {
                Schema.DescribeSObjectResult metadata = objectType.getDescribe();
                Assert.isFalse(metadata.isAccessible() || metadata.isCreateable() ||
                    metadata.isUpdateable() || metadata.isDeletable(), 'Unexpected object CRUD: ' + name);
            }
            assertReadDenied('SELECT Id FROM ' + name + ' WHERE Id = null LIMIT 1', name);
        }
    }

    private static void assertReadDenied(String soql, String label) {
        Boolean denied = false;
        try {
            Database.query(soql, AccessLevel.USER_MODE);
        } catch (QueryException expected) {
            denied = true;
        }
        Assert.isTrue(denied, 'Expected user-mode query denial for ' + label);
    }
}
