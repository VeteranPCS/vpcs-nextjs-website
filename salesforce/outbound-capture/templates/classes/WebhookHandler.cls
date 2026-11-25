public class WebhookHandler {
    @future
    public static void sendRevalidation(String accountId, Boolean isLender, Boolean isAgent) {
        captureRevalidation(accountId, isLender, isAgent);
    }

    @TestVisible
    private static void captureRevalidation(String accountId, Boolean isLender, Boolean isAgent) {
        if (String.isBlank(accountId) || (isLender != true && isAgent != true)) return;

        // This class is generated only for the WebDev package. It has no endpoint,
        // credential, or HTTP path, even if the package is used incorrectly.
        WebdevOutboundCapture.record(WebdevOutboundCapture.Action.AccountRevalidation, 1);
    }
}
