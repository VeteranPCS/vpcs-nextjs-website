#!/usr/bin/env python3
"""Apply regional integration edits to a verified, org-specific metadata retrieval."""
import argparse
from pathlib import Path
import xml.etree.ElementTree as ET

from generate import child, q, write_tree


def edit(root, output, sandbox=False):
    for folder in ("classes", "flows", "objects", "triggers"):
        (output / folder).mkdir(parents=True, exist_ok=True)

    source = (root / "classes/SmsMessageQueueBatch.cls").read_text()
    if ("WebdevOutboundCapture" in source) != sandbox:
        raise ValueError("The baseline's outbound containment does not match the target mode.")
    source = source.replace("WHERE Status__c IN ('New', 'Retry')",
                            "WHERE Event_Key__c = null AND Status__c IN ('New', 'Retry')")
    source = source.replace("WHERE Id IN :scopeIds AND Status__c IN ('New', 'Retry')",
                            "WHERE Id IN :scopeIds AND Event_Key__c = null AND Status__c IN ('New', 'Retry')")
    write_class(root, output, "SmsMessageQueueBatch", source)

    trigger_name = "SMSMessageQueueTrigger.trigger"
    source = (root / "triggers" / trigger_name).read_text()
    original = "        SmsMessageQueueBatch.triggerBatchJob();"
    if original not in source:
        raise ValueError("SMS queue trigger launch point changed.")
    source = source.replace(original, """        Boolean hasRegional = false;
        Boolean hasLegacy = false;
        for (SMS_Message_Queue__c message : Trigger.new) {
            hasRegional = hasRegional || message.Event_Key__c != null;
            hasLegacy = hasLegacy || message.Event_Key__c == null;
        }
        VpcsRegionalSmsWake.wakeAfterInsert(hasRegional, hasLegacy);""")
    (output / "triggers" / trigger_name).write_text(source.rstrip() + "\n")
    trigger_meta = trigger_name + "-meta.xml"
    (output / "triggers" / trigger_meta).write_bytes((root / "triggers" / trigger_meta).read_bytes())

    name = "AgentPortalReminderBatch"
    source = (root / "classes" / (name + ".cls")).read_text()
    if ("WebdevOutboundCapture" in source) != sandbox:
        raise ValueError("The baseline's outbound containment does not match the target mode.")
    source = source.replace("    private static final String PORTAL_BASE_URL = 'https://veteranpcs.my.site.com/s/agent-portal';\n\n", "")
    source = source.replace("""    // Main phone number listed on the VeteranPCS website; used as the default SMS "From" number.
    private static final String DEFAULT_FROM_PHONE_NUMBER = '+17197825065';""",
                            """    // Existing sender for onboarding and other non-Customer reminder records.
    private static final String LEGACY_FROM_PHONE_NUMBER = '+17197825065';""")
    source = source.replace("OR Last_Speed_To_Lead_Reminder__c < :cutoff)",
                            "OR Last_Speed_To_Lead_Reminder__c < :cutoff)\n            WITH SYSTEM_MODE")
    source = source.replace("SELECT Id, Name, Agent_Email__c, Agent__c, Last_Speed_To_Lead_Reminder__c,",
                            """SELECT Id, Name, Agent_Email__c, Agent__c, Last_Speed_To_Lead_Reminder__c,
                   RecordTypeId, Destination_State__c, Description, Additional_Comments__c,""")
    source = source.replace("List<MessagingService.FlowSmsRequest> smsRequests = new List<MessagingService.FlowSmsRequest>();",
                            "List<SMS_Message_Queue__c> smsRequests = new List<SMS_Message_Queue__c>();")
    source = source.replace("        List<Lead> toUpdate = new List<Lead>();",
                            """        List<Lead> toUpdate = new List<Lead>();
        List<VpcsRegionalRoutingExceptions.Issue> exceptions = new List<VpcsRegionalRoutingExceptions.Issue>();
        Boolean isSandbox = [SELECT IsSandbox FROM Organization WITH SYSTEM_MODE LIMIT 1].IsSandbox;
        String legacyPortal = isSandbox
            ? 'https://veteranpcs--webdev.sandbox.my.site.com/s/agent-portal'
            : 'https://veteranpcs.my.site.com/s/agent-portal';""")
    source = source.replace("            emails.add(buildReminderEmail(l, adminOrgWideEmailAddressId));", """            Boolean customer = VpcsCustomerRouting.isCustomer(l);
            if (customer && VpcsCustomerRouting.isSpam(l)) {
                continue;
            }
            VpcsCustomerRouting.Route route = customer ? VpcsCustomerRouting.forLead(l) : null;
            String portalLink = customer ? route.portalLink(l.Agent__c) : legacyPortal + '?agentId=' + l.Agent__c;
            if (portalLink != null) {
                emails.add(buildReminderEmail(l, adminOrgWideEmailAddressId, portalLink));
            }
            if (customer) {
                VpcsRegionalRoutingExceptions.Reason issue = reminderIssue(l, route, portalLink);
                if (issue != null) {
                    exceptions.add(new VpcsRegionalRoutingExceptions.Issue(l.Id, route, issue));
                }
            }""")
    source = source.replace("""            MessagingService.FlowSmsRequest smsRequest = buildNewLeadSmsRequest(l);
            if (smsRequest != null) {
                smsRequests.add(smsRequest);
            }

            Integer newCount = """, """            Integer newCount = """)
    source = source.replace("            Lead leadUpdate = new Lead(",
                            """            SMS_Message_Queue__c smsRequest = customer
                ? buildNewLeadSmsRequest(l, route, newCount, portalLink)
                : buildLegacySmsRequest(l, portalLink);
            if (smsRequest != null) {
                smsRequests.add(smsRequest);
            }
            Lead leadUpdate = new Lead(""")
    source = source.replace("                emails.add(buildAdminEscalationEmail(l, adminOrgWideEmailAddressId));",
                            """                String adminEmail = customer ? route.binding?.notificationEmail : 'admin@veteranpcs.com';
                if (!String.isBlank(adminEmail)) {
                    emails.add(buildAdminEscalationEmail(l, adminOrgWideEmailAddressId, adminEmail));
                }""")
    i = source.index("        if (!smsRequests.isEmpty())")
    j = source.index("        if (!toUpdate.isEmpty())", i)
    source = source[:i] + """        VpcsRegionalSms.enqueue(smsRequests);
        VpcsRegionalRoutingExceptions.report(exceptions);
""" + source[j:]
    source = source.replace("buildReminderEmail(Lead l, Id orgWideEmailAddressId) {",
                            "buildReminderEmail(Lead l, Id orgWideEmailAddressId, String portalLink) {")
    source = source.replace("        String portalLink = PORTAL_BASE_URL + '?agentId=' + l.Agent__c;\n", "")
    i = source.index("    // GitHub issue #19.")
    j = source.index("        String htmlBody =", i)
    source = source[:i] + """    private static VpcsRegionalRoutingExceptions.Reason reminderIssue(
        Lead record, VpcsCustomerRouting.Route route, String portalLink
    ) {
        if (!route.known) {
            return VpcsRegionalRoutingExceptions.Reason.UNKNOWN_DESTINATION;
        }
        if (route.binding == null) {
            return VpcsRegionalRoutingExceptions.Reason.MISSING_ROUTING_BINDING;
        }
        if (route.sender() == null) {
            return VpcsRegionalRoutingExceptions.Reason.MISSING_SENDER;
        }
        if (portalLink == null) {
            return VpcsRegionalRoutingExceptions.Reason.MISSING_PORTAL;
        }
        String phone = VpcsRegionalSms.phone(record.Agent__r?.PersonMobilePhone, record.Agent__r?.Phone);
        if (phone == null || phone == route.sender()) {
            return VpcsRegionalRoutingExceptions.Reason.MISSING_AGENT_PHONE;
        }
        return null;
    }

    private static SMS_Message_Queue__c buildNewLeadSmsRequest(
        Lead l, VpcsCustomerRouting.Route route, Integer count, String portalLink
    ) {
        if (portalLink == null) {
            return null;
        }
        String phone = VpcsRegionalSms.phone(l.Agent__r?.PersonMobilePhone, l.Agent__r?.Phone);
        return VpcsRegionalSms.message(l.Id, l.Agent__c, 'PORTAL_REMINDER:' + count, phone,
            VpcsRegionalLeadIntake.agentPortalSms(portalLink), route);
    }

    private static SMS_Message_Queue__c buildLegacySmsRequest(Lead l, String portalLink) {
        String phone = !String.isBlank(l.Agent__r?.PersonMobilePhone)
            ? l.Agent__r.PersonMobilePhone : l.Agent__r?.Phone;
        return String.isBlank(phone) ? null : new SMS_Message_Queue__c(
            To_Phone_Number__c = phone,
            From_Phone_Number__c = LEGACY_FROM_PHONE_NUMBER,
            Message__c = reminderSmsBody(portalLink),
            Status__c = 'New',
            Retry_Count__c = 0
        );
    }

    private static String reminderSmsBody(String portalLink) {
        return 'NEW LEAD from VeteranPCS - click link below to Accept and view their contact info. ' +
            'When you accept the lead it will notify us. If you cannot work with them after accepting please text or email us back, thank you!\\n\\n' +
            portalLink + '\\n\\n' +
            'Note: this text will remind you every hour until the lead is accepted or declined.';
    }

    private static Messaging.SingleEmailMessage buildAdminEscalationEmail(
        Lead l, Id orgWideEmailAddressId, String adminEmail
    ) {
""" + source[j:]
    source = source.replace("""        mail.setToAddresses(new List<String>{ 'admin@veteranpcs.com' });
        mail.setCcAddresses(new List<String>{ 'info@veteranpcs.com' });""",
                            """        mail.setToAddresses(new List<String>{ adminEmail });
        mail.setCcAddresses(new List<String>{ 'info@veteranpcs.com' });""")
    write_class(root, output, name, source)

    test_name = "AgentPortalReminderBatchTest"
    test = (root / "classes" / (test_name + ".cls")).read_text()
    test = test.replace("Status = 'New:_Not_Contacted',",
                        "RecordTypeId = customerType(), Destination_State__c = 'VA', Status = 'New:_Not_Contacted',")
    test = test.replace("SELECT Id, Name,", "SELECT Id, Name, RecordTypeId, Destination_State__c, Description, Additional_Comments__c,")
    test = test.replace("'5559998888', queued", "'+15559998888', queued")
    test = test.replace("'+17197825065'", "'+17192494757'").replace("default VeteranPCS number", "regional admin number")
    last_brace = test.rfind("}")
    test = test[:last_brace] + """
    private static Id customerType() {
        return Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
    }

    @IsTest
    static void nonCustomerRemindersRetainTheLegacyQueueAndCadence() {
        Lead fixture = [SELECT Agent__c FROM Lead WHERE LastName = 'LeadOne'];
        Id legacyType = Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Agent').getRecordTypeId();
        Lead onboarding = new Lead(RecordTypeId=legacyType, LastName='Synthetic Partner Onboarding',
            Company='VeteranPCS', Agent__c=fixture.Agent__c, Agent_Email__c='testagent@example.com',
            Status='New:_Not_Contacted');
        insert onboarding;

        Test.startTest();
        Database.executeBatch(new AgentPortalReminderBatch(), 200);
        Test.stopTest();

        Lead result = [
            SELECT Status, Speed_To_Lead_Reminder_Count__c, Last_Speed_To_Lead_Reminder__c
            FROM Lead WHERE Id=:onboarding.Id
        ];
        System.assertEquals('New:_Not_Contacted', result.Status);
        System.assertEquals(1, result.Speed_To_Lead_Reminder_Count__c);
        System.assertNotEquals(null, result.Last_Speed_To_Lead_Reminder__c);
        SMS_Message_Queue__c legacy = [
            SELECT Event_Key__c, Related_Lead__c, To_Phone_Number__c, From_Phone_Number__c
            FROM SMS_Message_Queue__c WHERE Event_Key__c = null
        ];
        System.assertEquals(null, legacy.Related_Lead__c);
        System.assertEquals('5559998888', legacy.To_Phone_Number__c);
        System.assertEquals('+17197825065', legacy.From_Phone_Number__c);
    }
""" + test[last_brace:]
    write_class(root, output, test_name, test)

    if sandbox:
        write_webdev_capture_test(root, output)

    queue = ET.Element(q("CustomObject"))
    baseline = ET.parse(root / "objects/SMS_Message_Queue__c.object").getroot()
    status = next(field for field in baseline.findall(q("fields")) if field.findtext(q("fullName")) == "Status__c")
    enum = status.find(f'{q("valueSet")}/{q("valueSetDefinition")}')
    if not any(item.findtext(q("fullName")) == "Held" for item in enum.findall(q("value"))):
        held = ET.SubElement(enum, q("value"))
        for key, value in {"fullName": "Held", "default": "false", "label": "Held"}.items():
            child(held, key, value)
    queue.append(status)
    make_field(queue, "Event_Key__c", "Event Key", "Text", length="160", unique="true",
               externalId="true", caseSensitive="false")
    make_field(queue, "Claim_Job_Id__c", "Claim Job ID", "Text", length="18")
    make_field(queue, "Related_Lead__c", "Related Lead", "Lookup", deleteConstraint="SetNull",
               referenceTo="Lead", relationshipLabel="Regional SMS Messages", relationshipName="Regional_SMS_Messages")
    make_field(queue, "Related_Opportunity__c", "Related Opportunity", "Lookup", deleteConstraint="SetNull",
               referenceTo="Opportunity", relationshipLabel="Regional SMS Messages", relationshipName="Regional_SMS_Messages")
    make_field(queue, "Related_Partner__c", "Related Partner", "Lookup", deleteConstraint="SetNull",
               referenceTo="Account", relationshipLabel="Regional SMS Messages", relationshipName="Regional_SMS_Messages")
    write_tree(queue, output / "objects/SMS_Message_Queue__c.object")

    path = "Lead_WebToLead_AfterInsert.flow"
    flow = ET.parse(root / "flows" / path).getroot()
    for node in list(flow):
        name = node.findtext(q("name"))
        if name in {"Send_New_Lead_SMS_to_Agent", "Agent_Has_Phone", "TXT_New_Lead_SMS_Message",
                    "FOR_SMS_ToPhoneNumber"}:
            flow.remove(node)
            continue
        for connector in node.iter(q("connector")):
            target = connector.find(q("targetReference"))
            if target is not None and target.text == "Agent_Has_Phone":
                target.text = "Set_Initial_Speed_To_Lead_Reminder_Timestamp"
        for target in node.iter(q("targetReference")):
            if target.text == "Alert_ISA_Admin_0_0_0":
                target.text = "Guard_Regional_Intake"
    add_decision(flow, "Guard_Regional_Intake", "Regional Contact Intake Guard", "Alert_ISA_Admin_0_0_0",
        "Routing_Intake_Handled",
        'AND({!$Record.RecordType.DeveloperName}="Customer",'
        'OR(AND(ISPICKVAL({!$Record.LeadSource},"Contact Agent"),'
        'REGEX(LOWER({!$Record.WebFormURL__c}),"^https?://[^/?#]+/contact-agent/?([?#].*)?$")),'
        'AND(ISPICKVAL({!$Record.LeadSource},"Contact Lender"),'
        'REGEX(LOWER({!$Record.WebFormURL__c}),"^https?://[^/?#]+/contact-lender/?([?#].*)?$"))))')
    write_tree(flow, output / "flows" / path)
    for name in ["Lead_BeforeUpsert", "Opportunity_Open_BeforeUpsert", "Opportunity_BeforeUpdate",
                 "Opportunity_AfterUpdate", "Opportunity_After_Upsert", "Opportunity_AfterUpsert_Open_Interviewing"]:
        path = name + ".flow"
        flow = ET.parse(root / "flows" / path).getroot()
        if flow.findtext(q("status")) != "Active":
            continue
        wire_flow_guard(flow)
        write_tree(flow, output / "flows" / path)


    for name, action, record_field in [
        ("Form_Lead_Update_subflow", "Send_Admin_Alert_Email", "Lead__c"),
        ("Form_Opportunity_Update_subflow", "Send_Admin_Alert_Email", "Opportunity__c"),
        ("SUB_Send_Lead_Status_Specific_Email_Alert", "Send_Lead_Accepted_Alert", "Lead__c"),
    ]:
        path = name + ".flow"
        flow = ET.parse(root / "flows" / path).getroot()
        wire_admin_email(flow, action, "VAR_TriggeringForm." + record_field)
        write_tree(flow, output / "flows" / path)

    for filename, collection, input_name in [
        ("Daily_Lead_Update_Email_Scheduler_p3yatg.flow", "VAR_LeadsToUpdate", "leads"),
        ("Daily_Opp_Update_Scheduler.flow", "VAR_OppsToUpdate", "opportunities"),
    ]:
        flow = ET.parse(root / "flows" / filename).getroot()
        wire_daily_status(flow, collection, input_name)
        write_tree(flow, output / "flows" / filename)

    workflow_path = output / "workflows/Lead.workflow"
    if sandbox:
        # The sandbox alert remains on its single verified containment recipient.
        workflow_path.unlink(missing_ok=True)
    else:
        original = ET.parse(root / "workflows/Lead.workflow").getroot()
        alert = next(item for item in original.findall(q("alerts"))
                     if item.findtext(q("fullName")) == "New_Lead_Alert_Unassigned_Customer")
        for recipient in alert.findall(q("recipients")):
            alert.remove(recipient)
        recipient = ET.Element(q("recipients"))
        child(recipient, "type", "owner")
        insertion = next(i for i, item in enumerate(alert) if item.tag in (q("senderAddress"), q("senderType"), q("template")))
        alert.insert(insertion, recipient)
        scoped = ET.Element(q("Workflow"))
        scoped.append(alert)
        write_tree(scoped, workflow_path)


def write_webdev_capture_test(root, output):
    name = "WebdevOutboundCaptureTest"
    source = (root / "classes" / (name + ".cls")).read_text()
    source = source.replace("""        Lead reminder = new Lead(LastName = 'Synthetic Reminder', Company = 'Capture Fixture',
            Agent_Email__c = 'reminder@example.test');""",
                            """        RecordType partnerType = [
            SELECT Id FROM RecordType WHERE SObjectType = 'Account'
                AND DeveloperName = 'PersonAccountAgent' AND IsPersonType = true LIMIT 1
        ];
        Account partner = new Account(RecordTypeId = partnerType.Id, FirstName = 'Synthetic',
            LastName = 'Regional Capture Partner', PersonMobilePhone = '+12025550103');
        insert partner;
        Id customerType = Lead.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName().get('Customer').getRecordTypeId();
        Lead reminder = new Lead(RecordTypeId=customerType, LastName = 'Synthetic Reminder', Company = 'Capture Fixture',
            Agent__c = partner.Id, Agent_Email__c = 'reminder@example.test', Destination_State__c = 'CO');""")
    source = source.replace("SELECT Id, Name, Agent_Email__c, Agent__c, Last_Speed_To_Lead_Reminder__c,",
                            """SELECT Id, Name, Agent_Email__c, Agent__c, Last_Speed_To_Lead_Reminder__c,
                   RecordTypeId, Destination_State__c, Description, Additional_Comments__c,""")
    write_class(root, output, name, source)


def wire_daily_status(flow, collection, input_name):
    sms = next(node for node in flow.findall(q("subflows"))
               if node.findtext(q("name")) == "Queue_Lead_Status_SMS_Message")
    after_sms = sms.findtext(f'{q("connector")}/{q("targetReference")}')
    for target in flow.iter(q("targetReference")):
        if target.text == "Queue_Lead_Status_SMS_Message":
            target.text = after_sms
    flow.remove(sms)
    action = next(node for node in flow.findall(q("actionCalls"))
                  if node.findtext(q("name")) == "Trigger_Send_SMS_Batch_job")
    action.find(q("label")).text = "Queue daily regional status SMS"
    action.find(q("actionName")).text = "VpcsRegionalDailyStatusQueue"
    action.find(q("nameSegment")).text = "VpcsRegionalDailyStatusQueue"
    action.find(q("flowTransactionModel")).text = "CurrentTransaction"
    index = list(action).index(action.find(q("nameSegment")))
    param = ET.Element(q("inputParameters"))
    child(param, "name", input_name)
    child(ET.SubElement(param, q("value")), "elementReference", collection)
    action.insert(index, param)


def wire_admin_email(root, email_action, customer_reference):
    email = next(node for node in root.findall(q("actionCalls")) if node.findtext(q("name")) == email_action)
    resolver_name = "Resolve_Regional_Admin_Recipients"
    for target in root.iter(q("targetReference")):
        if target.text == email_action:
            target.text = resolver_name

    address = next((param for param in email.findall(q("inputParameters"))
                    if param.findtext(q("name")) == "emailAddresses"), None)
    fixed_copy = address.findtext(f'{q("value")}/{q("stringValue")}') if address is not None else None
    if address is None:
        address = ET.Element(q("inputParameters"))
        child(address, "name", "emailAddresses")
        child(address, "value", "")
        email.insert(list(email).index(email.find(q("flowTransactionModel"))) + 1, address)
    value = address.find(q("value"))
    value.clear()
    child(value, "elementReference", resolver_name + ".addresses")

    resolver = ET.Element(q("actionCalls"))
    for key, val in {
        "name": resolver_name, "label": "Resolve Regional Admin Recipients", "locationX": "0", "locationY": "0",
        "actionName": "VpcsRegionalAdminEmailRecipients", "actionType": "apex",
    }.items():
        child(resolver, key, val)
    child(ET.SubElement(resolver, q("connector")), "targetReference", email_action)
    child(resolver, "flowTransactionModel", "CurrentTransaction")
    for name, val, source_type in [
        ("customerId", customer_reference, "elementReference"),
        ("operationalCopy", fixed_copy, "stringValue"),
    ]:
        if val:
            param = ET.SubElement(resolver, q("inputParameters"))
            child(param, "name", name)
            child(ET.SubElement(param, q("value")), source_type, val)
    child(resolver, "nameSegment", "VpcsRegionalAdminEmailRecipients")
    child(resolver, "offset", "0")
    child(resolver, "storeOutputAutomatically", "true")
    root.insert(list(root).index(email), resolver)


def wire_flow_guard(root):
    # The existing record-field scheduled paths keep their original entry, timing, and connectors.
    # Guard the synchronous path for the temporary migration permission.
    connector = root.find(f'{q("start")}/{q("connector")}/{q("targetReference")}')
    if connector is None:
        raise ValueError("Expected a synchronous Flow entry.")
    old_target = connector.text
    connector.text = "Guard_Routing_Migration"
    add_decision(root, "Guard_Routing_Migration", "Routing Migration", old_target,
                 "Routing_Migration_Transfer",
                 'AND({!$Permission.VPCS_Routing_Migration},ISCHANGED({!$Record.OwnerId}))')


def add_decision(root, name, label, default_target, rule_name, expression):
    decision = ET.Element(q("decisions"))
    for key, value in {"name": name, "label": label, "locationX": "0", "locationY": "0"}.items():
        child(decision, key, value)
    child(ET.SubElement(decision, q("defaultConnector")), "targetReference", default_target)
    child(decision, "defaultConnectorLabel", "Continue")
    rule = ET.SubElement(decision, q("rules"))
    child(rule, "name", rule_name)
    child(rule, "conditionLogic", "and")
    cond = ET.SubElement(rule, q("conditions"))
    child(cond, "leftValueReference", name + "_Check")
    child(cond, "operator", "EqualTo")
    child(ET.SubElement(cond, q("rightValue")), "booleanValue", "true")
    child(rule, "label", "Stop")
    decisions = root.findall(q("decisions"))
    if decisions:
        root.insert(list(root).index(decisions[0]), decision)
    else:
        root.insert(list(root).index(root.find(q("apiVersion"))) + 1, decision)
    formula = ET.Element(q("formulas"))
    child(formula, "name", name + "_Check")
    child(formula, "dataType", "Boolean")
    child(formula, "expression", expression)
    environments = root.findall(q("environments"))
    root.insert(list(root).index(environments[-1]) + 1, formula)



def write_class(root, output, name, source):
    if source == (root / "classes" / (name + ".cls")).read_text():
        raise ValueError(f"Integration patch did not match {name}")
    (output / "classes" / (name + ".cls")).write_text(source.rstrip() + "\n")
    (output / "classes" / (name + ".cls-meta.xml")).write_bytes(
        (root / "classes" / (name + ".cls-meta.xml")).read_bytes())


def make_field(obj, name, label, kind, **attributes):
    field = ET.SubElement(obj, q("fields"))
    child(field, "fullName", name)
    for key, value in sorted(dict(label=label, type=kind, required="false", **attributes).items()):
        child(field, key, value)


def write_admin_object(output):
    obj = ET.Element(q("CustomObject"))
    for name, label, length in [
        ("Notification_Email__c", "Notification Email", 255), ("Org_Id__c", "Organization ID", 18),
        ("Sender__c", "Sender", 20), ("Username__c", "Username", 255),
        ("Portal_URL__c", "Agent Portal URL", 255),
    ]:
        make_field(obj, name, label, "Text", length=str(length), fieldManageability="DeveloperControlled")
    make_field(obj, "Dispatch_Enabled__c", "Dispatch Enabled", "Checkbox",
               fieldManageability="DeveloperControlled", defaultValue="false")
    child(obj, "label", "VeteranPCS Regional Admin")
    child(obj, "pluralLabel", "VeteranPCS Regional Admins")
    child(obj, "visibility", "Public")
    write_tree(obj, output / "objects/Vpcs_Regional_Admin__mdt.object")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("baseline", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--sandbox", action="store_true")
    args = parser.parse_args()
    edit(args.baseline, args.output, args.sandbox)
    write_admin_object(args.output)
