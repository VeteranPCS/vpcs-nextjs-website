/** One-record transaction for a reviewed routing manifest. Requires a separately verified native automation hold. */
public without sharing class VpcsRoutingMigration {
    public class GuardException extends Exception {}

    private static final Pattern HEX_KEY = Pattern.compile('^[a-f0-9]{64}$');
    private static final Pattern RUN_ID = Pattern.compile('^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$');
    private static final Set<String> REQUIRED_QUERY_FIELDS = new Set<String>{'IsClosed', 'IsConverted'};
    private static final Set<String> AUDIT_FIELDS = new Set<String>{
        // Salesforce may stamp Lead.LastTransferDate during an OwnerId-only transfer.
        'ownerid', 'lastmodifieddate', 'lastmodifiedbyid', 'systemmodstamp', 'lasttransferdate'
    };
    // The verified repository manifests retain these former regional assignments in both orgs.
    private static final Set<String> KNOWN_ORGS = new Set<String>{'00D4x000003yaV2', '00Djg000000EK8Y'};
    private static final Set<Id> PREVIOUS_TASK_OWNERS = new Set<Id>{
        '0054x000005GsUvAAK', '0054x0000082vHgAAI', '005Rg000004hWojIAE', '005Rg00000BAN0DIAX'
    };

    private class Command {
        public Id organizationId;
        public Boolean isSandbox;
        public String manifestFingerprint;
        public String runId;
        public String action;
        public ChangeRequest request;
    }

    private class ChangeRequest {
        public String type;
        public Id id;
        public String manifestId;
        public Map<String, Object> expected;
        public List<RelatedGuard> related;
        public Map<String, Id> patch;
        public String idempotencyKey;
    }

    private class RelatedGuard {
        public String type;
        public Id id;
        public Map<String, Object> expected;
    }

    public static String getOrganization() {
        assertOperator();
        Organization actual = [SELECT Id, IsSandbox FROM Organization WITH SYSTEM_MODE LIMIT 1];
        return JSON.serialize(new Map<String, Object>{'id' => actual.Id, 'isSandbox' => actual.IsSandbox});
    }

    public static String getReceipt(Id organizationId, Boolean isSandbox, String key) {
        verifyOrganization(organizationId, isSandbox);
        require(isHex(key), 'Invalid receipt key');
        return receipt(key);
    }

    public static String executeOwnerOnly(String commandJson) {
        Map<String, Object> raw = (Map<String, Object>)JSON.deserializeUntyped(commandJson);
        Command command = parseCommand(raw);
        verifyOrganization(command.organizationId, command.isSandbox);
        require(!VpcsRegionalDispatchControl.enabled(), 'Regional dispatch must be paused for owner migration');
        ChangeRequest request = command.request;
        String applyKey = operationKey(command, 'apply');
        String rollbackKey = operationKey(command, 'rollback');
        Boolean applying = command.action == 'apply';
        require(request.idempotencyKey == (applying ? applyKey : rollbackKey), 'Command idempotency key differs');
        require(request.patch != null && request.patch.size() == 1 && request.patch.get('OwnerId') != null &&
            request.patch.get('OwnerId').getSObjectType() == User.SObjectType, 'Exactly one User OwnerId is required');

        // Acquire the Customer parent before the Task to keep the lock order consistent.
        SObject parent;
        Map<String, Object> parentExpected;
        if (request.type == 'Task') {
            Id parentId = (Id)request.expected.get('parentId');
            require(parentId != null, 'A referral Task requires its Customer parent');
            String parentType = parentId.getSObjectType().getDescribe().getName();
            require(parentType == 'Lead' || parentType == 'Opportunity', 'Invalid referral parent type');
            require(request.related.size() == 1, 'Task owner change requires an explicit parent comparison');
            RelatedGuard guard = request.related[0];
            require(guard.id == parentId && guard.type == parentType, 'Task parent guard differs');
            parentExpected = guard.expected;
            parent = readRow(parentType, parentId, true);
            if (parent == null) return conflict();
        } else {
            require(request.related.isEmpty(), 'Unexpected Customer related guards');
        }

        SObject beforeRow = readRow(request.type, request.id, true);
        if (beforeRow == null) return conflict();
        String already = receipt(request.idempotencyKey);
        if (already != null) return already;
        if (applying) {
            if (receipt(rollbackKey) != null) return conflict();
        } else {
            String appliedReceipt = receipt(applyKey);
            if (appliedReceipt == null) return conflict();
            Map<String, Object> applied = (Map<String, Object>)JSON.deserializeUntyped(appliedReceipt);
            Map<String, Object> appliedBefore = (Map<String, Object>)applied.get('before');
            Map<String, Object> appliedAfter = (Map<String, Object>)applied.get('after');
            require(matchesObject(appliedAfter, request.expected) &&
                idsEqual(appliedBefore.get('ownerId'), request.patch.get('OwnerId')),
                'Rollback must reverse this run\'s recorded owner change');
            if (parentExpected != null) {
                require(matchesObject(applied.get('parentExpected'), parentExpected),
                    'Task rollback parent comparison must match the durable apply receipt');
            }
        }
        String captureFailure = captureConflict(beforeRow, request.expected);
        if (captureFailure != null) return conflict(captureFailure);
        if (!isEligible(beforeRow, parent)) return conflict('record-ineligible');
        if (parentExpected != null) {
            String parentFailure = captureConflict(parent, parentExpected);
            if (parentFailure != null) return conflict('parent-' + parentFailure);
            if (applying && (!KNOWN_ORGS.contains(String.valueOf(command.organizationId).left(15)) ||
                !PREVIOUS_TASK_OWNERS.contains((Id)beforeRow.get('OwnerId')))) return conflict('task-prior-owner-not-regional');
        }
        Id desired = request.patch.get('OwnerId');
        if (applying) {
            VpcsCustomerRouting.Route route = resolve(parent != null ? parent : beforeRow);
            require(route != null && route.binding != null && route.binding.ownerId == desired,
                'Apply OwnerId does not match the current regional policy');
        }
        if ((Id)beforeRow.get('OwnerId') == desired) return conflict('owner-already-matches');

        Datetime started = System.now();
        Id accountId = request.type == 'Opportunity' ? (Id)beforeRow.get('AccountId') :
            parent instanceof Opportunity ? (Id)parent.get('AccountId') : null;
        String priorEffects = effectSignature(request.id, request.type, accountId, started);
        List<Integer> priorLimits = effectLimits();
        Savepoint checkpoint = Database.setSavepoint();
        try {
            VpcsCustomerRouting.setMigrationOwnerWrite(true);
            try {
                SObject patch = beforeRow.getSObjectType().newSObject(request.id);
                patch.put('OwnerId', desired);
                Database.DMLOptions options = new Database.DMLOptions();
                options.assignmentRuleHeader.useDefaultRule = false;
                options.emailHeader.triggerUserEmail = false;
                options.emailHeader.triggerOtherEmail = false;
                options.emailHeader.triggerAutoResponseEmail = false;
                options.optAllOrNone = true;
                // Elevated DML happens only after permission, org, policy, and expected-state checks.
                Database.SaveResult ownerUpdate = Database.update(patch, options, AccessLevel.SYSTEM_MODE);
                require(ownerUpdate.isSuccess(), 'The guarded OwnerId update failed');
            } finally {
                VpcsCustomerRouting.setMigrationOwnerWrite(false);
            }
            SObject afterRow = readRow(request.type, request.id, false);
            require(afterRow != null && (Id)afterRow.get('OwnerId') == desired &&
                sameProtectedFields(beforeRow, afterRow), 'Unexpected record mutation during owner update');
            require(matchesObject(priorLimits, effectLimits()) &&
                priorEffects.equals(effectSignature(request.id, request.type, accountId, started)) &&
                !relatedParentChanged(parent),
                'Detected related activity or outbound automation during owner update');

            Map<String, Object> after = request.expected.clone();
            after.put('ownerId', String.valueOf(desired));
            after.put('lastModifiedDate', jsonDate((Datetime)afterRow.get('LastModifiedDate')));
            Map<String, Object> outcome = new Map<String, Object>{'before' => request.expected, 'after' => after};
            if (parentExpected != null) outcome.put('parentExpected', parentExpected);
            String result = JSON.serialize(outcome);
            insert as system new VPCS_Routing_Migration_Receipt__c(Operation_Key__c = request.idempotencyKey, Receipt__c = result);
            return result;
        } catch (Exception failure) {
            Database.rollback(checkpoint);
            throw failure;
        }
    }


    private static void assertOperator() {
        require(FeatureManagement.checkPermission('VPCS_Routing_Migration'),
            'Routing migration operator permission is required');
    }

    private static void verifyOrganization(Id expectedId, Boolean expectedSandbox) {
        assertOperator();
        Organization actual = [SELECT Id, IsSandbox FROM Organization WITH SYSTEM_MODE LIMIT 1];
        require(expectedId == actual.Id && expectedSandbox == actual.IsSandbox, 'Routing migration Organization differs');
    }

    private static Command parseCommand(Map<String, Object> raw) {
        Command command = new Command();
        command.organizationId = (Id)raw.get('organizationId');
        command.isSandbox = (Boolean)raw.get('isSandbox');
        command.manifestFingerprint = (String)raw.get('manifestFingerprint');
        command.runId = (String)raw.get('runId');
        command.action = (String)raw.get('action');
        require(isHex(command.manifestFingerprint) && command.runId != null && RUN_ID.matcher(command.runId).matches() &&
            (command.action == 'apply' || command.action == 'rollback'), 'Invalid explicit manifest, run, or action');
        Map<String, Object> rawRequest = (Map<String, Object>)raw.get('request');
        require(rawRequest != null, 'Missing owner change request');
        ChangeRequest request = new ChangeRequest();
        command.request = request;
        request.type = (String)rawRequest.get('type');
        request.manifestId = (String)rawRequest.get('id');
        request.id = (Id)request.manifestId;
        request.expected = (Map<String, Object>)rawRequest.get('expected');
        request.idempotencyKey = (String)rawRequest.get('idempotencyKey');
        require(requiredType(request.type, request.id) && request.expected != null && isHex(request.idempotencyKey),
            'Invalid manifest request type, ID, or compare values');
        request.related = new List<RelatedGuard>();
        List<Object> related = (List<Object>)rawRequest.get('related');
        require(related != null && related.size() <= 1, 'One or zero related guards are supported');
        for (Object rawRelated : related) {
            Map<String, Object> fields = (Map<String, Object>)rawRelated;
            RelatedGuard guard = new RelatedGuard();
            guard.type = (String)fields.get('type');
            guard.id = (Id)fields.get('id');
            guard.expected = (Map<String, Object>)fields.get('expected');
            require(requiredType(guard.type, guard.id) && guard.expected != null, 'Invalid related guard');
            request.related.add(guard);
        }
        Map<String, Object> patch = (Map<String, Object>)rawRequest.get('patch');
        request.patch = new Map<String, Id>();
        require(patch != null && patch.size() == 1 && patch.containsKey('OwnerId'), 'Invalid owner-only patch');
        request.patch.put('OwnerId', (Id)patch.get('OwnerId'));
        return command;
    }

    private static Boolean requiredType(String type, Id recordId) {
        return (type == 'Lead' || type == 'Opportunity' || type == 'Task') && recordId != null &&
            recordId.getSObjectType().getDescribe().getName() == type;
    }

    private static Boolean isHex(String value) {
        return value != null && HEX_KEY.matcher(value).matches();
    }

    private static String operationKey(Command command, String action) {
        return digest(JSON.serialize(new List<String>{
            command.manifestFingerprint, command.runId, action, command.request.type, command.request.manifestId
        }));
    }

    private static String digest(String value) {
        return EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256', Blob.valueOf(value))).toLowerCase();
    }

    private static String conflict() {
        return conflict('record-or-receipt-unavailable');
    }

    private static String conflict(String reason) {
        return JSON.serialize(new Map<String, Object>{'conflict' => true, 'reason' => reason});
    }

    private static String receipt(String key) {
        List<VPCS_Routing_Migration_Receipt__c> existing = [
            SELECT Receipt__c FROM VPCS_Routing_Migration_Receipt__c WHERE Operation_Key__c = :key WITH SYSTEM_MODE LIMIT 1
        ];
        return existing.isEmpty() ? null : existing[0].Receipt__c;
    }

    private static void require(Boolean condition, String message) {
        if (condition != true) throw new GuardException(message);
    }

    private static SObject readRow(String type, Id recordId, Boolean lockRow) {
        require(requiredType(type, recordId), 'Unsupported guarded record');
        List<String> fields = new List<String>();
        for (Schema.SObjectField field : recordId.getSObjectType().getDescribe().fields.getMap().values()) {
            Schema.DescribeFieldResult description = field.getDescribe();
            if ((!description.isCalculated() || REQUIRED_QUERY_FIELDS.contains(description.getName())) &&
                description.getType() != Schema.DisplayType.Base64) {
                fields.add(description.getName());
            }
        }
        fields.sort();
        // Reading protected before-values for comparison requires system access.
        // All entry points that can reach this method verify the operator and org first.
        List<SObject> rows = Database.query(
            'SELECT ' + String.join(fields, ',') + ' FROM ' + type + ' WHERE Id = :recordId' +
            (lockRow ? ' FOR UPDATE' : ''), AccessLevel.SYSTEM_MODE
        );
        return rows.isEmpty() ? null : rows[0];
    }

    private static Boolean relatedParentChanged(SObject parent) {
        if (parent == null) return false;
        Id parentId = (Id)parent.get('Id');
        String parentType = parentId.getSObjectType().getDescribe().getName();
        SObject after = readRow(parentType, parentId, false);
        return after == null || !idsEqual(parent.get('OwnerId'), after.get('OwnerId')) ||
            !sameProtectedFields(parent, after);
    }

    private static Boolean idsEqual(Object left, Object right) {
        return left != null && right != null && (Id)String.valueOf(left) == (Id)String.valueOf(right);
    }

    @TestVisible
    private static String jsonDate(Datetime value) {
        return value.formatGmt('yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'');
    }

    private static Boolean matchesObject(Object left, Object right) {
        if (left instanceof Map<String, Object> && right instanceof Map<String, Object>) {
            Map<String, Object> leftMap = (Map<String, Object>)left;
            Map<String, Object> rightMap = (Map<String, Object>)right;
            if (leftMap.size() != rightMap.size()) return false;
            for (String key : leftMap.keySet()) {
                if (!rightMap.containsKey(key) || !matchesObject(leftMap.get(key), rightMap.get(key))) return false;
            }
            return true;
        }
        if (left instanceof List<Object> && right instanceof List<Object>) {
            List<Object> leftList = (List<Object>)left;
            List<Object> rightList = (List<Object>)right;
            if (leftList.size() != rightList.size()) return false;
            for (Integer index = 0; index < leftList.size(); index++) {
                if (!matchesObject(leftList[index], rightList[index])) return false;
            }
            return true;
        }
        return JSON.serialize(left).equals(JSON.serialize(right));
    }

    @TestVisible
    private static Boolean sameProtectedFields(SObject beforeRow, SObject afterRow) {
        Map<String, Object> beforeFields = comparableFields(beforeRow);
        Map<String, Object> afterFields = comparableFields(afterRow);
        Set<String> allFields = new Set<String>(beforeFields.keySet());
        allFields.addAll(afterFields.keySet());
        for (String field : allFields) {
            if (!matchesObject(beforeFields.get(field), afterFields.get(field))) return false;
        }
        return true;
    }

    private static Map<String, Object> comparableFields(SObject row) {
        Map<String, Object> populated = row.getPopulatedFieldsAsMap();
        Map<String, Object> fields = new Map<String, Object>();
        for (String apiName : populated.keySet()) {
            String name = apiName.toLowerCase();
            if (!AUDIT_FIELDS.contains(name)) fields.put(name, populated.get(apiName));
        }
        return fields;
    }

    private static VpcsCustomerRouting.Route resolve(SObject row) {
        if (row instanceof Lead) return VpcsCustomerRouting.forLead((Lead)row);
        if (row instanceof Opportunity) return VpcsCustomerRouting.forOpportunity((Opportunity)row);
        return null;
    }

    private static Boolean isEligible(SObject row, SObject parent) {
        if (row instanceof Lead) return VpcsCustomerRouting.isOpenCustomer((Lead)row);
        if (row instanceof Opportunity) {
            return !String.isBlank(((Opportunity)row).StageName) && VpcsCustomerRouting.isOpenCustomer((Opportunity)row);
        }
        return parent != null && isEligible(parent, null) && isReferral((Task)row);
    }

    private static String captureConflict(SObject row, Map<String, Object> expected) {
        if (!idsEqual(row.get('OwnerId'), expected.get('ownerId'))) return 'owner-changed';
        if (!matchesObject(jsonDate((Datetime)row.get('LastModifiedDate')), expected.get('lastModifiedDate'))) {
            return 'last-modified-changed';
        }
        if (row instanceof Lead) {
            if (!idsEqual(row.get('RecordTypeId'), expected.get('recordTypeId')) ||
                !matchesObject(row.get('IsConverted'), expected.get('isConverted')) ||
                !matchesObject(row.get('Status'), expected.get('status'))) return 'lead-eligibility-changed';
        } else if (row instanceof Opportunity) {
            if (!idsEqual(row.get('RecordTypeId'), expected.get('recordTypeId')) ||
                !matchesObject(row.get('IsClosed'), expected.get('isClosed')) ||
                !matchesObject(row.get('StageName'), expected.get('stageName'))) return 'opportunity-eligibility-changed';
        } else {
            Task task = (Task)row;
            Id parentId = task.WhatId == null ? task.WhoId : task.WhatId;
            if (!idsEqual(parentId, expected.get('parentId')) ||
                !matchesObject(task.IsClosed, expected.get('isClosed')) ||
                !matchesObject(isReferral(task), expected.get('isReferral'))) return 'referral-eligibility-changed';
        }
        if (!(row instanceof Task)) {
            String destination = (String)row.get('Destination_State__c');
            if (!matchesObject(VpcsCustomerRouting.normalizeDestination(destination), expected.get('state')) ||
                (expected.containsKey('rawDestinationState') &&
                 !matchesObject(destination, expected.get('rawDestinationState')))) return 'destination-changed';
        }
        List<Object> timers = (List<Object>)expected.get('timers');
        List<Object> pending = (List<Object>)expected.get('pendingMessages');
        if (timers == null || pending == null) return 'incomplete-timer-or-sms-capture';
        if (!matchesPendingMessages((Id)row.get('Id'), pending)) return 'pending-sms-changed';
        Set<String> timerKeys = new Set<String>();
        Map<String, Schema.SObjectField> rowFields = row.getSObjectType().getDescribe().fields.getMap();
        for (Object item : timers) {
            Map<String, Object> timer = (Map<String, Object>)item;
            String key = (String)timer.get('key');
            if (String.isBlank(key) || !timerKeys.add(key) || !rowFields.containsKey(key)) return 'invalid-timer-field';
            Schema.DisplayType type = rowFields.get(key).getDescribe().getType();
            Object captured = timer.get('value');
            Object current = row.get(key);
            if (current != null && type == Schema.DisplayType.DateTime) {
                current = jsonDate((Datetime)current);
            } else if (current != null && type == Schema.DisplayType.Date) {
                current = dateOnly((Date)current);
            }
            if (current instanceof Decimal && captured != null &&
                ((Decimal)current) == Decimal.valueOf(String.valueOf(captured))) continue;
            if (!matchesObject(current, captured)) return 'timer-value-changed:' + rowFields.get(key).getDescribe().getName();
        }
        return null;
    }

    @TestVisible
    private static String dateOnly(Date value) {
        return value == null ? null : JSON.serialize(value).substring(1, 11);
    }

    @TestVisible
    private static Boolean isReferral(Task task) {
        if (task.IsClosed != false || task.Subject == null) return false;
        if (task.WhatId == null && task.WhoId != null && task.WhoId.getSObjectType() == Lead.SObjectType) {
            return task.Subject.equals('Reach out to new Lead');
        }
        if (task.WhatId == null || task.WhatId.getSObjectType() != Opportunity.SObjectType) return false;
        // The trailing space is part of the exact Opportunity Flow subject.
        return task.Subject.equals('Check on Referral Check') ||
            task.Subject.equals('email closing info and agent referral agreement to Melanie ');
    }

    private static List<SObject> linkedSms(Id recordId, Boolean lockRows) {
        Schema.SObjectType targetType = recordId.getSObjectType();
        if (targetType == Task.SObjectType) return new List<SObject>();
        String lookup = targetType == Lead.SObjectType ? 'Related_Lead__c' : 'Related_Opportunity__c';
        Schema.SObjectType smsType = Schema.getGlobalDescribe().get('SMS_Message_Queue__c');
        require(smsType != null && smsType.getDescribe().fields.getMap().containsKey(lookup),
            'Pending SMS relation required to verify the ownership update');
        return Database.query('SELECT Id, Status__c, LastModifiedDate FROM SMS_Message_Queue__c WHERE ' +
            lookup + ' = :recordId AND Status__c IN (\'New\', \'Retry\', \'Processing\') LIMIT 1001' +
            (lockRows ? ' FOR UPDATE' : ''), AccessLevel.SYSTEM_MODE);
    }

    private static Boolean matchesPendingMessages(Id recordId, List<Object> pending) {
        Set<Id> expected = new Set<Id>();
        for (Object item : pending) expected.add((Id)item);
        Set<Id> current = new Set<Id>();
        List<SObject> pendingRows = linkedSms(recordId, true);
        require(pendingRows.size() <= 1000, 'Too many linked SMS records to verify one owner update');
        for (SObject row : pendingRows) {
            if (row.get('Status__c') == 'Processing') return false;
            current.add((Id)row.get('Id'));
        }
        return current == expected;
    }

    private static String keyedRows(List<SObject> rows) {
        require(rows.size() <= 1000, 'Too many related records to verify one owner update');
        List<String> ordered = new List<String>();
        for (SObject row : rows) ordered.add(JSON.serialize(row));
        ordered.sort();
        return JSON.serialize(ordered);
    }

    private static String effectSignature(Id recordId, String type, Id accountId, Datetime started) {
        Id actor = UserInfo.getUserId();
        List<String> signatures = new List<String>();
        if (type != 'Task') {
            String relationship = type == 'Lead' ? 'WhoId' : 'WhatId';
            signatures.add(keyedRows(Database.query('SELECT Id, OwnerId, LastModifiedDate, Status, Subject, ' +
                'Description, ActivityDate FROM Task WHERE ' + relationship + ' = :recordId LIMIT 1001', AccessLevel.SYSTEM_MODE)));
        }
        if (accountId != null) {
            signatures.add(keyedRows([SELECT Id, OwnerId, LastModifiedDate FROM Account WHERE Id = :accountId WITH SYSTEM_MODE]));
        }
        String emailRelationship = type == 'Task' ? 'ActivityId' : 'RelatedToId';
        signatures.add(keyedRows(Database.query('SELECT Id, LastModifiedDate, Status FROM EmailMessage WHERE ' +
            emailRelationship + ' = :recordId LIMIT 1001', AccessLevel.SYSTEM_MODE)));
        if (type == 'Lead') {
            signatures.add(keyedRows(Database.query('SELECT Id, EmailMessageId, RelationType FROM ' +
                'EmailMessageRelation WHERE RelationId = :recordId LIMIT 1001', AccessLevel.SYSTEM_MODE)));
        }
        signatures.add(keyedRows(linkedSms(recordId, false)));
        // Also catch unlinked SMS inserts attributable to this operator during the transaction.
        signatures.add(keyedRows(Database.query('SELECT Id, Status__c, LastModifiedDate FROM SMS_Message_Queue__c ' +
            'WHERE LastModifiedById = :actor AND LastModifiedDate >= :started LIMIT 1001', AccessLevel.SYSTEM_MODE)));
        return digest(JSON.serialize(signatures));
    }

    private static List<Integer> effectLimits() {
        return new List<Integer>{Limits.getEmailInvocations(), Limits.getFutureCalls(), Limits.getQueueableJobs()};
    }
}
