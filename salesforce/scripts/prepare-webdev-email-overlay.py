#!/usr/bin/env python3
"""Prepare a private Salesforce WebDev email recipient overlay without connecting to an org."""

import argparse
from copy import deepcopy
from dataclasses import dataclass, field
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys
from xml.etree import ElementTree as ET

METADATA_NS = "http://soap.sforce.com/2006/04/metadata"
ET.register_namespace("", METADATA_NS)
APPROVED_EMAIL = "tech@veteranpcs.com"
SANDBOX_PORTAL = "https://veteranpcs--webdev.sandbox.my.site.com"
PRODUCTION_PORTAL = re.compile(r"https://veteranpcs\.my\.site\.com(?=[/?:#\s\"']|$)")
PORTAL_ELEMENTS = {
    "Lead_WebToLead_AfterInsert": (
        ("textTemplates", "TXT_New_Lead_SMS_Message", "text"),
    ),
    "Screen_Lead_Update_Form": (
        ("formulas", "FOR_Portal_Redirect_Link", "expression"),
    ),
    "SUB_Send_Agent_Lead_Status_Update_Email": (
        ("formulas", "FOR_LeadUpdateURL", "expression"),
        ("actionCalls", "Action_Send_Email_to_Agent", "emailBody"),
    ),
    "SUB_Send_Agent_Opp_Update_Email": (
        ("formulas", "FOR_OppUpdateURL", "expression"),
        ("actionCalls", "Action_Send_Email_to_Agent", "emailBody"),
    ),
}
CONTACT_ID = re.compile(r"003[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?")
METADATA_NAME = re.compile(r"[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*")
PRIVATE_ROOT = Path(__file__).resolve().parents[1] / "retrieved-private"
ADDRESS_FIELDS = {
    "emailaddress", "emailaddresses", "emailaddresslist", "emailaddresscollection", "emailaddressescollection",
    "recipientaddresses", "recipientaddresslist", "recipientaddresscollection",
    "recipientaddressescollection",
    "recipientemailaddresses", "recipientemailaddresslist", "recipientemailaddresscollection",
    "to", "cc", "bcc",
    *(f"{prefix}{suffix}" for prefix in ("to", "cc", "bcc") for suffix in (
        "address", "addresses", "addresslist", "addresscollection", "addressescollection",
        "emailaddress", "emailaddresses", "emailaddresslist", "emailaddresscollection", "emails",
        "recipientaddress", "recipientaddresses", "recipientaddresslist", "recipientaddresscollection",
    )),
}
ID_FIELDS = {
    "recipientid", "recipientids", "recipientidlist", "recipientidslist",
    "recipientidcollection", "recipientidscollection", "recipientrecordid",
    "recipientrecordids", "recipientrecordidcollection", "recipientrecordidscollection",
    "targetobjectid", "targetobjectids", "targetobjectidcollection", "contactid",
}
RECIPIENT_FIELDS = ADDRESS_FIELDS | ID_FIELDS
PRESERVED_EMAIL_FIELDS = {
    "senderaddress", "sendertype", "useemailtemplate", "emailtemplateid",
    "relatedrecordid", "composeemailcontent", "emailsubject", "emailbody",
    "sendrichbody", "attachmentid", "attachmentidcollection", "logemailonsend",
}
ALERT_FIELDS = {
    "fullname", "ccemails", "description", "protected", "recipients",
    "senderaddress", "sendertype", "template",
}


class InventoryError(ValueError):
    """The input does not establish a safe, supported rewrite."""


def tag(name):
    return f"{{{METADATA_NS}}}{name}"


def local_name(node):
    return node.tag.partition("}")[2]


def read_metadata(path, kind):
    try:
        content = path.read_bytes()
        if b"<!DOCTYPE" in content.upper() or b"<!ENTITY" in content.upper():
            raise InventoryError(f"DOCTYPE and ENTITY declarations are unsupported in {path.name}")
        root = ET.fromstring(content)
    except (ET.ParseError, OSError):
        raise InventoryError(f"Unable to read metadata file {path.name}") from None
    if root.tag != tag(kind):
        raise InventoryError(f"Unexpected metadata type in {path.name}")
    return root, hashlib.sha256(content).hexdigest()


def child_text(node, name):
    return (node.findtext(tag(name)) or "").strip()


def identifier(value, label):
    if not METADATA_NAME.fullmatch(value):
        raise InventoryError(f"Missing or unsupported metadata identifier for {label}")
    return value


def normalized(name):
    return name.replace("_", "").casefold()


def workflow_alert_name(object_name, name):
    name = identifier(name, "Workflow Alert")
    if "." in name and not name.startswith(f"{object_name}."):
        raise InventoryError(f"Workflow Alert reference is outside {object_name}")
    return name if "." in name else f"{object_name}.{name}"


def projection(node, skip):
    """Compare the full XML tree while ignoring only a declared recipient surface."""
    return (
        node.tag, tuple(sorted(node.attrib.items())), node.text,
        tuple(projection(child, skip) for child in node if not skip(node, child)),
    )


def flow_projection(root):
    return projection(root, lambda parent, child: (
        parent.tag == tag("actionCalls")
        and child_text(parent, "actionType") == "emailSimple"
        and child.tag == tag("inputParameters")
        and normalized(child_text(child, "name")) in RECIPIENT_FIELDS
    ))


def alert_projection(root):
    return projection(root, lambda parent, child: (
        parent.tag == tag("alerts") and child.tag in (tag("recipients"), tag("ccEmails"))
    ))


def bool_param(params, key, action_label):
    param = params.get(key)
    if param is None:
        return False
    value = param.find(tag("value"))
    if value is not None and len(value) == 1 and local_name(value[0]) in ("booleanValue", "stringValue"):
        literal = (value[0].text or "").casefold()
        if literal in ("true", "false"):
            return literal == "true"
    raise InventoryError(f"{action_label} requires a literal {key} value")


def check_email_alert_action(action, label):
    params = action.findall(tag("inputParameters"))
    if len(params) == 1 and child_text(params[0], "name") == "SObjectRowId":
        value = params[0].find(tag("value"))
        if (
            len(params[0]) == 2 and value is not None and len(value) == 1
            and local_name(value[0]) in ("elementReference", "stringValue") and value[0].text
        ):
            return
    raise InventoryError(f"{label} has an unsupported Email Alert input structure")


def rewrite_send_email(action, action_label, fixture_contact_id):
    inputs = {}
    for param in action.findall(tag("inputParameters")):
        key = normalized(child_text(param, "name"))
        if key not in RECIPIENT_FIELDS | PRESERVED_EMAIL_FIELDS or key in inputs:
            raise InventoryError(f"{action_label} has an unknown or duplicate Send Email input")
        children = list(param)
        child_tags = {node.tag for node in children}
        if tag("name") not in child_tags or child_tags - {tag("name"), tag("value")} or len(children) != len(child_tags):
            raise InventoryError(f"{action_label} has an unsupported Send Email input structure")
        inputs[key] = param
    if not RECIPIENT_FIELDS.intersection(inputs):
        raise InventoryError(f"{action_label} contains no recognized recipient input")

    use_template = bool_param(inputs, "useemailtemplate", action_label) or "emailtemplateid" in inputs
    if use_template:
        template = inputs.get("emailtemplateid")
        value = template.find(tag("value")) if template is not None else None
        if value is None or len(value) != 1 or local_name(value[0]) not in ("stringValue", "elementReference") or not value[0].text:
            raise InventoryError(f"{action_label} requires a recognized template reference")
    log_email = bool_param(inputs, "logemailonsend", action_label)
    use_contact = use_template or log_email or bool(ID_FIELDS.intersection(inputs))
    if use_contact and not fixture_contact_id:
        return {"recipient": "fixture_contact_missing", "logs_activity": log_email, "uses_template": use_template}

    removed = [param for key, param in inputs.items() if key in RECIPIENT_FIELDS]
    first = list(action).index(removed[0])
    for param in removed:
        action.remove(param)
    new_input = ET.Element(tag("inputParameters"))
    ET.SubElement(new_input, tag("name")).text = "recipientId" if use_contact else "emailAddresses"
    value = ET.SubElement(new_input, tag("value"))
    ET.SubElement(value, tag("stringValue")).text = fixture_contact_id if use_contact else APPROVED_EMAIL
    action.insert(first, new_input)

    recipient_params = [
        item for item in action.findall(tag("inputParameters"))
        if normalized(child_text(item, "name")) in RECIPIENT_FIELDS
    ]
    if recipient_params != [new_input]:
        raise InventoryError(f"{action_label} failed the single-recipient invariant")
    return {
        "recipient": "fixture_contact" if use_contact else "approved_mailbox",
        "logs_activity": log_email,
        "uses_template": use_template,
    }


def rewrite_alert(alert, name):
    if any(normalized(local_name(child)) not in ALERT_FIELDS for child in alert):
        raise InventoryError(f"{name} has an unsupported Workflow Alert field")
    rewritten = deepcopy(alert)
    old_recipients = {tag("recipients"), tag("ccEmails")}
    for child in list(rewritten):
        if child.tag in old_recipients:
            rewritten.remove(child)
    if len(rewritten.findall(tag("fullName"))) != 1:
        raise InventoryError(f"{name} requires a single Workflow Alert name")
    cc = ET.Element(tag("ccEmails"))
    cc.text = APPROVED_EMAIL
    rewritten.insert(list(rewritten).index(rewritten.find(tag("fullName"))) + 1, cc)
    if alert_projection(rewritten) != alert_projection(alert):
        raise InventoryError(f"{name} changed a non-recipient Workflow Alert field")
    if rewritten.findall(tag("recipients")) or list(rewritten.iter(tag("ccEmails"))) != [cc]:
        raise InventoryError(f"{name} failed the single-recipient invariant")
    return rewritten


def active_rule_alerts(root, object_name):
    names = set()
    for rule in root.findall(tag("rules")):
        if child_text(rule, "active").casefold() != "true":
            continue
        for action in rule.iter(tag("actions")):
            action_type = child_text(action, "type")
            if action_type == "Alert":
                names.add(workflow_alert_name(object_name, child_text(action, "name")))
            elif action_type and action_type not in ("FieldUpdate", "Task", "OutboundMessage", "FlowAction"):
                raise InventoryError(f"{object_name} has an unsupported active Workflow Rule action")
    return names


def rewrite_portal_links(flow, name, portal_origin):
    selected = set()
    reviewed = []
    for kind, element_name, field in PORTAL_ELEMENTS.get(name, ()):
        elements = [element for element in flow.findall(tag(kind)) if child_text(element, "name") == element_name]
        if len(elements) != 1:
            raise InventoryError(f"{name} requires the reviewed portal link element {element_name}")
        parent = elements[0]
        if kind == "actionCalls":
            parameter = next(
                (item for item in parent.findall(tag("inputParameters")) if child_text(item, "name") == field),
                None,
            )
            node = parameter.find(f"{tag('value')}/{tag('stringValue')}") if parameter is not None else None
        else:
            node = parent.find(tag(field))
        if node is None or not node.text or not PRODUCTION_PORTAL.search(node.text):
            raise InventoryError(f"{name}.{element_name} requires its reviewed literal portal URL")
        selected.add(node)
        revised, count = PRODUCTION_PORTAL.subn(SANDBOX_PORTAL, node.text)
        if portal_origin:
            node.text = revised
        reviewed.append({"flow": name, "element": element_name, "replacements": count})

    if any(node not in selected and PRODUCTION_PORTAL.search(node.text or "") for node in flow.iter()):
        raise InventoryError(f"{name} has a production portal link outside the reviewed link elements")
    return reviewed


@dataclass
class Inputs:
    flows: dict = field(default_factory=dict)
    workflows: dict = field(default_factory=dict)
    settings: dict = field(default_factory=dict)
    versions: set = field(default_factory=set)
    hashes: dict = field(default_factory=dict)


def read_inventory(directories):
    results = Inputs()
    for directory in directories:
        if not directory.is_dir():
            raise InventoryError("Each metadata source must be an extracted Metadata API directory")
        package, digest = read_metadata(directory / "package.xml", "Package")
        version = child_text(package, "version")
        if not re.fullmatch(r"[1-9][0-9]*\.[0-9]+", version):
            raise InventoryError("Metadata package version is missing or unsupported")
        results.versions.add(version)
        results.hashes[f"package-{digest[:12]}.xml"] = digest
        for folder, extension, kind, records in (
            ("flows", ".flow", "Flow", results.flows),
            ("workflows", ".workflow", "Workflow", results.workflows),
            ("settings", ".settings", None, results.settings),
        ):
            for path in sorted((directory / folder).glob(f"*{extension}")):
                name = identifier(path.stem, folder)
                if folder == "settings" and name not in ("EmailAdministration", "EmailIntegration"):
                    continue
                root, digest = read_metadata(path, kind or f"{name}Settings")
                key = f"{folder}/{path.name}"
                if name in records and results.hashes[key] != digest:
                    raise InventoryError(f"Conflicting metadata copies for {key}")
                records[name] = root
                results.hashes[key] = digest
    if not results.flows or not results.workflows:
        raise InventoryError("The inventory requires both Flow and Workflow metadata")
    return results


def prepare_overlay(inputs, fixture_contact_id=None, portal_origin=None):
    alerts = {}
    active_alert_refs = set()
    flow_files = {}
    action_inventory = []
    portal_links = []
    uncovered_actions = set()
    active_flows = {name for name, root in inputs.flows.items() if child_text(root, "status") == "Active"}
    if portal_origin is not None and portal_origin != SANDBOX_PORTAL:
        raise InventoryError("Portal link rewrites require the verified WebDev Experience Cloud HTTPS origin")

    for name, root in inputs.workflows.items():
        active_alert_refs.update(active_rule_alerts(root, name))
        for alert in root.findall(tag("alerts")):
            full_name = workflow_alert_name(name, child_text(alert, "fullName"))
            if full_name in alerts:
                raise InventoryError(f"Duplicate Workflow Alert definition {full_name}")
            alerts[full_name] = (name, alert)

    for name in sorted(active_flows):
        original = inputs.flows[name]
        flow = deepcopy(original)
        rewrite_count = 0
        for subflow in flow.findall(tag("subflows")):
            target = identifier(child_text(subflow, "flowName"), "subflow")
            if target not in active_flows:
                raise InventoryError(f"Active flow {name} references unaudited subflow {target}")

        for action in flow.findall(tag("actionCalls")):
            action_type = identifier(child_text(action, "actionType"), "Flow action type")
            action_name = identifier(child_text(action, "actionName"), "Flow action")
            if action_type == "emailAlert":
                check_email_alert_action(action, f"{name}.{action_name}")
                active_alert_refs.add(identifier(action_name, "Flow email alert reference"))
            elif action_type == "emailSimple":
                label = f"{name}.{identifier(child_text(action, 'name'), 'Send Email element')}"
                details = rewrite_send_email(action, label, fixture_contact_id)
                action_inventory.append({"action": label, **details})
                rewrite_count += 1
            elif "email" in action_type.casefold() or "email" in action_name.casefold():
                raise InventoryError(f"{name} contains an unsupported email action")
            else:
                uncovered_actions.add(f"{action_type}:{action_name}")
        if rewrite_count and flow_projection(original) != flow_projection(flow):
            raise InventoryError(f"{name} changed non-recipient Flow metadata")
        links = rewrite_portal_links(flow, name, portal_origin)
        portal_links.extend(links)
        if rewrite_count or links:
            flow_files[name] = flow

    missing_alerts = sorted(active_alert_refs - alerts.keys())
    if missing_alerts:
        raise InventoryError(f"Missing definitions for active Workflow Alerts: {', '.join(missing_alerts)}")

    workflow_files = {}
    for name in sorted(active_alert_refs):
        object_name, original = alerts[name]
        root = workflow_files.setdefault(object_name, ET.Element(tag("Workflow")))
        root.append(rewrite_alert(original, name))

    email_settings = inputs.settings.get("EmailAdministration")
    bcc_setting = child_text(email_settings, "enableComplianceBcc") if email_settings is not None else ""
    integration_settings = inputs.settings.get("EmailIntegration")
    integration_flags = {
        name: child_text(integration_settings, name).casefold() == "true"
        for name in ("enableGmailIntegration", "enableOutlookIntegration", "orgIsSyncingEventsOutbound")
    } if integration_settings is not None else None
    inventory = {
        "approved_recipient": APPROVED_EMAIL,
        "active_flows_scanned": len(active_flows),
        "workflow_alerts_rewritten": sorted(active_alert_refs),
        "retrieved_alerts_without_active_flow_or_rule_reference": sorted(alerts.keys() - active_alert_refs),
        "flow_actions": action_inventory,
        "portal_link_rewrites": portal_links,
        "portal_origin_required": bool(portal_links and not portal_origin),
        "other_flow_actions_for_separate_review": sorted(uncovered_actions),
        "fixture_contact_required": any(action["recipient"] == "fixture_contact_missing" for action in action_inventory),
        "compliance_bcc_enabled": {"true": True, "false": False}.get(bcc_setting.casefold()),
        "email_integration_flags": integration_flags,
        "cloud_verification": "pending",
        "source_sha256": dict(sorted(inputs.hashes.items())),
    }
    return flow_files, workflow_files, inventory


def package_manifest(version, flow_files, alerts):
    package = ET.Element(tag("Package"))
    for name, members in (("Flow", flow_files), ("WorkflowAlert", alerts)):
        if members:
            metadata_type = ET.SubElement(package, tag("types"))
            for item in sorted(members):
                ET.SubElement(metadata_type, tag("members")).text = item
            ET.SubElement(metadata_type, tag("name")).text = name
    ET.SubElement(package, tag("version")).text = version
    return package


def write_xml(path, root):
    with path.open("xb") as stream:
        ET.ElementTree(root).write(stream, encoding="UTF-8", xml_declaration=True)


def write_overlay(output, private_root, version, flow_files, workflow_files, inventory):
    output = output.resolve()
    if output == private_root.resolve() or not output.is_relative_to(private_root.resolve()):
        raise InventoryError("Overlay output must be a new directory inside salesforce/retrieved-private")
    if inventory["fixture_contact_required"]:
        raise InventoryError("A verified sandbox fixture Contact ID is required before writing the overlay")
    if inventory["portal_origin_required"]:
        raise InventoryError("The verified sandbox portal origin is required before writing the overlay")
    if not flow_files and not workflow_files:
        raise InventoryError("The inventory contains no selected email metadata")
    if output.exists():
        raise InventoryError("Overlay output already exists; choose a new directory")
    output.mkdir(mode=0o700, parents=True)
    try:
        for folder, extension, items in (
            ("flows", ".flow", flow_files), ("workflows", ".workflow", workflow_files),
        ):
            if items:
                (output / folder).mkdir(mode=0o700)
            for name, root in sorted(items.items()):
                write_xml(output / folder / f"{name}{extension}", root)
        write_xml(output / "package.xml", package_manifest(version, flow_files, inventory["workflow_alerts_rewritten"]))
        with (output / "inventory.json").open("x", encoding="UTF-8") as stream:
            json.dump(inventory, stream, indent=2)
            stream.write("\n")
    except BaseException:
        shutil.rmtree(output)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--metadata-dir", action="append", type=Path, required=True,
                        help="Extracted Metadata API directory containing package.xml; repeat if needed")
    parser.add_argument("--fixture-contact-id", help="Verified sandbox Contact ID for the approved inbox")
    parser.add_argument("--portal-origin", help="Verified sandbox Experience Cloud origin for reviewed Flow links")
    parser.add_argument("--output", type=Path, help="New ignored overlay directory; omit for a read-only inventory")
    args = parser.parse_args()
    if args.fixture_contact_id and not CONTACT_ID.fullmatch(args.fixture_contact_id):
        parser.error("--fixture-contact-id must be a Salesforce Contact ID")

    try:
        inputs = read_inventory(args.metadata_dir)
        flow_files, workflow_files, inventory = prepare_overlay(inputs, args.fixture_contact_id, args.portal_origin)
        if args.output:
            version = max(inputs.versions, key=lambda number: tuple(map(int, number.split("."))))
            write_overlay(args.output, PRIVATE_ROOT, version, flow_files, workflow_files, inventory)
        print(json.dumps(inventory, indent=2))
    except (InventoryError, OSError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
