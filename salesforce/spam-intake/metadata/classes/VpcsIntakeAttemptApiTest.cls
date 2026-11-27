@IsTest
private class VpcsIntakeAttemptApiTest {
    private static final String ATTEMPT_ID = '0e88083d-eef6-4f47-8774-579f8ff11cf4';
    private static final String SECOND_ATTEMPT_ID = '14e5ae22-85e9-4a06-a5af-af4c685ab106';
    private static final String THIRD_ATTEMPT_ID = '8adbf705-23ca-4cc3-b634-a379d181c424';
    private static final String PAYLOAD_HASH = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    private static final String DIFFERENT_HASH = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

    @TestSetup
    static void createActors() {
        User allowed = websiteUser('intkall');
        User denied = websiteUser('intkden');
        insert new List<User>{allowed, denied};
        insert new PermissionSetAssignment(
            AssigneeId = allowed.Id,
            PermissionSetId = [SELECT Id FROM PermissionSet WHERE Name = 'VPCS_Intake_API' LIMIT 1].Id
        );
    }

    private static User websiteUser(String alias) {
        return new User(
            Alias = alias, LastName = 'VPCS Synthetic Intake', Email = alias + '@example.test',
            Username = UserInfo.getOrganizationId() + '.' + System.now().getTime() + '.' + alias + '@example.test',
            ProfileId = UserInfo.getProfileId(), TimeZoneSidKey = 'America/Denver',
            LocaleSidKey = 'en_US', EmailEncodingKey = 'UTF-8', LanguageLocaleKey = 'en_US'
        );
    }

    private static User websiteUserByAlias(String alias) {
        return [SELECT Id FROM User WHERE Alias = :alias AND LastName = 'VPCS Synthetic Intake' LIMIT 1];
    }

    private static Map<String, Object> call(String operation, String body, Integer expectedStatus) {
        RestRequest request = new RestRequest();
        request.requestURI = '/services/apexrest/vpcs/intake/v1/' + operation;
        request.httpMethod = 'POST';
        request.requestBody = Blob.valueOf(body);
        RestContext.request = request;
        RestContext.response = new RestResponse();
        VpcsIntakeAttemptApi.execute();
        Assert.areEqual(expectedStatus, RestContext.response.statusCode);
        Assert.areEqual('no-store', RestContext.response.headers.get('Cache-Control'));
        return (Map<String, Object>)JSON.deserializeUntyped(RestContext.response.responseBody.toString());
    }

    private static String attemptBody(String attemptId, String payloadHash, String emailHash) {
        Map<String, Object> body = new Map<String, Object>{'attemptId' => attemptId, 'payloadHash' => payloadHash};
        if (emailHash != null) {
            body.put('emailHash', emailHash);
        }
        return JSON.serialize(body);
    }

    private static String denyBody(String attemptId, String payloadHash) {
        return JSON.serialize(new Map<String, Object>{
            'attemptId' => attemptId, 'payloadHash' => payloadHash, 'denyDispatch' => true
        });
    }

    @IsTest
    static void deniesUnauthorizedCallerAndBoundsInput() {
        System.runAs(websiteUserByAlias('intkden')) {
            Assert.areEqual('forbidden', call('policy', '{}', 403).get('code'));
            Assert.areEqual('forbidden', call('claim', attemptBody(ATTEMPT_ID, PAYLOAD_HASH, null), 403).get('code'));
        }
        System.runAs(websiteUserByAlias('intkall')) {
            call('policy', '[]', 400);
            call('policy', '{"emailHash":"plain@example.test"}', 400);
            call('policy', '{"extra":"value"}', 400);
            call('policy', '{"denyDispatch":false}', 400);
            call('claim', attemptBody('anything', PAYLOAD_HASH, null), 400);
            call('claim', attemptBody(ATTEMPT_ID, 'a', null), 400);
            call('reconcile/extra', attemptBody(ATTEMPT_ID, PAYLOAD_HASH, null), 400);
            call('reconcile', attemptBody(ATTEMPT_ID, PAYLOAD_HASH, PAYLOAD_HASH), 400);
            call('inspect', denyBody(ATTEMPT_ID, PAYLOAD_HASH), 400);
            call('reconcile', denyBody(ATTEMPT_ID, PAYLOAD_HASH), 400);
            call('notification', denyBody(ATTEMPT_ID, PAYLOAD_HASH), 400);
        }
        Assert.areEqual(0, [SELECT COUNT() FROM Vpcs_Intake_Attempt__c WITH SYSTEM_MODE]);
    }

    @IsTest
    static void checksCurrentPolicyWithoutExposingRowsOrRevivingPreviouslyClaimedAttempts() {
        String emailHash = VpcsLeadEmailAdmission.canonicalEmailHash('synthetic-policy@example.test');
        String policyBody = JSON.serialize(new Map<String, Object>{'emailHash' => emailHash});
        String body = attemptBody(ATTEMPT_ID, PAYLOAD_HASH, emailHash);
        String secondBody = attemptBody(SECOND_ATTEMPT_ID, PAYLOAD_HASH, emailHash);
        User caller = websiteUserByAlias('intkall');
        System.runAs(caller) {
            Map<String, Object> policy = call('policy', policyBody, 200);
            Assert.areEqual(new Set<String>{'blocked', 'policyVersion'}, policy.keySet());
            Assert.areEqual('r1', policy.get('policyVersion'));
            Assert.areEqual(false, policy.get('blocked'));
            Assert.areEqual(true, call('claim', body, 200).get('claimed'));
        }

        Vpcs_Blocked_Email__c entry = new Vpcs_Blocked_Email__c(
            Email_Hash__c = emailHash, Active__c = true, Reason__c = 'Synthetic stale allow'
        );
        insert as system entry;
        System.runAs(caller) {
            Assert.areEqual(true, call('policy', policyBody, 200).get('blocked'));
            Assert.areEqual(true, call('claim', secondBody, 200).get('blocked'));
            Assert.areEqual(true, call('inspect', attemptBody(ATTEMPT_ID, PAYLOAD_HASH, null), 200).get('exists'));
            Map<String, Object> prior = call('claim', body, 200);
            Assert.areEqual(false, prior.get('claimed'));
            Assert.areEqual(false, prior.get('blocked'));
        }

        entry.Active__c = false;
        update as system entry;
        System.runAs(caller) {
            Assert.areEqual(false, call('policy', policyBody, 200).get('blocked'));
            Assert.areEqual(new Map<String, Object>{'claimed' => false, 'blocked' => true},
                call('claim', secondBody, 200));
            Assert.areEqual(new Map<String, Object>{'exists' => true, 'confirmed' => false, 'declined' => true},
                call('inspect', attemptBody(SECOND_ATTEMPT_ID, PAYLOAD_HASH, null), 200));
            Assert.areEqual(true, call('claim', attemptBody(THIRD_ATTEMPT_ID, PAYLOAD_HASH, emailHash), 200).get('claimed'));
        }
    }

    @IsTest
    static void firstAllowOrDenyDispositionWinsAndDeclinedCannotReconcile() {
        String first = attemptBody(ATTEMPT_ID, PAYLOAD_HASH, null);
        String second = attemptBody(SECOND_ATTEMPT_ID, PAYLOAD_HASH, null);
        User caller = websiteUserByAlias('intkall');
        System.runAs(caller) {
            Assert.areEqual(new Map<String, Object>{'exists' => false, 'confirmed' => false, 'declined' => false},
                call('inspect', first, 200));
            Assert.areEqual(new Map<String, Object>{'claimed' => false, 'blocked' => true},
                call('claim', denyBody(ATTEMPT_ID, PAYLOAD_HASH), 200));
            Assert.areEqual(new Map<String, Object>{'claimed' => false, 'blocked' => true},
                call('claim', first, 200));
            Assert.areEqual('attempt_conflict', call('claim', denyBody(ATTEMPT_ID, DIFFERENT_HASH), 409).get('code'));

            Assert.areEqual(new Map<String, Object>{'claimed' => true, 'blocked' => false},
                call('claim', second, 200));
            Assert.areEqual(new Map<String, Object>{'claimed' => false, 'blocked' => false},
                call('claim', denyBody(SECOND_ATTEMPT_ID, PAYLOAD_HASH), 200));
            Assert.areEqual(new Map<String, Object>{'exists' => true, 'confirmed' => false, 'declined' => false},
                call('inspect', second, 200));
        }

        Lead matching = new Lead(LastName = 'VPCS Synthetic Declined Attempt', Company = 'Synthetic',
            Status = 'Prospect', VPCS_Submission_ID__c = ATTEMPT_ID, VPCS_Submission_Hash__c = PAYLOAD_HASH);
        insert as system matching;
        System.runAs(caller) {
            Assert.areEqual(false, call('reconcile', first, 200).get('confirmed'));
            Assert.areEqual(false, call('notification', first, 200).get('claimed'));
        }
        Vpcs_Intake_Attempt__c stored = [
            SELECT State__c, Related_Lead__c, Website_Notification_Claimed__c
            FROM Vpcs_Intake_Attempt__c WHERE Attempt_Key__c = :ATTEMPT_ID WITH SYSTEM_MODE
        ];
        Assert.areEqual('Declined', stored.State__c);
        Assert.isNull(stored.Related_Lead__c);
        Assert.isFalse(stored.Website_Notification_Claimed__c);
    }

    @IsTest
    static void dispatchAndNotificationAreEachReservedOnceWithExactLeadReadback() {
        String body = attemptBody(ATTEMPT_ID, PAYLOAD_HASH, null);
        String conflicting = attemptBody(ATTEMPT_ID, DIFFERENT_HASH, null);
        User caller = websiteUserByAlias('intkall');
        System.runAs(caller) {
            Assert.areEqual(false, call('inspect', body, 200).get('exists'));
            Assert.areEqual(false, call('reconcile', body, 200).get('confirmed'));
            Assert.areEqual(true, call('claim', body, 200).get('claimed'));
            Assert.areEqual(false, call('claim', body, 200).get('claimed'));
            Assert.areEqual(false, call('inspect', body, 200).get('confirmed'));
            Assert.areEqual('attempt_conflict', call('inspect', conflicting, 409).get('code'));
            Assert.areEqual('attempt_conflict', call('claim', conflicting, 409).get('code'));
            Assert.areEqual('attempt_conflict', call('reconcile', conflicting, 409).get('code'));
            Assert.areEqual(false, call('reconcile', body, 200).get('confirmed'));
            Assert.areEqual(false, call('notification', body, 200).get('claimed'));
        }

        Lead persisted = new Lead(LastName = 'VPCS Synthetic Attempt', Company = 'Synthetic',
            Status = 'Prospect', VPCS_Submission_ID__c = ATTEMPT_ID, VPCS_Submission_Hash__c = DIFFERENT_HASH);
        insert as system persisted;
        System.runAs(caller) {
            Assert.areEqual(false, call('reconcile', body, 200).get('confirmed'));
        }

        persisted.VPCS_Submission_Hash__c = PAYLOAD_HASH;
        update as system persisted;
        System.runAs(caller) {
            Assert.areEqual(false, call('notification', body, 200).get('claimed'));
            Assert.areEqual(true, call('reconcile', body, 200).get('confirmed'));
            Assert.areEqual(true, call('reconcile', body, 200).get('confirmed'));
            Assert.areEqual(true, call('inspect', body, 200).get('confirmed'));
            Assert.areEqual(true, call('notification', body, 200).get('claimed'));
            Assert.areEqual(false, call('notification', body, 200).get('claimed'));
            Assert.areEqual(false, call('claim', body, 200).get('claimed'));
        }
        Vpcs_Intake_Attempt__c stored = [
            SELECT State__c, Related_Lead__c, Website_Notification_Claimed__c
            FROM Vpcs_Intake_Attempt__c WHERE Attempt_Key__c = :ATTEMPT_ID WITH SYSTEM_MODE
        ];
        Assert.areEqual('Confirmed', stored.State__c);
        Assert.areEqual(persisted.Id, stored.Related_Lead__c);
        Assert.isTrue(stored.Website_Notification_Claimed__c);

        delete as system persisted;
        System.runAs(caller) {
            Assert.areEqual(true, call('inspect', body, 200).get('confirmed'));
            Assert.areEqual(false, call('reconcile', body, 200).get('confirmed'));
            Assert.areEqual(false, call('notification', body, 200).get('claimed'));
        }
    }
}
