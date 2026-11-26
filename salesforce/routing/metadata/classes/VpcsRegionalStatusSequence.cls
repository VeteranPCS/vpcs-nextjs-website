/** Monotonic business transition identity; ownership-only migration never changes it. */
public class VpcsRegionalStatusSequence {
    public static void beforeLeads(List<Lead> records, Map<Id, Lead> prior) {
        Id customerType = Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer')?.getRecordTypeId();
        for (Lead current : records) {
            if (customerType == null || current.RecordTypeId != customerType) { continue; }
            Lead previous = prior == null ? null : prior.get(current.Id);
            if (previous == null) {
                current.Routing_Status_Sequence__c = 1;
            } else {
                current.Routing_Status_Sequence__c = previous.Routing_Status_Sequence__c;
                if (current.Status != previous.Status) {
                    current.Routing_Status_Sequence__c = value(previous.Routing_Status_Sequence__c) + 1;
                }
            }
        }
    }

    public static void beforeOpportunities(List<Opportunity> records, Map<Id, Opportunity> prior) {
        Id customerType = Opportunity.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer')?.getRecordTypeId();
        for (Opportunity current : records) {
            if (customerType == null || current.RecordTypeId != customerType) { continue; }
            Opportunity previous = prior == null ? null : prior.get(current.Id);
            if (previous == null) {
                current.Routing_Status_Sequence__c = 1;
            } else {
                current.Routing_Status_Sequence__c = previous.Routing_Status_Sequence__c;
                if (current.StageName != previous.StageName) {
                    current.Routing_Status_Sequence__c = value(previous.Routing_Status_Sequence__c) + 1;
                }
            }
        }
    }

    public static Decimal value(Decimal sequence) {
        return sequence == null ? 0 : sequence;
    }

    public static String eventKey(Decimal sequence, Date cycle) {
        // Daily follow-ups remain daily. A second transition the same day has its own identity.
        return 'STATUS:' + String.valueOf(value(sequence).longValue()) + ':' + String.valueOf(cycle);
    }
}
