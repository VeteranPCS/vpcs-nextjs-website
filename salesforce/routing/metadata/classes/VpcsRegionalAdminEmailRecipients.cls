/** Resolves supplemental recipients for native referral status templates. */
public without sharing class VpcsRegionalAdminEmailRecipients {
    public class Request {
        @InvocableVariable(required=true)
        public Id customerId;

        @InvocableVariable
        public String operationalCopy;
    }

    public class Result {
        @InvocableVariable
        public String addresses;
    }

    @InvocableMethod(label='Resolve Regional Admin Email Recipients')
    public static List<Result> resolve(List<Request> requests) {
        if (requests == null) {
            return new List<Result>();
        }
        Set<Id> leadIds = new Set<Id>();
        Set<Id> opportunityIds = new Set<Id>();
        for (Request request : requests) {
            if (request == null || request.customerId == null) {
                continue;
            }
            if (request.customerId.getSObjectType() == Lead.SObjectType) {
                leadIds.add(request.customerId);
            } else if (request.customerId.getSObjectType() == Opportunity.SObjectType) {
                opportunityIds.add(request.customerId);
            }
        }
        Map<Id, Lead> leads = new Map<Id, Lead>([
            SELECT Id, RecordTypeId, Destination_State__c, Additional_Comments__c, Description
            FROM Lead WHERE Id IN :leadIds WITH SYSTEM_MODE
        ]);
        Map<Id, Opportunity> opportunities = new Map<Id, Opportunity>([
            SELECT Id, RecordTypeId, Destination_State__c
            FROM Opportunity WHERE Id IN :opportunityIds WITH SYSTEM_MODE
        ]);
        Boolean sandbox = [SELECT IsSandbox FROM Organization WITH SYSTEM_MODE LIMIT 1].IsSandbox;
        Set<String> allowedCopies = sandbox ? new Set<String>{'tech@veteranpcs.com'} :
            new Set<String>{'admin@veteranpcs.com', 'info@veteranpcs.com'};
        List<Result> results = new List<Result>();
        for (Request request : requests) {
            Result result = new Result();
            results.add(result);
            if (request == null) {
                continue;
            }
            Set<String> addresses = new Set<String>();
            if (!String.isBlank(request.operationalCopy)) {
                for (String copy : request.operationalCopy.split(',')) {
                    String normalized = copy.trim().toLowerCase();
                    if (allowedCopies.contains(normalized)) {
                        addresses.add(normalized);
                    }
                }
            }
            Lead lead = leads.get(request.customerId);
            Opportunity opportunity = opportunities.get(request.customerId);
            VpcsCustomerRouting.Route route;
            if (lead != null && VpcsCustomerRouting.isCustomer(lead) && !VpcsCustomerRouting.isSpam(lead)) {
                route = VpcsCustomerRouting.forLead(lead);
            } else if (opportunity != null && VpcsCustomerRouting.isCustomer(opportunity)) {
                route = VpcsCustomerRouting.forOpportunity(opportunity);
            }
            String address = route?.binding?.notificationEmail;
            if (!String.isBlank(address)) {
                addresses.add(address.toLowerCase());
            }
            result.addresses = String.join(new List<String>(addresses), ',');
        }
        return results;
    }
}
