// Temporary WebDev-only adapter. The offline builder writes a bounded window.
// Do not deploy this class to another org or change the production handler.
public class WebhookHandler {
    private static final String FIXTURE_ID = '001jg000000V70U';
    private static final String EXPECTED_ORIGIN = 'https://test.veteranpcs.com';
    private static final String CREDENTIAL = 'VPCS_Webdev_Callback';
    private static final String PATH = '/api/v1/revalidate/salesforce';
    private static final String RUN_ID = '';
    private static final Long START_MS = 0L;
    private static final Long END_MS = 0L;
    @TestVisible private static String testCredentialOrigin;

    @future(callout=true)
    public static void sendRevalidation(String accountId, Boolean isLender, Boolean isAgent) {
        processRevalidation(accountId, isLender, isAgent, RUN_ID, START_MS, END_MS, Datetime.now().getTime());
    }

    // Keep the existing capture method so the baseline capture tests remain valid.
    @TestVisible
    private static void captureRevalidation(String accountId, Boolean isLender, Boolean isAgent) {
        if (String.isBlank(accountId) || (isLender != true && isAgent != true)) return;
        WebdevOutboundCapture.record(WebdevOutboundCapture.Action.AccountRevalidation, 1);
    }

    @TestVisible
    private static void processRevalidation(
        String accountId, Boolean isLender, Boolean isAgent, String runId,
        Long startMs, Long endMs, Long nowMs
    ) {
        if (WebdevOutboundCapture.mode() != WebdevOutboundCapture.Mode.Capture ||
            String.isBlank(accountId) || (isLender != true && isAgent != true)) return;

        if (isAgent != true || !FIXTURE_ID.equals(accountId) ||
            !isOpen(runId, Label.VPCS_Webdev_Capture_Run_Id, startMs, endMs, nowMs)) {
            captureRevalidation(accountId, isLender, isAgent);
            return;
        }

        String origin = getCredentialOrigin();
        if (!EXPECTED_ORIGIN.equals(origin) || (!Test.isRunningTest() && Datetime.now().getTime() >= endMs)) {
            System.debug(LoggingLevel.WARN, 'VPCS_WEBDEV_CALLBACK blocked_destination_or_window run=' + runId);
            captureRevalidation(accountId, isLender, isAgent);
            return;
        }

        try {
            HttpRequest request = new HttpRequest();
            request.setEndpoint('callout:' + CREDENTIAL + PATH);
            request.setMethod('POST');
            request.setTimeout(5000);
            request.setHeader('Content-Type', 'application/json');
            request.setHeader('X-VPCS-Callback-Run', runId);
            request.setBody(JSON.serialize(new Map<String, String>{ 'accountId' => accountId }));
            // Both authentication headers come from the encrypted external credential.
            // Do not follow 3xx or retry a failed/ambiguous call.
            HttpResponse response = new Http().send(request);
            System.debug(LoggingLevel.WARN, 'VPCS_WEBDEV_CALLBACK status=' + response.getStatusCode() + ' run=' + runId);
        } catch (Exception ignored) {
            System.debug(LoggingLevel.WARN, 'VPCS_WEBDEV_CALLBACK failed run=' + runId);
        }
    }

    private static String getCredentialOrigin() {
        if (Test.isRunningTest()) return testCredentialOrigin;
        try {
            return ConnectApi.NamedCredentials.getNamedCredential(CREDENTIAL).calloutUrl;
        } catch (Exception ignored) {
            return null;
        }
    }

    @TestVisible
    private static Boolean isOpen(String runId, String captureRun, Long startMs, Long endMs, Long nowMs) {
        return !String.isBlank(runId) && Pattern.matches('[A-Za-z0-9_-]{1,64}', runId) &&
            runId.equals(captureRun) && startMs <= nowMs && nowMs < endMs &&
            endMs - startMs <= 1800000L;
    }
}
