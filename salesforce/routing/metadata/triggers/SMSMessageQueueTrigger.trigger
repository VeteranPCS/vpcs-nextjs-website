// Single, canonical trigger point for launching SmsMessageQueueBatch. Any code path
// that queues an SMS (the daily Lead/Opp update schedulers, AgentPortalReminderBatch,
// Lead_WebToLead_AfterInsert, future callers) gets picked up within seconds without
// needing its own explicit "trigger the batch" call or a polling schedule.
trigger SMSMessageQueueTrigger on SMS_Message_Queue__c (after insert) {
    // Skip in test context by default: many existing unit tests insert
    // SMS_Message_Queue__c records outside their own Test.startTest()/stopTest()
    // boundaries (to simulate "already queued" state for the Launcher's AsyncApexJob
    // check) and aren't expecting an automatic batch launch to run/chain in the
    // background and interfere. SMSMessageQueueTriggerTest opts back in via
    // SmsMessageQueueBatch.forceRunTriggerInTest to get real coverage of this call.
    // Production behavior is unaffected — Test.isRunningTest() is always false
    // outside of Apex tests.
    if (!Test.isRunningTest() || SmsMessageQueueBatch.forceRunTriggerInTest) {
        Boolean hasRegional = false;
        Boolean hasLegacy = false;
        for (SMS_Message_Queue__c message : Trigger.new) {
            hasRegional = hasRegional || message.Event_Key__c != null;
            hasLegacy = hasLegacy || message.Event_Key__c == null;
        }
        VpcsRegionalSmsWake.wakeAfterInsert(hasRegional, hasLegacy);
    }
}
