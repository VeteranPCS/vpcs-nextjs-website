trigger VpcsCustomerOpportunityRouting on Opportunity (before insert, before update) {
    VpcsCustomerRouting.assignOpportunities(Trigger.new, Trigger.oldMap);
    VpcsRegionalStatusSequence.beforeOpportunities(Trigger.new, Trigger.oldMap);
}
