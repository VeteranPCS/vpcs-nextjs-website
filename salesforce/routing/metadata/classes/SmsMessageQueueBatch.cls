/**
 * @author KKnapp
 * @date 01/12/2026
 * @description Batch class for processing SMS messages from the queue asynchronously
 * @remarks Queries records with Status__c = 'New' or 'Retry' and processes them through MessagingService
 *          Implements retry logic with a maximum of 3 attempts before marking as permanent error
 */
public with sharing class SmsMessageQueueBatch implements Database.Batchable<sObject>, Database.Stateful, Database.AllowsCallouts {
    
    private static final Integer MAX_RETRY_ATTEMPTS = 3;
    
    // Stateful counters for batch summary
    private Integer totalProcessed = 0;
    private Integer totalSuccess = 0;
    private Integer totalFailed = 0;
    private Integer totalRetry = 0;
    
    /**
     * @description Start method - queries all messages ready to be processed
     * @param bc Batch context
     * @return Database.QueryLocator for messages with status 'New' or 'Retry'
     */
    public Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator([
            SELECT Id, To_Phone_Number__c, Message__c, From_Phone_Number__c, SenderEmail__c,
                   Named_Credential__c, Retry_Count__c, Status__c
            FROM SMS_Message_Queue__c 
            WHERE Event_Key__c = null AND Status__c IN ('New', 'Retry')
            ORDER BY CreatedDate ASC
        ]);
    }
    
    /**
     * @description Execute method - processes each batch of messages
     * @param bc Batch context
     * @param scope List of SMS_Message_Queue__c records to process
     * @remarks Re-claims the scope under a row lock (FOR UPDATE) before sending anything.
     *          The lock is held for the rest of this method (released when this chunk's
     *          transaction commits at the end of execute()), so a second SmsMessageQueueBatch
     *          instance racing over the same records blocks on its own FOR UPDATE query until
     *          this one commits — at which point those records are no longer New/Retry and it
     *          naturally excludes them. This makes duplicate batch launches harmless even if
     *          two independent callers both trigger one around the same moment. (Deliberately
     *          not marking Status__c = 'Processing' via a separate DML before the claim query
     *          returns — that would run into "uncommitted work pending" once we then try to
     *          call out; the row lock alone is what provides the mutual exclusion here.)
     */
    public void execute(Database.BatchableContext bc, List<SMS_Message_Queue__c> scope) {
        Set<Id> scopeIds = new Set<Id>();
        for (SMS_Message_Queue__c queueRecord : scope) {
            scopeIds.add(queueRecord.Id);
        }

        List<SMS_Message_Queue__c> claimed;
        try {
            claimed = [
                SELECT Id, To_Phone_Number__c, Message__c, From_Phone_Number__c, SenderEmail__c,
                       Named_Credential__c, Retry_Count__c, Status__c
                FROM SMS_Message_Queue__c
                WHERE Id IN :scopeIds AND Event_Key__c = null AND Status__c IN ('New', 'Retry')
                FOR UPDATE
            ];
        } catch (QueryException e) {
            // Another batch instance currently holds the lock on these same records
            // (a concurrent SmsMessageQueueBatch run). Back off instead of failing this
            // chunk — whichever instance is holding the lock will process them.
            LogService.warn(
                'Could not claim SMS queue records, likely a concurrent batch run: ' + e.getMessage(),
                'SmsMessageQueueBatch'
            );
            return;
        }

        List<SMS_Message_Queue__c> recordsToUpdate = new List<SMS_Message_Queue__c>();

        for (SMS_Message_Queue__c queueRecord : claimed) {
            totalProcessed++;

            try {
                // Mark as processing
                queueRecord.Status__c = 'Processing';
                queueRecord.Last_Attempt_At__c = Datetime.now();
                queueRecord.Retry_Count__c = (queueRecord.Retry_Count__c == null ? 0 : queueRecord.Retry_Count__c) + 1;
                
                // Create MessagingService instance
                IMessagingService service = String.isBlank(queueRecord.Named_Credential__c)
                    ? new MessagingService()
                    : new MessagingService(queueRecord.Named_Credential__c, false); // Don't validate sender in batch
                
                // Create SendSMSRequest
                SendSMSRequest smsRequest = new SendSMSRequest();
                smsRequest.toPhoneNumber = queueRecord.To_Phone_Number__c;
                smsRequest.message = queueRecord.Message__c;
                smsRequest.fromPhoneNumber = queueRecord.From_Phone_Number__c;
                smsRequest.senderEmail = queueRecord.SenderEmail__c;
                
                // Send the message
               SendMessageResult result = service.sendSMS(smsRequest);
                
                // Update queue record with result
                if (result.success) {
                    queueRecord.Success__c = true;
                    queueRecord.Message_Id__c = result.messageId;
                    queueRecord.Provider_Status__c = result.status;
                    queueRecord.Sent_At__c = result.createdAt;
                    queueRecord.Status__c = 'Sent';
                    queueRecord.Error_Message__c = null;
                    totalSuccess++;
                } else {
                    handleFailure(queueRecord, result.errorMessage);
                }
                
            } catch (Exception e) {
                handleFailure(queueRecord, 'Exception during processing: ' + e.getMessage());
            }
            
            recordsToUpdate.add(queueRecord);
        }
        
        // Update all records
        if (!recordsToUpdate.isEmpty()) {
            Database.SaveResult[] results = Database.update(recordsToUpdate, false);
            
            // Log any update failures
            for (Integer i = 0; i < results.size(); i++) {
                if (!results[i].isSuccess()) {
                    System.debug(LoggingLevel.ERROR, 'Failed to update queue record ' + 
                        recordsToUpdate[i].Id + ': ' + results[i].getErrors());
                }
            }
        }
    }
    
    /**
     * @description Handles failure scenarios with retry logic
     * @param queueRecord The queue record that failed
     * @param errorMessage The error message to record
     */
    private void handleFailure(SMS_Message_Queue__c queueRecord, String errorMessage) {
        queueRecord.Success__c = false;
        queueRecord.Error_Message__c = errorMessage;
        
        // Determine if we should retry or mark as permanent error
        if (queueRecord.Retry_Count__c >= MAX_RETRY_ATTEMPTS) {
            queueRecord.Status__c = 'Error';
            totalFailed++;
        } else {
            queueRecord.Status__c = 'Retry';
            totalRetry++;
        }
    }
    
    /**
     * @description Finish method - logs batch execution summary
     * @param bc Batch context
     */
    public void finish(Database.BatchableContext bc) {
        // Log summary
        System.debug(LoggingLevel.INFO, 'SMS Message Queue Batch Complete - ' +
            'Total: ' + totalProcessed + ', ' +
            'Success: ' + totalSuccess + ', ' +
            'Failed: ' + totalFailed + ', ' +
            'Retry: ' + totalRetry);
        
        // Could send an email notification here if needed
        // Or insert a custom log record for monitoring
    }

   /**
    * Triggers the batch job to process queued messages.
    * Enqueues a SmsMessageQueueBatchLauncher instead of launching the batch directly,
    * which prevents race conditions when multiple flows call this invocable concurrently.
    * The launcher checks for an active batch at execution time and self-chains if needed.
    */

   /**
    * Lets SMSMessageQueueTriggerTest opt in to exercising the trigger's real call to
    * triggerBatchJob() (SMSMessageQueueTrigger otherwise skips that call for any test,
    * since most existing tests insert SMS_Message_Queue__c records outside their own
    * Test.startTest()/stopTest() boundaries and don't expect a background launch to
    * run/chain and interfere). Defaults to false so every other test keeps that
    * protection; only a test that explicitly sets this to true sees the trigger fire.
    * Public (not @TestVisible) because the trigger itself — non-test code — needs to
    * read it too; @TestVisible only unlocks access for @isTest classes.
    */
   public static Boolean forceRunTriggerInTest = false;

   @InvocableMethod(label='Trigger SMS Send Batch Job')
   public static void triggerBatchJob() {
      try {
         // Skip if a launcher or batch is already active.
         // Checking both class names prevents duplicate launchers when two flows
         // call this invocable within the same transaction window.
         List<AsyncApexJob> activeJobs = [
            SELECT Id
            FROM AsyncApexJob
            WHERE ApexClass.Name IN ('SmsMessageQueueBatchLauncher', 'SmsMessageQueueBatch')
            AND Status IN ('Queued', 'Holding', 'Preparing', 'Processing')
            LIMIT 1
         ];

         if (activeJobs.isEmpty()) {
            System.enqueueJob(new SmsMessageQueueBatchLauncher());
         } else {
            LogService.info('SMS batch or launcher already active — skipping duplicate trigger.', 'SmsMessageQueueBatch');
         }
      }
      catch (Exception e) {
         LogService.error(e, 'SmsMessageQueueBatch');
      }
   }
}
