public without sharing class VpcsRegionalSms {
    public static String phone(String mobile, String alternate) {
        String normalized = normalize(mobile);
        return normalized == null ? normalize(alternate) : normalized;
    }

    private static String normalize(String value) {
        if (String.isBlank(value) || !Pattern.matches('^[+0-9(). -]+$', value.trim())) {
            return null;
        }
        String digits = value.replaceAll('[^0-9]', '');
        if (Pattern.matches('^[2-9][0-9]{2}[2-9][0-9]{6}$', digits)) {
            return '+1' + digits;
        }
        if (Pattern.matches('^1[2-9][0-9]{2}[2-9][0-9]{6}$', digits)) {
            return '+' + digits;
        }
        return null;
    }

    public static SMS_Message_Queue__c message(
        Id customerId, Id partnerId, String event, String phone, String body, VpcsCustomerRouting.Route route
    ) {
        if (!route.known || route.sender() == null || partnerId == null || phone == null || phone == route.sender() || String.isBlank(body)) {
            return null;
        }
        Boolean isLead = customerId.getSObjectType() == Lead.SObjectType;
        return new SMS_Message_Queue__c(
            Related_Lead__c = isLead ? customerId : null,
            Related_Opportunity__c = isLead ? null : customerId,
            Related_Partner__c = partnerId,
            Event_Key__c = customerId + ':' + event + ':' + partnerId,
            To_Phone_Number__c = phone,
            From_Phone_Number__c = route.sender(),
            Message__c = body,
            Status__c = 'New'
        );
    }

    public static void enqueue(List<SMS_Message_Queue__c> messages) {
        if (messages.isEmpty()) {
            return;
        }
        for (Database.SaveResult result : Database.insert(messages, false, AccessLevel.SYSTEM_MODE)) {
            if (!result.isSuccess()) {
                for (Database.Error issue : result.getErrors()) {
                    if (issue.getStatusCode() != StatusCode.DUPLICATE_VALUE) {
                        throw new QueueWriteException('Regional SMS queue write failed: ' + issue.getStatusCode());
                    }
                }
            }
        }
    }

    public class QueueWriteException extends Exception {}
}
