/** Native regional status entry point; caller sender overrides are retained only for Flow compatibility. */
public without sharing class OpportunityUpdateMessagingService {
    public class SendOppStatusSMSRequest {
        @InvocableVariable(Required=true) public Id OppRecordId;
        @InvocableVariable(Required=true) public String toPhoneNumber;
        @InvocableVariable public String fromPhoneNumber;
        @InvocableVariable public String senderEmailAddress;
        @InvocableVariable public String SenderEmail;
    }
    public class SendOppStatusSMSResponse {
        @InvocableVariable public Boolean success;
        @InvocableVariable public String messageId;
        @InvocableVariable public String errorMessage;
    }
    public OpportunityUpdateMessagingService() {}

    public String renderOppStatusSMS(Id recordId) {
        Id templateId = Label.OppUpdateSMSTemplate;
        return Messaging.renderStoredEmailTemplate(templateId, null, recordId,
            Messaging.AttachmentRetrievalOption.NONE, false).getPlainTextBody();
    }

    public SendMessageResult sendOppStatusSMS(Id recordId, String toPhoneNumber, String fromPhoneNumber, String senderEmail) {
        if (recordId == null) { throw new IllegalArgumentException('Record ID is required.'); }
        VpcsRegionalStatusMessages.Result queued = VpcsRegionalStatusMessages.enqueue(new Set<Id>{recordId}, false).get(recordId);
        SendMessageResult result = new SendMessageResult();
        result.success = queued.success;
        result.messageId = queued.queueId;
        result.status = queued.success ? 'Queued' : 'Held';
        result.errorMessage = queued.error;
        return result;
    }

    public SendMessageResult sendOppStatusSMSAsync(Id recordId, String toPhoneNumber, String fromPhoneNumber, String senderEmail) {
        return sendOppStatusSMS(recordId, toPhoneNumber, fromPhoneNumber, senderEmail);
    }

    @InvocableMethod(Label='Send Opp Status SMS' Description='Queue a correlated regional status SMS. Success means accepted by the queue, not delivered.')
    public static List<SendOppStatusSMSResponse> sendOppStatusSMS_Invocable(List<SendOppStatusSMSRequest> requests) {
        List<SendOppStatusSMSResponse> responses = new List<SendOppStatusSMSResponse>();
        if (requests == null) { return responses; }
        Set<Id> ids = new Set<Id>();
        for (SendOppStatusSMSRequest request : requests) {
            if (request?.OppRecordId != null) { ids.add(request.OppRecordId); }
        }
        Map<Id, VpcsRegionalStatusMessages.Result> results = VpcsRegionalStatusMessages.enqueue(ids, false);
        for (SendOppStatusSMSRequest request : requests) {
            SendOppStatusSMSResponse response = new SendOppStatusSMSResponse();
            VpcsRegionalStatusMessages.Result result = request == null ? null : results.get(request.OppRecordId);
            response.success = result != null && result.success;
            response.messageId = result?.queueId;
            response.errorMessage = result == null ? 'Record ID is required.' : result.error;
            responses.add(response);
        }
        return responses;
    }
}
