/** The regional queue fails closed when either verified org binding pauses dispatch. */
public without sharing class VpcsRegionalDispatchControl {
    @TestVisible private static Map<String, Boolean> testBindings;

    public static Boolean enabled() {
        if (Test.isRunningTest() && testBindings != null) {
            return allEnabled(testBindings);
        }
        String orgId = UserInfo.getOrganizationId().left(15);
        Map<String, Boolean> dispatchByAdmin = new Map<String, Boolean>();
        // Read the flag independently of the transaction's cached routing bindings.
        for (Vpcs_Regional_Admin__mdt row : [
            SELECT DeveloperName, Dispatch_Enabled__c FROM Vpcs_Regional_Admin__mdt
            WHERE Org_Id__c = :orgId WITH SYSTEM_MODE
        ]) {
            dispatchByAdmin.put(row.DeveloperName, row.Dispatch_Enabled__c);
        }
        return allEnabled(dispatchByAdmin);
    }

    private static Boolean allEnabled(Map<String, Boolean> dispatchByAdmin) {
        for (String admin : VpcsCustomerRoutingPolicy.senders.keySet()) {
            if (dispatchByAdmin.get(admin) != true) {
                return false;
            }
        }
        return true;
    }
}
