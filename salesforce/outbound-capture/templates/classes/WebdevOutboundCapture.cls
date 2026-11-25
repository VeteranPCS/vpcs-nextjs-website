public without sharing class WebdevOutboundCapture {
    private static final String WEBDEV_ORG = '00Djg000000EK8YEAW';
    private static final String PRODUCTION_ORG = '00D4x000003yaV2';
    public static final String CAPTURED = 'Captured';
    public static final String BLOCKED = 'SandboxBlocked';

    public enum Mode { Production, Capture, Blocked }
    public enum Action { Sms, SenderRegistry, AccountRevalidation, ReminderEmail }

    private static Mode detectedMode;
    @TestVisible private static Mode testMode;

    @TestVisible
    private static Mode classify(String orgId, Boolean sandbox) {
        if (sandbox == true && WEBDEV_ORG.equals(orgId)) return Mode.Capture;
        if (sandbox == false && orgId != null &&
            (orgId.length() == 15 || orgId.length() == 18) && PRODUCTION_ORG.equals(orgId.substring(0, 15))) {
            return Mode.Production;
        }
        return Mode.Blocked;
    }

    public static Mode mode() {
        if (Test.isRunningTest() && testMode != null) return testMode;
        if (detectedMode == null) {
            try {
                Organization currentOrg = [SELECT Id, IsSandbox FROM Organization LIMIT 1];
                detectedMode = classify(String.valueOf(currentOrg.Id), currentOrg.IsSandbox);
            } catch (Exception ignored) {
                detectedMode = Mode.Blocked;
            }
        }
        return detectedMode;
    }

    public static Mode messagingMode() {
        // Existing messaging tests use provider mocks to characterize production.
        // The capture suite sets an explicit mode. This default is test-runtime only.
        return Test.isRunningTest() && testMode == null ? Mode.Production : mode();
    }

    public static void record(Action action, Integer itemCount) {
        if (mode() != Mode.Capture || action == null || itemCount == null || itemCount < 0) return;

        String runId = Label.VPCS_Webdev_Capture_Run_Id;
        if (String.isBlank(runId) || !Pattern.matches('[A-Za-z0-9_-]{1,64}', runId)) runId = 'baseline-capture';
        String actionName = String.valueOf(action);
        // Digest input is limited to audit metadata. It excludes recipients, records, and message content.
        String nonce = EncodingUtil.convertToHex(Crypto.generateAesKey(128));
        String digest = EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256', Blob.valueOf(
            runId + '|' + actionName + '|' + itemCount + '|' + nonce
        )));
        insert new Webdev_Outbound_Capture__c(
            Run_Id__c = runId,
            Action__c = actionName,
            Item_Count__c = itemCount,
            Digest__c = digest
        );
    }
}
