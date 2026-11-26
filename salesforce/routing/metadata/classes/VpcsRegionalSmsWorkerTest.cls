@IsTest
private class VpcsRegionalSmsWorkerTest {
    private static final String CLAIM_15 = '707000000000001';
    private static final Id CLAIM_18 = '707000000000001AAA';
    private class Accepted implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest request) {
            Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(request.getBody());
            System.assertEquals('+17192495359', body.get('from'));
            System.assertEquals(new List<Object>{'+17195550100'}, (List<Object>) body.get('to'));
            HttpResponse response = new HttpResponse();
            response.setStatusCode(202);
            response.setHeader('Content-Type', 'application/json');
            response.setBody('{"data":{"id":"regional-test","status":"queued","createdAt":"2026-11-25T12:00:00.000Z"}}');
            return response;
        }
    }

    private class Ambiguous implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest request) {
            HttpResponse response = new HttpResponse();
            response.setStatusCode(504);
            response.setBody('{}');
            return response;
        }
    }

    @TestSetup
    static void prepareCommittedClaim() {
        RecordType personAccountType = [
            SELECT Id FROM RecordType
            WHERE SObjectType = 'Account' AND DeveloperName = 'PersonAccountAgent' AND IsPersonType = true
            WITH SYSTEM_MODE LIMIT 1
        ];
        Account agent = new Account(RecordTypeId=personAccountType.Id, FirstName='Synthetic',
            LastName='SMS Partner', PersonMobilePhone='+17195550100');
        insert as system agent;
        Id customerLead = Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
        Lead lead = new Lead(RecordTypeId=customerLead, LastName='Synthetic SMS Test', Company='VeteranPCS',
            Status='New:_Not_Contacted', Destination_State__c='CO', Agent__c=agent.Id, Speed_To_Lead_Reminder_Count__c=1);
        insert as system lead;
        insert as system new SMS_Message_Queue__c(
            Event_Key__c = lead.Id + ':PORTAL_REMINDER:1:' + agent.Id,
            Related_Lead__c = lead.Id, Related_Partner__c = agent.Id,
            Message__c = 'Synthetic SMS', Status__c = 'Processing',
            From_Phone_Number__c = '+17192495359', To_Phone_Number__c = '+17195550100',
            Claim_Job_Id__c = CLAIM_15, Retry_Count__c=1
        );
    }

    @IsTest
    static void providerReceiptSettlesCommittedClaim() {
        assertClaim(new Accepted(), 'Sent', 'regional-test');
    }

    @IsTest
    static void ambiguousProviderOutcomeIsHeld() {
        assertClaim(new Ambiguous(), 'Held', null);
    }

    @IsTest
    static void claimWithChangedDestinationIsHeldBeforeCallout() {
        enableDispatch();
        SMS_Message_Queue__c row = [
            SELECT Id, Related_Lead__c FROM SMS_Message_Queue__c WITH SYSTEM_MODE LIMIT 1
        ];
        update as system new Lead(Id=row.Related_Lead__c, Destination_State__c='NY');
        Integer before = Limits.getCallouts();
        VpcsRegionalSmsWorker.settle(CLAIM_18, new Set<Id>{row.Id});
        System.assertEquals(before, Limits.getCallouts(), 'A changed sender must stop dispatch.');
        SMS_Message_Queue__c held = [
            SELECT Status__c, Error_Message__c, Retry_Count__c
            FROM SMS_Message_Queue__c WHERE Id=:row.Id WITH SYSTEM_MODE
        ];
        System.assertEquals('Held', held.Status__c);
        System.assert(held.Error_Message__c.contains('changed after queueing'));
        System.assertEquals(1, held.Retry_Count__c);
    }

    @IsTest
    static void backloggedPortalAttemptIsHeldAfterANewerAttemptCommits() {
        enableDispatch();
        SMS_Message_Queue__c row = [
            SELECT Id, Related_Lead__c FROM SMS_Message_Queue__c WITH SYSTEM_MODE LIMIT 1
        ];
        update as system new Lead(Id=row.Related_Lead__c, Speed_To_Lead_Reminder_Count__c=2);
        Integer before = Limits.getCallouts();
        VpcsRegionalSmsWorker.settle(CLAIM_18, new Set<Id>{row.Id});
        System.assertEquals(before, Limits.getCallouts());
        SMS_Message_Queue__c held = [
            SELECT Status__c FROM SMS_Message_Queue__c WHERE Id=:row.Id WITH SYSTEM_MODE
        ];
        System.assertEquals('Held', held.Status__c);
    }

    @IsTest
    static void staleAndAbandonedClaimsStayHeldWithoutResend() {
        SMS_Message_Queue__c row = [SELECT Id FROM SMS_Message_Queue__c WITH SYSTEM_MODE LIMIT 1];
        update as system new SMS_Message_Queue__c(Id=row.Id, Last_Attempt_At__c=System.now().addDays(-2));
        VpcsRegionalSmsWorker.holdExpiredClaims();
        SMS_Message_Queue__c expired = [
            SELECT Status__c, Error_Message__c FROM SMS_Message_Queue__c WHERE Id=:row.Id WITH SYSTEM_MODE
        ];
        System.assertEquals('Held', expired.Status__c);
        System.assert(expired.Error_Message__c.contains('expired'));
        VpcsRegionalSmsWorker.holdUnsettledClaims(CLAIM_18, new Set<Id>{row.Id});
        SMS_Message_Queue__c held = [
            SELECT Status__c, Error_Message__c FROM SMS_Message_Queue__c WHERE Id=:row.Id WITH SYSTEM_MODE
        ];
        System.assertEquals('Held', held.Status__c);
        System.assertEquals(expired.Error_Message__c, held.Error_Message__c);
    }

    @IsTest
    static void eitherDisabledBindingPreventsClaimsAndResumeOnlyClaimsNew() {
        SMS_Message_Queue__c waiting = new SMS_Message_Queue__c(
            Event_Key__c='pause-new', Message__c='Synthetic', Status__c='New',
            To_Phone_Number__c='+17195550100', From_Phone_Number__c='+17192495359'
        );
        SMS_Message_Queue__c held = waiting.clone(false, false, false, false);
        held.Event_Key__c = 'previously-held';
        held.Status__c = 'Held';
        insert as system new List<SMS_Message_Queue__c>{waiting, held};
        Set<Id> ids = new Set<Id>{waiting.Id, held.Id};

        Test.startTest();
        VpcsRegionalDispatchControl.testBindings = new Map<String, Boolean>{'BETH'=>false, 'STEPHANIE'=>false};
        VpcsRegionalSmsWorker.claim(ids);
        VpcsRegionalDispatchControl.testBindings.put('STEPHANIE', true);
        VpcsRegionalSmsWorker.claim(ids);
        System.assertEquals(0, Limits.getQueueableJobs());
        SMS_Message_Queue__c paused = [
            SELECT Status__c, Claim_Job_Id__c, Retry_Count__c
            FROM SMS_Message_Queue__c WHERE Id=:waiting.Id WITH SYSTEM_MODE
        ];
        System.assertEquals('New', paused.Status__c);
        System.assertEquals(null, paused.Claim_Job_Id__c);
        System.assertEquals(0, paused.Retry_Count__c);

        VpcsRegionalDispatchControl.testBindings.put('BETH', true);
        VpcsRegionalSmsWorker.claim(ids);
        System.assertEquals(1, Limits.getQueueableJobs());
        Map<Id, SMS_Message_Queue__c> afterResume = new Map<Id, SMS_Message_Queue__c>([
            SELECT Status__c, Claim_Job_Id__c FROM SMS_Message_Queue__c WHERE Id IN :ids WITH SYSTEM_MODE
        ]);
        System.assertEquals('Processing', afterResume.get(waiting.Id).Status__c);
        System.assertEquals('Held', afterResume.get(held.Id).Status__c);
        System.assertEquals(null, afterResume.get(held.Id).Claim_Job_Id__c);
        Test.stopTest();
    }

    @IsTest
    static void aPauseAfterClaimHoldsWithoutCalloutAndCreatesReviewTask() {
        SMS_Message_Queue__c queued = [
            SELECT Id, Related_Lead__c FROM SMS_Message_Queue__c WHERE Status__c='Processing' WITH SYSTEM_MODE LIMIT 1
        ];
        VpcsRegionalDispatchControl.testBindings = new Map<String, Boolean>{'BETH'=>true, 'STEPHANIE'=>false};
        Integer priorCallouts = Limits.getCallouts();
        VpcsRegionalSmsWorker.settle(CLAIM_18, new Set<Id>{queued.Id});
        System.assertEquals(priorCallouts, Limits.getCallouts());
        SMS_Message_Queue__c current = [
            SELECT Status__c, Error_Message__c FROM SMS_Message_Queue__c WHERE Id=:queued.Id WITH SYSTEM_MODE
        ];
        System.assertEquals('Held', current.Status__c);
        System.assert(current.Error_Message__c.contains('No provider request was made'));
        System.assertEquals(1, [
            SELECT COUNT() FROM Task WHERE WhoId=:queued.Related_Lead__c
                AND Subject='Regional routing exception: SMS review' WITH SYSTEM_MODE
        ]);
    }

    @IsTest
    static void finalizerHoldsMatchingClaimAcrossIdRepresentations() {
        SMS_Message_Queue__c row = [SELECT Id FROM SMS_Message_Queue__c WITH SYSTEM_MODE LIMIT 1];
        VpcsRegionalSmsWorker.holdUnsettledClaims(CLAIM_18, new Set<Id>{row.Id});
        SMS_Message_Queue__c held = [
            SELECT Status__c, Claim_Job_Id__c FROM SMS_Message_Queue__c WHERE Id=:row.Id WITH SYSTEM_MODE
        ];
        System.assertEquals('Held', held.Status__c);
        System.assertEquals(CLAIM_15, held.Claim_Job_Id__c);
    }

    @IsTest
    static void invalidClaimCannotDispatchOrFinalizeAnotherJob() {
        enableDispatch();
        SMS_Message_Queue__c row = [SELECT Id FROM SMS_Message_Queue__c WITH SYSTEM_MODE LIMIT 1];
        update as system new SMS_Message_Queue__c(Id=row.Id, Claim_Job_Id__c='707-not-an-id',
            Last_Attempt_At__c=System.now().addDays(-2));
        Integer priorCallouts = Limits.getCallouts();
        VpcsRegionalSmsWorker.settle(CLAIM_18, new Set<Id>{row.Id});
        VpcsRegionalSmsWorker.holdUnsettledClaims(CLAIM_18, new Set<Id>{row.Id});
        System.assertEquals(priorCallouts, Limits.getCallouts());
        System.assertEquals('Processing', [
            SELECT Status__c FROM SMS_Message_Queue__c WHERE Id=:row.Id WITH SYSTEM_MODE
        ].Status__c);
        VpcsRegionalSmsWorker.holdExpiredClaims();
        System.assertEquals('Held', [
            SELECT Status__c FROM SMS_Message_Queue__c WHERE Id=:row.Id WITH SYSTEM_MODE
        ].Status__c);
    }

    @IsTest
    static void expiryKeepsActiveJobEvenWithFifteenCharacterClaim() {
        SMS_Message_Queue__c row = [SELECT Id FROM SMS_Message_Queue__c WITH SYSTEM_MODE LIMIT 1];
        Test.startTest();
        VpcsRegionalSmsWake.enqueue(new Set<Id>(), false);
        AsyncApexJob job = [
            SELECT Id FROM AsyncApexJob WHERE ApexClass.Name='VpcsRegionalSmsWake' AND Status IN ('Queued','Holding','Preparing','Processing')
            WITH SYSTEM_MODE LIMIT 1
        ];
        update as system new SMS_Message_Queue__c(Id=row.Id, Claim_Job_Id__c=String.valueOf(job.Id).left(15),
            Last_Attempt_At__c=System.now().addDays(-2));
        VpcsRegionalSmsWorker.holdExpiredClaims();
        System.assertEquals('Processing', [
            SELECT Status__c FROM SMS_Message_Queue__c WHERE Id=:row.Id WITH SYSTEM_MODE
        ].Status__c);
        Test.stopTest();
    }

    private static void enableDispatch() {
        VpcsRegionalDispatchControl.testBindings = new Map<String, Boolean>{'BETH'=>true, 'STEPHANIE'=>true};
    }

    private static void assertClaim(HttpCalloutMock provider, String status, String receipt) {
        enableDispatch();
        SMS_Message_Queue__c queued = [
            SELECT Id FROM SMS_Message_Queue__c WHERE Status__c='Processing' WITH SYSTEM_MODE LIMIT 1
        ];
        Test.setMock(HttpCalloutMock.class, provider);
        Test.startTest();
        // Setup committed the claim. Use its fixture ID because enqueueJob returns null during Apex tests.
        VpcsRegionalSmsWorker.settle(CLAIM_18, new Set<Id>{queued.Id});
        System.assertEquals(1, Limits.getCallouts(), 'An enabled matching claim must reach the mocked provider.');
        Test.stopTest();
        SMS_Message_Queue__c settled = [
            SELECT Status__c, Message_Id__c, Retry_Count__c FROM SMS_Message_Queue__c
            WHERE Id=:queued.Id WITH SYSTEM_MODE
        ];
        System.assertEquals(status, settled.Status__c);
        System.assertEquals(receipt, settled.Message_Id__c);
        System.assertEquals(1, settled.Retry_Count__c);
    }
}
