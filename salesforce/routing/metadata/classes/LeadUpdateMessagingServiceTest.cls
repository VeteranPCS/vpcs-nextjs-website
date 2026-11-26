@IsTest
private class LeadUpdateMessagingServiceTest {
    private static final String BETH_SENDER = '+17192495359';
    private static final String AGENT_MOBILE = '+12025550131';
    private static final String STATUS_BODY = 'Synthetic lead status update';

    @TestSetup
    static void createLeads() {
        bind();
        Id personType = [
            SELECT Id FROM RecordType
            WHERE SObjectType = 'Account' AND DeveloperName = 'PersonAccountAgent' AND IsPersonType = true
            WITH SYSTEM_MODE LIMIT 1
        ].Id;
        Account agent = new Account(RecordTypeId=personType, FirstName='Synthetic', LastName='Lead Agent',
            PersonMobilePhone='(202) 555-0131', Phone='+12025550132');
        insert as system agent;
        Id customerType = Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
        insert as system new List<Lead>{
            new Lead(RecordTypeId=customerType, LastName='Eligible', Company='Synthetic', Status='Prospect',
                Destination_State__c='TX', Agent__c=agent.Id),
            new Lead(RecordTypeId=customerType, LastName='Unknown state', Company='Synthetic', Status='Prospect',
                Agent__c=agent.Id),
            new Lead(RecordTypeId=customerType, LastName='Missing partner', Company='Synthetic', Status='Prospect',
                Destination_State__c='TX'),
            new Lead(RecordTypeId=customerType, LastName='Spam', Company='Synthetic', Status='Prospect',
                Destination_State__c='TX', Agent__c=agent.Id, Additional_Comments__c='[SPAM-SUSPECTED] synthetic')
        };
    }

    private static void bind() {
        VpcsCustomerRouting.testBindings = new Map<String, VpcsCustomerRouting.Binding>{
            'BETH' => new VpcsCustomerRouting.Binding(UserInfo.getUserId(), BETH_SENDER, null, null),
            'STEPHANIE' => new VpcsCustomerRouting.Binding(UserInfo.getUserId(), '+17192494757', null, null)
        };
    }

    private static LeadUpdateMessagingService.SendLeadStatusSMSRequest request(Id recordId) {
        LeadUpdateMessagingService.SendLeadStatusSMSRequest input = new LeadUpdateMessagingService.SendLeadStatusSMSRequest();
        input.LeadRecordId = recordId;
        input.toPhoneNumber = '+12025550139';
        input.fromPhoneNumber = '+12025550138';
        input.senderEmailAddress = 'override@example.test';
        input.SenderEmail = 'another-override@example.test';
        return input;
    }

    @IsTest
    static void queuesUsingDestinationAndAgentAndPreservesSettledEventOnRepeat() {
        bind();
        Lead record = [SELECT Id, Agent__c, Routing_Status_Sequence__c FROM Lead WHERE LastName = 'Eligible' WITH SYSTEM_MODE LIMIT 1];
        List<LeadUpdateMessagingService.SendLeadStatusSMSResponse> responses =
            LeadUpdateMessagingService.sendLeadStatusSMS_Invocable(
                new List<LeadUpdateMessagingService.SendLeadStatusSMSRequest>{request(record.Id), request(record.Id)});
        System.assertEquals(2, responses.size());
        System.assertEquals(true, responses[0].success);
        System.assertEquals(true, responses[1].success);
        System.assertEquals(null, responses[0].errorMessage);
        SMS_Message_Queue__c queued = [
            SELECT Id, Related_Partner__c, Event_Key__c, To_Phone_Number__c, From_Phone_Number__c, Message__c, Status__c
            FROM SMS_Message_Queue__c WHERE Related_Lead__c = :record.Id WITH SYSTEM_MODE
        ];
        System.assertEquals(String.valueOf(queued.Id), responses[0].messageId);
        System.assertEquals(String.valueOf(queued.Id), responses[1].messageId);
        System.assertEquals(record.Agent__c, queued.Related_Partner__c);
        System.assertEquals(BETH_SENDER, queued.From_Phone_Number__c);
        System.assertEquals(AGENT_MOBILE, queued.To_Phone_Number__c);
        System.assertEquals(VpcsRegionalStatusMessages.DEFERRED_BODY, queued.Message__c);
        System.assertEquals('New', queued.Status__c);
        System.assertEquals(record.Id + ':' + VpcsRegionalStatusSequence.eventKey(record.Routing_Status_Sequence__c,
            Date.today()) + ':' + record.Agent__c, queued.Event_Key__c);

        update as system new SMS_Message_Queue__c(Id=queued.Id, Status__c='Sent', Message_Id__c='synthetic-receipt', Retry_Count__c=1, Message__c=STATUS_BODY);
        update as system new Account(Id=record.Agent__c, PersonMobilePhone='+12025550133');
        SendMessageResult repeated = new LeadUpdateMessagingService()
            .sendLeadStatusSMSAsync(record.Id, '+12025550139', '+12025550138', 'override@example.test');

        System.assertEquals(true, repeated.success);
        System.assertEquals('Queued', repeated.status);
        System.assertEquals(String.valueOf(queued.Id), repeated.messageId);
        SMS_Message_Queue__c settled = [
            SELECT Status__c, Message_Id__c, Retry_Count__c, To_Phone_Number__c, Message__c
            FROM SMS_Message_Queue__c WHERE Related_Lead__c = :record.Id WITH SYSTEM_MODE
        ];
        System.assertEquals('Sent', settled.Status__c);
        System.assertEquals('synthetic-receipt', settled.Message_Id__c);
        System.assertEquals(1, settled.Retry_Count__c);
        System.assertEquals(AGENT_MOBILE, settled.To_Phone_Number__c);
        System.assertEquals(STATUS_BODY, settled.Message__c);
    }

    @IsTest
    static void holdsInvalidOrIneligibleRequestsWithoutQueuing() {
        bind();
        List<LeadUpdateMessagingService.SendLeadStatusSMSRequest> inputs =
            new List<LeadUpdateMessagingService.SendLeadStatusSMSRequest>{null, request(null)};
        Set<String> blockedNames = new Set<String>{'Missing partner', 'Unknown state', 'Spam'};
        Map<String, Id> idsByName = new Map<String, Id>();
        for (Lead record : [SELECT Id, LastName FROM Lead WHERE LastName IN :blockedNames WITH SYSTEM_MODE]) {
            idsByName.put(record.LastName, record.Id);
        }
        inputs.add(request(idsByName.get('Missing partner')));
        inputs.add(request(idsByName.get('Unknown state')));
        inputs.add(request(idsByName.get('Spam')));

        System.assertEquals(0, LeadUpdateMessagingService.sendLeadStatusSMS_Invocable(null).size());
        List<LeadUpdateMessagingService.SendLeadStatusSMSResponse> responses =
            LeadUpdateMessagingService.sendLeadStatusSMS_Invocable(inputs);
        System.assertEquals(5, responses.size());
        for (LeadUpdateMessagingService.SendLeadStatusSMSResponse response : responses) {
            System.assertEquals(false, response.success);
            System.assertEquals(null, response.messageId);
        }
        System.assertEquals('Record ID is required.', responses[0].errorMessage);
        System.assertEquals('Record ID is required.', responses[1].errorMessage);
        System.assertEquals('Regional routing or partner phone requires review.', responses[2].errorMessage);
        System.assertEquals('Regional routing or partner phone requires review.', responses[3].errorMessage);
        System.assertEquals('Record is ineligible for regional status SMS.', responses[4].errorMessage);
        System.assertEquals(0, [SELECT COUNT() FROM SMS_Message_Queue__c WITH SYSTEM_MODE]);
    }
}
