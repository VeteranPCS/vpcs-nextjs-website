/**
 * @author KKnapp
 * @description Test class for AgentPortalReminderBatch.
 */
@IsTest
private class AgentPortalReminderBatchTest {

    @TestSetup
    static void setup() {
        RecordType personAccountRT = [
            SELECT Id FROM RecordType
            WHERE SObjectType = 'Account' AND IsPersonType = true
            LIMIT 1
        ];
        Account agent = new Account(
            RecordTypeId = personAccountRT.Id,
            FirstName = 'Test',
            LastName = 'Agent',
            PersonEmail = 'testagent@example.com',
            PersonMobilePhone = '5559998888'
        );
        insert agent;

        insert new Lead(
            FirstName = 'New',
            LastName = 'LeadOne',
            Company = 'VeteranPCS',
            Email = 'newlead@example.com',
            Phone = '5550001111',
            RecordTypeId = customerType(), Destination_State__c = 'VA', Status = 'New:_Not_Contacted',
            Agent__c = agent.Id,
            Agent_Email__c = 'testagent@example.com'
        );
    }

    @IsTest
    static void testReminderBatch() {
        Test.startTest();
        Database.executeBatch(new AgentPortalReminderBatch(), 200);
        Test.stopTest();
        Lead lead = [SELECT Last_Speed_To_Lead_Reminder__c, Speed_To_Lead_Reminder_Count__c FROM Lead WHERE LastName = 'LeadOne' LIMIT 1];
        System.assertNotEquals(null, lead.Last_Speed_To_Lead_Reminder__c, 'Reminder timestamp should be set');
        System.assertEquals(1, lead.Speed_To_Lead_Reminder_Count__c, 'Reminder count should increment to 1');
    }

    @IsTest
    static void testReminderBatchSkipsRecentlySent() {
        Lead lead = [SELECT Id FROM Lead WHERE LastName = 'LeadOne' LIMIT 1];
        lead.Last_Speed_To_Lead_Reminder__c = Datetime.now();
        update lead;

        Test.startTest();
        Database.executeBatch(new AgentPortalReminderBatch(), 200);
        Test.stopTest();

        Lead result = [SELECT Last_Speed_To_Lead_Reminder__c, Speed_To_Lead_Reminder_Count__c FROM Lead WHERE LastName = 'LeadOne' LIMIT 1];
        System.assert(result.Last_Speed_To_Lead_Reminder__c <= Datetime.now().addSeconds(5),
            'Timestamp should not have advanced since lead was sent to recently');
        System.assertEquals(null, result.Speed_To_Lead_Reminder_Count__c,
            'Reminder count should not increment when the batch skips a recently-sent lead');
    }

    @IsTest
    static void testReminderBatchSkipsLeadsWithoutAgent() {
        // Lead_BeforeUpsert never clears Agent_Email__c, so a lead whose agent was removed can keep
        // a stale address. It must not be reminded (it would get a portal link with no agentId).
        insert new Lead(
            FirstName = 'New',
            LastName = 'NoAgentLead',
            Company = 'VeteranPCS',
            Email = 'noagentlead@example.com',
            RecordTypeId = customerType(), Destination_State__c = 'VA', Status = 'New:_Not_Contacted',
            Agent_Email__c = 'formeragent@example.com'
        );

        Test.startTest();
        Database.executeBatch(new AgentPortalReminderBatch(), 200);
        Test.stopTest();

        Lead result = [SELECT Last_Speed_To_Lead_Reminder__c, Speed_To_Lead_Reminder_Count__c FROM Lead WHERE LastName = 'NoAgentLead' LIMIT 1];
        System.assertEquals(null, result.Last_Speed_To_Lead_Reminder__c, 'A lead with no agent should not be reminded');
        System.assertEquals(null, result.Speed_To_Lead_Reminder_Count__c, 'A lead with no agent should not advance toward Urgent');
    }

    @IsTest
    static void testReminderBatchIncludesAllAgents() {
        // The single-agent pilot gate was removed at org-wide rollout; every assigned agent's
        // unaccepted leads must be picked up, not just one hardcoded Account.
        RecordType personAccountRT = [
            SELECT Id FROM RecordType
            WHERE SObjectType = 'Account' AND IsPersonType = true
            LIMIT 1
        ];
        Account secondAgent = new Account(
            RecordTypeId = personAccountRT.Id,
            FirstName = 'Second',
            LastName = 'Agent',
            PersonEmail = 'secondagent@example.com',
            PersonMobilePhone = '5557776666'
        );
        insert secondAgent;

        insert new Lead(
            FirstName = 'New',
            LastName = 'LeadThree',
            Company = 'VeteranPCS',
            Email = 'newlead3@example.com',
            RecordTypeId = customerType(), Destination_State__c = 'VA', Status = 'New:_Not_Contacted',
            Agent__c = secondAgent.Id,
            Agent_Email__c = 'secondagent@example.com'
        );

        Test.startTest();
        Database.executeBatch(new AgentPortalReminderBatch(), 200);
        Test.stopTest();

        List<Lead> leads = [
            SELECT Speed_To_Lead_Reminder_Count__c FROM Lead
            WHERE LastName IN ('LeadOne', 'LeadThree')
        ];
        System.assertEquals(2, leads.size(), 'Both agents should have a lead');
        for (Lead l : leads) {
            System.assertEquals(1, l.Speed_To_Lead_Reminder_Count__c,
                'Every agent with an unaccepted lead should receive a reminder');
        }
        System.assertEquals(2, [SELECT COUNT() FROM SMS_Message_Queue__c],
            'Each agent with a phone number should be queued an SMS');
    }

    @IsTest
    static void testExecuteEscalatesToUrgentAfterMaxAttempts() {
        Lead lead = [
            SELECT Id, Name, RecordTypeId, Destination_State__c, Description, Additional_Comments__c, Agent_Email__c, Agent__c, Last_Speed_To_Lead_Reminder__c,
                   Speed_To_Lead_Reminder_Count__c, Agent__r.PersonMobilePhone, Agent__r.Phone
            FROM Lead WHERE LastName = 'LeadOne' LIMIT 1
        ];
        lead.Speed_To_Lead_Reminder_Count__c = 3;
        update lead;

        Test.startTest();
        new AgentPortalReminderBatch().execute(null, new List<Lead>{ lead });
        Test.stopTest();

        Lead result = [SELECT Status, Speed_To_Lead_Reminder_Count__c FROM Lead WHERE Id = :lead.Id];
        System.assertEquals('Urgent', result.Status, 'Lead should escalate to Urgent on the 4th batch-sent reminder');
        System.assertEquals(4, result.Speed_To_Lead_Reminder_Count__c, 'Reminder count should increment to 4');
    }

    @IsTest
    static void testReminderBatchQueuesSmsForAgent() {
        // GitHub issue #19: agents get an SMS alongside the reminder email, via
        // MessagingService.sendSmsInvocableAsync() (the shared SMS service handler).
        Account agent = [SELECT Id FROM Account WHERE PersonEmail = 'testagent@example.com' LIMIT 1];

        Test.startTest();
        Database.executeBatch(new AgentPortalReminderBatch(), 200);
        Test.stopTest();

        List<SMS_Message_Queue__c> queued = [
            SELECT To_Phone_Number__c, From_Phone_Number__c, Message__c
            FROM SMS_Message_Queue__c
        ];
        System.assertEquals(1, queued.size(), 'Should queue exactly 1 SMS for the agent');
        System.assertEquals('+15559998888', queued[0].To_Phone_Number__c, 'SMS should go to the agent mobile number');
        System.assertEquals('+17192494757', queued[0].From_Phone_Number__c, 'SMS should send from the regional admin number');
        System.assert(queued[0].Message__c.contains('NEW LEAD from VeteranPCS'), 'Message should contain the new-lead SMS copy');
        System.assert(queued[0].Message__c.contains('agent-portal?agentId=' + agent.Id), 'Message should contain the agent portal link');
    }

    @IsTest
    static void testReminderBatchSkipsSmsWhenAgentHasNoPhone() {
        RecordType personAccountRT = [
            SELECT Id FROM RecordType
            WHERE SObjectType = 'Account' AND IsPersonType = true
            LIMIT 1
        ];
        Account agentWithoutPhone = new Account(
            RecordTypeId = personAccountRT.Id,
            FirstName = 'NoPhone',
            LastName = 'Agent',
            PersonEmail = 'nophoneagent@example.com'
        );
        insert agentWithoutPhone;

        insert new Lead(
            FirstName = 'New',
            LastName = 'LeadTwo',
            Company = 'VeteranPCS',
            Email = 'newlead2@example.com',
            RecordTypeId = customerType(), Destination_State__c = 'VA', Status = 'New:_Not_Contacted',
            Agent__c = agentWithoutPhone.Id,
            Agent_Email__c = 'nophoneagent@example.com'
        );

        Test.startTest();
        Database.executeBatch(new AgentPortalReminderBatch(), 200);
        Test.stopTest();

        Lead reminded = [SELECT Speed_To_Lead_Reminder_Count__c FROM Lead WHERE LastName = 'LeadTwo' LIMIT 1];
        System.assertEquals(1, reminded.Speed_To_Lead_Reminder_Count__c,
            'The email reminder should still go out when the agent has no phone number on file');
        // Only the setup agent (who has a phone) should be texted.
        List<SMS_Message_Queue__c> queued = [SELECT To_Phone_Number__c FROM SMS_Message_Queue__c];
        System.assertEquals(1, queued.size(), 'No SMS should be queued for the agent with no phone number on file');
        System.assertEquals('+15559998888', queued[0].To_Phone_Number__c, 'The only SMS should go to the agent with a phone');
    }

    @IsTest
    static void testGetAdminOrgWideEmailAddressIdReturnsConfiguredAddress() {
        // Regression test for GitHub issue #13: without an explicit Org-Wide Email Address,
        // Messaging.sendEmail() falls back to sending "from" whichever user runs the batch
        // (e.g. whoever scheduled it) instead of admin@veteranpcs.com.
        Id result = AgentPortalReminderBatch.getAdminOrgWideEmailAddressId();
        System.assertNotEquals(null, result,
            'admin@veteranpcs.com should resolve to a configured Org-Wide Email Address');
    }

    @IsTest
    static void testExecuteDoesNotEscalateBelowMaxAttempts() {
        Lead lead = [
            SELECT Id, Name, RecordTypeId, Destination_State__c, Description, Additional_Comments__c, Agent_Email__c, Agent__c, Last_Speed_To_Lead_Reminder__c,
                   Speed_To_Lead_Reminder_Count__c, Agent__r.PersonMobilePhone, Agent__r.Phone
            FROM Lead WHERE LastName = 'LeadOne' LIMIT 1
        ];
        lead.Speed_To_Lead_Reminder_Count__c = 1;
        update lead;

        Test.startTest();
        new AgentPortalReminderBatch().execute(null, new List<Lead>{ lead });
        Test.stopTest();

        Lead result = [SELECT Status, Speed_To_Lead_Reminder_Count__c FROM Lead WHERE Id = :lead.Id];
        System.assertEquals('New:_Not_Contacted', result.Status, 'Lead should not escalate before reaching the max attempts');
        System.assertEquals(2, result.Speed_To_Lead_Reminder_Count__c, 'Reminder count should increment to 2');
    }

    private static Id customerType() {
        return Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
    }

    @IsTest
    static void nonCustomerRemindersRetainTheLegacyQueueAndCadence() {
        Lead fixture = [SELECT Agent__c FROM Lead WHERE LastName = 'LeadOne'];
        Id legacyType = Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Agent').getRecordTypeId();
        Lead onboarding = new Lead(RecordTypeId=legacyType, LastName='Synthetic Partner Onboarding',
            Company='VeteranPCS', Agent__c=fixture.Agent__c, Agent_Email__c='testagent@example.com',
            Status='New:_Not_Contacted');
        insert onboarding;

        Test.startTest();
        Database.executeBatch(new AgentPortalReminderBatch(), 200);
        Test.stopTest();

        Lead result = [
            SELECT Status, Speed_To_Lead_Reminder_Count__c, Last_Speed_To_Lead_Reminder__c
            FROM Lead WHERE Id=:onboarding.Id
        ];
        System.assertEquals('New:_Not_Contacted', result.Status);
        System.assertEquals(1, result.Speed_To_Lead_Reminder_Count__c);
        System.assertNotEquals(null, result.Last_Speed_To_Lead_Reminder__c);
        SMS_Message_Queue__c legacy = [
            SELECT Event_Key__c, Related_Lead__c, To_Phone_Number__c, From_Phone_Number__c
            FROM SMS_Message_Queue__c WHERE Event_Key__c = null
        ];
        System.assertEquals(null, legacy.Related_Lead__c);
        System.assertEquals('5559998888', legacy.To_Phone_Number__c);
        System.assertEquals('+17197825065', legacy.From_Phone_Number__c);
    }
}
