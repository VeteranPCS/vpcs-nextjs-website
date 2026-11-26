// WebDev only. Run after the deployed capture and scheduler tests pass:
// sf apex run --target-org vpcs-webdev --file salesforce/scripts/restore-webdev-schedules.apex
// Production definitions were read in Setup on 2026-11-25; their owner uses America/Denver.
// These preserve the existing cadence. Working-hours changes are a separate release.
Organization org = [SELECT Id, IsSandbox FROM Organization LIMIT 1];
System.assertEquals('00Djg000000EK8YEAW', String.valueOf(org.Id), 'Wrong organization');
System.assertEquals(true, org.IsSandbox, 'A sandbox is required');
Id schedulingUserId = '0054x000008x6NqAAI';
System.assertEquals(schedulingUserId, (Id) UserInfo.getUserId(), 'Use the verified WebDev scheduling user');
System.assertEquals('America/Denver', UserInfo.getTimeZone().getID(), 'Use the verified scheduling timezone');
System.assertEquals(WebdevOutboundCapture.Mode.Capture, WebdevOutboundCapture.mode(), 'Outbound capture is required');
System.assertEquals('baseline-capture', Label.VPCS_Webdev_Capture_Run_Id, 'Do not overlap an active test run');
System.assertEquals(0, [SELECT COUNT() FROM Lead WHERE Status = 'New:_Not_Contacted'
    AND Agent__c != null AND Agent_Email__c != null], 'Reconcile eligible records before restoring schedules');

Map<String, String> expected = new Map<String, String>{
    'Speed-to-Lead Reminder 0 (AgentPortalReminderScheduler)' => '0 0 * * * ? *',
    'Speed-to-Lead Reminder 15 (AgentPortalReminderScheduler)' => '0 15 * * * ? *',
    'Speed-to-Lead Reminder 30 (AgentPortalReminderScheduler)' => '0 30 * * * ? *',
    'Speed-to-Lead Reminder 45 (AgentPortalReminderScheduler)' => '0 45 * * * ? *',
    'OpenPhone Populate Senders' => '0 30 0 * * ?',
    'OpenPhone Populate Senders Hourly' => '0 5 * * * ?'
};
Map<String, CronTrigger> existing = new Map<String, CronTrigger>();
for (CronTrigger job : [SELECT Id, OwnerId, CronJobDetail.Name, CronJobDetail.JobType,
    CronExpression, TimeZoneSidKey, State FROM CronTrigger WHERE CronJobDetail.Name IN :expected.keySet()]) {
    String name = job.CronJobDetail.Name;
    System.assertEquals(false, existing.containsKey(name), 'Duplicate schedule: ' + name);
    System.assertEquals('7', job.CronJobDetail.JobType, 'Unexpected job type: ' + name);
    System.assertEquals(schedulingUserId, job.OwnerId, 'Existing owner differs: ' + name);
    System.assertEquals(expected.get(name), job.CronExpression, 'Existing cadence differs: ' + name);
    System.assertEquals('America/Denver', job.TimeZoneSidKey, 'Existing timezone differs: ' + name);
    System.assertEquals('WAITING', job.State, 'Reconcile an existing nonwaiting job: ' + name);
    existing.put(name, job);
}
for (String name : expected.keySet()) {
    if (existing.containsKey(name)) continue;
    Schedulable worker = name.startsWith('Speed-to-Lead Reminder')
        ? (Schedulable) new AgentPortalReminderScheduler()
        : (Schedulable) new OpenPhonePopulateSendersSchedulable();
    Id jobId = System.schedule(name, expected.get(name), worker);
    System.debug(LoggingLevel.INFO, 'WEBDEV_SCHEDULE_RESTORED ' + name + ' ' + jobId);
}
