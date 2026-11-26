/** Native regional status entry point; caller sender overrides are retained only for Flow compatibility. */
public without sharing class LeadUpdateMessagingService {
    public class SendLeadStatusSMSRequest {
        @InvocableVariable(Required=true) public Id LeadRecordId;
        @InvocableVariable(Required=true) public String toPhoneNumber;
        @InvocableVariable public String fromPhoneNumber;
        @InvocableVariable public String senderEmailAddress;
        @InvocableVariable public String SenderEmail;
    }
    public class SendLeadStatusSMSResponse {
        @InvocableVariable public Boolean success;
        @InvocableVariable public String messageId;
        @InvocableVariable public String errorMessage;
    }
    public LeadUpdateMessagingService() {}

    public String renderLeadStatusSMS(Id recordId) {
        Id templateId = Label.LeadUpdateSMSTemplate;
        return Messaging.renderStoredEmailTemplate(templateId, null, recordId,
            Messaging.AttachmentRetrievalOption.NONE, false).getPlainTextBody();
    }

    public SendMessageResult sendLeadStatusSMS(Id recordId, String toPhoneNumber, String fromPhoneNumber, String senderEmail) {
        if (recordId == null) { throw new IllegalArgumentException('Record ID is required.'); }
        VpcsRegionalStatusMessages.Result queued = VpcsRegionalStatusMessages.enqueue(new Set<Id>{recordId}, true).get(recordId);
        SendMessageResult result = new SendMessageResult();
        result.success = queued.success;
        result.messageId = queued.queueId;
        result.status = queued.success ? 'Queued' : 'Held';
        result.errorMessage = queued.error;
        return result;
    }

    public SendMessageResult sendLeadStatusSMSAsync(Id recordId, String toPhoneNumber, String fromPhoneNumber, String senderEmail) {
        return sendLeadStatusSMS(recordId, toPhoneNumber, fromPhoneNumber, senderEmail);
    }

    @InvocableMethod(Label='Send Lead Status SMS' Description='Queue a correlated regional status SMS. Success means accepted by the queue, not delivered.')
    public static List<SendLeadStatusSMSResponse> sendLeadStatusSMS_Invocable(List<SendLeadStatusSMSRequest> requests) {
        List<SendLeadStatusSMSResponse> responses = new List<SendLeadStatusSMSResponse>();
        if (requests == null) { return responses; }
        Set<Id> ids = new Set<Id>();
        for (SendLeadStatusSMSRequest request : requests) {
            if (request?.LeadRecordId != null) { ids.add(request.LeadRecordId); }
        }
        Map<Id, VpcsRegionalStatusMessages.Result> results = VpcsRegionalStatusMessages.enqueue(ids, true);
        for (SendLeadStatusSMSRequest request : requests) {
            SendLeadStatusSMSResponse response = new SendLeadStatusSMSResponse();
            VpcsRegionalStatusMessages.Result result = request == null ? null : results.get(request.LeadRecordId);
            response.success = result != null && result.success;
            response.messageId = result?.queueId;
            response.errorMessage = result == null ? 'Record ID is required.' : result.error;
            responses.add(response);
        }
        return responses;
    }
}
