@IsTest
private class VpcsCustomerRoutingTest {
    private static void bind() {
        VpcsCustomerRouting.testBindings = new Map<String, VpcsCustomerRouting.Binding>{
            'BETH' => new VpcsCustomerRouting.Binding(UserInfo.getUserId(), '+17192495359', null, 'https://example.test/agent-portal'),
            'STEPHANIE' => new VpcsCustomerRouting.Binding(UserInfo.getUserId(), '+17192494757', null, 'https://example.test/agent-portal')
        };
    }

    @IsTest
    static void routesBothObjectsAndSuppressesUnknownAndSpam() {
        bind();
        Id customerLead = Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
        Id customerOpp = Opportunity.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
        Lead western = new Lead(RecordTypeId=customerLead, Status='Prospect', Destination_State__c=' ca ');
        Lead unknown = new Lead(RecordTypeId=customerLead, Status='Prospect', State_you_re_moving_to__c='CA');
        Lead spam = new Lead(RecordTypeId=customerLead, Status='Prospect', Destination_State__c='CA',
                             Additional_Comments__c='[SPAM-SUSPECTED] synthetic');
        Opportunity eastern = new Opportunity(RecordTypeId=customerOpp, Destination_State__c='DC', StageName='Tracking');
        Opportunity lost = new Opportunity(RecordTypeId=customerOpp, Destination_State__c='CA', StageName='Closed - Lost');
        VpcsCustomerRouting.assignLeads(new List<Lead>{western, unknown, spam}, null);
        VpcsCustomerRouting.assignOpportunities(new List<Opportunity>{eastern, lost}, null);
        System.assertEquals(UserInfo.getUserId(), western.OwnerId);
        System.assertEquals(UserInfo.getUserId(), unknown.OwnerId);
        System.assertEquals(UserInfo.getUserId(), spam.OwnerId);
        System.assert(VpcsCustomerRouting.isSpam(spam));
        System.assertEquals('DE', VpcsCustomerRouting.normalizeDestination('Deleware'));
        System.assertEquals('DC', VpcsCustomerRouting.normalizeDestination('District of Columbia'));
        System.assertEquals(UserInfo.getUserId(), eastern.OwnerId);
        System.assertEquals(null, lost.OwnerId);
        System.assertEquals('+17192495359', VpcsCustomerRouting.forLead(western).sender());
        System.assertEquals('+17192494757', VpcsCustomerRouting.forOpportunity(eastern).sender());
        System.assertEquals('STEPHANIE', VpcsCustomerRouting.forLead(unknown).admin);
        System.assertEquals(false, VpcsCustomerRouting.forLead(unknown).known);
    }

    @IsTest
    static void beforeSaveAssignsAllTerritoriesAndRoutesStateChanges() {
        Id customerLead = Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
        Id beth = VpcsCustomerRouting.forLead(new Lead(Destination_State__c='CA')).binding.ownerId;
        Id stephanie = VpcsCustomerRouting.forLead(new Lead(Destination_State__c='NY')).binding.ownerId;
        System.assertNotEquals(beth, stephanie);
        Set<String> western = new Set<String>{'AK','AZ','AR','CA','CO','HI','ID','IA','KS','LA','MN','MO',
            'MT','NE','NV','NM','ND','OK','OR','SD','TX','UT','WA','WY'};
        List<String> eastern = new List<String>{'AL','CT','DE','DC','FL','GA','IL','IN','KY','ME','MD','MA','MI','MS',
            'NH','NJ','NY','NC','OH','PA','PR','RI','SC','TN','VT','VA','WV','WI'};
        List<Lead> records = new List<Lead>();
        List<String> states = new List<String>(western);
        states.addAll(eastern);
        states.add(null);
        for (String state : states) {
            records.add(new Lead(RecordTypeId=customerLead, LastName='Routing ' + state,
                Company='Synthetic Native Routing', Status='Prospect', Destination_State__c=state));
        }
        insert as system records;
        Map<Id, Lead> persisted = new Map<Id, Lead>([
            SELECT OwnerId, Destination_State__c, Status, Routing_Status_Sequence__c
            FROM Lead WHERE Id IN :records WITH SYSTEM_MODE
        ]);
        System.assertEquals(53, persisted.size());
        for (Lead item : persisted.values()) {
            System.assertEquals(western.contains(item.Destination_State__c) ? beth : stephanie, item.OwnerId,
                'Wrong owner for ' + item.Destination_State__c);
        }

        Lead moved = persisted.get(records[0].Id);
        Decimal oldSequence = moved.Routing_Status_Sequence__c;
        update as system new Lead(Id=moved.Id, Destination_State__c='NY');
        Lead afterMove = [
            SELECT OwnerId, Status, Routing_Status_Sequence__c, Last_Speed_To_Lead_Reminder__c,
                   Speed_To_Lead_Reminder_Count__c
            FROM Lead WHERE Id=:moved.Id WITH SYSTEM_MODE
        ];
        System.assertEquals(stephanie, afterMove.OwnerId);
        System.assertEquals(moved.Status, afterMove.Status);
        System.assertEquals(oldSequence, afterMove.Routing_Status_Sequence__c);
        System.assertEquals(null, afterMove.Last_Speed_To_Lead_Reminder__c);
        System.assertEquals(null, afterMove.Speed_To_Lead_Reminder_Count__c);
        System.assertEquals(0, [SELECT COUNT() FROM SMS_Message_Queue__c WITH SYSTEM_MODE]);
    }

    @IsTest
    static void beforeSaveRoutesOpportunityStateChanges() {
        Id customerType = Opportunity.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
        Id beth = VpcsCustomerRouting.forOpportunity(new Opportunity(Destination_State__c='CA')).binding.ownerId;
        Id stephanie = VpcsCustomerRouting.forOpportunity(new Opportunity(Destination_State__c='VA')).binding.ownerId;
        Opportunity deal = new Opportunity(RecordTypeId=customerType, Name='Synthetic Customer Deal',
            StageName='Tracking', CloseDate=Date.today().addMonths(1), Destination_State__c='VA');
        insert as system deal;
        Opportunity before = [SELECT OwnerId, StageName, Routing_Status_Sequence__c FROM Opportunity WHERE Id=:deal.Id WITH SYSTEM_MODE];
        System.assertEquals(stephanie, before.OwnerId);
        update as system new Opportunity(Id=deal.Id, Destination_State__c='CA');
        Opportunity afterMove = [SELECT OwnerId, StageName, Routing_Status_Sequence__c FROM Opportunity WHERE Id=:deal.Id WITH SYSTEM_MODE];
        System.assertEquals(beth, afterMove.OwnerId);
        System.assertEquals(before.StageName, afterMove.StageName);
        System.assertEquals(before.Routing_Status_Sequence__c, afterMove.Routing_Status_Sequence__c);
        System.assertEquals(0, [SELECT COUNT() FROM SMS_Message_Queue__c WITH SYSTEM_MODE]);
    }

    @IsTest
    static void initialEventKeyDeduplicatesWithoutMutatingQueue() {
        bind();
        VpcsCustomerRouting.Route route = VpcsCustomerRouting.forLead(new Lead(Destination_State__c='OR'));
        Lead lead = new Lead(LastName='SMS Claim Test', Company='VeteranPCS');
        insert as system lead;
        Account partner = new Account(Name='Synthetic Partner');
        insert as system partner;
        SMS_Message_Queue__c first = VpcsRegionalSms.message(lead.Id, partner.Id, 'INITIAL_AGENT',
                                                           '+17195550100', 'Original', route);
        SMS_Message_Queue__c repeated = VpcsRegionalSms.message(lead.Id, partner.Id, 'INITIAL_AGENT',
                                                              '+17195550101', 'Duplicate', route);
        VpcsRegionalSms.enqueue(new List<SMS_Message_Queue__c>{first});
        VpcsRegionalSms.enqueue(new List<SMS_Message_Queue__c>{repeated});
        List<SMS_Message_Queue__c> rows = [
            SELECT Message__c, To_Phone_Number__c FROM SMS_Message_Queue__c WHERE Related_Lead__c = :lead.Id WITH SYSTEM_MODE
        ];
        System.assertEquals(1, rows.size());
        System.assertEquals('Original', rows[0].Message__c);
        System.assertEquals('+17195550100', rows[0].To_Phone_Number__c);
    }

    @IsTest
    static void contactIntakeQueuesBothAssignedRolesAndCreatesTriage() {
        bind();
        RecordType personAccountType = [
            SELECT Id FROM RecordType WHERE SObjectType = 'Account' AND IsPersonType = true WITH SYSTEM_MODE LIMIT 1
        ];
        Account agent = new Account(RecordTypeId=personAccountType.Id, FirstName='Synthetic',
            LastName='Agent', PersonMobilePhone='+17195550100');
        Account lender = new Account(Name='Synthetic Lender', Phone='+17195550101');
        insert as system new List<Account>{agent, lender};
        List<Lead> created = new List<Lead>{
            new Lead(LastName='Known Destination', Company='VeteranPCS'),
            new Lead(LastName='Missing Destination', Company='VeteranPCS'),
            new Lead(LastName='Quarantined Lead', Company='VeteranPCS')
        };
        insert as system created;
        Id customerLead = Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
        for (Lead record : created) {
            record.RecordTypeId = customerLead;
            record.Status = 'New:_Not_Contacted';
            record.WebToLead__c = true;
            record.LeadSource = 'Contact Agent';
            record.WebFormURL__c = 'https://example.test/contact-agent?sid=synthetic';
            record.Agent__c = agent.Id;
            record.Lender__c = lender.Id;
        }
        created[0].LeadSource = 'Contact Lender';
        created[0].WebFormURL__c = 'https://example.test/contact-lender?sid=synthetic';
        created[0].Destination_State__c = 'TX';
        created[1].Lender__c = null;
        created[2].Destination_State__c = 'DE';
        created[2].Additional_Comments__c = '[SPAM-SUSPECTED] synthetic';
        update as system created;
        VpcsRegionalLeadIntake.afterInsert(created);
        VpcsRegionalLeadIntake.afterInsert(new List<Lead>{created[0]});
        List<SMS_Message_Queue__c> rows = [
            SELECT Related_Lead__c, Event_Key__c, From_Phone_Number__c FROM SMS_Message_Queue__c WITH SYSTEM_MODE
        ];
        System.assertEquals(2, rows.size());
        Set<String> keys = new Set<String>();
        for (SMS_Message_Queue__c row : rows) {
            System.assertEquals(created[0].Id, row.Related_Lead__c);
            System.assertEquals('+17192495359', row.From_Phone_Number__c);
            keys.add(row.Event_Key__c);
        }
        System.assertEquals(new Set<String>{created[0].Id + ':INITIAL_AGENT:' + agent.Id, created[0].Id + ':INITIAL_LENDER:' + lender.Id}, keys);
        Task triage = [
            SELECT OwnerId, WhoId, Description FROM Task WHERE Subject = 'Regional routing exception: Routing setup' WITH SYSTEM_MODE
        ];
        System.assertEquals(created[1].Id, triage.WhoId);
        System.assertEquals(UserInfo.getUserId(), triage.OwnerId);
        System.assert(triage.Description.contains('Confirm the destination state.'));
    }

    @IsTest
    static void existingAssignedAgentScopeExtendsBeyondExactContactUrlsButExcludesProspect() {
        Id partner = '001000000000001AAA';
        Lead assigned = new Lead(WebToLead__c=true, Agent__c=partner, Status='New:_Not_Contacted',
            LeadSource='Contact Form', WebFormURL__c='https://example.test/contact');
        System.assert(VpcsRegionalLeadIntake.isInitialAgentEligible(assigned));
        System.assertEquals(false,VpcsRegionalLeadIntake.isContactIntake(assigned));
        assigned.Status='Prospect';
        System.assertEquals(false,VpcsRegionalLeadIntake.isInitialAgentEligible(assigned));
        assigned.Status='New:_Not_Contacted';
        assigned.Agent__c=null;
        assigned.Lender__c=partner;
        System.assertEquals(false,VpcsRegionalLeadIntake.isInitialAgentEligible(assigned));
        System.assertEquals(false,VpcsRegionalLeadIntake.isInitialLenderEligible(assigned));
    }

    @IsTest
    static void managedInsertSchedulesIndependentClaimWake() {
        Test.startTest();
        SmsMessageQueueBatch.forceRunTriggerInTest = true;
        SMS_Message_Queue__c row = new SMS_Message_Queue__c(
            Event_Key__c = 'synthetic-wake-only',
            Message__c = 'Synthetic SMS',
            To_Phone_Number__c = '+17195550100',
            From_Phone_Number__c = '+17192495359',
            Status__c = 'New'
        );
        insert as system row;
        System.assertEquals(1, Limits.getQueueableJobs());
        System.assertEquals(1, [SELECT COUNT() FROM AsyncApexJob WHERE ApexClass.Name='VpcsRegionalSmsWake' WITH SYSTEM_MODE]);
        SmsMessageQueueBatch.forceRunTriggerInTest = false;
        Test.stopTest();
    }

    @IsTest
    static void intakeFormRequiresAnExactMatchingPath() {
        Lead lead = new Lead(WebToLead__c=true, LeadSource='Contact Lender',
            WebFormURL__c='https://example.test/concierge?next=contact-lender');
        System.assertEquals(false, VpcsRegionalLeadIntake.isContactIntake(lead));
        lead.WebFormURL__c = 'https://example.test/contact-agent?id=synthetic';
        System.assertEquals(false, VpcsRegionalLeadIntake.isContactIntake(lead));
        lead.WebFormURL__c = 'https://example.test/contact-lender?id=synthetic';
        System.assertEquals(true, VpcsRegionalLeadIntake.isContactIntake(lead));
        System.assertEquals(null, VpcsRegionalSms.phone('+442079460123', null));
    }

    @IsTest
    static void sharedCopyMirrorsLegacyProspectAndUnassignedBranches() {
        Id partner = (Id) '001000000000001AAA';
        Lead prospect = new Lead(Status='Prospect', Agent__c=partner, Lender__c=partner);
        Lead unassigned = new Lead(Status='New:_Not_Contacted');
        Lead agentAssigned = new Lead(Status='New:_Not_Contacted', Agent__c=partner);
        Lead lenderAssigned = new Lead(Status='New:_Not_Contacted', Lender__c=partner);
        System.assert(VpcsRegionalLeadIntake.usesLegacyUnassignedCopy(prospect));
        System.assert(VpcsRegionalLeadIntake.usesLegacyUnassignedCopy(unassigned));
        System.assertEquals(false, VpcsRegionalLeadIntake.usesLegacyUnassignedCopy(agentAssigned));
        System.assertEquals(false, VpcsRegionalLeadIntake.usesLegacyUnassignedCopy(lenderAssigned));
    }

    @IsTest
    static void repeatedClaimCannotReplaceAnExistingDispatch() {
        VpcsRegionalDispatchControl.testBindings = new Map<String, Boolean>{'BETH'=>true, 'STEPHANIE'=>true};
        SMS_Message_Queue__c row = new SMS_Message_Queue__c(
            Event_Key__c = 'synthetic-claim-only',
            Message__c = 'Synthetic SMS',
            To_Phone_Number__c = '+17195550100',
            From_Phone_Number__c = '+17192495359',
            Status__c = 'New'
        );
        insert as system row;
        Test.startTest();
        VpcsRegionalSmsWorker.claim(new Set<Id>{row.Id});
        VpcsRegionalSmsWorker.claim(new Set<Id>{row.Id});
        System.assertEquals(1, Limits.getQueueableJobs());
        SMS_Message_Queue__c claimed = [
            SELECT Status__c, Retry_Count__c, Claim_Job_Id__c
            FROM SMS_Message_Queue__c WHERE Id=:row.Id WITH SYSTEM_MODE
        ];
        System.assertEquals('Processing', claimed.Status__c);
        System.assertEquals(1, claimed.Retry_Count__c);
        System.assertNotEquals(null, claimed.Claim_Job_Id__c);
        Test.stopTest();
    }
}
