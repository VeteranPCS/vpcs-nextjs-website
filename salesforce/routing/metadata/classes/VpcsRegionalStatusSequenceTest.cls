@IsTest
private class VpcsRegionalStatusSequenceTest {
    @IsTest
    static void leadSequenceChangesOnlyWhenStatusChanges() {
        Id customerType = Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
        Lead created = new Lead(RecordTypeId=customerType, Status='Prospect', Routing_Status_Sequence__c=77);
        VpcsRegionalStatusSequence.beforeLeads(new List<Lead>{created}, null);
        System.assertEquals(1, created.Routing_Status_Sequence__c, 'First save initializes the sequence.');

        Id recordId = '00Q000000000001';
        Lead before = new Lead(Id=recordId, RecordTypeId=customerType, Status='Prospect', Routing_Status_Sequence__c=1, OwnerId='005000000000001');
        Lead reassigned = new Lead(Id=recordId, RecordTypeId=customerType, Status='Prospect', Routing_Status_Sequence__c=99, OwnerId='005000000000002');
        VpcsRegionalStatusSequence.beforeLeads(new List<Lead>{reassigned}, new Map<Id, Lead>{recordId => before});
        System.assertEquals(1, reassigned.Routing_Status_Sequence__c, 'Reassignment cannot change the existing status event.');

        Lead advanced = new Lead(Id=recordId, RecordTypeId=customerType, Status='New:_Not_Contacted');
        VpcsRegionalStatusSequence.beforeLeads(new List<Lead>{advanced}, new Map<Id, Lead>{recordId => reassigned});
        System.assertEquals(2, advanced.Routing_Status_Sequence__c);

        Lead returned = new Lead(Id=recordId, RecordTypeId=customerType, Status='Prospect');
        VpcsRegionalStatusSequence.beforeLeads(new List<Lead>{returned}, new Map<Id, Lead>{recordId => advanced});
        System.assertEquals(3, returned.Routing_Status_Sequence__c, 'A return to an earlier status is still a distinct event.');
    }

    @IsTest
    static void opportunitySequenceStartsOnLegacyTransitionAndPreservesUnchangedStage() {
        Id customerType = Opportunity.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
        Opportunity created = new Opportunity(RecordTypeId=customerType, StageName='Tracking', Routing_Status_Sequence__c=42);
        VpcsRegionalStatusSequence.beforeOpportunities(new List<Opportunity>{created}, null);
        System.assertEquals(1, created.Routing_Status_Sequence__c);

        Id recordId = '006000000000001';
        Opportunity legacy = new Opportunity(Id=recordId, RecordTypeId=customerType, StageName='Tracking');
        Opportunity advanced = new Opportunity(Id=recordId, RecordTypeId=customerType, StageName='Under Contract');
        VpcsRegionalStatusSequence.beforeOpportunities(new List<Opportunity>{advanced},
            new Map<Id, Opportunity>{recordId => legacy});
        System.assertEquals(1, advanced.Routing_Status_Sequence__c, 'A legacy null sequence starts on the next transition.');

        Opportunity edited = new Opportunity(Id=recordId, RecordTypeId=customerType, StageName='Under Contract', Name='Corrected label',
            Routing_Status_Sequence__c=99);
        VpcsRegionalStatusSequence.beforeOpportunities(new List<Opportunity>{edited},
            new Map<Id, Opportunity>{recordId => advanced});
        System.assertEquals(1, edited.Routing_Status_Sequence__c);

        Opportunity returned = new Opportunity(Id=recordId, RecordTypeId=customerType, StageName='Tracking');
        VpcsRegionalStatusSequence.beforeOpportunities(new List<Opportunity>{returned},
            new Map<Id, Opportunity>{recordId => edited});
        System.assertEquals(2, returned.Routing_Status_Sequence__c);
    }

    @IsTest
    static void usesDistinctKeysForSameDayTransitionsAndLaterDailyCycles() {
        Date day = Date.newInstance(2026, 11, 25);
        System.assertEquals('STATUS:0:' + String.valueOf(day), VpcsRegionalStatusSequence.eventKey(null, day));
        System.assertEquals('STATUS:1:' + String.valueOf(day), VpcsRegionalStatusSequence.eventKey(1, day));
        System.assertEquals('STATUS:2:' + String.valueOf(day), VpcsRegionalStatusSequence.eventKey(2, day));
        System.assertEquals('STATUS:2:' + String.valueOf(day.addDays(1)), VpcsRegionalStatusSequence.eventKey(2, day.addDays(1)));
    }
}
