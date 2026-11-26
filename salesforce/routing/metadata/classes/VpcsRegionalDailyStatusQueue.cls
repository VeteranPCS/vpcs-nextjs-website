/** Bulk entry point for the two existing native daily status schedules. */
public without sharing class VpcsRegionalDailyStatusQueue {
    public class Request {
        @InvocableVariable
        public List<Lead> leads;
        @InvocableVariable
        public List<Opportunity> opportunities;
    }

    @InvocableMethod(label='Queue daily regional status SMS')
    public static void run(List<Request> requests) {
        Set<Id> leadIds = new Set<Id>();
        Set<Id> opportunityIds = new Set<Id>();
        for (Request request : requests) {
            if (request == null) {
                continue;
            }
            if (request.leads != null) {
                leadIds.addAll(new Map<Id,Lead>(request.leads).keySet());
            }
            if (request.opportunities != null) {
                opportunityIds.addAll(new Map<Id,Opportunity>(request.opportunities).keySet());
            }
        }
        VpcsRegionalStatusMessages.enqueue(leadIds, true);
        VpcsRegionalStatusMessages.enqueue(opportunityIds, false);
    }
}
