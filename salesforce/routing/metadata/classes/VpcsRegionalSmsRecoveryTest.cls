@IsTest
private class VpcsRegionalSmsRecoveryTest {
    private class SlotConsumer implements Queueable {
        public void execute(QueueableContext context) {}
    }

    private class OccupiedProducer implements Queueable {
        private final Boolean occupySlot;

        public OccupiedProducer(Boolean occupySlot) {
            this.occupySlot = occupySlot;
        }

        public void execute(QueueableContext context) {
            if (occupySlot) {
                System.enqueueJob(new SlotConsumer());
            }
            SmsMessageQueueBatch.forceRunTriggerInTest = true;
            SMS_Message_Queue__c regional = fixture(occupySlot ? 'slot-occupied' : 'no-chaining', 'New');
            if (occupySlot) {
                insert as system new List<SMS_Message_Queue__c>{regional, fixture(null, 'New')};
            } else {
                insert as system regional;
            }
            System.assertEquals(occupySlot ? 1 : 0, Limits.getQueueableJobs());
        }
    }

    private static SMS_Message_Queue__c fixture(String eventKey, String status) {
        return new SMS_Message_Queue__c(Event_Key__c=eventKey, Status__c=status,
            To_Phone_Number__c='+17195550100', From_Phone_Number__c='+17192495359', Message__c='Synthetic');
    }

    @IsTest
    static void occupiedAsyncSlotLeavesCommittedWorkForIndependentRecovery() {
        Test.startTest();
        AsyncOptions options = new AsyncOptions();
        options.MaximumQueueableStackDepth = 2;
        System.enqueueJob(new OccupiedProducer(true), options);
        Test.stopTest();
        SMS_Message_Queue__c waiting = [
            SELECT Id, Status__c, Claim_Job_Id__c FROM SMS_Message_Queue__c WHERE Event_Key__c='slot-occupied'
            WITH SYSTEM_MODE
        ];
        System.assertEquals('New',waiting.Status__c);
        System.assertEquals(null,waiting.Claim_Job_Id__c);
        System.assertEquals(1,[
            SELECT COUNT() FROM SMS_Message_Queue__c WHERE Event_Key__c=null AND Status__c='New'
            AND Claim_Job_Id__c=null WITH SYSTEM_MODE
        ]);
        VpcsRegionalDispatchControl.testBindings = new Map<String,Boolean>{'BETH'=>true,'STEPHANIE'=>true};
        Database.QueryLocatorIterator pending = new VpcsRegionalSmsRecovery().start(null).iterator();
        System.assert(pending.hasNext());
        System.assertEquals(waiting.Id,pending.next().Id);
    }

    @IsTest
    static void queueableProducerAtStackLimitLeavesCommittedNewWork() {
        Test.startTest();
        AsyncOptions options = new AsyncOptions();
        options.MaximumQueueableStackDepth = 1;
        System.enqueueJob(new OccupiedProducer(false), options);
        Test.stopTest();
        SMS_Message_Queue__c waiting = [
            SELECT Status__c, Claim_Job_Id__c FROM SMS_Message_Queue__c WHERE Event_Key__c='no-chaining'
            WITH SYSTEM_MODE
        ];
        System.assertEquals('New',waiting.Status__c);
        System.assertEquals(null,waiting.Claim_Job_Id__c);
    }

    @IsTest
    static void recoveryExcludesHeldAndLegacyAndHonorsPause() {
        SMS_Message_Queue__c waiting = fixture('regional-waiting','New');
        SMS_Message_Queue__c held = fixture('regional-held','Held');
        SMS_Message_Queue__c legacy = fixture(null,'New');
        insert as system new List<SMS_Message_Queue__c>{waiting,held,legacy};
        VpcsRegionalDispatchControl.testBindings = new Map<String,Boolean>{'BETH'=>false,'STEPHANIE'=>true};
        VpcsRegionalSmsRecovery sweep = new VpcsRegionalSmsRecovery();
        System.assertEquals(false,sweep.start(null).iterator().hasNext());
        VpcsRegionalDispatchControl.testBindings.put('BETH',true);
        Database.QueryLocatorIterator eligible = sweep.start(null).iterator();
        System.assert(eligible.hasNext());
        System.assertEquals(waiting.Id,eligible.next().Id);
        System.assertEquals(false,eligible.hasNext());

        Test.startTest();
        sweep.execute(null,new List<SObject>{waiting});
        System.assertEquals(1, Limits.getQueueableJobs());
        System.assertEquals('Processing',[
            SELECT Status__c FROM SMS_Message_Queue__c WHERE Id=:waiting.Id WITH SYSTEM_MODE
        ].Status__c);
        Test.stopTest();
    }

    @IsTest
    static void schedulerLaunchesOneNativeBatchForDurableNewWork() {
        VpcsRegionalDispatchControl.testBindings = new Map<String,Boolean>{'BETH'=>true,'STEPHANIE'=>true};
        insert as system fixture('cron-durable-new','New');
        Test.startTest();
        new VpcsRegionalSmsRecovery().execute((SchedulableContext)null);
        List<AsyncApexJob> batches = [
            SELECT Id, Status FROM AsyncApexJob
            WHERE ApexClass.Name='VpcsRegionalSmsRecovery' AND JobType='BatchApex' WITH SYSTEM_MODE
        ];
        System.assertEquals(1,batches.size());
        Test.stopTest();
    }

    @IsTest
    static void schedulerRestoresLegacyWakeWhileRegionalDispatchIsPaused() {
        VpcsRegionalDispatchControl.testBindings = new Map<String,Boolean>{'BETH'=>false,'STEPHANIE'=>true};
        SMS_Message_Queue__c regional = fixture('regional-stays-new','New');
        SMS_Message_Queue__c legacy = fixture(null,'New');
        insert as system new List<SMS_Message_Queue__c>{regional,legacy};
        Test.startTest();
        new VpcsRegionalSmsRecovery().execute((SchedulableContext)null);
        System.assertEquals(1, Limits.getQueueableJobs());
        System.assertEquals(1,[
            SELECT COUNT() FROM AsyncApexJob WHERE ApexClass.Name='SmsMessageQueueBatchLauncher'
            AND JobType='Queueable' WITH SYSTEM_MODE
        ]);
        Test.stopTest();
        System.assertEquals('New',[
            SELECT Status__c FROM SMS_Message_Queue__c WHERE Id=:regional.Id WITH SYSTEM_MODE
        ].Status__c);
    }

    @IsTest
    static void recoveryIsSchedulableWithAConcreteMinuteSlot() {
        Test.startTest();
        String name = 'VPCS Regional SMS Recovery Test 05';
        Id scheduledId = System.schedule(name,'0 5 * * * ?',new VpcsRegionalSmsRecovery());
        CronTrigger job = [
            SELECT CronExpression, CronJobDetail.Name, NextFireTime FROM CronTrigger WHERE Id=:scheduledId WITH SYSTEM_MODE
        ];
        System.assertEquals('0 5 * * * ?',job.CronExpression);
        System.assertEquals(name,job.CronJobDetail.Name);
        System.assertNotEquals(null,job.NextFireTime);
        Test.stopTest();
    }
}
