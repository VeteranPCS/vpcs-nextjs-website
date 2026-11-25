@IsTest
private class WebhookHandlerCanaryTest {
    private static final String ACCOUNT_ID = '001jg000000V70U';
    private static final Long NOW_MS = 1795636800000L;

    private class CallbackResponse implements HttpCalloutMock {
        private Integer statusCode;
        private Integer callCount = 0;

        CallbackResponse(Integer statusCode) {
            this.statusCode = statusCode;
        }

        public HttpResponse respond(HttpRequest request) {
            callCount++;
            System.assertEquals(1, callCount, 'Must make only one request per trigger event');
            System.assertEquals('callout:VPCS_Webdev_Callback/api/v1/revalidate/salesforce', request.getEndpoint());
            System.assertEquals('POST', request.getMethod());
            System.assertEquals(Label.VPCS_Webdev_Capture_Run_Id, request.getHeader('X-VPCS-Callback-Run'));
            System.assertEquals(ACCOUNT_ID, ((Map<String,Object>) JSON.deserializeUntyped(request.getBody())).get('accountId'));
            HttpResponse response = new HttpResponse();
            response.setStatusCode(statusCode);
            response.setHeader('Location', 'https://unused.example.invalid');
            return response;
        }
    }

    private static void process(String accountId, String runId) {
        WebhookHandler.processRevalidation(accountId, false, true, runId, NOW_MS - 1000, NOW_MS + 1000, NOW_MS);
    }

    private static Integer captures() {
        return [SELECT COUNT() FROM Webdev_Outbound_Capture__c WHERE Action__c = 'AccountRevalidation'];
    }

    @IsTest
    static void deniesNonCanaryEventsAndWrongOriginBeforeHttp() {
        CallbackResponse mock = new CallbackResponse(200);
        Test.setMock(HttpCalloutMock.class, mock);
        WebdevOutboundCapture.testMode = WebdevOutboundCapture.Mode.Capture;
        WebhookHandler.testCredentialOrigin = 'https://other.example.invalid';
        process(ACCOUNT_ID, Label.VPCS_Webdev_Capture_Run_Id);
        process('001000000000001', Label.VPCS_Webdev_Capture_Run_Id);
        process(ACCOUNT_ID, '');
        System.assertEquals(0, mock.callCount);
        System.assertEquals(3, captures());
    }

    @IsTest
    static void deniesProductionAndUnknownOrgBeforeHttp() {
        CallbackResponse mock = new CallbackResponse(200);
        Test.setMock(HttpCalloutMock.class, mock);
        WebhookHandler.testCredentialOrigin = 'https://test.veteranpcs.com';
        WebdevOutboundCapture.testMode = WebdevOutboundCapture.Mode.Production;
        process(ACCOUNT_ID, Label.VPCS_Webdev_Capture_Run_Id);
        WebdevOutboundCapture.testMode = WebdevOutboundCapture.Mode.Blocked;
        process(ACCOUNT_ID, Label.VPCS_Webdev_Capture_Run_Id);
        System.assertEquals(0, mock.callCount);
        System.assertEquals(0, captures());
    }

    private static void assertSinglePost(Integer status) {
        CallbackResponse mock = new CallbackResponse(status);
        Test.setMock(HttpCalloutMock.class, mock);
        WebhookHandler.testCredentialOrigin = 'https://test.veteranpcs.com';
        WebdevOutboundCapture.testMode = WebdevOutboundCapture.Mode.Capture;
        process(ACCOUNT_ID, Label.VPCS_Webdev_Capture_Run_Id);
        System.assertEquals(1, mock.callCount);
        System.assertEquals(0, captures());
    }

    @IsTest
    static void permitsOnePost() {
        assertSinglePost(200);
    }

    @IsTest
    static void doesNotFollowRedirectOrRetryFailure() {
        assertSinglePost(302);
        assertSinglePost(503);
    }

    @IsTest
    static void windowEnforcesMarkerAndBounds() {
        System.assert(WebhookHandler.isOpen('run', 'run', NOW_MS, NOW_MS + 1800000, NOW_MS));
        System.assert(!WebhookHandler.isOpen('run', 'RUN', NOW_MS, NOW_MS + 1800000, NOW_MS));
        System.assert(!WebhookHandler.isOpen('run', 'run', NOW_MS, NOW_MS + 1800001, NOW_MS));
        System.assert(!WebhookHandler.isOpen('run', 'run', NOW_MS, NOW_MS + 1000, NOW_MS - 1));
        System.assert(!WebhookHandler.isOpen('run', 'run', NOW_MS - 1000, NOW_MS, NOW_MS));
    }
}
