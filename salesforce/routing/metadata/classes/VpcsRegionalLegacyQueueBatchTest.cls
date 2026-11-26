@IsTest
private class VpcsRegionalLegacyQueueBatchTest {
    private static SMS_Message_Queue__c queuedMessage(String eventKey, String status) {
        return new SMS_Message_Queue__c(Event_Key__c=eventKey, Status__c=status,
            Message__c='Synthetic queue routing fixture', From_Phone_Number__c='+17192495359',
            To_Phone_Number__c='+17195550100', Retry_Count__c=0);
    }

    @IsTest
    static void legacyCallerWakesOnceWhenLauncherIsAlreadyQueued() {
        Test.startTest();
        SmsMessageQueueBatch.forceRunTriggerInTest = true;
        insert as system queuedMessage(null, 'New');
        System.assertEquals(1, Limits.getQueueableJobs());
        insert as system queuedMessage(null, 'New');
        System.assertEquals(1, Limits.getQueueableJobs(), 'A second legacy insert should reuse the waiting launcher.');
        SmsMessageQueueBatch.forceRunTriggerInTest = false;
        Test.stopTest();
    }

    @IsTest
    static void legacyBatchDoesNotClaimNewManagedRows() {
        VpcsRegionalDispatchControl.testBindings = new Map<String, Boolean>{'BETH'=>true, 'STEPHANIE'=>true};
        SMS_Message_Queue__c waiting = queuedMessage('synthetic-fallback-new', 'New');
        SMS_Message_Queue__c held = queuedMessage('synthetic-fallback-held', 'Held');
        held.Retry_Count__c = 1;
        insert as system new List<SMS_Message_Queue__c>{waiting, held};

        Test.startTest();
        new SmsMessageQueueBatch().execute(null, new List<SMS_Message_Queue__c>{waiting, held});
        System.assertEquals(0, Limits.getCallouts());
        System.assertEquals(0, Limits.getQueueableJobs());
        Set<Id> ids = new Set<Id>{waiting.Id, held.Id};
        Map<Id, SMS_Message_Queue__c> current = new Map<Id, SMS_Message_Queue__c>([
            SELECT Status__c, Retry_Count__c FROM SMS_Message_Queue__c WHERE Id IN :ids WITH SYSTEM_MODE
        ]);
        System.assertEquals('New', current.get(waiting.Id).Status__c);
        System.assertEquals('Held', current.get(held.Id).Status__c);
        System.assertEquals(1, current.get(held.Id).Retry_Count__c);
        Test.stopTest();
    }
}
