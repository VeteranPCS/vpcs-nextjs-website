public without sharing class VpcsWebdevLeadOwnerGuard {
    private static final Id WEBDEV_ORG_ID = '00Djg000000EK8YEAW';
    private static final String WORKFLOW_USERNAME = 'tech+webdev-workflow@veteranpcs.com.webdev';
    private static final String TEST_MARKER = '[VPCS WEBDEV TEST]';
    private static final Set<Id> APPROVED_OWNER_IDS = new Set<Id>{
        '0054x000005GsUvAAK', '005Rg000004hWojIAE', '0054x0000082vHgAAI', '005Rg00000BAN0DIAX'
    };
    private static final Set<String> AUDIT_AND_OWNER_FIELDS = new Set<String>{
        'id', 'ownerid', 'lastmodifiedbyid', 'lastmodifieddate', 'systemmodstamp',
        // Salesforce stamps LastTransferDate on owner changes, including in Apex trigger records.
        'lastactivitydate', 'lastreferenceddate', 'lastvieweddate', 'lasttransferdate'
    };
    private static Boolean webdevSandbox;
    private static Set<String> comparableFields;

    private class WebdevGuardTargetException extends Exception {}

    public static void enforceUpdates(List<Lead> updatedLeads, Map<Id, Lead> previousLeads) {
        if (!isGuardedSession()) return;
        validateUpdates(updatedLeads, previousLeads);
    }

    public static void blockOtherDml(List<Lead> leads) {
        if (!isGuardedSession()) return;
        addOtherDmlErrors(leads);
    }

    private static Boolean isGuardedSession() {
        String username = UserInfo.getUserName();
        Id organizationId = Id.valueOf(UserInfo.getOrganizationId());
        if (!appliesTo(username, organizationId, true)) return false;

        if (webdevSandbox == null) {
            List<Organization> orgs = [SELECT IsSandbox FROM Organization WHERE Id = :organizationId LIMIT 1];
            webdevSandbox = !orgs.isEmpty() && orgs[0].IsSandbox;
        }
        if (!webdevSandbox) {
            throw new WebdevGuardTargetException('Unable to verify the Salesforce WebDev sandbox for the workflow user.');
        }
        return true;
    }

    @TestVisible
    private static Boolean appliesTo(String username, Id organizationId, Boolean isSandbox) {
        return WORKFLOW_USERNAME.equals(username) && organizationId == WEBDEV_ORG_ID && isSandbox == true;
    }

    @TestVisible
    private static void validateUpdates(List<Lead> updatedLeads, Map<Id, Lead> previousLeads) {
        for (Lead updatedLead : updatedLeads) {
            String violation = ownerUpdateViolation(previousLeads.get(updatedLead.Id), updatedLead);
            if (violation != null) {
                updatedLead.addError('The WebDev workflow user may change only the owner of an existing marked test Lead to an approved owner. ' + violation);
            }
        }
    }

    @TestVisible
    private static void addOtherDmlErrors(List<Lead> leads) {
        for (Lead record : leads) {
            record.addError('The WebDev workflow user may only update the owner of a marked test Lead.');
        }
    }

    private static String ownerUpdateViolation(Lead previousLead, Lead updatedLead) {
        if (previousLead == null) return 'No previous Lead was available.';

        List<String> markFields = new List<String>();
        if (previousLead.FirstName == null || !previousLead.FirstName.startsWith(TEST_MARKER)) markFields.add('FirstName');
        if (previousLead.Description == null || !previousLead.Description.startsWith(TEST_MARKER + ' ')) markFields.add('Description');
        if (!markFields.isEmpty()) return 'Missing or invalid existing test markers [' + String.join(markFields, ', ') + '].';
        if (!APPROVED_OWNER_IDS.contains(updatedLead.OwnerId)) return 'OwnerId is outside the approved owner list.';

        List<String> changes = changedFields(previousLead, updatedLead);
        return changes.isEmpty() ? null : 'Changed fields [' + String.join(changes, ', ') + '].';
    }

    private static List<String> changedFields(Lead previousLead, Lead updatedLead) {
        Map<String, Object> previousFields = previousLead.getPopulatedFieldsAsMap();
        Map<String, Object> updatedFields = updatedLead.getPopulatedFieldsAsMap();
        Set<String> populatedFields = new Set<String>();
        populatedFields.addAll(previousFields.keySet());
        populatedFields.addAll(updatedFields.keySet());
        Set<String> fields = fieldsToCompare();
        List<String> changes = new List<String>();

        for (String fieldName : populatedFields) {
            if (fields.contains(fieldName.toLowerCase()) && !sameValue(previousFields.get(fieldName), updatedFields.get(fieldName))) {
                changes.add(fieldName);
            }
        }
        changes.sort();
        return changes;
    }

    @TestVisible
    private static Set<String> fieldsToCompare() {
        if (comparableFields == null) {
            comparableFields = new Set<String>();
            for (Schema.SObjectField token : Schema.SObjectType.Lead.fields.getMap().values()) {
                Schema.DescribeFieldResult field = token.getDescribe();
                String name = field.getName().toLowerCase();
                // Compare compound components and ignore projections that Salesforce computes.
                if (!AUDIT_AND_OWNER_FIELDS.contains(name) && !field.isCalculated() && !field.isAutoNumber()
                    && field.getType() != Schema.DisplayType.Address && field.getType() != Schema.DisplayType.Location) {
                    comparableFields.add(name);
                }
            }
        }
        return comparableFields;
    }

    private static Boolean sameValue(Object previousValue, Object updatedValue) {
        // Salesforce's Apex string == comparison is case-insensitive.
        if (previousValue instanceof String && updatedValue instanceof String) {
            return ((String) previousValue).equals((String) updatedValue);
        }
        return previousValue == updatedValue;
    }
}
