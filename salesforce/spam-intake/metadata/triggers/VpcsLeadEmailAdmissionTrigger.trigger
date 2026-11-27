trigger VpcsLeadEmailAdmissionTrigger on Lead (before insert, before update) {
    VpcsLeadEmailAdmission.enforce(Trigger.new, Trigger.oldMap);
}
