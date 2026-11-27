@RestResource(urlMapping='/vpcs/intake/v1/*')
global without sharing class VpcsIntakeAttemptApi {
    private static final String POLICY_VERSION = 'r1';
    private static final String ROOT = '/vpcs/intake/v1/';
    private static final Pattern HASH = Pattern.compile('[0-9a-f]{64}');
    private static final Pattern ATTEMPT_ID = Pattern.compile(
        '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
    );

    private class IntakeRequest {
        public String attemptId;
        public String payloadHash;
        public String emailHash;
        public Boolean denyDispatch;
    }

    @HttpPost
    global static void execute() {
        RestContext.response.addHeader('Cache-Control', 'no-store');
        RestContext.response.addHeader('Content-Type', 'application/json');
        if (!FeatureManagement.checkPermission('VPCS_Intake_API')) {
            respond(403, new Map<String, Object>{'code' => 'forbidden'});
            return;
        }

        RestRequest request = RestContext.request;
        if (request.requestBody == null || request.requestBody.size() > 512) {
            invalidRequest();
            return;
        }
        IntakeRequest input;
        try {
            input = (IntakeRequest)JSON.deserializeStrict(request.requestBody.toString(), IntakeRequest.class);
        } catch (Exception badInput) {
            invalidRequest();
            return;
        }
        if (input == null || (input.emailHash != null && !HASH.matcher(input.emailHash).matches())) {
            invalidRequest();
            return;
        }

        String operation = request.requestURI.substringAfter(ROOT);
        if (!operation.equals('claim') && input.denyDispatch != null) {
            invalidRequest();
            return;
        }
        if (operation.equals('policy')) {
            if (input.attemptId != null || input.payloadHash != null) {
                invalidRequest();
                return;
            }
            respond(200, new Map<String, Object>{'blocked' => isBlocked(input.emailHash),
                'policyVersion' => POLICY_VERSION});
            return;
        }
        if (input.attemptId == null || !ATTEMPT_ID.matcher(input.attemptId).matches() ||
            input.payloadHash == null || !HASH.matcher(input.payloadHash).matches()) {
            invalidRequest();
            return;
        }
        if (operation.equals('claim')) {
            claim(input);
        } else if (operation.equals('inspect') && input.emailHash == null) {
            inspect(input);
        } else if ((operation.equals('reconcile') || operation.equals('notification')) && input.emailHash == null) {
            settle(input, operation.equals('notification'));
        } else {
            invalidRequest();
        }
    }

    private static void claim(IntakeRequest input) {
        Boolean declined = input.denyDispatch == true || isBlocked(input.emailHash);
        // Dispatch and denial must compete on the same unique key. Neither
        // disposition expires or changes when the policy changes.
        Vpcs_Intake_Attempt__c attempt = new Vpcs_Intake_Attempt__c(
            Attempt_Key__c = input.attemptId,
            Payload_Hash__c = input.payloadHash,
            State__c = declined ? 'Declined' : 'Claimed'
        );
        Database.SaveResult result = Database.insert(attempt, false, AccessLevel.SYSTEM_MODE);
        if (!result.isSuccess()) {
            if (result.getErrors()[0].getStatusCode() != StatusCode.DUPLICATE_VALUE) {
                unavailable();
                return;
            }
            attempt = readAttempt(input.attemptId, false);
            if (attempt == null) {
                unavailable();
                return;
            }
            priorClaim(input, attempt);
            return;
        }
        respond(200, new Map<String, Object>{'claimed' => !declined, 'blocked' => declined});
    }

    private static void priorClaim(IntakeRequest input, Vpcs_Intake_Attempt__c attempt) {
        if (!input.payloadHash.equals(attempt.Payload_Hash__c)) {
            conflict();
            return;
        }
        respond(200, new Map<String, Object>{'claimed' => false, 'blocked' => 'Declined'.equals(attempt.State__c)});
    }

    private static void inspect(IntakeRequest input) {
        Vpcs_Intake_Attempt__c attempt = readAttempt(input.attemptId, false);
        if (attempt != null && !input.payloadHash.equals(attempt.Payload_Hash__c)) {
            conflict();
            return;
        }
        respond(200, new Map<String, Object>{'exists' => attempt != null,
            'confirmed' => attempt != null && 'Confirmed'.equals(attempt.State__c),
            'declined' => attempt != null && 'Declined'.equals(attempt.State__c)});
    }

    private static void settle(IntakeRequest input, Boolean takeNotification) {
        // Both transitions serialize on the same unique attempt row.
        Vpcs_Intake_Attempt__c attempt = readAttempt(input.attemptId, true);
        String resultKey = takeNotification ? 'claimed' : 'confirmed';
        if (attempt == null) {
            respond(200, new Map<String, Object>{resultKey => false});
            return;
        }
        if (!input.payloadHash.equals(attempt.Payload_Hash__c)) {
            conflict();
            return;
        }
        Boolean wasConfirmed = 'Confirmed'.equals(attempt.State__c);
        // A deleted Lead clears the lookup. A historical confirmation must
        // never be rebound to a different Lead, even after the old ID is free.
        if ('Declined'.equals(attempt.State__c) || (wasConfirmed && attempt.Related_Lead__c == null) ||
            (takeNotification && (!wasConfirmed || attempt.Website_Notification_Claimed__c))) {
            respond(200, new Map<String, Object>{resultKey => false});
            return;
        }

        // Until the unique Lead index is activated, ambiguity must fail closed.
        List<Lead> matches = [
            SELECT Id, VPCS_Submission_ID__c, VPCS_Submission_Hash__c
            FROM Lead
            WHERE VPCS_Submission_ID__c = :input.attemptId
            WITH SYSTEM_MODE LIMIT 2
        ];
        if (matches.size() != 1 || !input.attemptId.equals(matches[0].VPCS_Submission_ID__c) ||
            !attempt.Payload_Hash__c.equals(matches[0].VPCS_Submission_Hash__c) ||
            (attempt.Related_Lead__c != null && attempt.Related_Lead__c != matches[0].Id)) {
            respond(200, new Map<String, Object>{resultKey => false});
            return;
        }
        if (takeNotification) {
            attempt.Website_Notification_Claimed__c = true;
            update as system attempt;
        } else if (!wasConfirmed) {
            attempt.State__c = 'Confirmed';
            attempt.Related_Lead__c = matches[0].Id;
            update as system attempt;
        }
        respond(200, new Map<String, Object>{resultKey => true});
    }

    private static Vpcs_Intake_Attempt__c readAttempt(String attemptId, Boolean lockRow) {
        List<Vpcs_Intake_Attempt__c> matches;
        if (lockRow) {
            matches = [
                SELECT Payload_Hash__c, State__c, Related_Lead__c, Website_Notification_Claimed__c
                FROM Vpcs_Intake_Attempt__c
                WHERE Attempt_Key__c = :attemptId
                WITH SYSTEM_MODE LIMIT 1 FOR UPDATE
            ];
        } else {
            matches = [
                SELECT Payload_Hash__c, State__c FROM Vpcs_Intake_Attempt__c
                WHERE Attempt_Key__c = :attemptId
                WITH SYSTEM_MODE LIMIT 1
            ];
        }
        return matches.isEmpty() ? null : matches[0];
    }

    private static Boolean isBlocked(String emailHash) {
        return emailHash != null &&
            VpcsLeadEmailAdmission.activeHashes(new Set<String>{emailHash}).contains(emailHash);
    }

    private static void conflict() {
        respond(409, new Map<String, Object>{'code' => 'attempt_conflict'});
    }

    private static void unavailable() {
        respond(503, new Map<String, Object>{'code' => 'unavailable'});
    }

    private static void invalidRequest() {
        respond(400, new Map<String, Object>{'code' => 'invalid_request'});
    }

    private static void respond(Integer status, Map<String, Object> body) {
        RestContext.response.statusCode = status;
        RestContext.response.responseBody = Blob.valueOf(JSON.serialize(body));
    }
}
