@IsTest
private class VpcsLeadSubmissionUniquenessTest {
    private static final String ATTEMPT_ID = '0e88083d-eef6-4f47-8774-579f8ff11cf4';

    private static Lead fixture(String name, String attemptId) {
        return new Lead(LastName = name, Company = 'VPCS Synthetic Submission Index',
            Status = 'Prospect', VPCS_Submission_ID__c = attemptId);
    }

    @IsTest
    static void uniqueIndexRejectsRepeatedAndCaseVariantIdsWhileAllowingBlankHistory() {
        Assert.isTrue(Lead.VPCS_Submission_ID__c.getDescribe().isUnique(),
            'Run after applying the scoped submission uniqueness field.');
        Lead original = fixture('Original submission', ATTEMPT_ID);
        insert as system original;

        List<Database.SaveResult> outcomes = Database.insert(new List<Lead>{
            fixture('Exact repeat', ATTEMPT_ID),
            fixture('Case variant', ATTEMPT_ID.toUpperCase()),
            fixture('Legacy blank one', null),
            fixture('Legacy blank two', null)
        }, false, AccessLevel.SYSTEM_MODE);
        for (Integer index = 0; index < 2; index++) {
            Assert.isFalse(outcomes[index].isSuccess());
            Assert.areEqual(StatusCode.DUPLICATE_VALUE, outcomes[index].getErrors()[0].getStatusCode());
        }
        Assert.isTrue(outcomes[2].isSuccess());
        Assert.isTrue(outcomes[3].isSuccess());

        List<Lead> matched = [
            SELECT Id FROM Lead WHERE VPCS_Submission_ID__c = :ATTEMPT_ID WITH SYSTEM_MODE
        ];
        Assert.areEqual(1, matched.size());
        Assert.areEqual(original.Id, matched[0].Id);
        Assert.areEqual(2, [SELECT COUNT() FROM Lead WHERE VPCS_Submission_ID__c = null WITH SYSTEM_MODE]);
        Assert.areEqual(0, [SELECT COUNT() FROM SMS_Message_Queue__c WITH SYSTEM_MODE]);
    }
}
