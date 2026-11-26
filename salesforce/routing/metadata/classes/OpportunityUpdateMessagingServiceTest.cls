@IsTest
private class OpportunityUpdateMessagingServiceTest {
    private static final String STEPHANIE_SENDER = '+17192494757';
    private static final String AGENT_PHONE = '+12025550141';

    @TestSetup
    static void createOpportunities() {
        bind();
        Id personType = [
            SELECT Id FROM RecordType
            WHERE SObjectType = 'Account' AND DeveloperName = 'PersonAccountAgent' AND IsPersonType = true
            WITH SYSTEM_MODE LIMIT 1
        ].Id;
        Account agent = new Account(RecordTypeId=personType, FirstName='Synthetic', LastName='Opportunity Agent',
            Phone='(202) 555-0141');
        insert as system agent;
        Id customerType = Opportunity.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
        Date closing = Date.today().addDays(30);
        insert as system new List<Opportunity>{
            new Opportunity(RecordTypeId=customerType, Name='Eligible', StageName='Tracking', CloseDate=closing,
                Destination_State__c='FL', Agent__c=agent.Id),
            new Opportunity(RecordTypeId=customerType, Name='Unknown state', StageName='Tracking', CloseDate=closing,
                Agent__c=agent.Id),
            new Opportunity(RecordTypeId=customerType, Name='Missing partner', StageName='Tracking', CloseDate=closing,
                Destination_State__c='FL')
        };
    }

    private static void bind() {
        VpcsCustomerRouting.testBindings = new Map<String, VpcsCustomerRouting.Binding>{
            'BETH' => new VpcsCustomerRouting.Binding(UserInfo.getUserId(), '+17192495359', null, null),
            'STEPHANIE' => new VpcsCustomerRouting.Binding(UserInfo.getUserId(), STEPHANIE_SENDER, null, null)
        };
    }

    private static OpportunityUpdateMessagingService.SendOppStatusSMSRequest request(Id recordId) {
        OpportunityUpdateMessagingService.SendOppStatusSMSRequest input = new OpportunityUpdateMessagingService.SendOppStatusSMSRequest();
        input.OppRecordId = recordId;
        input.toPhoneNumber = '+12025550149';
        input.fromPhoneNumber = '+12025550148';
        input.senderEmailAddress = 'override@example.test';
        input.SenderEmail = 'another-override@example.test';
        return input;
    }

    @IsTest
    static void queuesUsingRegionalSenderAndCurrentAgentPhone() {
        bind();
        Opportunity record = [SELECT Id, Agent__c, Routing_Status_Sequence__c FROM Opportunity WHERE Name = 'Eligible' WITH SYSTEM_MODE LIMIT 1];
        List<OpportunityUpdateMessagingService.SendOppStatusSMSResponse> responses =
            OpportunityUpdateMessagingService.sendOppStatusSMS_Invocable(
                new List<OpportunityUpdateMessagingService.SendOppStatusSMSRequest>{request(record.Id)});
        System.assertEquals(1, responses.size());
        System.assertEquals(true, responses[0].success);
        System.assertEquals(null, responses[0].errorMessage);
        SMS_Message_Queue__c queued = [
            SELECT Id, Related_Partner__c, Related_Lead__c, Event_Key__c, To_Phone_Number__c, From_Phone_Number__c,
                Message__c, Status__c
            FROM SMS_Message_Queue__c WHERE Related_Opportunity__c = :record.Id WITH SYSTEM_MODE
        ];
        System.assertEquals(String.valueOf(queued.Id), responses[0].messageId);
        System.assertEquals(null, queued.Related_Lead__c);
        System.assertEquals(record.Agent__c, queued.Related_Partner__c);
        System.assertEquals(STEPHANIE_SENDER, queued.From_Phone_Number__c);
        System.assertEquals(AGENT_PHONE, queued.To_Phone_Number__c);
        System.assertEquals(VpcsRegionalStatusMessages.DEFERRED_BODY, queued.Message__c);
        System.assertEquals('New', queued.Status__c);
        System.assertEquals(record.Id + ':' + VpcsRegionalStatusSequence.eventKey(record.Routing_Status_Sequence__c,
            Date.today()) + ':' + record.Agent__c, queued.Event_Key__c);

        SendMessageResult repeated = new OpportunityUpdateMessagingService()
            .sendOppStatusSMSAsync(record.Id, '+12025550149', '+12025550148', 'override@example.test');
        System.assertEquals(true, repeated.success);
        System.assertEquals('Queued', repeated.status);
        System.assertEquals(String.valueOf(queued.Id), repeated.messageId);
        System.assertEquals(1, [SELECT COUNT() FROM SMS_Message_Queue__c WHERE Related_Opportunity__c = :record.Id WITH SYSTEM_MODE]);
    }

    @IsTest
    static void holdsMissingIdsStatesAndPartners() {
        bind();
        Id missingPartner = [SELECT Id FROM Opportunity WHERE Name = 'Missing partner' WITH SYSTEM_MODE LIMIT 1].Id;
        Id unknownState = [SELECT Id FROM Opportunity WHERE Name = 'Unknown state' WITH SYSTEM_MODE LIMIT 1].Id;
        System.assertEquals(0, OpportunityUpdateMessagingService.sendOppStatusSMS_Invocable(null).size());
        List<OpportunityUpdateMessagingService.SendOppStatusSMSResponse> responses =
            OpportunityUpdateMessagingService.sendOppStatusSMS_Invocable(
                new List<OpportunityUpdateMessagingService.SendOppStatusSMSRequest>{
                    null, request(null), request(missingPartner), request(unknownState)
                });
        System.assertEquals(4, responses.size());
        for (OpportunityUpdateMessagingService.SendOppStatusSMSResponse response : responses) {
            System.assertEquals(false, response.success);
            System.assertEquals(null, response.messageId);
        }
        System.assertEquals('Record ID is required.', responses[0].errorMessage);
        System.assertEquals('Record ID is required.', responses[1].errorMessage);
        System.assertEquals('Regional routing or partner phone requires review.', responses[2].errorMessage);
        System.assertEquals('Regional routing or partner phone requires review.', responses[3].errorMessage);
        System.assertEquals(0, [SELECT COUNT() FROM SMS_Message_Queue__c WITH SYSTEM_MODE]);
    }
}
