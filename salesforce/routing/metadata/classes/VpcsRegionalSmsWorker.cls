/** Native SMS automation uses explicit system-mode operations on already-qualified CRM events. */
public without sharing class VpcsRegionalSmsWorker implements Queueable, Database.AllowsCallouts {
    // RestClient uses Salesforce's 10-second default. Ten posts stay below its 120-second transaction ceiling.
    private static final Set<String> DAILY_LEAD_STATUSES = new Set<String>{
        'New:_Not_Contacted','New:_Attempted','Contacted:_Interviewing','Contacted:_Future Lead'
    };
    private static final Set<String> DAILY_OPP_STAGES = new Set<String>{
        'Tracking 6+','Tracking 3-6','Tracking 1-2','Tracking <1','Under Contract'
    };
    private final Set<Id> messageIds;
    private final Boolean wakeLegacy;

    private VpcsRegionalSmsWorker(Set<Id> messageIds, Boolean wakeLegacy) {
        this.messageIds = messageIds;
        this.wakeLegacy = wakeLegacy;
    }

    public void execute(QueueableContext context) {
        // Settle abandoned claims and preserve a requested legacy wake in a fresh transaction.
        System.attachFinalizer(new VpcsRegionalSmsWake(messageIds, wakeLegacy));
        settle(context.getJobId(), messageIds);
    }

    @TestVisible
    private static void settle(Id jobId, Set<Id> messageIds) {
        if (jobId == null) {
            return;
        }
        List<SMS_Message_Queue__c> rows = [
            SELECT Id, Event_Key__c, To_Phone_Number__c, From_Phone_Number__c, Message__c,
                   Related_Lead__c, Related_Opportunity__c, Related_Partner__c, Claim_Job_Id__c, Expected_Next_Contact__c
            FROM SMS_Message_Queue__c
            WHERE Id IN :messageIds AND Event_Key__c != null AND Status__c = 'Processing' WITH SYSTEM_MODE
        ];
        List<SMS_Message_Queue__c> owned = new List<SMS_Message_Queue__c>();
        MessagingService service = new MessagingService(new OpenPhoneClient('OpenPhone', false, new NullLogger()));
        List<VpcsRegionalRoutingExceptions.Issue> issues = new List<VpcsRegionalRoutingExceptions.Issue>();
        for (SMS_Message_Queue__c row : rows) {
            if (claimJobId(row.Claim_Job_Id__c) != jobId) {
                continue;
            }
            owned.add(row);
            row.Success__c = false;
            row.Status__c = 'Held';
            row.Error_Message__c = 'Provider outcome requires reconciliation before any resend.';
            Lead lead = findLead(row.Related_Lead__c);
            Opportunity opportunity = findOpportunity(row.Related_Opportunity__c);
            if (!isCurrent(row, lead, opportunity)) {
                row.Error_Message__c = 'Customer eligibility, region, or partner changed after queueing.';
                if (lead != null && !VpcsCustomerRouting.isSpam(lead)) {
                    issues.add(new VpcsRegionalRoutingExceptions.Issue(lead.Id, VpcsCustomerRouting.forLead(lead),
                        VpcsRegionalRoutingExceptions.Reason.STALE_SMS_CONTEXT));
                } else if (opportunity != null) {
                    issues.add(new VpcsRegionalRoutingExceptions.Issue(opportunity.Id,
                        VpcsCustomerRouting.forOpportunity(opportunity), VpcsRegionalRoutingExceptions.Reason.STALE_SMS_CONTEXT));
                }
                continue;
            }

            if (!VpcsRegionalDispatchControl.enabled()) {
                row.Error_Message__c = 'Regional dispatch paused after this message was claimed. No provider request was made.';
                Id customerId = lead == null ? opportunity.Id : lead.Id;
                issues.add(new VpcsRegionalRoutingExceptions.Issue(customerId, null,
                    VpcsRegionalRoutingExceptions.Reason.DISPATCH_PAUSED));
                continue;
            }
            Id customerId = lead == null ? opportunity.Id : lead.Id;
            VpcsCustomerRouting.Route currentRoute = lead == null
                ? VpcsCustomerRouting.forOpportunity(opportunity) : VpcsCustomerRouting.forLead(lead);
            String event = row.Event_Key__c.split(':')[1];
            String body;
            try {
                body = currentBody(row, event, lead, currentRoute);
            } catch (Exception renderFailure) {
                // Template failures are recorded below without logging template or customer content.
            }
            if (String.isBlank(body) || body.length() > 32768) {
                row.Error_Message__c = 'The current message could not be rendered. No provider request was made.';
                issues.add(new VpcsRegionalRoutingExceptions.Issue(customerId, currentRoute,
                    VpcsRegionalRoutingExceptions.Reason.SMS_DELIVERY_FAILURE));
                continue;
            }

            row.Message__c = body;
            SendSMSRequest request = new SendSMSRequest();
            request.toPhoneNumber = row.To_Phone_Number__c;
            request.fromPhoneNumber = row.From_Phone_Number__c;
            request.message = row.Message__c;
            try {
                SendMessageResult result = service.sendSMS(request);
                if (result != null && result.success == true && result.status == 'Captured' &&
                    String.isBlank(result.messageId)) {
                    row.Status__c = 'Captured';
                    row.Error_Message__c = null;
                } else if (result != null && result.success == true && !String.isBlank(result.messageId)) {
                    row.Success__c = true;
                    row.Status__c = 'Sent';
                    row.Message_Id__c = result.messageId;
                    row.Provider_Status__c = result.status;
                    row.Sent_At__c = result.createdAt;
                    row.Error_Message__c = null;
                }
            } catch (Exception outcomeUnknown) {
                // A thrown transport failure can occur after the provider accepted the request.
            }
            if (row.Status__c == 'Held') {
                issues.add(new VpcsRegionalRoutingExceptions.Issue(customerId, currentRoute,
                    VpcsRegionalRoutingExceptions.Reason.UNCERTAIN_SMS_OUTCOME));
            }
        }
        List<Database.SaveResult> results = Database.update(owned, false, AccessLevel.SYSTEM_MODE);
        List<LogService.AppLogData> warnings = new List<LogService.AppLogData>();
        for (Integer index = 0; index < results.size(); index++) {
            if (!results[index].isSuccess()) {
                LogService.AppLogData warning = new LogService.AppLogData();
                warning.className = 'VpcsRegionalSmsWorker';
                warning.loggingLevel = 'WARN';
                warning.message = 'Could not settle regional SMS claim; keep held for reconciliation. Queue row ' +
                    owned[index].Id;
                warnings.add(warning);
            }
        }
        if (!warnings.isEmpty()) {
            try {
                LogService.logData(warnings);
            } catch (Exception loggingFailure) {
                System.debug(LoggingLevel.WARN, 'Could not log regional SMS settlement failures: ' + warnings.size());
            }
        }
        VpcsRegionalRoutingExceptions.report(issues);
    }

    private static String currentBody(SMS_Message_Queue__c row, String event, Lead lead,
        VpcsCustomerRouting.Route route
    ) {
        if (event == 'INITIAL_LENDER') {
            return VpcsRegionalLeadIntake.lenderIntroduction(lead);
        }
        if (event == 'INITIAL_AGENT' || event == 'PORTAL_REMINDER') {
            return VpcsRegionalLeadIntake.agentPortalSms(route.portalLink(row.Related_Partner__c));
        }
        return VpcsRegionalStatusMessages.render(lead == null ? row.Related_Opportunity__c : lead.Id, lead != null);
    }

    private static Lead findLead(Id recordId) {
        if (recordId == null) {
            return null;
        }
        List<Lead> matches = [
            SELECT Id, RecordTypeId, IsConverted, Status, Destination_State__c, Additional_Comments__c, Description,
                   Agent__c, Agent__r.PersonMobilePhone, Agent__r.Phone, Agent__r.Active_on_Website__pc,
                   Lender__c, Lender__r.PersonMobilePhone, Lender__r.Phone,
                   WebToLead__c, WebFormURL__c, LeadSource, Routing_Status_Sequence__c, Next_Contact_Date__c,
                   Speed_To_Lead_Reminder_Count__c, FirstName, LastName, Email, MobilePhone, Phone,
                   Current_Base__c, Destination_Base__c
            FROM Lead WHERE Id = :recordId WITH SYSTEM_MODE
        ];
        return matches.isEmpty() ? null : matches[0];
    }

    private static Opportunity findOpportunity(Id recordId) {
        if (recordId == null) {
            return null;
        }
        List<Opportunity> matches = [
            SELECT Id, RecordTypeId, Destination_State__c, Routing_Status_Sequence__c, StageName, IsClosed, Next_Contact_Date__c,
                   Agent__c, Agent__r.PersonMobilePhone, Agent__r.Phone, Agent__r.Active_on_Website__pc
            FROM Opportunity WHERE Id = :recordId WITH SYSTEM_MODE
        ];
        return matches.isEmpty() ? null : matches[0];
    }

    private static Boolean isCurrent(SMS_Message_Queue__c row, Lead lead, Opportunity opportunity) {
        if (row.Related_Partner__c == null || row.Event_Key__c.endsWith(':')) {
            return false;
        }
        List<String> key = row.Event_Key__c.split(':');
        Id customerId = row.Related_Lead__c == null ? row.Related_Opportunity__c : row.Related_Lead__c;
        if (customerId == null || key.size() < 3 || parseId(key[0]) != customerId ||
            parseId(key[key.size() - 1]) != row.Related_Partner__c) {
            return false;
        }
        String event = key[1];
        VpcsCustomerRouting.Route current;
        Id currentPartner;
        Account partner;
        if (lead != null && opportunity == null && VpcsCustomerRouting.isCustomer(lead) &&
            !VpcsCustomerRouting.isSpam(lead)) {
            if (event == 'INITIAL_AGENT' || event == 'INITIAL_LENDER') {
                if (key.size() != 3 || !VpcsCustomerRouting.isOpenCustomer(lead) ||
                    !(event == 'INITIAL_AGENT' ? VpcsRegionalLeadIntake.isInitialAgentEligible(lead)
                                               : VpcsRegionalLeadIntake.isInitialLenderEligible(lead))) {
                    return false;
                }
            } else if (event == 'PORTAL_REMINDER') {
                Decimal attempt = lead.Speed_To_Lead_Reminder_Count__c;
                if (lead.IsConverted == true || (lead.Status != 'New:_Not_Contacted' && lead.Status != 'Urgent') ||
                    key.size() != 4 || attempt == null || attempt <= 0 || key[2] != String.valueOf(attempt.intValue())) {
                    return false;
                }
            } else if (event != 'STATUS' || lead.IsConverted == true) {
                return false;
            }
            if (event == 'STATUS' && (!DAILY_LEAD_STATUSES.contains(lead.Status) ||
                lead.Agent__r?.Active_on_Website__pc != true ||
                !VpcsRegionalStatusMessages.matchesNextContact(row.Expected_Next_Contact__c, lead.Next_Contact_Date__c) ||
                !isCurrentSequence(key, lead.Routing_Status_Sequence__c))) {
                return false;
            }
            current = VpcsCustomerRouting.forLead(lead);
            currentPartner = event == 'INITIAL_LENDER' ? lead.Lender__c : lead.Agent__c;
            partner = event == 'INITIAL_LENDER' ? lead.Lender__r : lead.Agent__r;
        } else if (opportunity != null && lead == null && event == 'STATUS' &&
                   VpcsCustomerRouting.isOpenCustomer(opportunity) &&
                   DAILY_OPP_STAGES.contains(opportunity.StageName) &&
                   opportunity.Agent__r?.Active_on_Website__pc == true &&
                   VpcsRegionalStatusMessages.matchesNextContact(row.Expected_Next_Contact__c, opportunity.Next_Contact_Date__c) &&
                   isCurrentSequence(key, opportunity.Routing_Status_Sequence__c)) {
            current = VpcsCustomerRouting.forOpportunity(opportunity);
            currentPartner = opportunity.Agent__c;
            partner = opportunity.Agent__r;
        } else {
            return false;
        }
        String phone = VpcsRegionalSms.phone(partner?.PersonMobilePhone, partner?.Phone);
        return current.known && current.sender() != null && current.sender() == row.From_Phone_Number__c &&
            currentPartner == row.Related_Partner__c && phone != null && phone != current.sender() && phone == row.To_Phone_Number__c;
    }

    private static Boolean isCurrentSequence(List<String> key, Decimal sequence) {
        if (key.size() != 5 || key[2] != String.valueOf(sequence == null ? 0 : sequence.longValue()) ||
            !Pattern.matches('[0-9]{4}-[0-9]{2}-[0-9]{2}', key[3])) {
            return false;
        }
        try {
            return String.valueOf(Date.valueOf(key[3])).left(10) == key[3];
        } catch (Exception invalidCycle) {
            return false;
        }
    }

    public static void claim(Set<Id> candidateIds) {
        claim(candidateIds, false);
    }

    public static void claim(Set<Id> candidateIds, Boolean wakeLegacy) {
        if (!VpcsRegionalDispatchControl.enabled()) {
            if (wakeLegacy) {
                SmsMessageQueueBatch.triggerBatchJob();
            }
            return;
        }
        List<SMS_Message_Queue__c> unclaimed = new List<SMS_Message_Queue__c>();
        for (SMS_Message_Queue__c row : [
            SELECT Id, Status__c, Claim_Job_Id__c
            FROM SMS_Message_Queue__c
            WHERE Id IN :candidateIds AND Event_Key__c != null
            WITH SYSTEM_MODE FOR UPDATE
        ]) {
            if (row.Status__c != 'New' || row.Claim_Job_Id__c != null) {
                continue;
            }
            if (unclaimed.size() >= VpcsRegionalSmsRecovery.SCOPE_SIZE) {
                break;
            }
            unclaimed.add(row);
        }
        if (unclaimed.isEmpty()) {
            if (wakeLegacy) {
                SmsMessageQueueBatch.triggerBatchJob();
            }
            return;
        }
        Set<Id> ids = new Map<Id, SMS_Message_Queue__c>(unclaimed).keySet();
        Id jobId = System.enqueueJob(new VpcsRegionalSmsWorker(ids, wakeLegacy));
        if (jobId == null && !Test.isRunningTest()) {
            throw new VpcsRegionalSms.QueueWriteException('Dispatch queue did not return a job ID.');
        }
        for (SMS_Message_Queue__c row : unclaimed) {
            row.Claim_Job_Id__c = String.valueOf(jobId);
            row.Status__c = 'Processing';
            row.Last_Attempt_At__c = System.now();
            row.Retry_Count__c = 1;
        }
        update as system unclaimed;
    }

    // enqueueJob and its worker context can use different lengths for the same job ID.
    private static Id claimJobId(String value) {
        return value != null && value.startsWith('707') ? parseId(value) : null;
    }

    private static Id parseId(String value) {
        if (String.isBlank(value)) {
            return null;
        }
        try {
            return (Id) value;
        } catch (Exception invalidId) {
            return null;
        }
    }

    public static void holdUnsettledClaims(Id jobId, Set<Id> ids) {
        if (jobId == null) {
            return;
        }
        List<SMS_Message_Queue__c> held = new List<SMS_Message_Queue__c>();
        for (SMS_Message_Queue__c row : [
            SELECT Id, Claim_Job_Id__c, Status__c
            FROM SMS_Message_Queue__c WHERE Id IN :ids WITH SYSTEM_MODE FOR UPDATE
        ]) {
            if (row.Status__c == 'Processing' && claimJobId(row.Claim_Job_Id__c) == jobId) {
                row.Status__c = 'Held';
                row.Error_Message__c = 'Dispatch did not settle; verify the provider outcome before any resend.';
                held.add(row);
            }
        }
        Database.update(held, false, AccessLevel.SYSTEM_MODE);
    }

    public static void holdExpiredClaims() {
        Datetime cutoff = System.now().addDays(-1);
        List<SMS_Message_Queue__c> stale = [
            SELECT Id, Claim_Job_Id__c
            FROM SMS_Message_Queue__c
            WHERE Event_Key__c != null AND Status__c = 'Processing' AND Last_Attempt_At__c < :cutoff
            WITH SYSTEM_MODE LIMIT 200
        ];
        if (stale.isEmpty()) {
            return;
        }
        Set<Id> claims = new Set<Id>();
        for (SMS_Message_Queue__c row : stale) {
            Id jobId = claimJobId(row.Claim_Job_Id__c);
            if (jobId != null) {
                claims.add(jobId);
            }
        }
        Set<Id> activeClaims = new Set<Id>();
        for (AsyncApexJob job : [
            SELECT Id FROM AsyncApexJob WHERE Id IN :claims
            AND Status IN ('Queued', 'Holding', 'Preparing', 'Processing') WITH SYSTEM_MODE
        ]) {
            activeClaims.add(job.Id);
        }
        Map<Id, SMS_Message_Queue__c> staleById = new Map<Id, SMS_Message_Queue__c>(stale);
        Set<Id> staleIds = staleById.keySet();
        List<SMS_Message_Queue__c> toHold = new List<SMS_Message_Queue__c>();
        for (SMS_Message_Queue__c row : [
            SELECT Id, Claim_Job_Id__c, Status__c, Last_Attempt_At__c
            FROM SMS_Message_Queue__c WHERE Id IN :staleIds WITH SYSTEM_MODE FOR UPDATE
        ]) {
            if (row.Status__c == 'Processing' && row.Last_Attempt_At__c < cutoff &&
                row.Claim_Job_Id__c == staleById.get(row.Id).Claim_Job_Id__c &&
                !activeClaims.contains(claimJobId(row.Claim_Job_Id__c))) {
                row.Status__c = 'Held';
                row.Error_Message__c = 'Dispatch claim expired; verify the provider outcome before any resend.';
                toHold.add(row);
            }
        }
        Database.update(toHold, false, AccessLevel.SYSTEM_MODE);
    }
}
