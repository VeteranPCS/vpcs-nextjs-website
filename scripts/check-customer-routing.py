#!/usr/bin/env python3
"""Verify the reviewed routing policy and Salesforce metadata offline using synthetic bindings."""

import json
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAMESPACE = {"sf": "http://soap.sforce.com/2006/04/metadata"}
ROUTING = Path("salesforce/routing")
POLICY_CLASS = Path("classes/VpcsCustomerRoutingPolicy.cls")
ASSIGNMENT_RULE = Path("assignmentRules/Lead.assignmentRules")
LEGACY = {
    "BETH": "AK AZ CA CO HI ID IA KS MO MT NE NV NM ND OR SD UT WA WY".split(),
    "STEPHANIE": "CT DE DC IL IN ME MD MA MI MN NH NJ NY OH PA PR RI VT VA WV WI".split(),
    "JESSICA": "AL FL GA NC SC".split(),
    "TARA": "AR KY LA MS OK TN TX".split(),
}
EXPECTED_TRANSFERS = {
    ("AR", "TARA", "BETH"), ("LA", "TARA", "BETH"), ("OK", "TARA", "BETH"),
    ("TX", "TARA", "BETH"), ("MN", "STEPHANIE", "BETH"),
    ("AL", "JESSICA", "STEPHANIE"), ("FL", "JESSICA", "STEPHANIE"),
    ("GA", "JESSICA", "STEPHANIE"), ("NC", "JESSICA", "STEPHANIE"),
    ("SC", "JESSICA", "STEPHANIE"), ("KY", "TARA", "STEPHANIE"),
    ("MS", "TARA", "STEPHANIE"), ("TN", "TARA", "STEPHANIE"),
}
EXPECTED_SENDERS = {"BETH": "+17192495359", "STEPHANIE": "+17192494757"}
SYNTHETIC_USERS = {"BETH": "west@example.invalid", "STEPHANIE": "east@example.invalid"}
BASELINE_ASSIGNMENT = """<?xml version="1.0" encoding="UTF-8"?>
<AssignmentRules xmlns="http://soap.sforce.com/2006/04/metadata">
    <assignmentRule>
        <fullName>Active fixture rule</fullName>
        <active>true</active>
        <ruleEntry>
            <assignedTo>legacy-status@example.invalid</assignedTo>
            <assignedToType>User</assignedToType>
            <criteriaItems>
                <field>Lead.Status</field>
                <operation>equals</operation>
                <value>New:_Not_Contacted</value>
            </criteriaItems>
        </ruleEntry>
        <ruleEntry>
            <assignedTo>noncustomer@example.invalid</assignedTo>
            <assignedToType>User</assignedToType>
            <formula>RecordType.DeveloperName="Agent"</formula>
        </ruleEntry>
    </assignmentRule>
    <assignmentRule>
        <fullName>Inactive fixture rule</fullName>
        <active>false</active>
        <ruleEntry>
            <assignedTo>inactive@example.invalid</assignedTo>
            <assignedToType>User</assignedToType>
            <formula>TRUE</formula>
        </ruleEntry>
    </assignmentRule>
</AssignmentRules>
"""


class CheckFailure(Exception):
    pass


def require(condition, message):
    if not condition:
        raise CheckFailure(message)


def xml(file):
    return ET.parse(file).getroot()


def value(element, name):
    return element.findtext(f"sf:{name}", namespaces=NAMESPACE)


def elements(element, path):
    return element.findall(path, NAMESPACE)


def json_file(file):
    return json.loads(file.read_text(encoding="utf-8"))


def routing_map(territories):
    state_owners = {state: owner for owner, states in territories.items() for state in states}
    require(len(state_owners) == sum(map(len, territories.values())), "Each territory must occur once")
    return state_owners


def apex_map(source, name):
    declaration = re.search(rf"\b{name}\s*=\s*new Map<String, String>\s*\{{(.*?)\}}", source, re.S)
    require(declaration is not None, f"Missing Apex policy map {name}")
    pairs = re.findall(r"'([^']+)'\s*=>\s*'([^']+)'", declaration.group(1))
    require(len(dict(pairs)) == len(pairs), f"Duplicate key in Apex map {name}")
    return dict(pairs)


def check_reviewed_policy(policy, catalog, apex_source):
    require(set(policy) == {"version", "source", "defaultAdmin", "territories", "openLeadStatuses",
                           "terminalOpportunityStages"}, "Routing policy must keep org bindings in operator input")
    require(set(policy["territories"]) == set(SYNTHETIC_USERS) and policy["defaultAdmin"] == "STEPHANIE",
            "Customer routing must use Beth and Stephanie with Stephanie as the default")
    roster = {item["code"] for item in catalog}
    require(len(roster) == len(catalog) == 52, "State catalog must cover 50 states, DC and PR")
    actual = routing_map(policy["territories"])
    legacy = routing_map(LEGACY)
    require(set(actual) == set(legacy) == roster, "Reviewed policy must cover the complete 52-territory roster")
    transfers = {(state, legacy[state], owner) for state, owner in actual.items() if legacy[state] != owner}
    require(transfers == EXPECTED_TRANSFERS, "Assignments differ from the independent 13-transfer review")

    require(apex_map(apex_source, "adminByState") == actual, "Apex state assignments differ from reviewed config")
    require(apex_map(apex_source, "senders") == EXPECTED_SENDERS, "Apex sender assignments differ from approved routing")
    canonical_names = {re.sub(r"[^A-Z]", "", row["name"].upper()): row["code"] for row in catalog}
    require(len(canonical_names) == 52, "State display-name aliases must be unique")
    aliases = {**canonical_names, "WASHINGTONDC": "DC", "DELEWARE": "DE"}
    require(apex_map(apex_source, "stateAliases") == aliases,
            "Apex aliases must cover the 52 display names plus Washington DC and Deleware")


def check_assignment_rules(output, policy):
    rules = elements(xml(output / ASSIGNMENT_RULE), "sf:assignmentRule")
    require([value(rule, "active") for rule in rules] == ["true", "false"], "Assignment rule activity changed")
    entries = elements(rules[0], "sf:ruleEntry")
    require([value(entry, "assignedTo") for entry in entries] ==
            [SYNTHETIC_USERS["BETH"], SYNTHETIC_USERS["STEPHANIE"],
             "legacy-status@example.invalid", "noncustomer@example.invalid"],
            "Active Customer criteria must precede preserved noncustomer entries")
    require(all(value(entry, "assignedToType") == "User" for entry in entries), "Assignment entry must target a user")

    status_terms = ",".join(f'TEXT(Status)="{status}"' for status in policy["openLeadStatuses"])
    beth_terms = ",".join(f'TEXT(Destination_State__c)="{state}"' for state in policy["territories"]["BETH"])
    customer = f'AND(RecordType.DeveloperName="Customer",OR({status_terms})'
    formulas = [value(entry, "formula") for entry in entries]
    require(formulas == [f"{customer},OR({beth_terms}))", f"{customer})",
                         'AND(RecordType.DeveloperName<>"Customer",TEXT(Status)="New:_Not_Contacted")',
                         'RecordType.DeveloperName="Agent"'],
            "Generated formulas must route eligible customers in order and retain the noncustomer baseline scope")
    inactive = elements(rules[1], "sf:ruleEntry")
    require(len(inactive) == 1 and value(inactive[0], "assignedTo") == "inactive@example.invalid" and
            value(inactive[0], "formula") == "TRUE", "Inactive baseline assignment rule changed")


def object_fields(metadata, name):
    fields = elements(xml(metadata / f"objects/{name}.object"), "sf:fields")
    by_name = {value(field, "fullName"): field for field in fields}
    require(len(by_name) == len(fields), f"Duplicate field in {name}")
    return by_name


def check_schema(metadata, migration):
    sms = object_fields(metadata, "SMS_Message_Queue__c")
    lookups = {"Related_Lead__c": "Lead", "Related_Opportunity__c": "Opportunity", "Related_Partner__c": "Account"}
    for field, target in lookups.items():
        actual = sms.get(field)
        require(actual is not None and value(actual, "referenceTo") == target and
                value(actual, "type") == "Lookup" and value(actual, "deleteConstraint") == "SetNull" and
                value(actual, "required") == "false", f"{field} must be an optional lookup to {target}")
    event = sms["Event_Key__c"]
    require(value(event, "type") == "Text" and value(event, "externalId") == "true" and
            value(event, "unique") == "true" and value(event, "required") == "false",
            "SMS event key must be a unique external ID that permits legacy rows")
    require(value(sms["Claim_Job_Id__c"], "length") == "18", "SMS claim must hold a full Salesforce Job ID")
    statuses = elements(sms["Status__c"], "sf:valueSet/sf:valueSetDefinition/sf:value")
    require({value(status, "fullName") for status in statuses} >=
            {"New", "Processing", "Sent", "Error", "Retry", "Held"}, "SMS queue statuses are incomplete")

    sequences = {"Lead.Routing_Status_Sequence__c", "Opportunity.Routing_Status_Sequence__c"}
    for object_name in ("Lead", "Opportunity"):
        sequence = object_fields(metadata, object_name)["Routing_Status_Sequence__c"]
        require(value(sequence, "type") == "Number" and value(sequence, "scale") == "0",
                f"{object_name} routing status sequence must be an integer field")
    receipt_dir = migration / "objects/VPCS_Routing_Migration_Receipt__c"
    receipt_key = xml(receipt_dir / "fields/Operation_Key__c.field-meta.xml")
    require(value(receipt_key, "type") == "Text" and value(receipt_key, "length") == "64" and
            value(receipt_key, "externalId") == "true" and value(receipt_key, "unique") == "true" and
            value(receipt_key, "required") == "true", "Migration receipt key must be a required unique SHA-256 external ID")
    receipt_object = xml(receipt_dir / "VPCS_Routing_Migration_Receipt__c.object-meta.xml")
    require(value(receipt_object, "sharingModel") == "Private", "Migration receipts must have private sharing")

    package = elements(xml(metadata / "package.xml"), "sf:types")
    package_members = {value(entry, "name"): {member.text for member in elements(entry, "sf:members")}
                       for entry in package}
    require(package_members.get("CustomField") == sequences | {f"SMS_Message_Queue__c.{field}" for field in sms},
            "Routing package CustomField members differ from the scoped schema")
    require("CustomMetadata" not in package_members and "AssignmentRules" not in package_members and
            not any((metadata / "customMetadata").glob("*")) and not any((metadata / "assignmentRules").glob("*")),
            "Org-specific bindings and assignments must not be committed in the routing template")


def generate(root, destination, *args):
    subprocess.run([sys.executable, str(root / ROUTING / "generate.py"), "--output", str(destination), *args],
                   cwd=root, check=True)


def check(root=ROOT):
    metadata = root / ROUTING / "metadata"
    policy = json_file(root / "config/routing/customer-admins.json")
    catalog = json_file(root / "content/_data/us-states.json")
    check_reviewed_policy(policy, catalog, (metadata / POLICY_CLASS).read_text(encoding="utf-8"))
    check_schema(metadata, root / "salesforce/routing-migration/apex")
    with tempfile.TemporaryDirectory(prefix="vpcs-routing-check-") as work:
        fixture = Path(work)
        plain = fixture / "plain"
        generate(root, plain)
        for path in (POLICY_CLASS, Path("package.xml")):
            require((plain / path).read_bytes() == (metadata / path).read_bytes(),
                    f"{path.name} differs from the offline generator")

        bindings = fixture / "synthetic-bindings.json"
        bindings.write_text(json.dumps({
            "orgId": "00D000000000001",
            "portalUrl": "https://portal.example.invalid",
            "admins": {
                admin: {"username": username, "notificationEmail": "notifications@example.invalid"}
                for admin, username in SYNTHETIC_USERS.items()
            },
        }), encoding="utf-8")
        baseline = fixture / "baseline.assignmentRules"
        baseline.write_text(BASELINE_ASSIGNMENT, encoding="utf-8")
        bound = fixture / "bound"
        generate(root, bound, "--bindings", str(bindings), "--assignment-baseline", str(baseline))
        check_assignment_rules(bound, policy)


def main():
    try:
        check()
    except (CheckFailure, OSError, KeyError, ValueError, ET.ParseError, subprocess.SubprocessError) as error:
        print(f"Customer routing check failed: {error}", file=sys.stderr)
        return 1
    print("Customer routing policy, assignment criteria, and metadata passed offline verification.")
    print("Migration release still requires native scheduled-path and queue checks plus a bounded operator permission window.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
