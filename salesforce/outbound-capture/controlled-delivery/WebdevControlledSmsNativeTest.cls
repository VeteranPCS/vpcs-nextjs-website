@IsTest
private class WebdevControlledSmsNativeTest {
    private static final Id JOB_ID = '707000000000001AAA';
    private static final String TECH = '+17194153014';
    private static final String BETH = '+17192495359';
    private static final String STEPHANIE = '+17192494757';
    private static final String MARKER = '[VPCS WEBDEV TEST]';
    private static final String NOTES = 'Synthetic routing delivery verification';
    private static final String PORTAL = 'https://example.test/agent-portal';
    private static final String AGENT_NAME = 'Synthetic Native Agent';
    private static final String LENDER_NAME = 'Synthetic Native Lender';
    private static final String CAPTURE_NAME = 'Synthetic Ordinary Capture';

    private class Provider implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest request) {
            System.assertEquals('POST', request.getMethod());
            System.assertEquals('callout:OpenPhone/v1/messages', request.getEndpoint());
            System.assertEquals(0, Limits.getDmlStatements(),
                'Controlled sends must precede ordinary capture audit DML');
            Map<String, Object> payload = (Map<String, Object>)JSON.deserializeUntyped(request.getBody());
            System.assertEquals(new List<Object>{TECH}, (List<Object>)payload.get('to'));
            String sender = (String)payload.get('from');
            String body = (String)payload.get('content');
            String prefix = MARKER + ' ' + Label.VPCS_Webdev_Capture_Run_Id + ' ';
            String receiptId;
            if (sender == BETH) {
                System.assert(body.startsWith(prefix + 'AgentSelectedCO\n'));
                System.assert(body.contains(PORTAL + '?agentId='));
                receiptId = 'native-beth-canary';
            } else {
                System.assertEquals(STEPHANIE, sender);
                System.assert(body.startsWith(prefix + 'LenderSelectedFL\n'));
                System.assert(body.contains(LENDER_NAME));
                System.assert(body.contains('tech@veteranpcs.com'));
                System.assert(body.contains('Destination State: Florida'));
                receiptId = 'native-stephanie-canary';
            }
            HttpResponse response = new HttpResponse();
            response.setStatusCode(202);
            response.setHeader('Content-Type', 'application/json');
            response.setBody('{"data":{"id":"' + receiptId + '","status":"queued"}}');
            return response;
        }
    }

    private static void routing() {
        WebdevOutboundCapture.testMode = WebdevOutboundCapture.Mode.Capture;
        VpcsRegionalDispatchControl.testBindings = new Map<String, Boolean>{'BETH' => true, 'STEPHANIE' => true};
        VpcsCustomerRouting.testBindings = new Map<String, VpcsCustomerRouting.Binding>{
            'BETH' => new VpcsCustomerRouting.Binding(UserInfo.getUserId(), BETH, 'tech@veteranpcs.com', PORTAL),
            'STEPHANIE' => new VpcsCustomerRouting.Binding(UserInfo.getUserId(), STEPHANIE, 'tech@veteranpcs.com', PORTAL)
        };
    }

    private static SMS_Message_Queue__c fixture(Id partnerId, Boolean isAgent, String surname, String sid) {
        Id customerType = Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
        String source = isAgent ? 'Contact Agent' : 'Contact Lender';
        Lead customer = new Lead(RecordTypeId = customerType, FirstName = MARKER, LastName = surname,
            Company = 'Synthetic Native Fixture', Status = 'Prospect', Email = 'tech@veteranpcs.com',
            Destination_State__c = isAgent ? 'CO' : 'FL', LeadSource = source, WebToLead__c = false,
            WebFormURL__c = 'https://example.test/contact-' + (isAgent ? 'agent' : 'lender') + '?sid=' + sid,
            Description = MARKER + ' ' + Label.VPCS_Webdev_Capture_Run_Id + ' ' + sid,
            Additional_Comments__c = NOTES, VPCS_Submission_ID__c = sid,
            Agent__c = isAgent ? partnerId : null, Lender__c = isAgent ? null : partnerId);
        insert as system customer;
        // Qualify the synthetic row for settlement without running the live website insert branch.
        update as system new Lead(Id = customer.Id, WebToLead__c = true, Status = 'New:_Not_Contacted');
        Lead persisted = [
            SELECT Status, LeadSource, WebToLead__c, WebFormURL__c,
                   Agent__c, Lender__c FROM Lead WHERE Id = :customer.Id WITH SYSTEM_MODE
        ];
        System.assertEquals('New:_Not_Contacted', persisted.Status);
        System.assert(isAgent ? VpcsRegionalLeadIntake.isInitialAgentEligible(persisted)
                              : VpcsRegionalLeadIntake.isInitialLenderEligible(persisted));
        return new SMS_Message_Queue__c(
            Related_Lead__c = customer.Id, Related_Partner__c = partnerId,
            Event_Key__c = customer.Id + (isAgent ? ':INITIAL_AGENT:' : ':INITIAL_LENDER:') + partnerId,
            Status__c = 'Processing', To_Phone_Number__c = TECH,
            From_Phone_Number__c = isAgent ? BETH : STEPHANIE, Message__c = 'Intentionally stale persisted text',
            Claim_Job_Id__c = String.valueOf(JOB_ID).left(15), Retry_Count__c = 1);
    }

    private static List<SMS_Message_Queue__c> configureSlots() {
        List<SMS_Message_Queue__c> rows = [
            SELECT Id, Related_Lead__c, Related_Partner__c, Event_Key__c,
                   Related_Lead__r.LastName, Related_Lead__r.VPCS_Submission_ID__c
            FROM SMS_Message_Queue__c WITH SYSTEM_MODE
        ];
        List<WebdevControlledSms.Slot> slots = new List<WebdevControlledSms.Slot>();
        for (SMS_Message_Queue__c row : rows) {
            String surname = row.Related_Lead__r.LastName;
            if (surname == CAPTURE_NAME) continue;
            slots.add(new WebdevControlledSms.Slot(row.Id, row.Related_Lead__c, row.Related_Partner__c,
                surname == AGENT_NAME ? 'AgentSelectedCO' : 'LenderSelectedFL',
                surname, row.Related_Lead__r.VPCS_Submission_ID__c, row.Event_Key__c));
        }
        WebdevControlledSms.testWindow = new WebdevControlledSms.DeliveryWindow(
            Label.VPCS_Webdev_Capture_Run_Id, System.now().addMinutes(-1), System.now().addMinutes(10), slots);
        return rows;
    }

    @TestSetup
    static void committedFixtures() {
        routing();
        Map<String, Schema.RecordTypeInfo> types = Account.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName();
        Account agent = new Account(RecordTypeId = types.get('PersonAccountAgent').getRecordTypeId(),
            FirstName = 'Synthetic', LastName = 'Native Agent Partner', PersonMobilePhone = TECH);
        Account lender = new Account(RecordTypeId = types.get('Person_Account_Lender').getRecordTypeId(),
            FirstName = 'Synthetic', LastName = 'Native Lender Partner', PersonMobilePhone = TECH);
        insert as system new List<Account>{agent, lender};
        // Put ordinary capture first in the unsorted candidates.
        List<SMS_Message_Queue__c> fixtures = new List<SMS_Message_Queue__c>{
            fixture(agent.Id, true, CAPTURE_NAME, 'capture-only-sid'),
            fixture(agent.Id, true, AGENT_NAME, 'native-agent-sid'),
            fixture(lender.Id, false, LENDER_NAME, 'native-lender-sid')
        };
        System.assertEquals(0, [SELECT COUNT() FROM SMS_Message_Queue__c WITH SYSTEM_MODE],
            'Fixture creation must not run the native initial insert SMS path');
        insert as system fixtures;
        List<SMS_Message_Queue__c> allRows = configureSlots();
        WebdevControlledSms.reserve(new Map<Id, SMS_Message_Queue__c>(allRows).keySet(), JOB_ID);
        System.assertEquals(2, [SELECT COUNT() FROM Webdev_Live_SMS_Reservation__c WITH SYSTEM_MODE]);
    }

    @IsTest
    static void actualOpenPhoneBoundarySendsTwoApprovedMessagesBeforeCapturingOrdinaryRow() {
        routing();
        List<SMS_Message_Queue__c> rows = configureSlots();
        List<SMS_Message_Queue__c> captureFirst = new List<SMS_Message_Queue__c>();
        List<SMS_Message_Queue__c> approved = new List<SMS_Message_Queue__c>();
        for (SMS_Message_Queue__c row : rows) {
            if (row.Related_Lead__r.LastName == CAPTURE_NAME) captureFirst.add(row);
            else approved.add(row);
        }
        captureFirst.addAll(approved);
        System.assertEquals(CAPTURE_NAME, WebdevControlledSms.liveFirst(captureFirst)[2].Related_Lead__r.LastName);
        Test.setMock(HttpCalloutMock.class, new Provider());
        Test.startTest();
        VpcsRegionalSmsWorker.settle(JOB_ID, new Map<Id, SMS_Message_Queue__c>(rows).keySet());
        System.assertEquals(2, Limits.getCallouts());
        Test.stopTest();

        Map<String, String> observed = new Map<String, String>();
        for (SMS_Message_Queue__c row : [
            SELECT Status__c, Message_Id__c, Related_Lead__r.LastName FROM SMS_Message_Queue__c WITH SYSTEM_MODE
        ]) {
            observed.put(row.Related_Lead__r.LastName, row.Status__c + ':' + row.Message_Id__c);
        }
        System.assertEquals('Sent:native-beth-canary', observed.get(AGENT_NAME));
        System.assertEquals('Sent:native-stephanie-canary', observed.get(LENDER_NAME));
        System.assertEquals('Captured:null', observed.get(CAPTURE_NAME));
    }
}
