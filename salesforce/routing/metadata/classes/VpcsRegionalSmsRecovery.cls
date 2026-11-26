/** Independently collects committed regional queue rows after a producer cannot request a wake. */
public without sharing class VpcsRegionalSmsRecovery implements Schedulable, Database.Batchable<SObject> {
    public static final Integer SCOPE_SIZE = 10;
    private final Set<Id> requested;
    private final Boolean wakeLegacy;

    public VpcsRegionalSmsRecovery() {
        this(null, false);
    }

    private VpcsRegionalSmsRecovery(Set<Id> requested, Boolean wakeLegacy) {
        this.requested = requested;
        this.wakeLegacy = wakeLegacy;
    }

    public static void launch(Set<Id> requested, Boolean wakeLegacy) {
        Database.executeBatch(new VpcsRegionalSmsRecovery(requested, wakeLegacy), SCOPE_SIZE);
    }

    public void execute(SchedulableContext context) {
        // A mixed insert can commit without an enqueue slot. Check legacy New independently
        // and leave the existing dispatcher in charge of legacy claiming and retry behavior.
        if (![
            SELECT Id FROM SMS_Message_Queue__c
            WHERE Event_Key__c = null AND Status__c = 'New' AND Claim_Job_Id__c = null WITH SYSTEM_MODE LIMIT 1
        ].isEmpty()) {
            SmsMessageQueueBatch.triggerBatchJob();
        }
        if (!VpcsRegionalDispatchControl.enabled() || [
            SELECT Id FROM SMS_Message_Queue__c
            WHERE Event_Key__c != null AND Status__c = 'New' AND Claim_Job_Id__c = null WITH SYSTEM_MODE LIMIT 1
        ].isEmpty()) {
            VpcsRegionalSmsWorker.holdExpiredClaims();
            return;
        }
        List<AsyncApexJob> running = [
            SELECT Id FROM AsyncApexJob WHERE ApexClass.Name = 'VpcsRegionalSmsRecovery' AND JobType = 'BatchApex'
            AND Status IN ('Queued','Holding','Preparing','Processing') WITH SYSTEM_MODE LIMIT 1
        ];
        if (running.isEmpty()) {
            launch(null, false);
        }
    }

    public Database.QueryLocator start(Database.BatchableContext context) {
        VpcsRegionalSmsWorker.holdExpiredClaims();
        if (!VpcsRegionalDispatchControl.enabled()) {
            return Database.getQueryLocator([SELECT Id FROM SMS_Message_Queue__c WHERE Id = null WITH SYSTEM_MODE]);
        }
        if (requested == null) {
            return Database.getQueryLocator([
                SELECT Id FROM SMS_Message_Queue__c
                WHERE Event_Key__c != null AND Status__c = 'New' AND Claim_Job_Id__c = null
                WITH SYSTEM_MODE ORDER BY CreatedDate, Id
            ]);
        }
        return Database.getQueryLocator([
            SELECT Id FROM SMS_Message_Queue__c WHERE Id IN :requested
            AND Event_Key__c != null AND Status__c = 'New' AND Claim_Job_Id__c = null
            WITH SYSTEM_MODE ORDER BY CreatedDate, Id
        ]);
    }

    public void execute(Database.BatchableContext context, List<SObject> scope) {
        VpcsRegionalSmsWorker.claim(new Map<Id,SObject>(scope).keySet());
    }

    public void finish(Database.BatchableContext context) {
        if (wakeLegacy) {
            SmsMessageQueueBatch.triggerBatchJob();
        }
    }
}
