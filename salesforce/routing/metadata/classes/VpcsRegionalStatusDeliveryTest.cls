@IsTest
private class VpcsRegionalStatusDeliveryTest {
    private static final Id JOB_ID = '707000000000001AAA';
    private static final String CURRENT_BODY = 'Synthetic current status.';
    private static final Date NEXT_CONTACT = Date.newInstance(2026,11,27);

    private class Provider implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest request) {
            Map<String,Object> message = (Map<String,Object>) JSON.deserializeUntyped(request.getBody());
            System.assertEquals(CURRENT_BODY, message.get('content'));
            HttpResponse response = new HttpResponse();
            response.setStatusCode(202);
            response.setBody('{"data":{"id":"daily-fixture","status":"queued"}}');
            return response;
        }
    }

    @TestSetup
    static void setupClaim() {
        Id accountType = Account.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName()
            .get('PersonAccountAgent').getRecordTypeId();
        Account agent = new Account(RecordTypeId=accountType, FirstName='Synthetic',
            LastName='Status Dispatch Agent', PersonMobilePhone='+17195550100', Active_on_Website__pc=true);
        insert as system agent;
        Id leadType = Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
        Lead lead = new Lead(RecordTypeId=leadType, LastName='Synthetic Status Dispatch', Company='VeteranPCS',
            Status='New:_Not_Contacted', Destination_State__c='CO', Agent__c=agent.Id,
            Next_Contact_Date__c=NEXT_CONTACT);
        insert as system lead;
        Decimal sequence = [
            SELECT Routing_Status_Sequence__c FROM Lead WHERE Id=:lead.Id WITH SYSTEM_MODE
        ].Routing_Status_Sequence__c;
        insert as system new SMS_Message_Queue__c(Event_Key__c=lead.Id + ':' +
             VpcsRegionalStatusSequence.eventKey(sequence, Date.newInstance(2026,11,26)) + ':' + agent.Id,
             Related_Lead__c=lead.Id, Related_Partner__c=agent.Id,
             From_Phone_Number__c='+17192495359', To_Phone_Number__c='+17195550100', Status__c='Processing',
             Claim_Job_Id__c='707000000000001', Retry_Count__c=1,
             Message__c='Synthetic stale pre-rendered status.',
             Expected_Next_Contact__c='2026-11-27');
    }

    private static void enable() {
        VpcsRegionalDispatchControl.testBindings=new Map<String,Boolean>{'BETH'=>true,'STEPHANIE'=>true};
    }

    @IsTest
    static void workerUsesCurrentTemplateAndPersistsActualBody() {
        enable();
        VpcsRegionalStatusMessages.testBody=CURRENT_BODY;
        Test.setMock(HttpCalloutMock.class, new Provider());
        Id queued=[SELECT Id FROM SMS_Message_Queue__c WITH SYSTEM_MODE LIMIT 1].Id;
        Test.startTest();
        VpcsRegionalSmsWorker.settle(JOB_ID,new Set<Id>{queued});
        System.assertEquals(1,Limits.getCallouts());
        Test.stopTest();
        SMS_Message_Queue__c row=[
            SELECT Status__c,Message__c,Message_Id__c FROM SMS_Message_Queue__c WHERE Id=:queued WITH SYSTEM_MODE
        ];
        System.assertEquals('Sent',row.Status__c);
        System.assertEquals(CURRENT_BODY,row.Message__c);
        System.assertEquals('daily-fixture',row.Message_Id__c);
    }

    @IsTest
    static void clearedOrRescheduledContactHoldsWithoutAStatusTransition() {
        enable();
        SMS_Message_Queue__c queued = [
            SELECT Id, Related_Lead__c FROM SMS_Message_Queue__c WITH SYSTEM_MODE LIMIT 1
        ];
        Lead baseline = [
            SELECT Status, Routing_Status_Sequence__c FROM Lead WHERE Id=:queued.Related_Lead__c WITH SYSTEM_MODE
        ];
        for (Date changed : new List<Date>{null,NEXT_CONTACT.addDays(7)}) {
            update as system new Lead(Id=queued.Related_Lead__c, Next_Contact_Date__c=changed);
            Lead live = [
                SELECT Status, Routing_Status_Sequence__c, Next_Contact_Date__c
                FROM Lead WHERE Id=:queued.Related_Lead__c WITH SYSTEM_MODE
            ];
            System.assertEquals(changed,live.Next_Contact_Date__c);
            System.assertEquals(baseline.Status,live.Status);
            System.assertEquals(baseline.Routing_Status_Sequence__c,live.Routing_Status_Sequence__c);
            VpcsRegionalSmsWorker.settle(JOB_ID,new Set<Id>{queued.Id});
            System.assertEquals('Held',[
                SELECT Status__c FROM SMS_Message_Queue__c WHERE Id=:queued.Id WITH SYSTEM_MODE
            ].Status__c);
            update as system new SMS_Message_Queue__c(Id=queued.Id,Status__c='Processing');
        }
        System.assertEquals(0,Limits.getCallouts());
    }

    @IsTest
    static void missingOrInvalidSnapshotDoesNotMatchEvenWhenDateIsUnchanged() {
        enable();
        Id queued=[SELECT Id FROM SMS_Message_Queue__c WITH SYSTEM_MODE LIMIT 1].Id;
        for (String missing : new List<String>{null,'2026-02-31'}) {
            update as system new SMS_Message_Queue__c(Id=queued,Expected_Next_Contact__c=missing,Status__c='Processing');
            VpcsRegionalSmsWorker.settle(JOB_ID,new Set<Id>{queued});
            System.assertEquals('Held',[
                SELECT Status__c FROM SMS_Message_Queue__c WHERE Id=:queued WITH SYSTEM_MODE
            ].Status__c);
        }
        System.assertEquals(0,Limits.getCallouts());
        System.assert(VpcsRegionalStatusMessages.matchesNextContact('NONE',null));
        System.assert(!VpcsRegionalStatusMessages.matchesNextContact(null,null));
        System.assert(!VpcsRegionalStatusMessages.matchesNextContact('none',null));
    }

    @IsTest
    static void invalidCycleAndRevokedOptInCannotSend() {
        enable();
        SMS_Message_Queue__c original=[
            SELECT Id,Related_Lead__c,Related_Partner__c,Event_Key__c FROM SMS_Message_Queue__c WITH SYSTEM_MODE LIMIT 1
        ];
        update as system new SMS_Message_Queue__c(Id=original.Id,
            Event_Key__c=original.Event_Key__c.replace('2026-11-26','2026-02-31'));
        VpcsRegionalSmsWorker.settle(JOB_ID,new Set<Id>{original.Id});
        System.assertEquals('Held',[
            SELECT Status__c FROM SMS_Message_Queue__c WHERE Id=:original.Id WITH SYSTEM_MODE
        ].Status__c);
        update as system new SMS_Message_Queue__c(Id=original.Id,Event_Key__c=original.Event_Key__c,Status__c='Processing');
        update as system new Account(Id=original.Related_Partner__c,Active_on_Website__pc=false);
        VpcsRegionalSmsWorker.settle(JOB_ID,new Set<Id>{original.Id});
        System.assertEquals(0,Limits.getCallouts());
        System.assertEquals('Held',[
            SELECT Status__c FROM SMS_Message_Queue__c WHERE Id=:original.Id WITH SYSTEM_MODE
        ].Status__c);
    }
}
