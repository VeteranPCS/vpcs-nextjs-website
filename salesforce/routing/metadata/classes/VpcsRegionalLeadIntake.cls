public without sharing class VpcsRegionalLeadIntake {
    private static final String AGENT_BODY = 'NEW LEAD from VeteranPCS - click link below to Accept and view their contact info. ' +
        'When you accept the lead it will notify us. If you cannot work with them after accepting please text or email us back, thank you!\n\n';

    public static Boolean isContactIntake(Lead item) {
        return contactRole(item) != null;
    }

    private static String contactRole(Lead item) {
        if (item.WebToLead__c != true || String.isBlank(item.WebFormURL__c)) {
            return null;
        }
        String form = item.WebFormURL__c.toLowerCase();
        String prefix = '^https?://[^/?#]+/';
        String suffix = '/?([?#].*)?$';
        if (item.LeadSource == 'Contact Agent' && Pattern.matches(prefix + 'contact-agent' + suffix, form)) {
            return 'Agent';
        }
        if (item.LeadSource == 'Contact Lender' && Pattern.matches(prefix + 'contact-lender' + suffix, form)) {
            return 'Lender';
        }
        return null;
    }

    public static Boolean isInitialAgentEligible(Lead item) {
        // The native Web-to-Lead flow checked Prospect before the assigned-agent branch.
        return item.WebToLead__c == true && item.Status != 'Prospect' && item.Agent__c != null;
    }

    public static Boolean isInitialLenderEligible(Lead item) {
        return contactRole(item) == 'Lender' && item.Lender__c != null;
    }

    public static void afterInsert(List<Lead> created) {
        List<Lead> eligible = new List<Lead>();
        Set<Id> partnerIds = new Set<Id>();
        for (Lead item : created) {
            if ((isContactIntake(item) || isInitialAgentEligible(item)) &&
                VpcsCustomerRouting.isOpenCustomer(item) &&
                !VpcsCustomerRouting.isSpam(item)) {
                eligible.add(item);
                if (item.Agent__c != null) {
                    partnerIds.add(item.Agent__c);
                }
                if (item.Lender__c != null) {
                    partnerIds.add(item.Lender__c);
                }
            }
        }
        if (eligible.isEmpty()) {
            return;
        }
        Map<Id, Account> partners = new Map<Id, Account>();
        if (!partnerIds.isEmpty()) {
            partners = new Map<Id, Account>([
                SELECT Id, PersonMobilePhone, Phone FROM Account WHERE Id IN :partnerIds WITH SYSTEM_MODE
            ]);
        }
        List<SMS_Message_Queue__c> outbound = new List<SMS_Message_Queue__c>();
        List<VpcsRegionalRoutingExceptions.Issue> alerts = new List<VpcsRegionalRoutingExceptions.Issue>();
        for (Lead item : eligible) {
            VpcsCustomerRouting.Route route = VpcsCustomerRouting.forLead(item);
            List<VpcsRegionalRoutingExceptions.Reason> issues = new List<VpcsRegionalRoutingExceptions.Reason>();
            if (!route.known) {
                issues.add(VpcsRegionalRoutingExceptions.Reason.UNKNOWN_DESTINATION);
            }
            if (route.binding == null) {
                issues.add(VpcsRegionalRoutingExceptions.Reason.MISSING_ROUTING_BINDING);
            } else if (route.sender() == null) {
                issues.add(VpcsRegionalRoutingExceptions.Reason.MISSING_SENDER);
            }
            String role = contactRole(item);
            Boolean intendsAgent = isInitialAgentEligible(item) || (role == 'Agent' && item.Agent__c == null);
            Boolean intendsLender = role == 'Lender';
            if (intendsAgent) {
                prepare(item, partners.get(item.Agent__c), 'Agent', route, issues, outbound);
            }
            if (intendsLender) {
                prepare(item, partners.get(item.Lender__c), 'Lender', route, issues, outbound);
            }
            Boolean copySharedInbox = usesLegacyUnassignedCopy(item);
            for (VpcsRegionalRoutingExceptions.Reason issue : issues) {
                alerts.add(new VpcsRegionalRoutingExceptions.Issue(item.Id, route, issue, copySharedInbox));
            }
        }
        VpcsRegionalSms.enqueue(outbound);
        VpcsRegionalRoutingExceptions.report(alerts);
    }

    @TestVisible
    private static Boolean usesLegacyUnassignedCopy(Lead item) {
        // The existing Flow checks Prospect first, then each assigned partner
        // before its contact-form branches for an unassigned Lead.
        return item.Status == 'Prospect' || (item.Agent__c == null && item.Lender__c == null);
    }

    private static void prepare(Lead item, Account partner, String role, VpcsCustomerRouting.Route route,
        List<VpcsRegionalRoutingExceptions.Reason> issues, List<SMS_Message_Queue__c> outbound
    ) {
        if (partner == null) {
            issues.add(role == 'Agent' ? VpcsRegionalRoutingExceptions.Reason.MISSING_AGENT
                : VpcsRegionalRoutingExceptions.Reason.MISSING_LENDER);
            return;
        }
        String phone = VpcsRegionalSms.phone(partner.PersonMobilePhone, partner.Phone);
        if (phone == null || phone == route.sender()) {
            issues.add(role == 'Agent' ? VpcsRegionalRoutingExceptions.Reason.MISSING_AGENT_PHONE
                : VpcsRegionalRoutingExceptions.Reason.MISSING_LENDER_PHONE);
            return;
        }
        String portalLink = route.portalLink(partner.Id);
        if (role == 'Agent' && route.known && portalLink == null) {
            issues.add(VpcsRegionalRoutingExceptions.Reason.MISSING_PORTAL);
            return;
        }
        String body = role == 'Agent'
            ? agentPortalSms(portalLink)
            : lenderIntroduction(item);
        SMS_Message_Queue__c message = VpcsRegionalSms.message(item.Id, partner.Id, 'INITIAL_' + role.toUpperCase(), phone, body, route);
        if (message != null) {
            outbound.add(message);
        }
    }

    public static String agentPortalSms(String portalLink) {
        return String.isBlank(portalLink) ? null : AGENT_BODY + portalLink +
            '\n\nNote: this text will remind you every hour until the lead is accepted or declined.';
    }

    public static String lenderIntroduction(Lead item) {
        String mainPhone = String.isBlank(item.MobilePhone) ? item.Phone : item.MobilePhone;
        String phone = String.isBlank(mainPhone) ? 'Not provided' : mainPhone.trim();
        String digits = phone.replaceAll('[^0-9]', '');
        if (digits.length() == 11 && digits.startsWith('1')) {
            digits = digits.substring(1);
        }
        if (digits.length() == 10) {
            phone = '(' + digits.substring(0, 3) + ') ' + digits.substring(3, 6) + '-' + digits.substring(6);
        }
        String name = String.isBlank(item.FirstName) ? item.LastName : item.FirstName + ' ' + item.LastName;
        String state = VpcsCustomerRouting.normalizeDestination(item.Destination_State__c);
        String body = 'New Lead From VeteranPCS:\n' + name +
            '\nEmail: ' + (String.isBlank(item.Email) ? 'Not provided' : item.Email.trim()) +
            '\nPhone: ' + phone + '\nDestination State: ' + VpcsCustomerRoutingPolicy.labelByState.get(state);
        if (!String.isBlank(item.Current_Base__c)) {
            body += '\nCurrent Base: ' + item.Current_Base__c;
        }
        if (!String.isBlank(item.Destination_Base__c)) {
            body += '\nDestination Base: ' + item.Destination_Base__c;
        }
        if (!String.isBlank(item.Additional_Comments__c)) {
            body += '\nAdditional Comments: ' + item.Additional_Comments__c;
        }
        return body;
    }

}
