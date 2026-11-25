trigger VpcsWebdevLeadOwnerGuardTrigger on Lead (before insert, before update, after update, before delete, after undelete) {
    if (Trigger.isUpdate) {
        VpcsWebdevLeadOwnerGuard.enforceUpdates(Trigger.new, Trigger.oldMap);
    } else {
        VpcsWebdevLeadOwnerGuard.blockOtherDml(Trigger.isDelete ? Trigger.old : Trigger.new);
    }
}
