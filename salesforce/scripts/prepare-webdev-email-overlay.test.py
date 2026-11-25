"""Offline recipient overlay tests using synthetic Salesforce metadata only."""

from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from xml.etree import ElementTree as ET

SCRIPT = Path(__file__).with_name("prepare-webdev-email-overlay.py")
SPEC = importlib.util.spec_from_file_location("webdev_email_overlay", SCRIPT)
overlay = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = overlay
SPEC.loader.exec_module(overlay)

NS = overlay.METADATA_NS
APPROVED = overlay.APPROVED_EMAIL
FIXTURE_CONTACT = "003000000000001AAA"


def xml(kind, contents):
    return ET.fromstring(f'<{kind} xmlns="{NS}">{contents}</{kind}>')


def field(name, value, value_type="stringValue"):
    return f"""
      <inputParameters><name>{name}</name>
        <value><{value_type}>{value}</{value_type}></value>
      </inputParameters>
    """


def email_action(*inputs):
    return f"""
      <actionCalls><name>Send</name><actionName>emailSimple</actionName>
        <actionType>emailSimple</actionType><connector><targetReference>Next</targetReference></connector>
        {"".join(inputs)}
      </actionCalls>
    """


def email_alert(*inputs):
    return f"""
      <actionCalls><name>Alert</name><actionName>Lead.Welcome</actionName>
        <actionType>emailAlert</actionType>
        {field("SObjectRowId", "$Record.Id", "elementReference")}
        {"".join(inputs)}
      </actionCalls>
    """


def sample_flow(*actions):
    return xml("Flow", f"""
      <apiVersion>62.0</apiVersion><status>Active</status>
      <start><scheduledPaths><name>FollowUp</name><offsetNumber>5</offsetNumber>
      <offsetUnit>Minutes</offsetUnit></scheduledPaths></start>
      <decisions><name>ChoosePath</name><label>Choose path</label></decisions>
      {"".join(actions)}
    """)


def sample_alert(name):
    return f"""
      <alerts><fullName>{name}</fullName>
        <ccEmails>cc1@example.invalid,cc2@example.invalid</ccEmails>
        <ccEmails>cc3@example.invalid</ccEmails><description>Preserve this</description>
        <recipients><type>email</type><field>Agent_Email__c</field></recipients>
        <recipients><type>user</type><recipient>user@example.invalid</recipient></recipients>
        <senderType>OrgWideEmailAddress</senderType><template>Leads/Preserve</template>
      </alerts>
    """


def dispatch_inputs(flow):
    action = next(a for a in flow.findall(overlay.tag("actionCalls"))
                  if overlay.child_text(a, "actionType") == "emailSimple")
    inputs = {}
    for parameter in action.findall(overlay.tag("inputParameters")):
        value = parameter.find(overlay.tag("value"))
        inputs[overlay.child_text(parameter, "name")] = [node.text for node in value] if value is not None else []
    return inputs


class PrepareWebdevEmailOverlayTests(unittest.TestCase):
    def test_removes_all_envelope_variants_and_preserves_flow_logic(self):
        original = sample_flow(email_action(
            field("emailAddresses", "old@example.invalid"),
            field("toRecipientAddressList", "$Record.Email", "elementReference"),
            field("ccRecipientAddressList", "cc@example.invalid"),
            field("bccAddressesCollection", "$Record.Manager.Email", "elementReference"),
            field("emailBody", "Body with links unchanged"),
            '<inputParameters><name>attachmentId</name></inputParameters>',
        ))
        inputs = overlay.Inputs(flows={"Scheduled": original}, workflows={"Lead": xml("Workflow", "")})
        flow_files, _, inventory = overlay.prepare_overlay(inputs)
        result = flow_files["Scheduled"]
        self.assertEqual(overlay.flow_projection(result), overlay.flow_projection(original))
        self.assertEqual(dispatch_inputs(result), {
            "emailAddresses": [APPROVED],
            "emailBody": ["Body with links unchanged"],
            "attachmentId": [],
        })
        self.assertIn("old@example.invalid", ET.tostring(original, encoding="unicode"))
        self.assertEqual(inventory["cloud_verification"], "pending")

    def test_uses_one_fixture_contact_for_template_and_keeps_activity_link(self):
        original = sample_flow(email_action(
            field("emailAddresses", "old@example.invalid"),
            field("ccEmails", "cc@example.invalid"),
            field("Recipient_ID_Collection", "Old_Contacts", "elementReference"),
            field("recipientId", "003000000000002AAA"),
            field("relatedRecordId", "$Record.Id", "elementReference"),
            field("useEmailTemplate", "true"),
            field("emailTemplateId", "Template.Id", "elementReference"),
            field("logEmailOnSend", "true", "booleanValue"),
        ))
        inputs = overlay.Inputs(flows={"Templated": original}, workflows={"Lead": xml("Workflow", "")})
        _, _, dry_run = overlay.prepare_overlay(inputs)
        self.assertTrue(dry_run["fixture_contact_required"])

        flow_files, _, inventory = overlay.prepare_overlay(inputs, FIXTURE_CONTACT)
        result = dispatch_inputs(flow_files["Templated"])
        self.assertEqual(set(result), {
            "recipientId", "relatedRecordId", "useEmailTemplate", "emailTemplateId", "logEmailOnSend",
        })
        self.assertEqual(result["recipientId"], [FIXTURE_CONTACT])
        self.assertEqual(result["relatedRecordId"], ["$Record.Id"])
        self.assertTrue(inventory["flow_actions"][0]["logs_activity"])
        self.assertFalse(inventory["fixture_contact_required"])

    def test_packages_referenced_alerts_only_including_timed_classic_rules(self):
        active_rule = """
          <rules><fullName>Scheduled_Rule</fullName><active>true</active>
            <workflowTimeTriggers><actions><name>FromRule</name><type>Alert</type></actions></workflowTimeTriggers>
          </rules>
        """
        workflow = xml("Workflow", sample_alert("Welcome") + sample_alert("FromRule") + sample_alert("Unused") + active_rule)
        inputs = overlay.Inputs(flows={"Primary": sample_flow(email_alert())}, workflows={"Lead": workflow})
        flow_files, alerts, inventory = overlay.prepare_overlay(inputs)
        self.assertEqual(flow_files, {})
        self.assertEqual(inventory["workflow_alerts_rewritten"], ["Lead.FromRule", "Lead.Welcome"])
        self.assertEqual(inventory["retrieved_alerts_without_active_flow_or_rule_reference"], ["Lead.Unused"])
        for alert in alerts["Lead"]:
            name = overlay.child_text(alert, "fullName")
            self.assertEqual([n.text for n in alert.findall(overlay.tag("ccEmails"))], [APPROVED])
            self.assertEqual(alert.findall(overlay.tag("recipients")), [])
            self.assertEqual(overlay.alert_projection(alert), overlay.alert_projection(
                next(a for a in workflow.findall(overlay.tag("alerts"))
                     if overlay.child_text(a, "fullName") == name)
            ))
        manifest = overlay.package_manifest("62.0", flow_files, inventory["workflow_alerts_rewritten"])
        self.assertEqual([n.text for n in manifest.iter(overlay.tag("name"))], ["WorkflowAlert"])
        self.assertEqual([n.text for n in manifest.iter(overlay.tag("members"))], ["Lead.FromRule", "Lead.Welcome"])

    def test_rejects_unknown_recipient_shapes_and_unsafe_template_switches(self):
        cases = [
            (email_action(field("emailAddresses", "old@example.invalid"), field("BlindRecipientV2", "other")),
             "unknown or duplicate Send Email input"),
            (email_action(field("emailAddresses", "old@example.invalid"), field("Email_Addresses", "other")),
             "unknown or duplicate Send Email input"),
            (email_action(field("emailAddresses", "old@example.invalid"),
                          field("useEmailTemplate", "$Record.Use_Template__c", "elementReference")),
             "requires a literal useemailtemplate value"),
            (email_action(field("emailAddresses", "old@example.invalid"), field("useEmailTemplate", "true")),
             "requires a recognized template reference"),
            (email_alert(field("recipientId", "003000000000002AAA")),
             "unsupported Email Alert input structure"),
        ]
        for action, error in cases:
            with self.subTest(error=error):
                inputs = overlay.Inputs(flows={"Primary": sample_flow(action)},
                                        workflows={"Lead": xml("Workflow", sample_alert("Welcome"))})
                with self.assertRaisesRegex(overlay.InventoryError, error):
                    overlay.prepare_overlay(inputs, FIXTURE_CONTACT)

    def test_rejects_incomplete_workflow_inventory(self):
        inputs = overlay.Inputs(flows={"Primary": sample_flow(email_alert())}, workflows={"Lead": xml("Workflow", "")})
        with self.assertRaisesRegex(overlay.InventoryError, "Missing definitions .* Lead.Welcome"):
            overlay.prepare_overlay(inputs)
        flow = sample_flow()
        flow.append(xml("subflows", "<flowName>Missing_Child</flowName>"))
        with self.assertRaisesRegex(overlay.InventoryError, "unaudited subflow Missing_Child"):
            overlay.prepare_overlay(overlay.Inputs(flows={"Primary": flow}, workflows=inputs.workflows))

    def test_rewrites_only_reviewed_portal_origins_and_preserves_paths(self):
        name = "SUB_Send_Agent_Lead_Status_Update_Email"
        original = sample_flow(
            email_action(
                field("emailAddresses", "$Record.Email", "elementReference"),
                field("emailBody", "Tap https://veteranpcs.my.site.com/s/lead-update?leadId={!Lead.Id}"),
            ).replace("<name>Send</name>", "<name>Action_Send_Email_to_Agent</name>")
        )
        original.append(xml("formulas", """
            <name>FOR_LeadUpdateURL</name>
            <expression>"https://veteranpcs.my.site.com/s/lead-update?leadId=" &amp; {!Lead.Id}</expression>
        """))
        inputs = overlay.Inputs(flows={name: original}, workflows={"Lead": xml("Workflow", "")})
        _, _, planned = overlay.prepare_overlay(inputs)
        self.assertTrue(planned["portal_origin_required"])
        self.assertEqual(len(planned["portal_link_rewrites"]), 2)

        flows, _, verified = overlay.prepare_overlay(inputs, portal_origin=overlay.SANDBOX_PORTAL)
        view = ET.tostring(flows[name], encoding="unicode")
        self.assertNotIn("https://veteranpcs.my.site.com", view)
        self.assertIn(f"{overlay.SANDBOX_PORTAL}/s/lead-update?leadId=", view)
        self.assertIn("<offsetNumber>5</offsetNumber>", view)
        self.assertIn(f"<stringValue>{APPROVED}</stringValue>", view)
        self.assertFalse(verified["portal_origin_required"])

        with self.assertRaisesRegex(overlay.InventoryError, "verified WebDev Experience Cloud"):
            overlay.prepare_overlay(inputs, portal_origin="https://veteranpcs.my.site.com")
        original.append(xml("formulas", """
            <name>Unknown_Link</name><expression>https://veteranpcs.my.site.com/s/unreviewed</expression>
        """))
        with self.assertRaisesRegex(overlay.InventoryError, "outside the reviewed link elements"):
            overlay.prepare_overlay(inputs, portal_origin=overlay.SANDBOX_PORTAL)

    def test_captures_email_settings_and_claims_only_new_private_output(self):
        inputs = overlay.Inputs(
            flows={"Primary": sample_flow(email_alert(), email_action(
                field("recipientId", "003000000000002AAA"), field("emailBody", "sample body"),
            ))},
            workflows={"Lead": xml("Workflow", sample_alert("Welcome"))},
            settings={
                "EmailAdministration": xml("EmailAdministrationSettings", "<enableComplianceBcc>true</enableComplianceBcc>"),
                "EmailIntegration": xml("EmailIntegrationSettings", "<enableGmailIntegration>true</enableGmailIntegration>"),
            },
        )
        flow_files, alert_files, pending = overlay.prepare_overlay(inputs)
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "private"
            candidate = root / "candidate"
            with self.assertRaisesRegex(overlay.InventoryError, "fixture Contact ID is required"):
                overlay.write_overlay(candidate, root, "62.0", flow_files, alert_files, pending)
            self.assertFalse(candidate.exists())

            flow_files, alert_files, inventory = overlay.prepare_overlay(inputs, FIXTURE_CONTACT)
            with self.assertRaisesRegex(overlay.InventoryError, "inside salesforce/retrieved-private"):
                overlay.write_overlay(Path(temp) / "outside", root, "62.0", flow_files, alert_files, inventory)
            overlay.write_overlay(candidate, root, "62.0", flow_files, alert_files, inventory)
            with self.assertRaisesRegex(overlay.InventoryError, "already exists"):
                overlay.write_overlay(candidate, root, "62.0", flow_files, alert_files, inventory)

            written = json.loads((candidate / "inventory.json").read_text())
            self.assertEqual(written, inventory)
            self.assertTrue(written["compliance_bcc_enabled"])
            self.assertTrue(written["email_integration_flags"]["enableGmailIntegration"])
            self.assertNotIn(FIXTURE_CONTACT, json.dumps(written))
            self.assertEqual(overlay.flow_projection(ET.parse(candidate / "flows/Primary.flow").getroot()),
                             overlay.flow_projection(inputs.flows["Primary"]))
            self.assertEqual({p.name for p in candidate.iterdir()},
                             {"flows", "workflows", "inventory.json", "package.xml"})

    def test_rejects_conflicting_sources_and_xml_entity_declarations(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            sources = [root / "first", root / "second"]
            for source in sources:
                (source / "flows").mkdir(parents=True)
                (source / "workflows").mkdir()
                (source / "package.xml").write_text(f'<Package xmlns="{NS}"><version>62.0</version></Package>')
                ET.ElementTree(sample_flow(email_alert())).write(source / "flows/Primary.flow", encoding="utf-8")
                (source / "workflows/Lead.workflow").write_text(f'<Workflow xmlns="{NS}">{sample_alert("Welcome")}</Workflow>')
            combined = overlay.read_inventory(sources)
            self.assertEqual(set(combined.flows), {"Primary"})

            modified = deepcopy(sample_flow(email_alert()))
            modified.find(overlay.tag("status")).text = "Draft"
            ET.ElementTree(modified).write(sources[1] / "flows/Primary.flow", encoding="utf-8")
            with self.assertRaisesRegex(overlay.InventoryError, "Conflicting metadata copies"):
                overlay.read_inventory(sources)
            (sources[1] / "package.xml").write_text(f'<!DOCTYPE Package [<!ENTITY v "62.0">]><Package xmlns="{NS}"><version>&v;</version></Package>')
            with self.assertRaisesRegex(overlay.InventoryError, "DOCTYPE and ENTITY"):
                overlay.read_inventory(sources)


if __name__ == "__main__":
    unittest.main()
