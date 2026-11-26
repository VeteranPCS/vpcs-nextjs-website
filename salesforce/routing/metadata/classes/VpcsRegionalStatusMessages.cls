/** Shared daily-status queue boundary. No caller can override the regional sender or partner. */
public without sharing class VpcsRegionalStatusMessages {
    public static final String DEFERRED_BODY = 'Pending regional status template rendering.';
    @TestVisible private static String testBody;

    public static String nextContactSnapshot(Date nextContact) {
        return nextContact == null ? 'NONE' : String.valueOf(nextContact);
    }

    public static Boolean matchesNextContact(String snapshot, Date nextContact) {
        return nextContactSnapshot(nextContact).equals(snapshot);
    }

    public static String render(Id recordId, Boolean leads) {
        return Test.isRunningTest() && testBody != null ? testBody :
            (leads ? new LeadUpdateMessagingService().renderLeadStatusSMS(recordId)
                   : new OpportunityUpdateMessagingService().renderOppStatusSMS(recordId));
    }

    public class Result {
        public Boolean success = false;
        public Id queueId;
        public String error;
    }

    public static Map<Id, Result> enqueue(Set<Id> ids, Boolean leads) {
        Map<Id, Result> results = new Map<Id, Result>();
        if (ids.isEmpty()) { return results; }
        String objectName = leads ? 'Lead' : 'Opportunity';
        String fields = 'Id, RecordType.DeveloperName, Destination_State__c, Routing_Status_Sequence__c, '
            + 'Agent__c, Agent__r.PersonMobilePhone, Agent__r.Phone, Next_Contact_Date__c, '
            + (leads ? 'IsConverted, Status, Description, Additional_Comments__c' : 'IsClosed, StageName');
        // Internal Flow automation must inspect its routing fields even when the submitting user
        // cannot edit them. This is not exposed as a REST or Aura data endpoint.
        Map<Id, SObject> records = new Map<Id, SObject>(Database.queryWithBinds(
            'SELECT ' + fields + ' FROM ' + objectName + ' WHERE Id IN :ids',
            new Map<String, Object>{'ids' => ids}, AccessLevel.SYSTEM_MODE));
        List<SMS_Message_Queue__c> outbound = new List<SMS_Message_Queue__c>();
        List<VpcsRegionalRoutingExceptions.Issue> issues = new List<VpcsRegionalRoutingExceptions.Issue>();
        Map<String, Id> eventRecords = new Map<String, Id>();
        for (Id id : ids) {
            Result result = new Result();
            results.put(id, result);
            SObject record = records.get(id);
            if (record == null || record.getSObject('RecordType')?.get('DeveloperName') != 'Customer'
                || (leads && (((Lead) record).IsConverted || VpcsCustomerRouting.isSpam((Lead) record)))) {
                result.error = 'Record is ineligible for regional status SMS.';
                continue;
            }
            VpcsCustomerRouting.Route route = leads
                ? VpcsCustomerRouting.forLead((Lead) record)
                : VpcsCustomerRouting.forOpportunity((Opportunity) record);
            Account partner = (Account) record.getSObject('Agent__r');
            String phone = partner == null ? null : VpcsRegionalSms.phone(partner.PersonMobilePhone, partner.Phone);
            if (!route.known || route.sender() == null || phone == null || phone == route.sender()) {
                result.error = 'Regional routing or partner phone requires review.';
                VpcsRegionalRoutingExceptions.Reason reason = !route.known
                    ? VpcsRegionalRoutingExceptions.Reason.UNKNOWN_DESTINATION
                    : route.binding == null ? VpcsRegionalRoutingExceptions.Reason.MISSING_ROUTING_BINDING
                    : route.sender() == null ? VpcsRegionalRoutingExceptions.Reason.MISSING_SENDER
                    : partner == null ? VpcsRegionalRoutingExceptions.Reason.MISSING_AGENT
                    : VpcsRegionalRoutingExceptions.Reason.MISSING_AGENT_PHONE;
                issues.add(new VpcsRegionalRoutingExceptions.Issue(id, route, reason));
                continue;
            }
            String event = VpcsRegionalStatusSequence.eventKey(
                (Decimal) record.get('Routing_Status_Sequence__c'), Date.today());
            SMS_Message_Queue__c message = VpcsRegionalSms.message(id, (Id) record.get('Agent__c'),
                event, phone, DEFERRED_BODY, route);
            message.Expected_Next_Contact__c = nextContactSnapshot((Date) record.get('Next_Contact_Date__c'));
            outbound.add(message);
            eventRecords.put(message.Event_Key__c, id);
        }
        VpcsRegionalSms.enqueue(outbound);
        Set<String> keys = eventRecords.keySet();
        if (!keys.isEmpty()) {
            for (SMS_Message_Queue__c row : [
                SELECT Id, Event_Key__c, Status__c FROM SMS_Message_Queue__c WHERE Event_Key__c IN :keys WITH SYSTEM_MODE
            ]) {
                Result result = results.get(eventRecords.get(row.Event_Key__c));
                result.queueId = row.Id;
                result.success = new Set<String>{'New', 'Processing', 'Sent', 'Captured'}.contains(row.Status__c);
                if (!result.success) { result.error = 'Existing status message requires reconciliation.'; }
            }
        }
        VpcsRegionalRoutingExceptions.report(issues);
        return results;
    }
}
