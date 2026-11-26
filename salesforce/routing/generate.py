#!/usr/bin/env python3
"""Render the routing policy, scoped deployment manifest, and per-org bindings."""
import argparse
import json
import re
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
NS = "http://soap.sforce.com/2006/04/metadata"
ET.register_namespace("", NS)
SENDERS = {"BETH": "+17192495359", "STEPHANIE": "+17192494757"}


def q(name):
    return f"{{{NS}}}{name}"


def child(parent, name, value):
    ET.SubElement(parent, q(name)).text = value


def write_tree(element, file):
    file.parent.mkdir(parents=True, exist_ok=True)
    ET.indent(element, space="    ")
    file.write_text('<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(element, encoding="unicode") + "\n")


def apex_strings(values):
    return ", ".join("'" + value.replace("'", "\\'") + "'" for value in values)


def write_policy(policy, metadata, state_catalog):
    territories = policy["territories"]
    values = {state: admin for admin, states in territories.items() for state in states}
    if set(territories) != set(SENDERS) or len(values) != sum(map(len, territories.values())):
        raise ValueError("Regional state lists must cover both admins without duplicates.")
    if policy["defaultAdmin"] not in territories or any(not re.fullmatch("[A-Z]{2}", key) for key in values):
        raise ValueError("Invalid routing policy.")
    by_state = ",\n".join(f"        '{state}' => '{values[state]}'" for state in sorted(values))
    senders = ", ".join(f"'{admin}' => '{phone}'" for admin, phone in SENDERS.items())
    aliases = {
        re.sub(r"[^A-Z]", "", row["state_name"].upper()): row["short_name"]
        for row in state_catalog if row["short_name"] in values
    }
    aliases.update({"DISTRICTOFCOLUMBIA": "DC", "DELEWARE": "DE"})
    labels = {row["short_name"]: row["state_name"] for row in state_catalog if row["short_name"] in values}
    apex_labels = ",\n".join(f"        '{state}' => {apex_strings([labels[state]])}" for state in sorted(labels))
    apex_aliases = ",\n".join(f"        '{name}' => '{aliases[name]}'" for name in sorted(aliases))
    dest = metadata / "classes" / "VpcsCustomerRoutingPolicy.cls"
    dest.write_text(f"""// Generated from config/routing/customer-admins.json by salesforce/routing/generate.py.
public class VpcsCustomerRoutingPolicy {{
    public static final String defaultAdmin = '{policy["defaultAdmin"]}';
    public static final Set<String> openLeadStatuses = new Set<String>{{ {apex_strings(policy["openLeadStatuses"])} }};
    public static final Set<String> terminalOpportunityStages = new Set<String>{{ {apex_strings(policy["terminalOpportunityStages"])} }};
    public static final Map<String, String> senders = new Map<String, String>{{ {senders} }};
    public static final Map<String, String> adminByState = new Map<String, String>{{
{by_state}
    }};
    public static final Map<String, String> stateAliases = new Map<String, String>{{
{apex_aliases}
    }};
    public static final Map<String, String> labelByState = new Map<String, String>{{
{apex_labels}
    }};
}}
""")


def wire_assignment(baseline, metadata, policy, bindings):
    if baseline is None:
        raise ValueError("The target org assignment-rule baseline is required.")
    tree = ET.parse(baseline)
    default = next((rule for rule in tree.getroot().findall(q("assignmentRule"))
                    if rule.findtext(q("active")) == "true"), None)
    if default is None:
        raise ValueError("No active Lead assignment rule.")
    prior = default.findall(q("ruleEntry"))
    for entry in prior:
        default.remove(entry)
    for admin in [key for key in policy["territories"] if key != policy["defaultAdmin"]] + [policy["defaultAdmin"]]:
        states = policy["territories"][admin]
        state_formula = "OR(" + ",".join(f'Destination_State__c="{state}"' for state in states) + ")"
        # Picklist TEXT is required in assignment rule formulas.
        state_formula = state_formula.replace("Destination_State__c=", "TEXT(Destination_State__c)=")
        statuses = "OR(" + ",".join(f'TEXT(Status)="{state}"' for state in policy["openLeadStatuses"]) + ")"
        clauses = ['RecordType.DeveloperName="Customer"', statuses]
        if admin != policy["defaultAdmin"]:
            clauses.append(state_formula)
        entry = ET.SubElement(default, q("ruleEntry"))
        child(entry, "assignedTo", bindings[admin]["username"])
        child(entry, "assignedToType", "User")
        child(entry, "formula", "AND(" + ",".join(clauses) + ")")
    for entry in prior:
        # Limit the old broad status criterion to the original noncustomer behavior.
        items = entry.findall(q("criteriaItems"))
        if ([item.findtext(q("field")) for item in items] == ["Lead.Status"]
                and items[0].findtext(q("operation")) == "equals"
                and items[0].findtext(q("value")) == "New:_Not_Contacted"):
            entry.remove(items[0])
            child(entry, "formula", 'AND(RecordType.DeveloperName<>"Customer",TEXT(Status)="New:_Not_Contacted")')
        default.append(entry)
    write_tree(tree.getroot(), metadata / "assignmentRules" / "Lead.assignmentRules")


def write_bindings(org, metadata):
    if not re.fullmatch(r"00D[a-zA-Z0-9]{12}(?:[a-zA-Z0-9]{3})?", org["orgId"]):
        raise ValueError("Expected a Salesforce Organization ID.")
    if set(org["admins"]) != set(SENDERS) or len({admin["username"] for admin in org["admins"].values()}) != 2:
        raise ValueError("Both regional admin usernames are required and must be distinct.")
    for key, config in org["admins"].items():
        record = ET.Element(q("CustomMetadata"))
        child(record, "label", key.title())
        child(record, "protected", "false")
        dispatch_enabled = config.get("dispatchEnabled", True)
        if not isinstance(dispatch_enabled, bool):
            raise ValueError("dispatchEnabled must be a boolean.")
        for field, value in {
            "Dispatch_Enabled__c": dispatch_enabled,
            "Org_Id__c": org["orgId"][:15],
            "Username__c": config["username"],
            "Sender__c": SENDERS[key],
            "Notification_Email__c": config["notificationEmail"],
            "Portal_URL__c": org["portalUrl"],
        }.items():
            checkbox = isinstance(value, bool)
            if not checkbox and (not value or "\n" in value):
                raise ValueError(f"Invalid {field}")
            item = ET.SubElement(record, q("values"))
            child(item, "field", field)
            val = ET.SubElement(item, q("value"), {
                "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
                "xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
                "xsi:type": "xsd:boolean" if checkbox else "xsd:string",
            })
            val.text = str(value).lower() if checkbox else value
        write_tree(record, metadata / "customMetadata" / f"Vpcs_Regional_Admin.{key}.md")


def write_manifest(metadata):
    package = ET.Element(q("Package"))
    for folder, extension, kind in [
        ("assignmentRules", ".assignmentRules", "AssignmentRules"), ("classes", ".cls", "ApexClass"),
        ("triggers", ".trigger", "ApexTrigger"), ("customMetadata", ".md", "CustomMetadata"),
        ("flows", ".flow", "Flow"), ("customPermissions", ".customPermission", "CustomPermission"),
        ("permissionsets", ".permissionset", "PermissionSet"),
    ]:
        members = sorted(file.name.removesuffix(extension) for file in (metadata / folder).glob("*" + extension))
        if members:
            types = ET.SubElement(package, q("types"))
            for member in members:
                child(types, "members", member)
            child(types, "name", kind)
    fields = ET.SubElement(package, q("types"))
    for file in sorted((metadata / "objects").glob("*.object")):
        object_name = file.name.removesuffix(".object")
        if object_name.endswith("__mdt"):
            continue
        for field in ET.parse(file).getroot().findall(q("fields")):
            child(fields, "members", object_name + "." + field.findtext(q("fullName")))
    child(fields, "name", "CustomField")
    types = ET.SubElement(package, q("types"))
    child(types, "members", "Vpcs_Regional_Admin__mdt")
    child(types, "name", "CustomObject")
    if (metadata / "workflows/Lead.workflow").exists():
        alerts = ET.SubElement(package, q("types"))
        child(alerts, "members", "Lead.New_Lead_Alert_Unassigned_Customer")
        child(alerts, "name", "WorkflowAlert")
    child(package, "version", "67.0")
    write_tree(package, metadata / "package.xml")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=HERE.parents[1] / "config/routing/customer-admins.json")
    parser.add_argument("--state-catalog", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--baseline", type=Path)
    parser.add_argument("--sandbox", action="store_true")
    parser.add_argument("--bindings", type=Path)
    parser.add_argument("--assignment-baseline", type=Path)
    args = parser.parse_args()
    if args.sandbox and args.baseline is None:
        parser.error("--sandbox requires the fresh WebDev --baseline")
    policy = json.loads(args.config.read_text())
    metadata = args.output.resolve()
    if metadata != HERE / "metadata":
        shutil.copytree(HERE / "metadata", metadata, dirs_exist_ok=True)
    catalog = args.state_catalog or args.config.resolve().parents[2] / "content/_data/site/state_list.json"
    write_policy(policy, metadata, json.loads(catalog.read_text()))
    if args.bindings:
        org = json.loads(args.bindings.read_text())
        write_bindings(org, metadata)
        wire_assignment(args.assignment_baseline, metadata, policy, org["admins"])
    if args.baseline:
        from prepare_baseline import edit, write_admin_object
        edit(args.baseline, metadata, args.sandbox)
        write_admin_object(metadata)
    write_manifest(metadata)


if __name__ == "__main__":
    main()
