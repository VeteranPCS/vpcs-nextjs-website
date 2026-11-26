@IsTest
private class VpcsNativeRoutingLifecycleTest {
    private static Id customerLeadType() {
        return Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
    }

    @IsTest
    static void activeAssignmentRuleMatchesRegionalPolicyWithoutApexOwnerBinding() {
        Id beth = VpcsCustomerRouting.forLead(new Lead(Destination_State__c='CA')).binding.ownerId;
        Id stephanie = VpcsCustomerRouting.forLead(new Lead(Destination_State__c='DC')).binding.ownerId;
        System.assertNotEquals(beth, stephanie);

        // Deliberately withhold the Apex binding in this transaction so only the
        // active Salesforce assignment rule can produce the expected owners.
        VpcsCustomerRouting.testBindings = new Map<String, VpcsCustomerRouting.Binding>();
        List<Lead> records = new List<Lead>{
            new Lead(LastName='California', Destination_State__c='CA'),
            new Lead(LastName='District of Columbia', Destination_State__c='DC'),
            new Lead(LastName='Unknown Destination'),
            new Lead(LastName='Marked', Destination_State__c='TX',
                     Additional_Comments__c='[SPAM-SUSPECTED] synthetic')
        };
        Database.DMLOptions opts = new Database.DMLOptions();
        opts.assignmentRuleHeader.useDefaultRule = true;
        for (Lead record : records) {
            record.RecordTypeId = customerLeadType();
            record.Company = 'Synthetic Assignment Rule';
            record.Status = 'Prospect';
            record.setOptions(opts);
        }
        insert as system records;
        Map<Id, Lead> stored = new Map<Id, Lead>([
            SELECT OwnerId, Status, Destination_State__c FROM Lead WHERE Id IN :records WITH SYSTEM_MODE
        ]);
        System.assertEquals(beth, stored.get(records[0].Id).OwnerId);
        System.assertEquals(stephanie, stored.get(records[1].Id).OwnerId);
        System.assertEquals(stephanie, stored.get(records[2].Id).OwnerId);
        System.assertEquals(beth, stored.get(records[3].Id).OwnerId);
        System.assertEquals(0, [SELECT COUNT() FROM SMS_Message_Queue__c WITH SYSTEM_MODE]);
    }

    @IsTest
    static void nativeConversionRetainsLeadOwnerAndRoutesCustomerOpportunity() {
        Id customerOpp = Opportunity.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
        Lead lead = new Lead(RecordTypeId=customerLeadType(), LastName='Synthetic Conversion',
            Company='Synthetic Conversion Company', Status='Prospect', Destination_State__c='CO');
        insert as system lead;
        Id originalOwner = [SELECT OwnerId FROM Lead WHERE Id=:lead.Id WITH SYSTEM_MODE].OwnerId;
        LeadStatus converted = [SELECT ApiName FROM LeadStatus WHERE IsConverted=true WITH SYSTEM_MODE LIMIT 1];
        Database.LeadConvert request = new Database.LeadConvert();
        request.setLeadId(lead.Id);
        request.setOwnerId(originalOwner);
        request.setConvertedStatus(converted.ApiName);
        request.setOpportunityName('Synthetic Converted Opportunity');
        Database.LeadConvertResult conversion = Database.convertLead(request);
        System.assert(conversion.isSuccess(), 'Native Lead conversion should succeed.');
        Lead completed = [SELECT OwnerId, IsConverted FROM Lead WHERE Id=:lead.Id WITH SYSTEM_MODE];
        System.assertEquals(true, completed.IsConverted);
        System.assertEquals(originalOwner, completed.OwnerId);

        Opportunity generated = [
            SELECT OwnerId, RecordTypeId, Destination_State__c, StageName, IsClosed
            FROM Opportunity WHERE Id=:conversion.getOpportunityId() WITH SYSTEM_MODE
        ];
        if (VpcsCustomerRouting.isOpenCustomer(generated)) {
            System.assertEquals(VpcsCustomerRouting.forOpportunity(generated).binding.ownerId, generated.OwnerId);
        }
        // Profiles may choose another default Opportunity type on conversion. Also
        // exercise an explicit Customer Opportunity on the actual converted Account.
        Opportunity customerDeal = new Opportunity(RecordTypeId=customerOpp, Name='Synthetic Converted Customer Deal',
            AccountId=conversion.getAccountId(), StageName='Tracking', CloseDate=Date.today().addMonths(1),
            Destination_State__c='NY', OwnerId=originalOwner);
        insert as system customerDeal;
        Id customerDealOwner = [SELECT OwnerId FROM Opportunity WHERE Id=:customerDeal.Id WITH SYSTEM_MODE].OwnerId;
        System.assertEquals(VpcsCustomerRouting.forOpportunity(customerDeal).binding.ownerId, customerDealOwner);
        System.assertNotEquals(originalOwner, customerDealOwner);
        System.assertEquals(0, [SELECT COUNT() FROM SMS_Message_Queue__c WITH SYSTEM_MODE]);
    }
    @IsTest
    static void resolvesReferralRecipientsByCustomerRegionAndPreservesAllowlistedCopy() {
        Lead lead = new Lead(RecordTypeId=customerLeadType(), LastName='Synthetic Referral Status Lead',
            Company='Synthetic Referral Status', Status='Prospect', Destination_State__c='CO');
        insert as system lead;
        Id customerOpp = Opportunity.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
        Opportunity opportunity = new Opportunity(RecordTypeId=customerOpp, Name='Synthetic Referral Status Opportunity',
            StageName='Tracking', CloseDate=Date.today().addMonths(1), Destination_State__c='VA');
        insert as system opportunity;
        VpcsCustomerRouting.testBindings = new Map<String, VpcsCustomerRouting.Binding>{
            'BETH' => new VpcsCustomerRouting.Binding(UserInfo.getUserId(), '+17192495359', 'beth@example.test', null),
            'STEPHANIE' => new VpcsCustomerRouting.Binding(UserInfo.getUserId(), '+17192494757', 'steph@example.test', null)
        };
        Boolean isSandbox = [SELECT IsSandbox FROM Organization WITH SYSTEM_MODE LIMIT 1].IsSandbox;
        String shared = isSandbox ? 'tech@veteranpcs.com' : 'info@veteranpcs.com';
        VpcsRegionalAdminEmailRecipients.Request leadRequest = new VpcsRegionalAdminEmailRecipients.Request();
        leadRequest.customerId = lead.Id;
        leadRequest.operationalCopy = shared + ',unauthorized@example.test';
        VpcsRegionalAdminEmailRecipients.Request oppRequest = new VpcsRegionalAdminEmailRecipients.Request();
        oppRequest.customerId = opportunity.Id;
        List<VpcsRegionalAdminEmailRecipients.Result> results = VpcsRegionalAdminEmailRecipients.resolve(
            new List<VpcsRegionalAdminEmailRecipients.Request>{leadRequest, oppRequest});
        System.assertEquals(new Set<String>{'beth@example.test', shared}, new Set<String>(results[0].addresses.split(',')));
        System.assertEquals('steph@example.test', results[1].addresses);
    }

}
