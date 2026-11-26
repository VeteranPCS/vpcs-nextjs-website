@IsTest
private class VpcsLeadEmailAdmissionTest {
    private static final String BLOCKED = 'vpcs.admission.fixture@gmail.com';
    private static final String ALIAS = 'VpcsAdmissionFixture+synthetic@gmail.com';

    private static Lead fixture(String name, String email) {
        return new Lead(LastName = name, Company = 'VPCS Synthetic Admission',
            Status = 'Prospect', Email = email);
    }

    private static Vpcs_Blocked_Email__c block(String email, Boolean active) {
        return new Vpcs_Blocked_Email__c(
            Email_Hash__c = VpcsLeadEmailAdmission.canonicalEmailHash(email),
            Active__c = active, Reason__c = 'Synthetic admission test'
        );
    }

    @IsTest
    static void canonicalizesSharedIdentityVectors() {
        StaticResource vectorFile = [
            SELECT Body FROM StaticResource WHERE Name = 'VpcsSpamIdentityVectors' LIMIT 1
        ];
        for (Object value : (List<Object>)JSON.deserializeUntyped(vectorFile.Body.toString())) {
            Map<String, Object> vector = (Map<String, Object>)value;
            String canonical = (String)vector.get('canonical');
            String hash = canonical == null ? null : EncodingUtil.convertToHex(
                Crypto.generateDigest('SHA-256', Blob.valueOf(canonical))
            );
            System.assertEquals(hash, VpcsLeadEmailAdmission.canonicalEmailHash((String)vector.get('input')),
                (String)vector.get('label'));
        }
    }

    @IsTest
    static void queriesOnceForTwoHundredDistinctKeys() {
        Vpcs_Blocked_Email__c entry = block(BLOCKED, true);
        insert as system entry;
        List<Lead> records = new List<Lead>{fixture('Blocked alias', ALIAS)};
        for (Integer index = 1; index < 200; index++) {
            records.add(fixture('Allowed ' + index, 'allowed' + index + '@example.test'));
        }

        Integer before = Limits.getQueries();
        VpcsLeadEmailAdmission.enforce(records, null);
        Assert.areEqual(1, Limits.getQueries() - before);
        Assert.isTrue(records[0].hasErrors());
        for (Integer index = 1; index < records.size(); index++) {
            Assert.isFalse(records[index].hasErrors());
        }
    }

    @IsTest
    static void nativeTriggerRejectsNewRecordsWithoutRequiringWebsiteFields() {
        Vpcs_Blocked_Email__c entry = block(BLOCKED, true);
        insert as system entry;
        Lead withoutSource = fixture('Blocked no source', ALIAS);
        Lead selected = fixture('Blocked selected agent', BLOCKED);
        selected.LeadSource = 'Contact Agent';
        selected.WebToLead__c = true;
        selected.Destination_State__c = 'CO';
        selected.RecordTypeId = Lead.SObjectType.getDescribe()
            .getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();

        for (Database.SaveResult result : Database.insert(
                 new List<Lead>{withoutSource, selected}, false, AccessLevel.SYSTEM_MODE)) {
            Assert.isFalse(result.isSuccess());
            Assert.areEqual(VpcsLeadEmailAdmission.BLOCKED_CODE, result.getErrors()[0].getMessage());
        }
        Assert.areEqual(0, [SELECT COUNT() FROM Lead WITH SYSTEM_MODE]);
        Assert.areEqual(0, [SELECT COUNT() FROM SMS_Message_Queue__c WITH SYSTEM_MODE]);
    }

    @IsTest
    static void nativeBulkInsertRejects199AndPersistsOne() {
        Vpcs_Blocked_Email__c entry = block(BLOCKED, true);
        insert as system entry;
        List<Lead> records = new List<Lead>();
        for (Integer index = 0; index < 199; index++) {
            records.add(fixture('Bulk blocked ' + index, 'vpcs.admission.fixture+' + index + '@gmail.com'));
        }
        records.add(fixture('Bulk allowed', 'bulk-allowed@example.test'));
        List<Database.SaveResult> outcomes = Database.insert(records, false, AccessLevel.SYSTEM_MODE);
        Assert.areEqual(200, outcomes.size());
        for (Integer index = 0; index < 199; index++) {
            Assert.isFalse(outcomes[index].isSuccess());
            Assert.areEqual(VpcsLeadEmailAdmission.BLOCKED_CODE, outcomes[index].getErrors()[0].getMessage());
        }
        Assert.isTrue(outcomes[199].isSuccess());
        Assert.areEqual(1, [SELECT COUNT() FROM Lead WITH SYSTEM_MODE]);
        Assert.areEqual(0, [SELECT COUNT() FROM SMS_Message_Queue__c WITH SYSTEM_MODE]);
    }

    @IsTest
    static void preservesHistoricalUpdatesAndNativeConversion() {
        Lead historical = fixture('Historical blocked email', BLOCKED);
        Lead changing = fixture('Different historical email', 'existing@example.test');
        insert as system new List<Lead>{historical, changing};
        Vpcs_Blocked_Email__c entry = block(BLOCKED, true);
        insert as system entry;

        historical.Title = 'Synthetic job title';
        update as system historical;

        historical.Email = ALIAS;
        Database.SaveResult aliasChange = Database.update(historical, false, AccessLevel.SYSTEM_MODE);
        Assert.isFalse(aliasChange.isSuccess());
        Assert.areEqual(VpcsLeadEmailAdmission.BLOCKED_CODE, aliasChange.getErrors()[0].getMessage());

        changing.Email = ALIAS;
        Database.SaveResult changeResult = Database.update(changing, false, AccessLevel.SYSTEM_MODE);
        Assert.isFalse(changeResult.isSuccess());
        Assert.areEqual(VpcsLeadEmailAdmission.BLOCKED_CODE, changeResult.getErrors()[0].getMessage());

        Database.LeadConvert request = new Database.LeadConvert();
        request.setLeadId(historical.Id);
        request.setConvertedStatus([SELECT ApiName FROM LeadStatus WHERE IsConverted = true LIMIT 1].ApiName);
        request.setDoNotCreateOpportunity(true);
        Assert.isTrue(Database.convertLead(request).isSuccess());

        entry.Active__c = false;
        update as system entry;
        update as system changing;
        String persistedAlias = [SELECT Email FROM Lead WHERE Id = :changing.Id WITH SYSTEM_MODE].Email;
        // Native Lead storage can lowercase the address. Retaining the plus
        // suffix distinguishes the requested alias from the canonical key.
        Assert.isTrue(ALIAS.equalsIgnoreCase(persistedAlias));
    }
}
