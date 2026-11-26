from pathlib import Path
from tempfile import TemporaryDirectory
import json
import re
import unittest
import xml.etree.ElementTree as ET

from generate import q, wire_assignment, write_policy
from prepare_baseline import wire_admin_email, wire_flow_guard


REPO = Path(__file__).resolve().parents[2]
POLICY_PATH = REPO / "config/routing/customer-admins.json"
CATALOG_PATH = REPO / "content/_data/site/state_list.json"


class RoutingGenerationTests(unittest.TestCase):
    def test_apex_map_matches_all_52_states_and_reviewed_aliases(self):
        policy = json.loads(POLICY_PATH.read_text())
        catalog = json.loads(CATALOG_PATH.read_text())
        with TemporaryDirectory() as directory:
            scope = Path(directory)
            (scope / "classes").mkdir()
            write_policy(policy, scope, catalog)
            apex = (scope / "classes/VpcsCustomerRoutingPolicy.cls").read_text()
        actual = dict(re.findall(r"'([A-Z]{2})' => '(BETH|STEPHANIE)'", apex))
        expected = {state: admin for admin, states in policy["territories"].items() for state in states}
        self.assertEqual(len(actual), 52)
        self.assertEqual(actual, expected)
        self.assertIn("'DELEWARE' => 'DE'", apex)
        self.assertIn("'DISTRICTOFCOLUMBIA' => 'DC'", apex)

    def test_assignment_rule_keeps_default_open_scope_and_noncustomer_rule(self):
        policy = json.loads(POLICY_PATH.read_text())
        with TemporaryDirectory() as directory:
            scope = Path(directory)
            baseline = scope / "baseline.xml"
            baseline.write_text(
                '<AssignmentRules xmlns="http://soap.sforce.com/2006/04/metadata">'
                '<assignmentRule><fullName>Default</fullName><active>true</active><ruleEntry>'
                '<assignedTo>baseline@example.test</assignedTo><assignedToType>User</assignedToType>'
                '<criteriaItems><field>Lead.Status</field><operation>equals</operation>'
                '<value>New:_Not_Contacted</value></criteriaItems></ruleEntry>'
                '</assignmentRule></AssignmentRules>'
            )
            bindings = {"BETH": {"username": "west@example.test"}, "STEPHANIE": {"username": "east@example.test"}}
            wire_assignment(baseline, scope, policy, bindings)
            rules = ET.parse(scope / "assignmentRules/Lead.assignmentRules").getroot()
            entries = rules.findall(f"{q('assignmentRule')}/{q('ruleEntry')}")
        self.assertEqual([row.findtext(q("assignedTo")) for row in entries],
                         ["west@example.test", "east@example.test", "baseline@example.test"])
        self.assertEqual(set(re.findall(r'Destination_State__c\)="([A-Z]{2})"', entries[0].findtext(q("formula")))),
                         set(policy["territories"]["BETH"]))
        for value in policy["openLeadStatuses"]:
            self.assertIn(f'TEXT(Status)="{value}"', entries[1].findtext(q("formula")))
        self.assertIn('RecordType.DeveloperName<>"Customer"', entries[2].findtext(q("formula")))

    def test_referral_email_keeps_template_merge_sender_and_native_continuation(self):
        flow = ET.fromstring(
            '<Flow xmlns="http://soap.sforce.com/2006/04/metadata">'
            '<actionCalls><name>Send_Admin</name><flowTransactionModel>CurrentTransaction</flowTransactionModel>'
            '<inputParameters><name>emailAddresses</name><value><stringValue>info@veteranpcs.com</stringValue>'
            '</value></inputParameters><inputParameters><name>recipientId</name>'
            '<value><stringValue>existing-merge-contact</stringValue></value></inputParameters>'
            '<inputParameters><name>emailTemplateId</name><value><stringValue>existing-template</stringValue>'
            '</value></inputParameters></actionCalls><start><connector><targetReference>Send_Admin</targetReference>'
            '</connector></start></Flow>'
        )
        wire_admin_email(flow, "Send_Admin", "VAR_Record.Lead__c")
        resolver, original = flow.findall(q("actionCalls"))
        values = {param.findtext(q("name")): next(iter(param.find(q("value")))).text
                  for param in original.findall(q("inputParameters"))}
        self.assertEqual(values, {"emailAddresses": "Resolve_Regional_Admin_Recipients.addresses",
                                  "recipientId": "existing-merge-contact", "emailTemplateId": "existing-template"})
        self.assertEqual(resolver.findtext(f"{q('connector')}/{q('targetReference')}"), "Send_Admin")
        self.assertEqual(flow.findtext(f"{q('start')}/{q('connector')}/{q('targetReference')}"),
                         "Resolve_Regional_Admin_Recipients")

    def test_migration_guard_leaves_scheduled_path_unchanged(self):
        flow = ET.fromstring(
            '<Flow xmlns="http://soap.sforce.com/2006/04/metadata"><apiVersion>67.0</apiVersion>'
            '<environments>Default</environments><start><connector><targetReference>Immediate</targetReference>'
            '</connector><scheduledPaths><connector><targetReference>Follow_Up</targetReference></connector>'
            '<offsetNumber>3</offsetNumber><offsetUnit>Days</offsetUnit><timeSource>RecordField</timeSource>'
            '</scheduledPaths></start></Flow>'
        )
        schedule = flow.find(f"{q('start')}/{q('scheduledPaths')}")
        before = ET.tostring(schedule)
        wire_flow_guard(flow)
        self.assertEqual(ET.tostring(schedule), before)
        self.assertEqual(flow.findtext(f"{q('start')}/{q('connector')}/{q('targetReference')}"),
                         "Guard_Routing_Migration")


if __name__ == "__main__":
    unittest.main()
