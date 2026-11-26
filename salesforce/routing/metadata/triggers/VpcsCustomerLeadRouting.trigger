trigger VpcsCustomerLeadRouting on Lead (before insert, before update, after insert) {
    if (Trigger.isBefore) {
        VpcsCustomerRouting.assignLeads(Trigger.new, Trigger.oldMap);
        VpcsRegionalStatusSequence.beforeLeads(Trigger.new, Trigger.oldMap);
    } else {
        VpcsRegionalLeadIntake.afterInsert(Trigger.new);
    }
}
