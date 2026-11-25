@IsTest
private class WebdevOutboundCaptureTest {
    private class NoHttp implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest request) {
            System.assert(false, 'Outbound HTTP must remain disabled in this case');
            return new HttpResponse();
        }
    }

    private class ProviderHttp implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest request) {
            HttpResponse response = new HttpResponse();
            if (request.getMethod() == 'GET') {
                System.assertEquals('callout:OpenPhone/v1/phone-numbers', request.getEndpoint());
                response.setStatusCode(200);
                response.setBody('{"data":[]}');
            } else {
                System.assertEquals('POST', request.getMethod());
                System.assertEquals('callout:OpenPhone/v1/messages', request.getEndpoint());
                response.setStatusCode(202);
                response.setBody('{"data":{"id":"mock-provider-receipt","status":"queued"}}');
            }
            return response;
        }
    }

    private static OpenPhoneSendMessageRequest sampleSms() {
        OpenPhoneSendMessageRequest request = new OpenPhoneSendMessageRequest();
        request.fromNumber = '+12025550101';
        request.toNumber = new List<String>{ '+12025550102' };
        request.content = 'Synthetic private text for a capture assertion';
        return request;
    }

    private static Integer revalidationCount() {
        return [SELECT COUNT() FROM Webdev_Outbound_Capture__c WHERE Action__c = 'AccountRevalidation'];
    }

    private static Account insertTestPartner() {
        RecordType person = [
            SELECT Id FROM RecordType
            WHERE SObjectType = 'Account' AND DeveloperName = 'PersonAccountAgent'
                AND IsPersonType = true AND IsActive = true
            LIMIT 1
        ];
        Account partner = new Account(
            FirstName = 'WebDev', LastName = 'Capture Fixture', RecordTypeId = person.Id,
            PersonEmail = 'capture-fixture@example.test'
        );
        insert partner;
        Account saved = [SELECT isAgent__pc FROM Account WHERE Id = :partner.Id];
        System.assertEquals(true, saved.isAgent__pc, 'PersonAccountAgent must set the calculated agent flag');
        return partner;
    }

    @IsTest
    static void exactOrgAndSandboxFlagRequired() {
        System.assertEquals(WebdevOutboundCapture.Mode.Capture, WebdevOutboundCapture.classify('00Djg000000EK8YEAW', true));
        System.assertEquals(WebdevOutboundCapture.Mode.Production, WebdevOutboundCapture.classify('00D4x000003yaV2', false));
        System.assertEquals(WebdevOutboundCapture.Mode.Blocked, WebdevOutboundCapture.classify('00Djg000000EK8YEAW', false));
        System.assertEquals(WebdevOutboundCapture.Mode.Blocked, WebdevOutboundCapture.classify('00djg000000ek8yeaw', true));
        System.assertEquals(WebdevOutboundCapture.Mode.Blocked, WebdevOutboundCapture.classify('00D4x000003yaV2', true));
        System.assertEquals(WebdevOutboundCapture.Mode.Blocked, WebdevOutboundCapture.classify('00D000000000001AAA', false));
        System.assertEquals(WebdevOutboundCapture.Mode.Blocked, WebdevOutboundCapture.classify(null, null));
    }

    @IsTest
    static void capturesSmsBeforeSenderResolutionWithoutCreatingProviderReceipt() {
        Test.setMock(HttpCalloutMock.class, new NoHttp());
        WebdevOutboundCapture.testMode = WebdevOutboundCapture.Mode.Capture;
        // Validation is on and there is no registered fallback sender. Capture precedes that lookup.
        OpenPhoneSendMessageResponse response = new OpenPhoneClient('OpenPhone', true).SendMessage(sampleSms());

        System.assertEquals('Captured', response.data.status);
        System.assertEquals(null, response.data.id);
        System.assertEquals(null, response.data.createdAt);
        Webdev_Outbound_Capture__c entry = [
            SELECT Action__c, Item_Count__c, Run_Id__c, Digest__c, CreatedDate FROM Webdev_Outbound_Capture__c
        ];
        System.assertEquals('Sms', entry.Action__c);
        System.assertEquals(1, entry.Item_Count__c);
        System.assert(Pattern.matches('[A-Za-z0-9_-]{1,64}', entry.Run_Id__c));
        System.assert(Pattern.matches('[A-Fa-f0-9]{64}', entry.Digest__c));
        System.assertNotEquals(null, entry.CreatedDate);
        String evidence = JSON.serialize(entry);
        System.assert(!evidence.contains(sampleSms().content));
        System.assert(!evidence.contains(sampleSms().toNumber[0]));
    }

    @IsTest
    static void capturesScheduledSenderEnumerationWithoutReplacingRegistry() {
        Test.setMock(HttpCalloutMock.class, new NoHttp());
        WebdevOutboundCapture.testMode = WebdevOutboundCapture.Mode.Capture;
        insert new OpenPhone_RegisteredNumbers__c(
            Name = 'Test Registry Entry', UserEmail__c = 'registry@example.test', PhoneNumber__c = '+12025550101'
        );

        new OpenPhonePopulateSendersSchedulable().runNow();

        System.assertEquals(1, [SELECT COUNT() FROM OpenPhone_RegisteredNumbers__c]);
        Webdev_Outbound_Capture__c entry = [SELECT Action__c, Item_Count__c FROM Webdev_Outbound_Capture__c];
        System.assertEquals('SenderRegistry', entry.Action__c);
        System.assertEquals(0, entry.Item_Count__c);
    }

    @IsTest
    static void deniesUnapprovedCredentialAndUnknownOrgBeforeHttp() {
        Test.setMock(HttpCalloutMock.class, new NoHttp());
        WebdevOutboundCapture.testMode = WebdevOutboundCapture.Mode.Capture;
        try {
            new OpenPhoneClient('Unapproved_Test_Alias', false).SendMessage(sampleSms());
            System.assert(false, 'An unapproved alias must be rejected');
        } catch (OpenPhoneClient.CalloutException expected) {
            System.assertEquals('Outbound delivery blocked by sandbox policy', expected.getMessage());
        }

        WebdevOutboundCapture.testMode = WebdevOutboundCapture.Mode.Blocked;
        try {
            new OpenPhoneClient('OpenPhone').GetPhoneNumbers();
            System.assert(false, 'An unverified org must not enumerate senders');
        } catch (OpenPhoneClient.CalloutException expected) {
            System.assertEquals('Outbound delivery blocked by sandbox policy', expected.getMessage());
        }
        WebhookHandler.captureRevalidation('synthetic-account-reference', true, true);
        System.assertEquals(0, [SELECT COUNT() FROM Webdev_Outbound_Capture__c]);
    }

    @IsTest
    static void productionKeepsProviderRequestsAndReceipts() {
        Test.setMock(HttpCalloutMock.class, new ProviderHttp());
        WebdevOutboundCapture.testMode = WebdevOutboundCapture.Mode.Production;
        OpenPhoneClient client = new OpenPhoneClient('OpenPhone');

        System.assertEquals(0, client.GetPhoneNumbers().data.size());
        OpenPhoneSendMessageResponse result = client.SendMessage(sampleSms());
        System.assertEquals('mock-provider-receipt', result.data.id);
        System.assertEquals('queued', result.data.status);
        System.assertEquals(0, [SELECT COUNT() FROM Webdev_Outbound_Capture__c]);
    }

    @IsTest
    static void reminderBatchCapturesNativeEmailWithoutSending() {
        Test.setMock(HttpCalloutMock.class, new NoHttp());
        WebdevOutboundCapture.testMode = WebdevOutboundCapture.Mode.Capture;
        Lead reminder = new Lead(LastName = 'Synthetic Reminder', Company = 'Capture Fixture',
            Agent_Email__c = 'reminder@example.test');
        insert reminder;

        Integer sendCount = Limits.getEmailInvocations();
        new AgentPortalReminderBatch().execute(null, [
            SELECT Id, Name, Agent_Email__c, Agent__c, Last_Speed_To_Lead_Reminder__c,
                   Speed_To_Lead_Reminder_Count__c, Agent__r.PersonMobilePhone, Agent__r.Phone
            FROM Lead WHERE Id = :reminder.Id
        ]);

        System.assertEquals(sendCount, Limits.getEmailInvocations());
        Webdev_Outbound_Capture__c entry = [SELECT Item_Count__c FROM Webdev_Outbound_Capture__c WHERE Action__c = 'ReminderEmail'];
        System.assertEquals(1, entry.Item_Count__c);
    }

    @IsTest
    static void queuePersistsCaptureButRejectsEvenDefaultAliasWhenExplicitlyOverridden() {
        Test.setMock(HttpCalloutMock.class, new NoHttp());
        WebdevOutboundCapture.testMode = WebdevOutboundCapture.Mode.Capture;
        SMS_Message_Queue__c ordinary = new SMS_Message_Queue__c(
            To_Phone_Number__c = '+12025550102', From_Phone_Number__c = '+12025550101',
            Message__c = 'Synthetic queue content', Status__c = 'New', Retry_Count__c = 0
        );
        SMS_Message_Queue__c overrideRow = ordinary.clone(false, false, false, false);
        overrideRow.Named_Credential__c = 'OpenPhone';
        List<SMS_Message_Queue__c> scope = new List<SMS_Message_Queue__c>{ ordinary, overrideRow };
        insert scope;

        SmsMessageQueueBatch worker = new SmsMessageQueueBatch();
        worker.execute(null, scope);
        worker.execute(null, scope);

        Map<Id, SMS_Message_Queue__c> persisted = new Map<Id, SMS_Message_Queue__c>([
            SELECT Status__c, Message_Id__c, Provider_Status__c, Sent_At__c, Success__c, Retry_Count__c
            FROM SMS_Message_Queue__c
        ]);
        System.assertEquals('Captured', persisted.get(ordinary.Id).Status__c);
        System.assertEquals(false, persisted.get(ordinary.Id).Success__c);
        System.assertEquals(null, persisted.get(ordinary.Id).Message_Id__c);
        System.assertEquals(null, persisted.get(ordinary.Id).Sent_At__c);
        System.assertEquals(1, persisted.get(ordinary.Id).Retry_Count__c);
        System.assertEquals('Error', persisted.get(overrideRow.Id).Status__c);
        System.assertEquals('SandboxBlocked', persisted.get(overrideRow.Id).Provider_Status__c);
        System.assertEquals(1, [SELECT COUNT() FROM Webdev_Outbound_Capture__c WHERE Action__c = 'Sms']);
    }

    @IsTest
    static void accountTriggerCapturesInVerifiedDeploymentOrg() {
        Test.setMock(HttpCalloutMock.class, new NoHttp());
        Organization deploymentOrg = [SELECT Id, IsSandbox FROM Organization LIMIT 1];
        System.assertEquals('00Djg000000EK8YEAW', String.valueOf(deploymentOrg.Id));
        System.assertEquals(18, String.valueOf(deploymentOrg.Id).length());
        System.assertEquals(true, deploymentOrg.IsSandbox);
        System.assertEquals(WebdevOutboundCapture.Mode.Capture, WebdevOutboundCapture.mode());
        Test.startTest();
        Account partner = insertTestPartner();
        Test.stopTest();

        System.assertEquals(1, revalidationCount());
        Webdev_Outbound_Capture__c entry = [SELECT Digest__c FROM Webdev_Outbound_Capture__c LIMIT 1];
        System.assert(!JSON.serialize(entry).contains(String.valueOf(partner.Id)));
    }

    @IsTest
    static void realWebdevIdentitySelectsCaptureAtProviderBoundary() {
        Test.setMock(HttpCalloutMock.class, new NoHttp());
        WebdevOutboundCapture.Mode detected = WebdevOutboundCapture.mode();
        System.assertEquals(WebdevOutboundCapture.Mode.Capture, detected);
        // Select the detected mode rather than the legacy production-mock test default.
        WebdevOutboundCapture.testMode = detected;

        System.assertEquals('Captured', new OpenPhoneClient('OpenPhone').SendMessage(sampleSms()).data.status);
        System.assertEquals(0, new OpenPhoneClient('OpenPhone').GetPhoneNumbers().data.size());
        System.assertEquals(2, [SELECT COUNT() FROM Webdev_Outbound_Capture__c]);
    }

    @IsTest
    static void areaAssignmentTriggerCapturesInVerifiedDeploymentOrg() {
        Test.setMock(HttpCalloutMock.class, new NoHttp());
        Account partner = insertTestPartner();
        Area__c area = new Area__c(Name = 'WebDev Test Area', State__c = 'Texas', Coverage_Target__c = 1);
        insert area;

        Test.startTest();
        Integer previousFutureCount = Limits.getFutureCalls();
        insert new Area_Assignment__c(Agent__c = partner.Id, Area__c = area.Id, AA_Score__c = 90);
        System.assert(Limits.getFutureCalls() > previousFutureCount, 'Area Assignment must schedule the callback handler');
        Test.stopTest();

        System.assert(revalidationCount() >= 1, 'Area Assignment must invoke capture rather than an HTTP callback');
    }
}
