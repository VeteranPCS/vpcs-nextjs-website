@IsTest
private class VpcsRoutingMigrationTest {
    private static final String TEST_USER = 'VPCS Owner Migration Test';
    private static final String MANIFEST = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    private static final String RECEIPT = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

    @TestSetup
    static void setupOperator() {
        User operator = new User(
            Alias = 'vpcsmig',
            LastName = TEST_USER,
            Username = 'vpcs-' + UserInfo.getOrganizationId() + '-' + String.valueOf(System.now().getTime()) +
                '@example.invalid',
            Email = 'vpcs-migration@example.invalid',
            TimeZoneSidKey = 'America/Denver',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId = UserInfo.getProfileId()
        );
        insert as system operator;
        PermissionSet operatorPermission = [
            SELECT Id FROM PermissionSet WHERE Name = 'VPCS_Routing_Migration_Operator' WITH SYSTEM_MODE LIMIT 1
        ];
        insert as system new PermissionSetAssignment(AssigneeId = operator.Id, PermissionSetId = operatorPermission.Id);
    }

    private static String command(Organization org, String type, String recordId, Map<String, Object> patch) {
        return command(org, type, recordId, 'apply', new Map<String, Object>(), patch);
    }

    private static String receiptKey(String action, String type, String recordId) {
        return EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256', Blob.valueOf(
            JSON.serialize(new List<String>{MANIFEST, 'test-owner-migration', action, type, recordId})
        ))).toLowerCase();
    }

    private static String command(
        Organization org, String type, String recordId, String action,
        Map<String, Object> expected, Map<String, Object> patch
    ) {
        return JSON.serialize(new Map<String, Object>{
            'organizationId' => org.Id,
            'isSandbox' => org.IsSandbox,
            'manifestFingerprint' => MANIFEST,
            'runId' => 'test-owner-migration',
            'action' => action,
            'request' => new Map<String, Object>{
                'type' => type, 'id' => recordId, 'expected' => expected,
                'related' => new List<Object>(), 'patch' => patch, 'idempotencyKey' => receiptKey(action, type, recordId)
            }
        });
    }

    @IsTest
    static void operatorReadsExactOrgAndDurableReceipt() {
        Organization org = [SELECT Id, IsSandbox FROM Organization WITH SYSTEM_MODE LIMIT 1];
        User operator = [SELECT Id FROM User WHERE LastName = :TEST_USER WITH SYSTEM_MODE LIMIT 1];
        insert as system new VPCS_Routing_Migration_Receipt__c(Operation_Key__c = RECEIPT, Receipt__c = '{"example":1}');
        System.runAs(operator) {
            Map<String, Object> actual = (Map<String, Object>)JSON.deserializeUntyped(VpcsRoutingMigration.getOrganization());
            System.assertEquals(org.Id, (Id)actual.get('id'));
            System.assertEquals(org.IsSandbox, actual.get('isSandbox'));
            System.assertEquals('{"example":1}', VpcsRoutingMigration.getReceipt(org.Id, org.IsSandbox, RECEIPT));
            try {
                VpcsRoutingMigration.getReceipt(org.Id, !org.IsSandbox, RECEIPT);
                System.assert(false, 'Expected exact Organization mismatch');
            } catch (VpcsRoutingMigration.GuardException failure) {
                System.assert(failure.getMessage().contains('Organization differs'));
            }
        }
    }

    @IsTest
    static void rejectsAccountAndAdditionalPatchFields() {
        VpcsRegionalDispatchControl.testBindings = new Map<String, Boolean>{'BETH' => false, 'STEPHANIE' => false};
        Organization org = [SELECT Id, IsSandbox FROM Organization WITH SYSTEM_MODE LIMIT 1];
        User operator = [SELECT Id FROM User WHERE LastName = :TEST_USER WITH SYSTEM_MODE LIMIT 1];
        System.runAs(operator) {
            try {
                VpcsRoutingMigration.executeOwnerOnly(command(org, 'Account', '001000000000123',
                    new Map<String, Object>{'OwnerId' => operator.Id}));
                System.assert(false, 'Expected account guard');
            } catch (VpcsRoutingMigration.GuardException failure) {
                System.assert(failure.getMessage().contains('request type'));
            }
            try {
                VpcsRoutingMigration.executeOwnerOnly(command(org, 'Lead', '00Q000000000123',
                    new Map<String, Object>{'OwnerId' => operator.Id, 'Status' => 'Urgent'}));
                System.assert(false, 'Expected owner-only guard');
            } catch (VpcsRoutingMigration.GuardException failure) {
                System.assert(failure.getMessage().contains('owner-only patch'));
            }
        }
    }

    @IsTest
    static void taskOwnerChangesRequireParentComparisonBeforeDml() {
        VpcsRegionalDispatchControl.testBindings = new Map<String, Boolean>{'BETH' => false, 'STEPHANIE' => false};
        Organization org = [SELECT Id, IsSandbox FROM Organization WITH SYSTEM_MODE LIMIT 1];
        User operator = [SELECT Id FROM User WHERE LastName = :TEST_USER WITH SYSTEM_MODE LIMIT 1];
        String fixtureTask = '00T000000000123';
        Map<String, Object> taskExpected = new Map<String, Object>{'parentId' => '00Q000000000123'};
        System.runAs(operator) {
            for (String action : new List<String>{'apply', 'rollback'}) {
                try {
                    VpcsRoutingMigration.executeOwnerOnly(command(org, 'Task', fixtureTask, action,
                        taskExpected, new Map<String, Object>{'OwnerId' => operator.Id}));
                    System.assert(false, 'Expected missing parent guard for ' + action);
                } catch (VpcsRoutingMigration.GuardException failure) {
                    System.assert(failure.getMessage().contains('requires an explicit parent comparison'));
                }
                System.assertEquals(null, VpcsRoutingMigration.getReceipt(org.Id, org.IsSandbox,
                    receiptKey(action, 'Task', fixtureTask)));
            }
        }
    }

    @IsTest
    static void identifiesOnlyTheExactReferralSubjectsAndRelation() {
        Task lead = (Task)JSON.deserialize(
            '{"WhoId":"00Q000000000123","Subject":"Reach out to new Lead","IsClosed":false}', Task.class);
        Task opportunity = (Task)JSON.deserialize(
            '{"WhatId":"006000000000123","Subject":"Check on Referral Check","IsClosed":false}', Task.class);
        Task agreement = (Task)JSON.deserialize(
            '{"WhatId":"006000000000123","Subject":"email closing info and agent referral agreement to Melanie ","IsClosed":false}', Task.class);
        System.assert(VpcsRoutingMigration.isReferral(lead));
        System.assert(VpcsRoutingMigration.isReferral(opportunity));
        System.assert(VpcsRoutingMigration.isReferral(agreement));
        agreement.Subject = agreement.Subject.trim();
        opportunity.Subject = 'check on referral check';
        lead.WhatId = '001000000000123';
        System.assertEquals(false, VpcsRoutingMigration.isReferral(lead));
        System.assertEquals(false, VpcsRoutingMigration.isReferral(opportunity));
        System.assertEquals(false, VpcsRoutingMigration.isReferral(agreement));
    }

    @IsTest
    static void appliesResumesAndRollsBackWithNativeGuard() {
        Organization org = [SELECT Id, IsSandbox FROM Organization WITH SYSTEM_MODE LIMIT 1];
        User operator = [SELECT Id FROM User WHERE LastName = :TEST_USER WITH SYSTEM_MODE LIMIT 1];
        Id destinationOwner = UserInfo.getUserId();
        Schema.RecordTypeInfo recordType = Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer');
        VpcsCustomerRouting.testBindings = new Map<String, VpcsCustomerRouting.Binding>();
        Lead customer = new Lead(
            LastName = 'Synthetic Owner CAS Test',
            Company = 'Synthetic CRM Fixture',
            OwnerId = operator.Id,
            RecordTypeId = recordType.getRecordTypeId(),
            Destination_State__c = 'TX',
            WebToLead__c = false,
            Status = 'Prospect',
            Next_Contact_Date__c = Date.today().addDays(10),
            Description = 'Synthetic migration note'
        );
        insert as system customer;
        update as system new Lead(Id = customer.Id, IsUnreadByOwner = false);
        customer = [
            SELECT Id, OwnerId, RecordTypeId, LastModifiedDate, IsConverted, Status,
                   CreatedDate, Next_Contact_Date__c, Description, Destination_State__c, IsUnreadByOwner
            FROM Lead WHERE Id = :customer.Id WITH SYSTEM_MODE
        ];
        System.assertEquals(operator.Id, customer.OwnerId);
        System.assertEquals(false, customer.IsUnreadByOwner, 'The original owner has already read the Lead.');
        System.assertEquals('TX', customer.Destination_State__c, 'The persisted fixture must retain its destination.');
        System.assert(VpcsCustomerRouting.isOpenCustomer(customer), 'The persisted fixture must be eligible.');
        VpcsCustomerRouting.testBindings.put(
            'BETH', new VpcsCustomerRouting.Binding(destinationOwner, '+17192495359', null, null)
        );
        String recordId = String.valueOf(customer.Id);
        List<Object> timers = new List<Object>{
            new Map<String, Object>{'key' => 'CreatedDate', 'value' => VpcsRoutingMigration.jsonDate(customer.CreatedDate)},
            new Map<String, Object>{'key' => 'Next_Contact_Date__c', 'value' => VpcsRoutingMigration.dateOnly(customer.Next_Contact_Date__c)}
        };
        Map<String, Object> captured = new Map<String, Object>{
            'ownerId' => customer.OwnerId,
            'lastModifiedDate' => VpcsRoutingMigration.jsonDate(customer.LastModifiedDate),
            'recordTypeId' => customer.RecordTypeId,
            'state' => 'TX',
            'rawDestinationState' => customer.Destination_State__c,
            'isConverted' => customer.IsConverted,
            'status' => customer.Status,
            'timers' => timers,
            'pendingMessages' => new List<Object>()
        };
        Map<String, Object> stale = captured.clone();
        stale.put('lastModifiedDate', VpcsRoutingMigration.jsonDate(customer.LastModifiedDate.addMinutes(-1)));
        Map<String, Object> applyPatch = new Map<String, Object>{'OwnerId' => destinationOwner};
        System.runAs(operator) {
            VpcsRegionalDispatchControl.testBindings = new Map<String, Boolean>{'BETH' => true, 'STEPHANIE' => true};
            try {
                VpcsRoutingMigration.executeOwnerOnly(command(org, 'Lead', recordId, 'apply', captured, applyPatch));
                System.assert(false, 'Expected dispatch pause guard');
            } catch (VpcsRoutingMigration.GuardException failure) {
                System.assert(failure.getMessage().contains('Regional dispatch must be paused'));
            }
            System.assertEquals(null, VpcsRoutingMigration.getReceipt(org.Id, org.IsSandbox, receiptKey('apply', 'Lead', recordId)));
            System.assertEquals(operator.Id, [SELECT OwnerId FROM Lead WHERE Id = :customer.Id WITH SYSTEM_MODE].OwnerId);
            VpcsRegionalDispatchControl.testBindings = new Map<String, Boolean>{'BETH' => false, 'STEPHANIE' => false};

            Map<String, Object> staleResult = (Map<String, Object>)JSON.deserializeUntyped(
                VpcsRoutingMigration.executeOwnerOnly(command(org, 'Lead', recordId, 'apply', stale, applyPatch))
            );
            System.assertEquals(true, staleResult.get('conflict'));
            System.assertEquals('last-modified-changed', staleResult.get('reason'));
            System.assertEquals(null, VpcsRoutingMigration.getReceipt(org.Id, org.IsSandbox, receiptKey('apply', 'Lead', recordId)));

            String applyCommand = command(org, 'Lead', recordId, 'apply', captured, applyPatch);
            String applied = VpcsRoutingMigration.executeOwnerOnly(applyCommand);
            Map<String, Object> appliedReceipt = (Map<String, Object>)JSON.deserializeUntyped(applied);
            Map<String, Object> afterApply = (Map<String, Object>)appliedReceipt.get('after');
            System.assertNotEquals(null, afterApply, applied);
            System.assertEquals(destinationOwner, (Id)afterApply.get('ownerId'));
            System.assertEquals(true, [
                SELECT IsUnreadByOwner FROM Lead WHERE Id = :customer.Id WITH SYSTEM_MODE
            ].IsUnreadByOwner, 'A transferred Lead is unread for its new owner.');
            System.assertEquals(applied, VpcsRoutingMigration.executeOwnerOnly(applyCommand));
            System.assertEquals(applied, VpcsRoutingMigration.getReceipt(org.Id, org.IsSandbox, receiptKey('apply', 'Lead', recordId)));

            String rolledBack = VpcsRoutingMigration.executeOwnerOnly(command(org, 'Lead', recordId, 'rollback',
                afterApply, new Map<String, Object>{'OwnerId' => customer.OwnerId}
            ));
            System.assertEquals(rolledBack, VpcsRoutingMigration.getReceipt(org.Id, org.IsSandbox, receiptKey('rollback', 'Lead', recordId)));
        }
        Lead finalCustomer = [
            SELECT OwnerId, Status, Next_Contact_Date__c, Description
            FROM Lead WHERE Id = :customer.Id WITH SYSTEM_MODE
        ];
        System.assertEquals(customer.OwnerId, finalCustomer.OwnerId);
        System.assertEquals(customer.Status, finalCustomer.Status);
        System.assertEquals(customer.Next_Contact_Date__c, finalCustomer.Next_Contact_Date__c);
        System.assertEquals(customer.Description, finalCustomer.Description);
        System.assertEquals(2, [SELECT COUNT() FROM VPCS_Routing_Migration_Receipt__c WITH SYSTEM_MODE]);
    }

    @IsTest
    static void nativeOwnerTransferMarksReadLeadUnread() {
        User operator = [SELECT Id FROM User WHERE LastName = :TEST_USER WITH SYSTEM_MODE LIMIT 1];
        Id destinationOwner = UserInfo.getUserId();
        System.assertNotEquals(operator.Id, destinationOwner);
        Id customerType = Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName()
            .get('Customer').getRecordTypeId();
        VpcsCustomerRouting.testBindings = new Map<String, VpcsCustomerRouting.Binding>();
        Lead customer = new Lead(LastName = 'Synthetic Read Lead', Company = 'Synthetic CRM Fixture',
            OwnerId = operator.Id, RecordTypeId = customerType, Destination_State__c = 'UT',
            Status = 'Contacted:_Future Lead', WebToLead__c = false);
        insert as system customer;
        update as system new Lead(Id = customer.Id, IsUnreadByOwner = false);
        System.assertEquals(false, [
            SELECT IsUnreadByOwner FROM Lead WHERE Id = :customer.Id WITH SYSTEM_MODE
        ].IsUnreadByOwner);
        VpcsCustomerRouting.testBindings.put(
            'BETH', new VpcsCustomerRouting.Binding(destinationOwner, '+17192495359', null, null)
        );
        System.runAs(operator) {
            VpcsCustomerRouting.setMigrationOwnerWrite(true);
            try {
                Database.DMLOptions options = new Database.DMLOptions();
                options.assignmentRuleHeader.useDefaultRule = false;
                options.emailHeader.triggerUserEmail = false;
                options.emailHeader.triggerOtherEmail = false;
                options.emailHeader.triggerAutoResponseEmail = false;
                options.optAllOrNone = true;
                Database.SaveResult transfer = Database.update(
                    new Lead(Id = customer.Id, OwnerId = destinationOwner), options, AccessLevel.SYSTEM_MODE);
                System.assert(transfer.isSuccess());
            } finally {
                VpcsCustomerRouting.setMigrationOwnerWrite(false);
            }
        }
        Lead transferred = [SELECT OwnerId, IsUnreadByOwner, Status, Destination_State__c
            FROM Lead WHERE Id = :customer.Id WITH SYSTEM_MODE];
        System.assertEquals(destinationOwner, transferred.OwnerId);
        System.assertEquals(true, transferred.IsUnreadByOwner);
        System.assertEquals(customer.Status, transferred.Status);
        System.assertEquals('UT', transferred.Destination_State__c);
        System.assertEquals(0, [SELECT COUNT() FROM VPCS_Routing_Migration_Receipt__c WITH SYSTEM_MODE]);
    }

    @IsTest
    static void detectsProtectedFieldChangesAlongsideOwner() {
        Lead original = new Lead(OwnerId = '005000000000123', Status = 'Prospect', LastName = 'Synthetic',
            IsUnreadByOwner = false);
        Lead ownerOnly = original.clone(false, false, false, false);
        ownerOnly.OwnerId = '005000000000124';
        System.assertEquals(null, VpcsRoutingMigration.protectedFieldChange(original, ownerOnly, true));

        Lead platformStamped = (Lead)JSON.deserialize(
            '{"OwnerId":"005000000000124","Status":"Prospect","LastName":"Synthetic","LastTransferDate":"2026-11-25","IsUnreadByOwner":true}',
            Lead.class
        );
        System.assertEquals(null, VpcsRoutingMigration.protectedFieldChange(original, platformStamped, true),
            'Salesforce stamps the transferred Lead for the new owner');
        System.assertEquals('isunreadbyowner', VpcsRoutingMigration.protectedFieldChange(original, platformStamped, false),
            'An unchanged Task parent does not receive the direct-transfer allowance');
        System.assertEquals('isunreadbyowner', VpcsRoutingMigration.protectedFieldChange(platformStamped, original, true),
            'The opposite unread transition is not an ownership stamp');
        platformStamped.OwnerId = original.OwnerId;
        System.assertEquals('isunreadbyowner', VpcsRoutingMigration.protectedFieldChange(original, platformStamped, true),
            'A change with the same owner is still protected');

        platformStamped.OwnerId = '005000000000124';
        platformStamped.Status = 'Urgent';
        System.assertEquals('status', VpcsRoutingMigration.protectedFieldChange(original, platformStamped, true),
            'Still reject a business change on the same platform-stamped transfer');
        ownerOnly.LastName = null;
        System.assertEquals('lastname', VpcsRoutingMigration.protectedFieldChange(original, ownerOnly, true));

        Opportunity beforeOpportunity = new Opportunity(OwnerId = '005000000000123', StageName = 'Under Contract');
        Opportunity afterOpportunity = new Opportunity(OwnerId = '005000000000124', StageName = 'Tracking 1-2');
        System.assertEquals('stagename',
            VpcsRoutingMigration.protectedFieldChange(beforeOpportunity, afterOpportunity, true));
    }
}
