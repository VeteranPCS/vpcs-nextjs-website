/** Resolves owner and sender bindings for native CRM routing, independent of submitter field access. */
public without sharing class VpcsCustomerRouting {
    @TestVisible private static Map<String, Binding> testBindings;
    private static Map<String, Binding> cachedBindings;
    private static Boolean migrationOwnerWrite = false;

    public static void setMigrationOwnerWrite(Boolean enabled) {
        if (enabled && !FeatureManagement.checkPermission('VPCS_Routing_Migration')) {
            throw new RoutingPermissionException('Routing migration permission required.');
        }
        migrationOwnerWrite = enabled;
    }

    public static Boolean isMigrationOwnerWrite() {
        return migrationOwnerWrite;
    }

    public class RoutingPermissionException extends Exception {}
    private static final Id CUSTOMER_LEAD = recordTypeId(Lead.SObjectType);
    private static final Id CUSTOMER_OPPORTUNITY = recordTypeId(Opportunity.SObjectType);

    public class Binding {
        public Id ownerId;
        public String sender;
        public String notificationEmail;
        public String portalUrl;

        public Binding(Id ownerId, String sender, String notificationEmail, String portalUrl) {
            this.ownerId = ownerId;
            this.sender = sender;
            this.notificationEmail = notificationEmail;
            this.portalUrl = portalUrl;
        }
    }

    public class Route {
        public String admin;
        public Boolean known;
        public Binding binding;

        private Route(String state) {
            String normalized = normalizeDestination(state);
            known = normalized != null;
            admin = known ? VpcsCustomerRoutingPolicy.adminByState.get(normalized) : VpcsCustomerRoutingPolicy.defaultAdmin;
            binding = bindings().get(admin);
        }

        public String portalLink(Id partnerId) {
            return binding == null || String.isBlank(binding.portalUrl) ? null : binding.portalUrl + '?agentId=' + partnerId;
        }

        public String sender() {
            return binding == null ? null : binding.sender;
        }
    }

    public static String normalizeDestination(String state) {
        if (String.isBlank(state)) {
            return null;
        }
        String normalized = state.trim().toUpperCase();
        return VpcsCustomerRoutingPolicy.adminByState.containsKey(normalized)
            ? normalized : VpcsCustomerRoutingPolicy.stateAliases.get(normalized.replaceAll('[^A-Z]', ''));
    }

    private static Id recordTypeId(Schema.SObjectType objectType) {
        Schema.RecordTypeInfo info = objectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer');
        return info == null ? null : info.getRecordTypeId();
    }

    private static Map<String, Binding> bindings() {
        if (Test.isRunningTest() && testBindings != null) {
            return testBindings;
        }
        if (cachedBindings == null) {
            cachedBindings = new Map<String, Binding>();
            String orgId = UserInfo.getOrganizationId().left(15);
            Set<String> usernames = new Set<String>();
            List<Vpcs_Regional_Admin__mdt> settings = new List<Vpcs_Regional_Admin__mdt>();
            for (Vpcs_Regional_Admin__mdt setting : Vpcs_Regional_Admin__mdt.getAll().values()) {
                if (setting.Org_Id__c == orgId && !String.isBlank(setting.Username__c)) {
                    settings.add(setting);
                    usernames.add(setting.Username__c);
                }
            }
            if (!usernames.isEmpty()) {
                Map<String, User> usersByUsername = new Map<String, User>();
                for (User admin : [SELECT Id, Username FROM User WHERE IsActive = true AND Username IN :usernames WITH SYSTEM_MODE]) {
                    usersByUsername.put(admin.Username.toLowerCase(), admin);
                }
                Boolean sandbox = [SELECT IsSandbox FROM Organization WITH SYSTEM_MODE LIMIT 1].IsSandbox;
                for (Vpcs_Regional_Admin__mdt setting : settings) {
                    User assigned = usersByUsername.get(setting.Username__c.toLowerCase());
                    String expectedSender = VpcsCustomerRoutingPolicy.senders.get(setting.DeveloperName);
                    if (assigned != null && expectedSender != null) {
                        String email = setting.Notification_Email__c;
                        if (sandbox && email != 'tech@veteranpcs.com') {
                            email = null;
                        }
                        String sender = expectedSender == setting.Sender__c ? expectedSender : null;
                        String portal = setting.Portal_URL__c;
                        String expectedPortal = sandbox
                            ? 'https://veteranpcs--webdev.sandbox.my.site.com/s/agent-portal'
                            : 'https://veteranpcs.my.site.com/s/agent-portal';
                        cachedBindings.put(setting.DeveloperName,
                            new Binding(assigned.Id, sender, email, portal == expectedPortal ? portal : null));
                    }
                }
            }
        }
        return cachedBindings;
    }

    public static Boolean isCustomer(Lead record) {
        return CUSTOMER_LEAD != null && record.RecordTypeId == CUSTOMER_LEAD;
    }

    public static Boolean isCustomer(Opportunity record) {
        return CUSTOMER_OPPORTUNITY != null && record.RecordTypeId == CUSTOMER_OPPORTUNITY;
    }

    public static Boolean isOpenCustomer(Lead record) {
        return isCustomer(record) && record.IsConverted != true
            && VpcsCustomerRoutingPolicy.openLeadStatuses.contains(record.Status);
    }

    public static Boolean isOpenCustomer(Opportunity record) {
        return isCustomer(record) && record.IsClosed != true
            && !VpcsCustomerRoutingPolicy.terminalOpportunityStages.contains(record.StageName);
    }

    public static Boolean isSpam(Lead record) {
        return hasSpamMarker(record.Additional_Comments__c) || hasSpamMarker(record.Description);
    }

    private static Boolean hasSpamMarker(String value) {
        return value != null && value.contains('[SPAM-SUSPECTED]');
    }

    public static Route forLead(Lead record) {
        return new Route(record.Destination_State__c);
    }

    public static Route forOpportunity(Opportunity record) {
        return new Route(record.Destination_State__c);
    }

    public static void assignLeads(List<Lead> records, Map<Id, Lead> prior) {
        if (migrationOwnerWrite) { return; }
        for (Lead record : records) {
            Lead previous = prior == null ? null : prior.get(record.Id);
            if (isOpenCustomer(record) &&
                (previous == null || !isOpenCustomer(previous) ||
                 previous.Destination_State__c != record.Destination_State__c || previous.OwnerId != record.OwnerId)) {
                Route route = forLead(record);
                if (route.binding != null) {
                    record.OwnerId = route.binding.ownerId;
                }
            }
        }
    }

    public static void assignOpportunities(List<Opportunity> records, Map<Id, Opportunity> prior) {
        if (migrationOwnerWrite) { return; }
        for (Opportunity record : records) {
            Opportunity previous = prior == null ? null : prior.get(record.Id);
            if (isOpenCustomer(record) && (previous == null || !isOpenCustomer(previous) ||
                previous.Destination_State__c != record.Destination_State__c || previous.OwnerId != record.OwnerId)) {
                Route route = forOpportunity(record);
                if (route.binding != null) {
                    record.OwnerId = route.binding.ownerId;
                }
            }
        }
    }
}
