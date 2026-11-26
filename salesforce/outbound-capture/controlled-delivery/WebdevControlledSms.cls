/** WebDev-only exception to capture mode. The existing worker owns claims and settlement. */
public without sharing class WebdevControlledSms {
    private static final Id WEBDEV_ORG = '00Djg000000EK8YEAW';
    private static final String TECH_PHONE = '+17194153014';
    private static final String MARKER = '[VPCS WEBDEV TEST]';
    private static final String SYNTHETIC_NOTES = 'Synthetic routing delivery verification';
    private static final String BETH_SENDER = '+17192495359';
    private static final String STEPHANIE_SENDER = '+17192494757';
    private static Permit activePermit;
    private static Set<Id> attempted = new Set<Id>();
    @TestVisible private static DeliveryWindow testWindow;

    private class Permit {
        final String recipient;
        final String sender;
        final String body;

        Permit(String recipient, String sender, String body) {
            this.recipient = recipient;
            this.sender = sender;
            this.body = body;
        }
    }

    public class DeliveryWindow {
        public String run;
        public Datetime issuedAt;
        public Datetime expiresAt;
        public List<Slot> slots;

        public DeliveryWindow(String run, Datetime issuedAt, Datetime expiresAt, List<Slot> slots) {
            this.run = run;
            this.issuedAt = issuedAt;
            this.expiresAt = expiresAt;
            this.slots = slots;
        }
    }

    public class Slot {
        public Id queueId;
        public Id leadId;
        public Id partnerId;
        public String scenario;
        public String lastName;
        public String submissionId;
        public String eventKey;

        public Slot(Id queueId, Id leadId, Id partnerId, String scenario, String lastName,
            String submissionId, String eventKey) {
            this.queueId = queueId;
            this.leadId = leadId;
            this.partnerId = partnerId;
            this.scenario = scenario;
            this.lastName = lastName;
            this.submissionId = submissionId;
            this.eventKey = eventKey;
        }

        public String sender() {
            return scenario.endsWith('CO') ? BETH_SENDER : STEPHANIE_SENDER;
        }

        public String expectedState() {
            return scenario.endsWith('CO') ? 'CO' : 'FL';
        }

        public String expectedAdmin() {
            return scenario.endsWith('CO') ? 'BETH' : 'STEPHANIE';
        }
    }

    private static DeliveryWindow configuration() {
        return Test.isRunningTest() && testWindow != null ? testWindow : WebdevControlledSmsPolicy.window();
    }

    private static Boolean active(DeliveryWindow window) {
        return window != null && (Id)UserInfo.getOrganizationId() == WEBDEV_ORG &&
            WebdevOutboundCapture.mode() == WebdevOutboundCapture.Mode.Capture &&
            Label.VPCS_Webdev_Capture_Run_Id.equals(window.run) &&
            window.issuedAt != null && window.expiresAt != null && window.issuedAt <= System.now() &&
            window.expiresAt > System.now() && window.expiresAt > window.issuedAt &&
            window.expiresAt.getTime() - window.issuedAt.getTime() <= 1800000 &&
            window.slots != null && window.slots.size() > 0 && window.slots.size() <= 4;
    }

    private static Slot slotFor(DeliveryWindow window, Id queueId) {
        if (window == null || window.slots == null) return null;
        for (Slot item : window.slots) if (item.queueId == queueId) return item;
        return null;
    }

    public static List<SMS_Message_Queue__c> liveFirst(List<SMS_Message_Queue__c> rows) {
        // Normal capture writes an audit row; provider calls must run first in a mixed worker job.
        DeliveryWindow window = configuration();
        List<SMS_Message_Queue__c> controlled = new List<SMS_Message_Queue__c>();
        List<SMS_Message_Queue__c> ordinary = new List<SMS_Message_Queue__c>();
        for (SMS_Message_Queue__c row : rows) {
            if (slotFor(window, row.Id) == null) ordinary.add(row);
            else controlled.add(row);
        }
        controlled.addAll(ordinary);
        return controlled;
    }

    public static void reserve(Set<Id> queueIds, Id jobId) {
        DeliveryWindow window = configuration();
        if (!active(window) || jobId == null || !VpcsRegionalDispatchControl.enabled()) return;
        Set<Id> approved = new Set<Id>();
        for (Slot item : window.slots) if (queueIds.contains(item.queueId)) approved.add(item.queueId);
        if (approved.isEmpty()) return;
        List<Webdev_Live_SMS_Reservation__c> reservations = new List<Webdev_Live_SMS_Reservation__c>();
        for (SMS_Message_Queue__c row : byId(approved).values()) {
            Slot item = slotFor(window, row.Id);
            if (eligible(window, item, row, jobId)) {
                reservations.add(new Webdev_Live_SMS_Reservation__c(
                    Queue_Key__c = String.valueOf(row.Id).left(15), Job_Id__c = String.valueOf(jobId), Run_Id__c = window.run));
            }
        }
        // Unique Queue_Key__c permits at most one committed live attempt per approved queue row.
        // A duplicate or other failed insert gives the new job no matching reservation.
        if (!reservations.isEmpty()) Database.insert(reservations, false, AccessLevel.SYSTEM_MODE);
    }

    public static SendMessageResult sendOrCapture(Id jobId, Id queueId, IMessagingService service, SendSMSRequest request) {
        DeliveryWindow window = configuration();
        Slot item = slotFor(window, queueId);
        if (item == null) return service.sendSMS(request);
        if (!active(window) || !VpcsRegionalDispatchControl.enabled() || jobId == null) return denied();
        SMS_Message_Queue__c row = byId(new Set<Id>{queueId}).get(queueId);
        if (!eligible(window, item, row, jobId) || request == null ||
            !TECH_PHONE.equals(request.toPhoneNumber) || !item.sender().equals(request.fromPhoneNumber) ||
            String.isNotBlank(request.senderEmail) || String.isBlank(request.message)) return denied();
        Lead customer = row.Related_Lead__r;
        String rendered = item.scenario.startsWith('Agent')
            ? VpcsRegionalLeadIntake.agentPortalSms(VpcsCustomerRouting.forLead(customer).portalLink(item.partnerId))
            : VpcsRegionalLeadIntake.lenderIntroduction(customer);
        if (!request.message.equals(rendered)) return denied();

        String key = String.valueOf(queueId).left(15);
        List<Webdev_Live_SMS_Reservation__c> reserved = [
            SELECT Job_Id__c, Run_Id__c FROM Webdev_Live_SMS_Reservation__c WHERE Queue_Key__c = :key
            WITH SYSTEM_MODE LIMIT 1
        ];
        if (reserved.isEmpty() || idFrom(reserved[0].Job_Id__c) != jobId || !window.run.equals(reserved[0].Run_Id__c)) {
            return denied();
        }

        if (!attempted.add(queueId)) return denied();
        SendSMSRequest approved = new SendSMSRequest();
        approved.toPhoneNumber = TECH_PHONE;
        approved.fromPhoneNumber = item.sender();
        approved.message = MARKER + ' ' + window.run + ' ' + item.scenario + '\n' + request.message;
        activePermit = new Permit(approved.toPhoneNumber, approved.fromPhoneNumber, approved.message);
        try {
            return service.sendSMS(approved);
        } finally {
            activePermit = null;
        }
    }

    public static Boolean consumePermit(OpenPhoneSendMessageRequest request, String credential) {
        if (activePermit == null || !active(configuration()) || !'OpenPhone'.equals(credential) || request == null ||
            String.isNotBlank(request.senderEmail) || request.toNumber == null || request.toNumber.size() != 1 ||
            !activePermit.recipient.equals(request.toNumber[0]) || !activePermit.sender.equals(request.fromNumber) ||
            !activePermit.body.equals(request.content)) return false;
        activePermit = null;
        return true;
    }

    private static SendMessageResult denied() {
        return SendMessageResult.createFailure('WebDev live SMS approval did not match the claimed test row');
    }

    private static Map<Id, SMS_Message_Queue__c> byId(Set<Id> ids) {
        return new Map<Id, SMS_Message_Queue__c>([
            SELECT Id, Status__c, Event_Key__c, Claim_Job_Id__c, Retry_Count__c, Named_Credential__c,
                   From_Phone_Number__c, To_Phone_Number__c, Related_Lead__c, Related_Opportunity__c,
                   Related_Partner__c, Related_Lead__r.Id, Related_Lead__r.RecordTypeId, Related_Lead__r.IsConverted,
                   Related_Lead__r.Status, Related_Lead__r.Destination_State__c, Related_Lead__r.OwnerId,
                   Related_Lead__r.FirstName, Related_Lead__r.LastName, Related_Lead__r.Description,
                   Related_Lead__r.Email, Related_Lead__r.Phone, Related_Lead__r.MobilePhone,
                   Related_Lead__r.Current_Base__c, Related_Lead__r.Destination_Base__c, Related_Lead__r.VPCS_Submission_ID__c,
                   Related_Lead__r.Additional_Comments__c, Related_Lead__r.Agent__c, Related_Lead__r.Lender__c,
                   Related_Partner__r.PersonMobilePhone, Related_Partner__r.Phone
            FROM SMS_Message_Queue__c WHERE Id IN :ids WITH SYSTEM_MODE
        ]);
    }

    private static Boolean eligible(DeliveryWindow window, Slot item, SMS_Message_Queue__c row, Id jobId) {
        if (row == null || row.Status__c != 'Processing' || row.Retry_Count__c != 1 ||
            idFrom(row.Claim_Job_Id__c) != jobId || row.Related_Lead__c != item.leadId ||
            row.Related_Opportunity__c != null || row.Related_Partner__c != item.partnerId ||
            !item.eventKey.equals(row.Event_Key__c) || String.isNotBlank(row.Named_Credential__c) ||
            !TECH_PHONE.equals(row.To_Phone_Number__c) || !item.sender().equals(row.From_Phone_Number__c) ||
            !TECH_PHONE.equals(VpcsRegionalSms.phone(row.Related_Partner__r?.PersonMobilePhone,
                row.Related_Partner__r?.Phone))) return false;
        Lead customer = row.Related_Lead__r;
        String firstLine = MARKER + ' ' + window.run + ' ' + item.submissionId;
        if (customer == null || !VpcsCustomerRouting.isOpenCustomer(customer) || VpcsCustomerRouting.isSpam(customer) ||
            !MARKER.equals(customer.FirstName) || !item.lastName.equals(customer.LastName) ||
            !'tech@veteranpcs.com'.equals(customer.Email) || String.isNotBlank(customer.Phone) ||
            String.isNotBlank(customer.MobilePhone) || !item.submissionId.equals(customer.VPCS_Submission_ID__c) ||
            String.isNotBlank(customer.Current_Base__c) || String.isNotBlank(customer.Destination_Base__c) ||
            !SYNTHETIC_NOTES.equals(customer.Additional_Comments__c) ||
            customer.Description == null || !(firstLine.equals(customer.Description) ||
                customer.Description.startsWith(firstLine + '\n') || customer.Description.startsWith(firstLine + '\r\n')) ||
            !item.expectedState().equals(customer.Destination_State__c)) return false;
        String event = item.eventKey.split(':')[1];
        if (event != (item.scenario.startsWith('Agent') ? 'INITIAL_AGENT' : 'INITIAL_LENDER')) return false;
        Id partnerId = event == 'INITIAL_AGENT' ? customer.Agent__c : customer.Lender__c;
        if (partnerId != item.partnerId) return false;
        VpcsCustomerRouting.Route route = VpcsCustomerRouting.forLead(customer);
        return item.expectedAdmin().equals(route.admin) && route.binding != null &&
            route.binding.ownerId == customer.OwnerId && item.sender().equals(route.sender());
    }

    private static Id idFrom(String candidate) {
        try {
            return (Id)candidate;
        } catch (Exception invalidId) {
            return null;
        }
    }
}
