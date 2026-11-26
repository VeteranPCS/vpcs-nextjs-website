/**
 * @author KKnapp
 * @description Batch job that sends hourly speed-to-lead reminder emails to agents
 *              who have leads in 'New:_Not_Contacted' status. Run via AgentPortalReminderScheduler
 *              (one scheduled job per hour, 24 total).
 *
 *              The Last_Speed_To_Lead_Reminder__c field on Lead acts as a 1-hour debounce:
 *              a lead is only included if the field is null or older than 1 hour ago.
 *
 *              Speed_To_Lead_Reminder_Count__c tracks how many of these reminders have been sent.
 *              Once a lead reaches MAX_REMINDER_ATTEMPTS (4 batch-sent reminders, 5 total contact
 *              attempts counting the initial alert sent by Lead_WebToLead_AfterInsert), its Status
 *              is changed to 'Urgent' and admins are emailed. The lead then falls out of this batch's
 *              query (Status != 'New:_Not_Contacted'), so nagging stops automatically.
 */
public without sharing class AgentPortalReminderBatch implements Database.Batchable<sObject> {

    // Existing sender for onboarding and other non-Customer reminder records.
    private static final String LEGACY_FROM_PHONE_NUMBER = '+17197825065';

    // 4 batch-sent reminders = 5 total contact attempts, counting the initial new-lead alert
    // sent outside this batch (Lead_WebToLead_AfterInsert).
    private static final Integer MAX_REMINDER_ATTEMPTS = 4;

    public Database.QueryLocator start(Database.BatchableContext bc) {
        Datetime cutoff = Datetime.now().addHours(-1);
        return Database.getQueryLocator([
            SELECT Id, Name, Agent_Email__c, Agent__c, Last_Speed_To_Lead_Reminder__c,
                   RecordTypeId, Destination_State__c, Description, Additional_Comments__c,
                   Speed_To_Lead_Reminder_Count__c, Agent__r.PersonMobilePhone, Agent__r.Phone
            FROM Lead
            WHERE Status = 'New:_Not_Contacted'
              AND Agent__c != null
              AND Agent_Email__c != null
              AND (Last_Speed_To_Lead_Reminder__c = null
                   OR Last_Speed_To_Lead_Reminder__c < :cutoff)
            WITH SYSTEM_MODE
        ]);
    }

    public void execute(Database.BatchableContext bc, List<Lead> scope) {
        List<Messaging.SingleEmailMessage> emails = new List<Messaging.SingleEmailMessage>();
        List<SMS_Message_Queue__c> smsRequests = new List<SMS_Message_Queue__c>();
        List<Lead> toUpdate = new List<Lead>();
        List<VpcsRegionalRoutingExceptions.Issue> exceptions = new List<VpcsRegionalRoutingExceptions.Issue>();
        Boolean isSandbox = [SELECT IsSandbox FROM Organization WITH SYSTEM_MODE LIMIT 1].IsSandbox;
        String legacyPortal = isSandbox
            ? 'https://veteranpcs--webdev.sandbox.my.site.com/s/agent-portal'
            : 'https://veteranpcs.my.site.com/s/agent-portal';
        Id adminOrgWideEmailAddressId = getAdminOrgWideEmailAddressId();

        for (Lead l : scope) {
            Boolean customer = VpcsCustomerRouting.isCustomer(l);
            if (customer && VpcsCustomerRouting.isSpam(l)) {
                continue;
            }
            VpcsCustomerRouting.Route route = customer ? VpcsCustomerRouting.forLead(l) : null;
            String portalLink = customer ? route.portalLink(l.Agent__c) : legacyPortal + '?agentId=' + l.Agent__c;
            if (portalLink != null) {
                emails.add(buildReminderEmail(l, adminOrgWideEmailAddressId, portalLink));
            }
            if (customer) {
                VpcsRegionalRoutingExceptions.Reason issue = reminderIssue(l, route, portalLink);
                if (issue != null) {
                    exceptions.add(new VpcsRegionalRoutingExceptions.Issue(l.Id, route, issue));
                }
            }

            Integer newCount = (l.Speed_To_Lead_Reminder_Count__c == null ? 0 : Integer.valueOf(l.Speed_To_Lead_Reminder_Count__c)) + 1;
            SMS_Message_Queue__c smsRequest = customer
                ? buildNewLeadSmsRequest(l, route, newCount, portalLink)
                : buildLegacySmsRequest(l, portalLink);
            if (smsRequest != null) {
                smsRequests.add(smsRequest);
            }
            Lead leadUpdate = new Lead(
                Id = l.Id,
                Last_Speed_To_Lead_Reminder__c = Datetime.now(),
                Speed_To_Lead_Reminder_Count__c = newCount
            );

            if (newCount >= MAX_REMINDER_ATTEMPTS) {
                leadUpdate.Status = 'Urgent';
                String adminEmail = customer ? route.binding?.notificationEmail : 'admin@veteranpcs.com';
                if (!String.isBlank(adminEmail)) {
                    emails.add(buildAdminEscalationEmail(l, adminOrgWideEmailAddressId, adminEmail));
                }
            }

            toUpdate.add(leadUpdate);
        }

        if (!emails.isEmpty()) {
            Messaging.sendEmail(emails, false);
        }
        VpcsRegionalSms.enqueue(smsRequests);
        VpcsRegionalRoutingExceptions.report(exceptions);
        if (!toUpdate.isEmpty()) {
            Database.update(toUpdate, false);
        }
    }

    // Without an explicit Org-Wide Email Address, Messaging.sendEmail() falls back to sending
    // "from" whichever user's context the batch happens to run under (e.g. whoever scheduled it),
    // not admin@veteranpcs.com as intended. See GitHub issue #13.
    @TestVisible
    private static Id getAdminOrgWideEmailAddressId() {
        List<OrgWideEmailAddress> owea = [
            SELECT Id FROM OrgWideEmailAddress WHERE Address = 'admin@veteranpcs.com' LIMIT 1
        ];
        return owea.isEmpty() ? null : owea[0].Id;
    }

    private static Messaging.SingleEmailMessage buildReminderEmail(Lead l, Id orgWideEmailAddressId, String portalLink) {
        String htmlBody =
            '<p style="font-family:Arial,sans-serif;">Congratulations! You have a new lead from VeteranPCS. ' +
              'Please click the link below to Accept this new lead and view their contact details. ' +
              'It will alert us that you\'ve accepted. You\'ll get a reminder tomorrow to log an update.</p>' +
            '<p style="font-family:Arial,sans-serif;">' +
              '<a href="' + portalLink + '" style="background:#282E6D;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;">' +
              'View &amp; Accept Your Lead</a></p>' +
            '<p style="font-family:Arial,sans-serif;">Here is your unique VeteranPCS portal link: ' +
              '<a href="' + portalLink + '">' + portalLink + '</a></p>' +
            '<p style="font-family:Arial,sans-serif;color:#A71E23;font-weight:bold;">Note: This notification will continue every hour until the lead is accepted or denied.</p>' +
            '<p style="font-size:9px;color:#cccccc;margin-top:20px;">src: AgentPortalReminderBatch.buildReminderEmail</p>';

        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setToAddresses(new List<String>{ l.Agent_Email__c });
        mail.setSubject('NEW LEAD: VeteranPCS_Must Accept to View');
        mail.setHtmlBody(htmlBody);
        if (orgWideEmailAddressId != null) {
            mail.setOrgWideEmailAddressId(orgWideEmailAddressId);
        }
        mail.setReplyTo('info@veteranpcs.com');
        return mail;
    }

    private static VpcsRegionalRoutingExceptions.Reason reminderIssue(
        Lead record, VpcsCustomerRouting.Route route, String portalLink
    ) {
        if (!route.known) {
            return VpcsRegionalRoutingExceptions.Reason.UNKNOWN_DESTINATION;
        }
        if (route.binding == null) {
            return VpcsRegionalRoutingExceptions.Reason.MISSING_ROUTING_BINDING;
        }
        if (route.sender() == null) {
            return VpcsRegionalRoutingExceptions.Reason.MISSING_SENDER;
        }
        if (portalLink == null) {
            return VpcsRegionalRoutingExceptions.Reason.MISSING_PORTAL;
        }
        String phone = VpcsRegionalSms.phone(record.Agent__r?.PersonMobilePhone, record.Agent__r?.Phone);
        if (phone == null || phone == route.sender()) {
            return VpcsRegionalRoutingExceptions.Reason.MISSING_AGENT_PHONE;
        }
        return null;
    }

    private static SMS_Message_Queue__c buildNewLeadSmsRequest(
        Lead l, VpcsCustomerRouting.Route route, Integer count, String portalLink
    ) {
        if (portalLink == null) {
            return null;
        }
        String phone = VpcsRegionalSms.phone(l.Agent__r?.PersonMobilePhone, l.Agent__r?.Phone);
        return VpcsRegionalSms.message(l.Id, l.Agent__c, 'PORTAL_REMINDER:' + count, phone,
            VpcsRegionalLeadIntake.agentPortalSms(portalLink), route);
    }

    private static SMS_Message_Queue__c buildLegacySmsRequest(Lead l, String portalLink) {
        String phone = !String.isBlank(l.Agent__r?.PersonMobilePhone)
            ? l.Agent__r.PersonMobilePhone : l.Agent__r?.Phone;
        return String.isBlank(phone) ? null : new SMS_Message_Queue__c(
            To_Phone_Number__c = phone,
            From_Phone_Number__c = LEGACY_FROM_PHONE_NUMBER,
            Message__c = reminderSmsBody(portalLink),
            Status__c = 'New',
            Retry_Count__c = 0
        );
    }

    private static String reminderSmsBody(String portalLink) {
        return 'NEW LEAD from VeteranPCS - click link below to Accept and view their contact info. ' +
            'When you accept the lead it will notify us. If you cannot work with them after accepting please text or email us back, thank you!\n\n' +
            portalLink + '\n\n' +
            'Note: this text will remind you every hour until the lead is accepted or declined.';
    }

    private static Messaging.SingleEmailMessage buildAdminEscalationEmail(
        Lead l, Id orgWideEmailAddressId, String adminEmail
    ) {
        String htmlBody =
            '<p style="font-family:Arial,sans-serif;">Lead <strong>' + l.Name + '</strong> has not been accepted ' +
              'after 5 contact attempts (1 initial alert + 4 hourly reminders). Its status has been changed to ' +
              '<strong>Urgent</strong> and no further reminders will be sent automatically.</p>' +
            '<p style="font-size:9px;color:#cccccc;margin-top:20px;">src: AgentPortalReminderBatch.buildAdminEscalationEmail</p>';

        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setToAddresses(new List<String>{ adminEmail });
        mail.setCcAddresses(new List<String>{ 'info@veteranpcs.com' });
        mail.setSubject('Lead Escalated to Urgent: ' + l.Name + ' — Not Accepted After 5 Attempts');
        mail.setHtmlBody(htmlBody);
        if (orgWideEmailAddressId != null) {
            mail.setOrgWideEmailAddressId(orgWideEmailAddressId);
        }
        mail.setReplyTo('info@veteranpcs.com');
        return mail;
    }

    public void finish(Database.BatchableContext bc) {}
}
