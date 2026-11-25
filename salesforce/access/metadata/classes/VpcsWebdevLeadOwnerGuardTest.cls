@IsTest
private class VpcsWebdevLeadOwnerGuardTest {
    private static final Id WEBDEV_ORG = '00Djg000000EK8YEAW';
    private static final Id OTHER_ORG = '00D000000000001';
    private static final String WORKFLOW_USER = 'tech+webdev-workflow@veteranpcs.com.webdev';
    private static final Id APPROVED_OWNER = '0054x000005GsUvAAK';
    private static final Id OTHER_APPROVED_OWNER = '005Rg000004hWojIAE';
    private static final Id UNAPPROVED_OWNER = '005000000000001';

    @IsTest
    static void activatesOnlyForExactIdentity() {
        System.assert(VpcsWebdevLeadOwnerGuard.appliesTo(WORKFLOW_USER, WEBDEV_ORG, true));
        System.assert(!VpcsWebdevLeadOwnerGuard.appliesTo(WORKFLOW_USER, OTHER_ORG, true));
        System.assert(!VpcsWebdevLeadOwnerGuard.appliesTo(WORKFLOW_USER, WEBDEV_ORG, false));
        System.assert(!VpcsWebdevLeadOwnerGuard.appliesTo(WORKFLOW_USER, WEBDEV_ORG, null));
        System.assert(!VpcsWebdevLeadOwnerGuard.appliesTo(WORKFLOW_USER.toUpperCase(), WEBDEV_ORG, true));
        System.assert(!VpcsWebdevLeadOwnerGuard.appliesTo('different@example.invalid', WEBDEV_ORG, true));
    }

    @IsTest
    static void allowsAllFourOwnersWithTheWebsiteMarker() {
        Lead previous = markedLead();
        for (Id ownerId : new List<Id>{
            '0054x000005GsUvAAK', '005Rg000004hWojIAE', '0054x0000082vHgAAI', '005Rg00000BAN0DIAX'
        }) {
            Lead nextLead = previous.clone(true, false, false, false);
            nextLead.OwnerId = ownerId;
            validate(previous, nextLead);
            System.assert(!nextLead.hasErrors(), 'An allowed owner-only update must succeed');
        }
    }

    @IsTest
    static void rejectsUnapprovedOwnersOnChangesAndRetries() {
        Lead previous = markedLead();
        Lead nextLead = previous.clone(true, false, false, false);
        nextLead.OwnerId = '005000000000002';
        validate(previous, nextLead);
        System.assert(nextLead.hasErrors(), 'A different, unapproved owner must fail');
        System.assert(nextLead.getErrors()[0].getMessage().contains('OwnerId is outside the approved owner list.'));

        Lead unapprovedRetry = previous.clone(true, false, false, false);
        validate(previous, unapprovedRetry);
        System.assert(unapprovedRetry.hasErrors(), 'A same-owner write must still require an approved owner');
    }

    @IsTest
    static void allowsAnApprovedSameOwnerWriteWithExistingMarkers() {
        Lead previous = markedLead();
        previous.OwnerId = APPROVED_OWNER;
        Lead retry = previous.clone(true, false, false, false);
        validate(previous, retry);
        System.assert(!retry.hasErrors(), 'An approved same-owner assignment must be idempotent');
    }

    @IsTest
    static void rejectsSameOwnerWritesWithChangedFieldsOrMissingMarkers() {
        Lead previous = markedLead();
        previous.OwnerId = APPROVED_OWNER;
        Lead changed = previous.clone(true, false, false, false);
        changed.Company = 'Another synthetic firm';
        validate(previous, changed);
        System.assert(changed.hasErrors(), 'A same-owner write cannot change another business field');

        previous.Description = 'Unmarked description';
        Lead unmarked = previous.clone(true, false, false, false);
        validate(previous, unmarked);
        System.assert(unmarked.hasErrors(), 'A same-owner write still requires the existing markers');
    }

    @IsTest
    static void requiresBothMarkersOnTheExistingRecord() {
        Lead previous = markedLead();
        previous.FirstName = 'Ordinary Lead';
        Lead forged = changedOwner(previous);
        forged.FirstName = '[VPCS WEBDEV TEST]';
        validate(previous, forged);
        System.assert(forged.hasErrors(), 'Adding the first-name marker during the owner change must fail');
        System.assert(forged.getErrors()[0].getMessage().contains('existing test markers [FirstName]'));
        System.assert(!forged.getErrors()[0].getMessage().contains('Ordinary Lead'));

        previous = markedLead();
        previous.Description = 'Unmarked description';
        Lead missingDescriptionMarker = changedOwner(previous);
        validate(previous, missingDescriptionMarker);
        System.assert(missingDescriptionMarker.hasErrors(), 'A first-name marker alone must fail');
        System.assert(missingDescriptionMarker.getErrors()[0].getMessage().contains('existing test markers [Description]'));
        System.assert(!missingDescriptionMarker.getErrors()[0].getMessage().contains('Unmarked description'));
    }

    @IsTest
    static void rejectsNonOwnerBusinessValuesIncludingCaseAndNullChanges() {
        Lead previous = markedLead();
        Lead caseChange = changedOwner(previous);
        caseChange.LastName = previous.LastName.toUpperCase();
        validate(previous, caseChange);
        System.assert(caseChange.hasErrors(), 'Changing the case of a persisted value must fail');

        Lead removedValue = changedOwner(previous);
        removedValue.Email = null;
        validate(previous, removedValue);
        System.assert(removedValue.hasErrors(), 'Clearing a persisted field must fail');

        Lead newAddressComponent = changedOwner(previous);
        newAddressComponent.City = 'Synthetic City';
        validate(previous, newAddressComponent);
        System.assert(newAddressComponent.hasErrors(), 'Changing a compound address component must fail');

        Lead changedCompany = changedOwner(previous);
        changedCompany.Company = 'Another synthetic firm';
        validate(previous, changedCompany);
        System.assert(changedCompany.hasErrors(), 'A non-permissionable business field must still be protected');
    }

    @IsTest
    static void reportsProtectedFieldNamesWithoutValuesOrOwnerId() {
        Lead previous = markedLead();
        previous.IsUnreadByOwner = false;
        Lead changed = changedOwner(previous);
        changed.Company = 'Private changed value';
        changed.IsUnreadByOwner = true;

        validate(previous, changed);

        System.assert(changed.hasErrors(), 'Changing protected fields must still fail');
        String message = changed.getErrors()[0].getMessage();
        System.assert(message.endsWith('Changed fields [Company, IsUnreadByOwner].'));
        System.assert(!message.contains(previous.Company));
        System.assert(!message.contains(changed.Company));
        System.assert(!message.contains(String.valueOf(changed.OwnerId)));
    }

    @IsTest
    static void comparesBusinessFieldsAndSkipsSalesforceProjections() {
        Set<String> fields = VpcsWebdevLeadOwnerGuard.fieldsToCompare();
        System.assert(fields.contains('email'));
        System.assert(fields.contains('city'));
        System.assert(fields.contains('company'));
        System.assert(fields.contains('isunreadbyowner'));
        System.assert(!fields.contains('ownerid'));
        System.assert(!fields.contains('address'));
        System.assert(!fields.contains('lastmodifiedbyid'));
        System.assert(!fields.contains('lastmodifieddate'));
        System.assert(!fields.contains('systemmodstamp'));
        System.assert(!fields.contains('lastactivitydate'));
        System.assert(!fields.contains('lastreferenceddate'));
        System.assert(!fields.contains('lastvieweddate'));
        System.assert(!fields.contains('lasttransferdate'), 'Allow the Salesforce timestamp on an owner-only transfer.');
        for (Schema.SObjectField token : Schema.SObjectType.Lead.fields.getMap().values()) {
            Schema.DescribeFieldResult field = token.getDescribe();
            if (field.isCalculated()) System.assert(!fields.contains(field.getName().toLowerCase()));
        }
    }

    @IsTest
    static void blocksOtherLeadDmlForTheWorkflowUser() {
        Lead row = markedLead();
        VpcsWebdevLeadOwnerGuard.addOtherDmlErrors(new List<Lead>{row});
        System.assert(row.hasErrors(), 'A gated insert, delete or undelete must fail');
    }

    @IsTest
    static void leavesNormalLeadWritesToExistingRules() {
        Lead ordinary = new Lead(LastName = 'Synthetic admin fixture', Company = 'Synthetic Company');
        insert ordinary;
        ordinary.Description = 'Ordinary operator update';
        update ordinary;

        Lead persisted = [SELECT Description FROM Lead WHERE Id = :ordinary.Id];
        System.assertEquals('Ordinary operator update', persisted.Description);
    }

    @IsTest
    static void enforcesTriggerAsProvisionedWorkflowUser() {
        System.assertEquals(WEBDEV_ORG, Id.valueOf(UserInfo.getOrganizationId()), 'Validate this package in WebDev');
        List<User> users = [SELECT Id, Username, IsActive FROM User WHERE Username = :WORKFLOW_USER LIMIT 2];
        System.assertEquals(1, users.size(), 'The actual WebDev workflow user must be provisioned before validation');
        User workflowUser = users[0];
        System.assert(WORKFLOW_USER.equals(workflowUser.Username) && workflowUser.IsActive, 'The workflow identity must match exactly and be active');

        Lead fixture = new Lead(
            FirstName = '[VPCS WEBDEV TEST]', LastName = 'Workflow run-as fixture', Company = 'Synthetic Company',
            Description = '[VPCS WEBDEV TEST] apex-test trigger-run-as', OwnerId = OTHER_APPROVED_OWNER
        );
        insert fixture;

        System.runAs(workflowUser) {
            Database.SaveResult transfer = Database.update(new Lead(Id = fixture.Id, OwnerId = APPROVED_OWNER), false);
            System.assert(transfer.isSuccess(), 'The workflow user must be able to transfer a marked Lead to an approved owner. ' +
                dmlDiagnostics(transfer.getErrors()));

            Database.SaveResult retry = Database.update(new Lead(Id = fixture.Id, OwnerId = APPROVED_OWNER), false);
            System.assert(retry.isSuccess(), 'The workflow user must be able to repeat the approved owner assignment. ' +
                dmlDiagnostics(retry.getErrors()));

            Database.SaveResult changed = Database.update(new Lead(Id = fixture.Id, OwnerId = APPROVED_OWNER,
                Company = 'Denied synthetic company'), false);
            System.assert(!changed.isSuccess() && changed.getErrors()[0].getMessage().contains('The WebDev workflow user'),
                'The active guard must reject a business-field change under the real workflow identity. ' +
                dmlDiagnostics(changed.getErrors()));

            Database.DeleteResult deleted = Database.delete(new Lead(Id = fixture.Id), false);
            System.assert(!deleted.isSuccess() && deleted.getErrors()[0].getMessage().contains('The WebDev workflow user'),
                'The active guard must reject a delete under the real workflow identity. ' + dmlDiagnostics(deleted.getErrors()));
        }

        Lead persisted = [SELECT OwnerId, Company FROM Lead WHERE Id = :fixture.Id];
        System.assertEquals(APPROVED_OWNER, persisted.OwnerId);
        System.assertEquals('Synthetic Company', persisted.Company);
    }

    private static String dmlDiagnostics(List<Database.Error> errors) {
        List<String> details = new List<String>();
        for (Database.Error error : errors) {
            details.add(String.valueOf(error.getStatusCode()) + ' [' + String.join(error.getFields(), ', ') + '] ' + error.getMessage());
        }
        return details.isEmpty() ? 'Salesforce returned no DML errors.' : String.join(details, ' | ');
    }

    private static Lead markedLead() {
        return new Lead(
            Id = '00Q000000000001',
            FirstName = '[VPCS WEBDEV TEST] Synthetic',
            LastName = 'Sample',
            Company = 'Synthetic Company',
            OwnerId = UNAPPROVED_OWNER,
            Description = '[VPCS WEBDEV TEST] example-run submission-id\nSynthetic harness lead',
            Email = 'synthetic@example.invalid'
        );
    }

    private static Lead changedOwner(Lead previous) {
        Lead updated = previous.clone(true, false, false, false);
        updated.OwnerId = APPROVED_OWNER;
        return updated;
    }

    private static void validate(Lead previous, Lead updated) {
        VpcsWebdevLeadOwnerGuard.validateUpdates(new List<Lead>{updated}, new Map<Id, Lead>{previous.Id => previous});
    }
}
