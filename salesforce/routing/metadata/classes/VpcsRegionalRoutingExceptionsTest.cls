@IsTest
private class VpcsRegionalRoutingExceptionsTest {
    private static final String SETUP_SUBJECT = 'Regional routing exception: Routing setup';
    private static final String SMS_SUBJECT = 'Regional routing exception: SMS review';
    private static final String TEST_INBOX = 'tech@veteranpcs.com';

    private static void bind(String email) {
        Id owner = UserInfo.getUserId();
        VpcsCustomerRouting.testBindings = new Map<String, VpcsCustomerRouting.Binding>{
            'BETH' => new VpcsCustomerRouting.Binding(owner, '+17192495359', email, null),
            'STEPHANIE' => new VpcsCustomerRouting.Binding(owner, '+17192494757', email, null)
        };
    }

    private static Lead customer(String state) {
        Id typeId = Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName()
            .get('Customer').getRecordTypeId();
        return new Lead(RecordTypeId = typeId, LastName = 'Synthetic Routing Exception',
            Company = 'Synthetic CRM Fixture', Status = 'Prospect', Destination_State__c = state, WebToLead__c = false);
    }

    private static List<Task> openTasks(Set<Id> customerIds) {
        Set<String> subjects = new Set<String>{SETUP_SUBJECT, SMS_SUBJECT};
        return [
            SELECT Id, OwnerId, WhoId, Subject, Description FROM Task
            WHERE WhoId IN :customerIds AND IsClosed = false AND Subject IN :subjects
            WITH SYSTEM_MODE ORDER BY Subject, Id
        ];
    }

    @IsTest
    static void groupsSetupReasonsAndCustomersInOneAdminSummary() {
        bind(TEST_INBOX);
        Lead unknown = customer(null);
        Lead known = customer('TX');
        insert as system new List<Lead>{unknown, known};
        VpcsCustomerRouting.Route triageRoute = VpcsCustomerRouting.forLead(unknown);
        VpcsCustomerRouting.Route knownRoute = VpcsCustomerRouting.forLead(known);

        Integer beforeEmails = Limits.getEmailInvocations();
        VpcsRegionalRoutingExceptions.report(new List<VpcsRegionalRoutingExceptions.Issue>{
            new VpcsRegionalRoutingExceptions.Issue(unknown.Id, triageRoute,
                VpcsRegionalRoutingExceptions.Reason.UNKNOWN_DESTINATION),
            new VpcsRegionalRoutingExceptions.Issue(unknown.Id, triageRoute,
                VpcsRegionalRoutingExceptions.Reason.MISSING_AGENT),
            new VpcsRegionalRoutingExceptions.Issue(unknown.Id, triageRoute,
                VpcsRegionalRoutingExceptions.Reason.MISSING_AGENT),
            new VpcsRegionalRoutingExceptions.Issue(known.Id, knownRoute,
                VpcsRegionalRoutingExceptions.Reason.MISSING_LENDER_PHONE)
        });

        List<Task> tasks = openTasks(new Set<Id>{unknown.Id, known.Id});
        System.assertEquals(2, tasks.size(), JSON.serialize(VpcsRegionalRoutingExceptions.testWarnings));
        for (Task task : tasks) {
            System.assertEquals(SETUP_SUBJECT, task.Subject);
            System.assertEquals(UserInfo.getUserId(), task.OwnerId);
            if (task.WhoId == unknown.Id) {
                System.assertEquals('Confirm the assigned agent.\nConfirm the destination state.', task.Description);
            } else {
                System.assertEquals('Confirm the lender SMS phone number.', task.Description);
            }
        }
        System.assertEquals(1, Limits.getEmailInvocations() - beforeEmails);
        System.assertEquals(1, VpcsRegionalRoutingExceptions.testSummaries.size());
        System.assertEquals(2, VpcsRegionalRoutingExceptions.testSummaries.get(TEST_INBOX).size());
    }

    @IsTest
    static void reusesOpenTaskWhenRepeatedAndKeepsSeparateSmsReview() {
        bind(TEST_INBOX);
        Lead lead = customer('NC');
        insert as system lead;
        VpcsCustomerRouting.Route route = VpcsCustomerRouting.forLead(lead);
        VpcsRegionalRoutingExceptions.Issue setup = new VpcsRegionalRoutingExceptions.Issue(lead.Id, route,
            VpcsRegionalRoutingExceptions.Reason.MISSING_SENDER);
        List<VpcsRegionalRoutingExceptions.Issue> setupOnly = new List<VpcsRegionalRoutingExceptions.Issue>{setup};
        VpcsRegionalRoutingExceptions.report(setupOnly);
        Task original = openTasks(new Set<Id>{lead.Id})[0];
        original.Description += '\nOperator note.';
        update as system original;

        VpcsRegionalRoutingExceptions.Issue portal = new VpcsRegionalRoutingExceptions.Issue(lead.Id, route,
            VpcsRegionalRoutingExceptions.Reason.MISSING_PORTAL);
        VpcsRegionalRoutingExceptions.Issue sms = new VpcsRegionalRoutingExceptions.Issue(lead.Id, route,
            VpcsRegionalRoutingExceptions.Reason.UNCERTAIN_SMS_OUTCOME);
        List<VpcsRegionalRoutingExceptions.Issue> current = new List<VpcsRegionalRoutingExceptions.Issue>{
            setup, portal, sms
        };
        VpcsRegionalRoutingExceptions.report(current);
        List<Task> tasks = openTasks(new Set<Id>{lead.Id});
        System.assertEquals(2, tasks.size());
        System.assertEquals(original.Id, tasks[0].Id);
        System.assertEquals('Verify the regional SMS sender configuration.\nOperator note.\n' +
            'Verify the regional portal link configuration.', tasks[0].Description);
        System.assertEquals(SMS_SUBJECT, tasks[1].Subject);
        System.assert(tasks[1].Description.contains('Confirm whether the previous SMS was delivered'));

        Integer beforeEmails = Limits.getEmailInvocations();
        VpcsRegionalRoutingExceptions.report(current);
        System.assertEquals(2, openTasks(new Set<Id>{lead.Id}).size());
        System.assertEquals(beforeEmails, Limits.getEmailInvocations());
        System.assert(VpcsRegionalRoutingExceptions.testSummaries.isEmpty());
    }

    @IsTest
    static void unboundOwnerLogsExceptionWithoutMisrouting() {
        VpcsCustomerRouting.testBindings = new Map<String, VpcsCustomerRouting.Binding>();
        Lead lead = customer('AZ');
        insert as system lead;
        VpcsRegionalRoutingExceptions.report(new List<VpcsRegionalRoutingExceptions.Issue>{
            new VpcsRegionalRoutingExceptions.Issue(lead.Id, VpcsCustomerRouting.forLead(lead),
                VpcsRegionalRoutingExceptions.Reason.MISSING_ROUTING_BINDING)
        });
        System.assert(openTasks(new Set<Id>{lead.Id}).isEmpty());
        System.assert(VpcsRegionalRoutingExceptions.testSummaries.isEmpty());
        System.assertEquals(1, VpcsRegionalRoutingExceptions.testWarnings.get(
            'missing-regional-owner-MISSING_ROUTING_BINDING'));
    }
}
