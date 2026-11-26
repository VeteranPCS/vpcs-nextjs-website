@IsTest
private class WebdevControlledSmsTest {
    private static final Id JOB = '707000000000001';
    private static final Id NEXT_JOB = '707000000000002';
    private static final String TECH = '+17194153014';
    private static final String BETH = '+17192495359';
    private static final String STEPHANIE = '+17192494757';
    private static final String LOCATION = 'VPCS WebDev synthetic location';
    private static final String MARKER = '[VPCS WEBDEV TEST]';
    private static final String SUBMISSION = 'controlled-delivery-fixture';
    private static final String PORTAL = 'https://example.test/agent-portal';
    private static final String SURNAME = 'Synthetic-ApexTest';

    private class FakeProvider implements IMessagingService {
        Integer accepted = 0;

        public SendMessageResult sendSMS(SendSMSRequest request) {
            OpenPhoneSendMessageRequest boundary = new OpenPhoneSendMessageRequest();
            boundary.fromNumber = request.fromPhoneNumber;
            boundary.toNumber = new List<String>{request.toPhoneNumber};
            String originalBody = request.message;
            boundary.content = originalBody;
            System.assertEquals(false, WebdevControlledSms.consumePermit(boundary, 'alternate'));
            boundary.toNumber = new List<String>{'+12025550100'};
            System.assertEquals(false, WebdevControlledSms.consumePermit(boundary, 'OpenPhone'));
            boundary.toNumber = new List<String>{TECH};
            boundary.fromNumber = STEPHANIE;
            System.assertEquals(false, WebdevControlledSms.consumePermit(boundary, 'OpenPhone'));
            request.fromPhoneNumber = STEPHANIE;
            request.message = 'Changed by caller after authorization';
            boundary.content = request.message;
            System.assertEquals(false, WebdevControlledSms.consumePermit(boundary, 'OpenPhone'));
            boundary.fromNumber = BETH;
            String originalPrefix = MARKER + ' ' + Label.VPCS_Webdev_Capture_Run_Id + ' AgentSelectedCO\n';
            System.assertNotEquals(originalPrefix, request.message);
            boundary.content = originalBody;
            System.assert(WebdevControlledSms.consumePermit(boundary, 'OpenPhone'));
            System.assertEquals(false, WebdevControlledSms.consumePermit(boundary, 'OpenPhone'));
            System.assert(originalBody.startsWith(MARKER + ' ' + Label.VPCS_Webdev_Capture_Run_Id +
                ' AgentSelectedCO\n'));
            accepted++;
            return SendMessageResult.createSuccess('synthetic-provider-id', 'queued', System.now());
        }

        public SendMessageResult sendSmsAsync(SendSMSRequest request) {
            return sendSMS(request);
        }

        public SendMessageResult sendSmsAsync(SendSMSRequest request, Boolean triggerBatch) {
            return sendSMS(request);
        }
    }

    private static SMS_Message_Queue__c seed() {
        WebdevOutboundCapture.testMode = WebdevOutboundCapture.Mode.Capture;
        VpcsRegionalDispatchControl.testBindings = new Map<String, Boolean>{'BETH' => true, 'STEPHANIE' => true};
        VpcsCustomerRouting.testBindings = new Map<String, VpcsCustomerRouting.Binding>{
            'BETH' => new VpcsCustomerRouting.Binding(UserInfo.getUserId(), BETH, 'tech@veteranpcs.com', PORTAL)
        };
        Id partnerType = Account.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName()
            .get('PersonAccountAgent').getRecordTypeId();
        Account partner = new Account(RecordTypeId = partnerType, FirstName = 'Synthetic',
            LastName = 'Controlled SMS Test Partner', PersonMobilePhone = TECH);
        insert as system partner;
        Id customerType = Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
        Lead customer = new Lead(FirstName = MARKER, LastName = SURNAME, Company = 'Synthetic Control',
            RecordTypeId = customerType, Status = 'Prospect', Destination_State__c = 'CO', WebToLead__c = false,
            Email = 'tech@veteranpcs.com', Agent__c = partner.Id, VPCS_Submission_ID__c = SUBMISSION,
            Additional_Comments__c = 'Synthetic routing delivery verification',
            Description = MARKER + ' ' + Label.VPCS_Webdev_Capture_Run_Id + ' ' + SUBMISSION + '\nSynthetic test');
        insert as system customer;
        SMS_Message_Queue__c row = new SMS_Message_Queue__c(
            Related_Lead__c = customer.Id, Related_Partner__c = partner.Id,
            Event_Key__c = customer.Id + ':INITIAL_AGENT:' + partner.Id, Status__c = 'Processing',
            To_Phone_Number__c = TECH, From_Phone_Number__c = BETH, Message__c = 'Old queue body from before a portal change',
            Claim_Job_Id__c = String.valueOf(JOB), Retry_Count__c = 1);
        insert as system row;
        WebdevControlledSms.testWindow = new WebdevControlledSms.DeliveryWindow(
            Label.VPCS_Webdev_Capture_Run_Id, System.now().addMinutes(-1), System.now().addMinutes(10),
            new List<WebdevControlledSms.Slot>{new WebdevControlledSms.Slot(
                row.Id, customer.Id, partner.Id, 'AgentSelectedCO', SURNAME, SUBMISSION, row.Event_Key__c
            )});
        return row;
    }

    private static SendSMSRequest requestFor(SMS_Message_Queue__c row) {
        SendSMSRequest result = new SendSMSRequest();
        result.toPhoneNumber = TECH;
        result.fromPhoneNumber = BETH;
        result.message = VpcsRegionalLeadIntake.agentPortalSms(PORTAL + '?agentId=' + row.Related_Partner__c);
        return result;
    }

    @IsTest
    static void requiresDurableClaimThenAllowsOnlyOneAttempt() {
        SMS_Message_Queue__c row = seed();
        FakeProvider provider = new FakeProvider();
        System.assertEquals(false, WebdevControlledSms.sendOrCapture(JOB, row.Id, provider, requestFor(row)).success);
        WebdevControlledSms.reserve(new Set<Id>{row.Id}, JOB);
        WebdevControlledSms.reserve(new Set<Id>{row.Id}, JOB);
        System.assertEquals(1, [SELECT COUNT() FROM Webdev_Live_SMS_Reservation__c WITH SYSTEM_MODE]);
        System.assert(WebdevControlledSms.sendOrCapture(JOB, row.Id, provider, requestFor(row)).success);
        System.assertEquals(false, WebdevControlledSms.sendOrCapture(JOB, row.Id, provider, requestFor(row)).success);

        update as system new SMS_Message_Queue__c(Id = row.Id, Claim_Job_Id__c = String.valueOf(NEXT_JOB));
        WebdevControlledSms.reserve(new Set<Id>{row.Id}, NEXT_JOB);
        System.assertEquals(false, WebdevControlledSms.sendOrCapture(NEXT_JOB, row.Id, provider, requestFor(row)).success);
        System.assertEquals(1, provider.accepted);
    }

    @IsTest
    static void deniesRecipientSenderExpiryAndMissingFixtureMarker() {
        SMS_Message_Queue__c row = seed();
        FakeProvider provider = new FakeProvider();
        WebdevControlledSms.reserve(new Set<Id>{row.Id}, JOB);
        SendSMSRequest forged = requestFor(row);
        forged.toPhoneNumber = '+12025550100';
        System.assertEquals(false, WebdevControlledSms.sendOrCapture(JOB, row.Id, provider, forged).success);
        forged.toPhoneNumber = TECH;
        forged.fromPhoneNumber = STEPHANIE;
        System.assertEquals(false, WebdevControlledSms.sendOrCapture(JOB, row.Id, provider, forged).success);
        forged.fromPhoneNumber = BETH;
        forged.message = 'Different body';
        System.assertEquals(false, WebdevControlledSms.sendOrCapture(JOB, row.Id, provider, forged).success);
        WebdevControlledSms.testWindow.expiresAt = System.now().addSeconds(-1);
        System.assertEquals(false, WebdevControlledSms.sendOrCapture(JOB, row.Id, provider, requestFor(row)).success);
        WebdevControlledSms.testWindow.expiresAt = System.now().addMinutes(10);
        update as system new Lead(Id = row.Related_Lead__c, Description = 'Unmarked Customer');
        System.assertEquals(false, WebdevControlledSms.sendOrCapture(JOB, row.Id, provider, requestFor(row)).success);
        System.assertEquals(0, provider.accepted);
    }
    @IsTest
    static void requiresBothExactSyntheticLocationsOrBothNull() {
        SMS_Message_Queue__c row = seed();
        FakeProvider provider = new FakeProvider();
        WebdevControlledSms.reserve(new Set<Id>{row.Id}, JOB);
        System.assertEquals(1, [SELECT COUNT() FROM Webdev_Live_SMS_Reservation__c WITH SYSTEM_MODE]);

        update as system new Lead(Id = row.Related_Lead__c, Current_Base__c = LOCATION);
        System.assertEquals(false, WebdevControlledSms.sendOrCapture(JOB, row.Id, provider, requestFor(row)).success);

        update as system new Lead(Id = row.Related_Lead__c, Destination_Base__c = 'Denver');
        System.assertEquals(false, WebdevControlledSms.sendOrCapture(JOB, row.Id, provider, requestFor(row)).success);

        update as system new Lead(Id = row.Related_Lead__c,
            Current_Base__c = 'vpcs WebDev synthetic location', Destination_Base__c = LOCATION);
        System.assertEquals(false, WebdevControlledSms.sendOrCapture(JOB, row.Id, provider, requestFor(row)).success);
        System.assertEquals(0, provider.accepted);

        update as system new Lead(Id = row.Related_Lead__c, Current_Base__c = LOCATION);
        System.assert(WebdevControlledSms.sendOrCapture(JOB, row.Id, provider, requestFor(row)).success);
        System.assertEquals(1, provider.accepted);
    }

}
