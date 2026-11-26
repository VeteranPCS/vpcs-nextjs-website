@IsTest
private class VpcsRegionalDailyStatusQueueTest {
    @TestSetup
    static void createDueBatch() {
        Id accountType = Account.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName()
            .get('PersonAccountAgent').getRecordTypeId();
        Account agent = new Account(RecordTypeId=accountType, FirstName='Synthetic',
            LastName='Daily SMS Agent', PersonMobilePhone='+17195550100', Active_on_Website__pc=true);
        insert as system agent;
        Id leadType = Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
        List<Lead> due = new List<Lead>();
        for (Integer index=0; index<200; index++) {
            due.add(new Lead(RecordTypeId=leadType, LastName='Daily Status Fixture ' + index,
                Company='Synthetic Status', Status='New:_Not_Contacted', Destination_State__c='CO', Agent__c=agent.Id,
                Next_Contact_Date__c=Date.today().addDays(1)));
        }
        insert as system due;
    }

    @IsTest
    static void bulkInvocableQueuesTwoHundredWithoutInlineTemplateQueries() {
        VpcsRegionalDailyStatusQueue.Request request = new VpcsRegionalDailyStatusQueue.Request();
        request.leads = [SELECT Id FROM Lead WITH SYSTEM_MODE];
        System.assertEquals(200, request.leads.size());
        Test.startTest();
        // Multi-scope batch execution is verified in the native sandbox. Here the
        // trigger bypass keeps Apex's one-scope test harness focused on bulk enqueue.
        VpcsRegionalDailyStatusQueue.run(new List<VpcsRegionalDailyStatusQueue.Request>{request});
        Integer queries = Limits.getQueries();
        System.assert(queries < 20, 'Status queuing must not render a template per row.');
        System.assertEquals(200, [
            SELECT COUNT() FROM SMS_Message_Queue__c
            WHERE Status__c='New' AND Event_Key__c != null WITH SYSTEM_MODE
        ]);
        for (SMS_Message_Queue__c row : [
            SELECT Message__c, Expected_Next_Contact__c FROM SMS_Message_Queue__c WITH SYSTEM_MODE
        ]) {
            System.assertEquals(VpcsRegionalStatusMessages.DEFERRED_BODY, row.Message__c);
            System.assertEquals(String.valueOf(Date.today().addDays(1)),row.Expected_Next_Contact__c);
        }
        Test.stopTest();
    }

    @IsTest
    static void distinctQueueInsertsReuseTheSameTransactionWake() {
        List<Lead> due = [SELECT Id FROM Lead WITH SYSTEM_MODE LIMIT 3];
        Test.startTest();
        SmsMessageQueueBatch.forceRunTriggerInTest = true;
        for (Lead record : due) {
            VpcsRegionalDailyStatusQueue.Request request = new VpcsRegionalDailyStatusQueue.Request();
            request.leads = new List<Lead>{record};
            VpcsRegionalDailyStatusQueue.run(new List<VpcsRegionalDailyStatusQueue.Request>{request});
        }
        System.assertEquals(1, Limits.getQueueableJobs());
        System.assertEquals(3, [SELECT COUNT() FROM SMS_Message_Queue__c WHERE Status__c='New' WITH SYSTEM_MODE]);
        SmsMessageQueueBatch.forceRunTriggerInTest = false;
        Test.stopTest();
    }
}
