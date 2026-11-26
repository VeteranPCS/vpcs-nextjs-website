/** Coalesces committed regional outbox inserts and reconciles the worker's claim on completion. */
public without sharing class VpcsRegionalSmsWake implements Queueable, Finalizer {
    private static Boolean regionalSweepQueued = false;
    private final Datetime sweepFrom;
    private final Set<Id> messageIds;
    private final Boolean wakeLegacy;

    private VpcsRegionalSmsWake(Set<Id> messageIds, Boolean wakeLegacy, Datetime sweepFrom) {
        this.messageIds = messageIds;
        this.wakeLegacy = wakeLegacy;
        this.sweepFrom = sweepFrom;
    }

    public VpcsRegionalSmsWake(Set<Id> messageIds, Boolean wakeLegacy) {
        this(messageIds, wakeLegacy, null);
    }

    public static void wakeAfterInsert(Boolean hasRegional, Boolean hasLegacy) {
        if (regionalSweepQueued) {
            return;
        }
        if (!hasRegional) {
            if (hasLegacy) {
                SmsMessageQueueBatch.triggerBatchJob();
            }
            return;
        }
        // This is a latency optimization. The independent regional recovery schedule reads the
        // same outbox when the producer has no slot or belongs to a bounded Queueable chain.
        if (!System.isQueueable() && Limits.getQueueableJobs() < Limits.getLimitQueueableJobs()) {
            enqueue(new VpcsRegionalSmsWake(new Set<Id>(), hasLegacy, System.now().addSeconds(-1)));
            regionalSweepQueued = true;
        }
    }

    public static void enqueue(Set<Id> messageIds, Boolean wakeLegacy) {
        enqueue(new VpcsRegionalSmsWake(messageIds, wakeLegacy));
    }

    private static void enqueue(VpcsRegionalSmsWake job) {
        AsyncOptions options = new AsyncOptions();
        options.MaximumQueueableStackDepth = 2;
        System.enqueueJob(job, options);
    }

    public void execute(QueueableContext context) {
        Set<Id> pending = messageIds;
        Boolean laterLegacy = wakeLegacy;
        Integer batchThreshold = VpcsRegionalSmsRecovery.SCOPE_SIZE;
        if (sweepFrom != null) {
            Integer checkCount = batchThreshold + 1;
            pending = new Map<Id,SMS_Message_Queue__c>([
                SELECT Id FROM SMS_Message_Queue__c
                WHERE Event_Key__c != null AND Status__c='New' AND Claim_Job_Id__c = null
                WITH SYSTEM_MODE ORDER BY CreatedDate, Id LIMIT :checkCount
            ]).keySet();
            laterLegacy = wakeLegacy || ![
                SELECT Id FROM SMS_Message_Queue__c
                WHERE Event_Key__c = null AND Status__c='New' AND CreatedDate >= :sweepFrom
                WITH SYSTEM_MODE LIMIT 1
            ].isEmpty();
        }
        if (pending.size() > batchThreshold && VpcsRegionalDispatchControl.enabled()) {
            VpcsRegionalSmsRecovery.launch(sweepFrom == null ? pending : null, laterLegacy);
        } else {
            VpcsRegionalSmsWorker.claim(pending, laterLegacy);
        }
    }

    public void execute(FinalizerContext context) {
        VpcsRegionalSmsWorker.holdUnsettledClaims(context.getAsyncApexJobId(), messageIds);
        if (wakeLegacy) {
            SmsMessageQueueBatch.triggerBatchJob();
        }
    }
}
