/** Records CRM-admin exceptions after any outbound callouts in the transaction. */
public without sharing class VpcsRegionalRoutingExceptions {
    public enum Reason {
        UNKNOWN_DESTINATION, MISSING_ROUTING_BINDING, MISSING_SENDER, MISSING_PORTAL,
        MISSING_AGENT, MISSING_LENDER, MISSING_AGENT_PHONE, MISSING_LENDER_PHONE,
        STALE_SMS_CONTEXT, SMS_DELIVERY_FAILURE, UNCERTAIN_SMS_OUTCOME, DISPATCH_PAUSED
    }

    public class Issue {
        public Id recordId;
        public VpcsCustomerRouting.Route route;
        public Reason reason;
        public Boolean copySharedInbox;

        public Issue(Id recordId, VpcsCustomerRouting.Route route, Reason reason) {
            this(recordId, route, reason, false);
        }

        public Issue(Id recordId, VpcsCustomerRouting.Route route, Reason reason, Boolean copySharedInbox) {
            this.recordId = recordId;
            this.route = route;
            this.reason = reason;
            this.copySharedInbox = copySharedInbox == true;
        }
    }

    private static final String CONTEXT = 'VpcsRegionalRoutingExceptions.report';
    private static final String SETUP_SUBJECT = 'Regional routing exception: Routing setup';
    private static final String SMS_SUBJECT = 'Regional routing exception: SMS review';
    private static final Set<String> SUBJECTS = new Set<String>{SETUP_SUBJECT, SMS_SUBJECT};
    private static final String SANDBOX_INBOX = 'tech@veteranpcs.com';
    private static final String SHARED_INBOX = 'info@veteranpcs.com';
    private static final Map<Reason, String> REASON_TEXT = new Map<Reason, String>{
        Reason.UNKNOWN_DESTINATION => 'Confirm the destination state.',
        Reason.MISSING_ROUTING_BINDING => 'Verify the regional admin assignment.',
        Reason.MISSING_SENDER => 'Verify the regional SMS sender configuration.',
        Reason.MISSING_PORTAL => 'Verify the regional portal link configuration.',
        Reason.MISSING_AGENT => 'Confirm the assigned agent.',
        Reason.MISSING_LENDER => 'Confirm the assigned lender.',
        Reason.MISSING_AGENT_PHONE => 'Confirm the agent SMS phone number.',
        Reason.MISSING_LENDER_PHONE => 'Confirm the lender SMS phone number.',
        Reason.STALE_SMS_CONTEXT => 'Review the current routing details before any SMS is sent.',
        Reason.SMS_DELIVERY_FAILURE => 'Review the failed SMS delivery.',
        Reason.DISPATCH_PAUSED => 'Review the SMS held during the regional dispatch pause.',
        Reason.UNCERTAIN_SMS_OUTCOME => 'Confirm whether the previous SMS was delivered before retrying.'
    };

    private class TaskNotice {
        Id recordId;
        VpcsCustomerRouting.Binding binding;
        String subject;
        Set<Reason> reasons = new Set<Reason>();
        Boolean sharedCopy = false;
    }

    private class Summary {
        String recipient;
        List<String> lines = new List<String>();

        Summary(String recipient) {
            this.recipient = recipient;
        }
    }

    @TestVisible private static Map<String, List<String>> testSummaries;
    @TestVisible private static Map<String, Integer> testWarnings;

    public static void report(List<Issue> issues) {
        if (issues == null || issues.isEmpty() || VpcsCustomerRouting.isMigrationOwnerWrite()) return;
        if (Test.isRunningTest()) {
            testSummaries = new Map<String, List<String>>();
            testWarnings = new Map<String, Integer>();
        }
        Map<String, Integer> warnings = new Map<String, Integer>();
        try {
            reportIssues(issues, warnings);
        } catch (Exception failure) {
            // The queue worker may already have provider receipts. Never roll them back for an exception alert.
            countWarning(warnings, 'report-' + failure.getTypeName());
        }
        if (Test.isRunningTest()) testWarnings = warnings.clone();
        if (!warnings.isEmpty()) {
            String message = 'Regional routing exceptions require review: ' + JSON.serialize(warnings);
            try {
                LogService.AppLogData warning = new LogService.AppLogData();
                warning.message = message;
                warning.loggingLevel = 'WARN';
                warning.className = CONTEXT;
                LogService.logData(new List<LogService.AppLogData>{warning});
            } catch (Exception loggingFailure) {
                System.debug(LoggingLevel.WARN, message);
            }
        }
    }

    private static void reportIssues(List<Issue> issues, Map<String, Integer> warnings) {
        Set<Id> leadIds = new Set<Id>();
        Set<Id> oppIds = new Set<Id>();
        for (Issue issue : issues) {
            if (issue == null || issue.recordId == null || issue.reason == null) continue;
            Schema.SObjectType type = issue.recordId.getSObjectType();
            if (type == Lead.SObjectType) leadIds.add(issue.recordId);
            if (type == Opportunity.SObjectType) oppIds.add(issue.recordId);
        }

        // Internal automation may run as a Guest or queue worker. Restrict eligible records
        // and recipients in the helper, then use system access for the locked CRM records.
        Map<Id, VpcsCustomerRouting.Route> currentRoutes = lockRoutes(leadIds, oppIds);
        Map<String, TaskNotice> groups = new Map<String, TaskNotice>();
        for (Issue issue : issues) {
            if (issue == null || issue.recordId == null || issue.reason == null) {
                countWarning(warnings, 'invalid-issue');
                continue;
            }
            VpcsCustomerRouting.Route current = currentRoutes.get(issue.recordId);
            if (current == null) {
                countWarning(warnings, 'unavailable-or-ineligible-customer');
                continue;
            }
            VpcsCustomerRouting.Route route = issue.route != null && issue.route.admin == current.admin &&
                issue.route.binding == current.binding ? issue.route : current;
            if (route.binding == null || route.binding.ownerId == null ||
                route.binding.ownerId.getSObjectType() != User.SObjectType) {
                countWarning(warnings, 'missing-regional-owner-' + String.valueOf(issue.reason));
                continue;
            }
            String subject = subjectFor(issue.reason);
            String key = groupKey(issue.recordId, subject);
            TaskNotice taskNotice = groups.get(key);
            if (taskNotice == null) {
                taskNotice = new TaskNotice();
                taskNotice.recordId = issue.recordId;
                taskNotice.binding = route.binding;
                taskNotice.subject = subject;
                groups.put(key, taskNotice);
            }
            taskNotice.reasons.add(issue.reason);
            taskNotice.sharedCopy = taskNotice.sharedCopy || issue.copySharedInbox;
        }

        if (!groups.isEmpty()) writeTasksAndSummaries(groups, leadIds, oppIds, warnings);
    }

    private static Map<Id, VpcsCustomerRouting.Route> lockRoutes(Set<Id> leadIds, Set<Id> oppIds) {
        Map<Id, VpcsCustomerRouting.Route> routes = new Map<Id, VpcsCustomerRouting.Route>();
        if (!leadIds.isEmpty()) {
            for (Lead customer : [
                SELECT Id, RecordTypeId, IsConverted, Status, Destination_State__c, Description, Additional_Comments__c
                FROM Lead WHERE Id IN :leadIds WITH SYSTEM_MODE FOR UPDATE
            ]) {
                if (VpcsCustomerRouting.isOpenCustomer(customer) && !VpcsCustomerRouting.isSpam(customer)) {
                    routes.put(customer.Id, VpcsCustomerRouting.forLead(customer));
                }
            }
        }
        if (!oppIds.isEmpty()) {
            for (Opportunity customer : [
                SELECT Id, RecordTypeId, IsClosed, StageName, Destination_State__c
                FROM Opportunity WHERE Id IN :oppIds WITH SYSTEM_MODE FOR UPDATE
            ]) {
                if (VpcsCustomerRouting.isOpenCustomer(customer)) {
                    routes.put(customer.Id, VpcsCustomerRouting.forOpportunity(customer));
                }
            }
        }
        return routes;
    }

    private static void writeTasksAndSummaries(
        Map<String, TaskNotice> groups, Set<Id> leadIds, Set<Id> oppIds, Map<String, Integer> warnings
    ) {
        Map<String, Task> existing = new Map<String, Task>();
        for (Task task : [
            SELECT Id, WhoId, WhatId, OwnerId, Subject, Description
            FROM Task
            WHERE IsClosed = false AND Subject IN :SUBJECTS AND (WhoId IN :leadIds OR WhatId IN :oppIds)
            WITH SYSTEM_MODE ORDER BY CreatedDate, Id
        ]) {
            Id recordId = task.WhatId == null ? task.WhoId : task.WhatId;
            String key = groupKey(recordId, task.Subject);
            if (groups.containsKey(key) && !existing.containsKey(key)) existing.put(key, task);
        }

        List<Task> newTasks = new List<Task>();
        List<Task> updatedTasks = new List<Task>();
        List<TaskNotice> newNotices = new List<TaskNotice>();
        List<TaskNotice> updateNotices = new List<TaskNotice>();
        List<String> keys = new List<String>(groups.keySet());
        keys.sort();
        for (String key : keys) {
            TaskNotice taskNotice = groups.get(key);
            Task task = existing.get(key);
            String description = describeReasons(task == null ? null : task.Description, taskNotice.reasons);
            if (task == null) {
                task = new Task(
                    Subject = taskNotice.subject, ActivityDate = Date.today().addDays(1),
                    WhoId = taskNotice.recordId.getSObjectType() == Lead.SObjectType ? taskNotice.recordId : null,
                    WhatId = taskNotice.recordId.getSObjectType() == Opportunity.SObjectType ? taskNotice.recordId : null
                );
            } else if (task.OwnerId == taskNotice.binding.ownerId && description.equals(task.Description)) {
                continue;
            }
            task.OwnerId = taskNotice.binding.ownerId;
            task.Description = description;
            if (task.Id == null) {
                newTasks.add(task);
                newNotices.add(taskNotice);
            } else {
                updatedTasks.add(task);
                updateNotices.add(taskNotice);
            }
        }
        if (newTasks.isEmpty() && updatedTasks.isEmpty()) return;

        // Keep inserts and updates explicit. An explicit-mode upsert needs a concrete field token.
        List<Database.SaveResult> results = Database.insert(newTasks, false, AccessLevel.SYSTEM_MODE);
        results.addAll(Database.update(updatedTasks, false, AccessLevel.SYSTEM_MODE));
        newNotices.addAll(updateNotices);
        Map<Id, Summary> summaries = new Map<Id, Summary>();
        List<String> sharedLines = new List<String>();
        String taskUrl = URL.getOrgDomainUrl().toExternalForm() + '/';
        for (Integer index = 0; index < results.size(); index++) {
            Database.SaveResult result = results[index];
            TaskNotice taskNotice = newNotices[index];
            if (!result.isSuccess()) {
                for (Database.Error error : result.getErrors()) countWarning(warnings, 'task-' + error.getStatusCode());
                continue;
            }
            String line = taskNotice.subject + ' | ' + taskUrl + result.getId();
            if (String.isBlank(taskNotice.binding.notificationEmail)) {
                countWarning(warnings, 'missing-regional-notification-inbox');
            } else {
                Summary summary = summaries.get(taskNotice.binding.ownerId);
                if (summary == null) {
                    summary = new Summary(taskNotice.binding.notificationEmail);
                    summaries.put(taskNotice.binding.ownerId, summary);
                }
                summary.lines.add(line);
            }
            if (taskNotice.sharedCopy) sharedLines.add(line);
        }
        sendSummaries(summaries, sharedLines, warnings);
    }

    private static void sendSummaries(
        Map<Id, Summary> summaries, List<String> sharedLines, Map<String, Integer> warnings
    ) {
        if (summaries.isEmpty() && sharedLines.isEmpty()) return;
        Organization org = [SELECT IsSandbox FROM Organization WITH SYSTEM_MODE LIMIT 1];
        List<Summary> recipients = summaries.values();
        if (!org.IsSandbox && !sharedLines.isEmpty()) {
            Summary shared = new Summary(SHARED_INBOX);
            shared.lines = sharedLines;
            recipients.add(shared);
        }
        List<Messaging.SingleEmailMessage> messages = new List<Messaging.SingleEmailMessage>();
        for (Summary summary : recipients) {
            if (org.IsSandbox && summary.recipient != SANDBOX_INBOX) {
                countWarning(warnings, 'blocked-sandbox-notification-inbox');
                continue;
            }
            Messaging.SingleEmailMessage message = new Messaging.SingleEmailMessage();
            message.setToAddresses(new List<String>{summary.recipient});
            message.setSubject('Regional routing exceptions');
            message.setPlainTextBody(String.join(summary.lines, '\n'));
            message.setSaveAsActivity(false);
            messages.add(message);
            if (Test.isRunningTest()) testSummaries.put(summary.recipient, summary.lines);
        }
        if (messages.isEmpty()) return;
        if (Limits.getEmailInvocations() == Limits.getLimitEmailInvocations()) {
            countWarning(warnings, 'email-invocation-limit');
            return;
        }
        for (Messaging.SendEmailResult result : Messaging.sendEmail(messages, false)) {
            if (!result.isSuccess()) {
                for (Messaging.SendEmailError error : result.getErrors()) countWarning(warnings, 'email-' + error.getStatusCode());
            }
        }
    }

    private static String subjectFor(Reason issueReason) {
        return issueReason == Reason.STALE_SMS_CONTEXT || issueReason == Reason.SMS_DELIVERY_FAILURE ||
            (issueReason == Reason.UNCERTAIN_SMS_OUTCOME || issueReason == Reason.DISPATCH_PAUSED) ? SMS_SUBJECT : SETUP_SUBJECT;
    }

    private static String groupKey(Id recordId, String subject) {
        return String.valueOf(recordId) + ':' + subject;
    }

    private static String describeReasons(String current, Set<Reason> reasons) {
        List<String> additions = new List<String>();
        Set<String> existingLines = String.isBlank(current) ? new Set<String>() : new Set<String>(current.split('\n'));
        for (Reason reason : reasons) {
            String text = REASON_TEXT.get(reason);
            if (!existingLines.contains(text)) additions.add(text);
        }
        additions.sort();
        if (String.isBlank(current)) return String.join(additions, '\n');
        return additions.isEmpty() ? current : current + '\n' + String.join(additions, '\n');
    }

    private static void countWarning(Map<String, Integer> warnings, String key) {
        Integer prior = warnings.get(key);
        warnings.put(key, prior == null ? 1 : prior + 1);
    }
}
