#!/usr/bin/env python3
"""Audit email links and apply only explicitly reviewed sandbox URL replacements."""

import argparse
import base64
import binascii
from collections import Counter
from copy import deepcopy
from html import unescape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
from urllib.parse import urlsplit
from xml.etree import ElementTree as ET

NS = "http://soap.sforce.com/2006/04/metadata"
ET.register_namespace("", NS)
PRIVATE_ROOT = Path(__file__).resolve().parents[1] / "retrieved-private"
PRODUCTION_PORTAL = "veteranpcs.my.site.com"
PRODUCTION_RECORDS = {"veteranpcs.lightning.force.com", "veteranpcs.my.salesforce.com"}
PRODUCTION_WEBSITE = {"www.veteranpcs.com", "veteranpcs.com"}
SANDBOX_HOSTS = {
    "veteranpcs--webdev.sandbox.my.salesforce.com",
    "veteranpcs--webdev.sandbox.my.site.com",
    "veteranpcs--webdev.sandbox.lightning.force.com",
}
TEMPLATE_NAME = re.compile(r"[A-Za-z0-9_$-]+(?:/[A-Za-z0-9_$-]+)+")
LABEL_NAME = re.compile(r"[A-Za-z][A-Za-z0-9_$]*")
URL_LABEL = re.compile(r"\{!\s*\$Label\.([A-Za-z][A-Za-z0-9_$]*)\s*\}")
MERGE_LINK = re.compile(r"\{!\s*([A-Za-z0-9_$]+(?:\.[A-Za-z0-9_$]+)+)\s*\}")
HTTP_URL = re.compile(r"https?://[^\s<>\"']+", re.I)
CSS_URL = re.compile(r"""url\(\s*["']?([^\s)"']+)""", re.I)
INLINE_IMAGE = re.compile(r"data:image/(png|jpeg|gif);base64,([A-Za-z0-9+/=]+)")
IMAGE_SIGNATURES = {"png": b"\x89PNG\r\n\x1a\n", "jpeg": b"\xff\xd8\xff", "gif": b"GIF8"}
ACTION_HOSTS = {
    PRODUCTION_PORTAL, *PRODUCTION_RECORDS, "calendly.com", "forms.gle",
    "docs.google.com", "drive.google.com", "affiliate.rollupapp.com",
    "www.etsy.com", "veteranpcs.theceshop.com", "www.gosquaredaway.com",
}
SAFE_ID_FIELDS = {"opportunity.id", "lead.id", "lead.agentid__c", "form__c.id", "relatedto.id"}


def tag(name):
    return f"{{{NS}}}{name}"


def host_of(value):
    try:
        parsed = urlsplit(value)
    except ValueError:
        return None
    return parsed.hostname if parsed.scheme in ("http", "https") or value.startswith("//") else None


class EmailLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets = Counter()
        self.link_hosts = Counter()
        self.merge_links = set()
        self.pixel_indicators = 0
        self.destinations = []

    def handle_starttag(self, element, attributes):
        attributes = dict(attributes)
        for key in ("href", "action"):
            value = attributes.get(key) or ""
            if value:
                self.destinations.append(("link", value))
            host = host_of(value)
            if host:
                self.link_hosts[host] += 1
            self.merge_links.update(MERGE_LINK.findall(value))
        if element in ("img", "script", "iframe", "video", "source"):
            value = attributes.get("src") or ""
            if value:
                self.destinations.append(("asset", value))
            host = host_of(value)
            if host:
                self.assets[host] += 1
                if element == "img" and (
                    attributes.get("width") == "1" or attributes.get("height") == "1"
                    or re.search(r"pixel|beacon|track", urlsplit(value).path, re.I)
                ):
                    self.pixel_indicators += 1
            if attributes.get("srcset"):
                self.destinations.append(("asset", "<unreviewed srcset>"))


def audit_body(contents):
    parser = EmailLinks()
    parser.feed(contents)
    return {
        "literal_hosts": sorted({host for value in HTTP_URL.findall(contents) if (host := host_of(value))}),
        "link_hosts": dict(sorted(parser.link_hosts.items())),
        "remote_asset_hosts": dict(sorted(parser.assets.items())),
        "merge_links": sorted(parser.merge_links),
        "url_labels": sorted(set(URL_LABEL.findall(contents))),
        "possible_pixel_count": parser.pixel_indicators,
    }


def read_templates(roots):
    templates = {}
    for root in roots:
        if not root.is_dir():
            raise ValueError("Each template root must be an extracted email folder")
        for path in root.rglob("*.email"):
            name = path.relative_to(root).with_suffix("").as_posix()
            if not TEMPLATE_NAME.fullmatch(name):
                raise ValueError("An EmailTemplate identifier is unsupported")
            body = path.read_bytes()
            metadata = path.with_name(path.name + "-meta.xml").read_bytes()
            if name in templates and templates[name] != (body, metadata):
                raise ValueError(f"Conflicting copies for template {name}")
            templates[name] = (body, metadata)
    if not templates:
        raise ValueError("No extracted EmailTemplate bodies were found")
    return templates


def read_labels(path):
    content = path.read_bytes()
    if b"<!DOCTYPE" in content.upper() or b"<!ENTITY" in content.upper():
        raise ValueError("Unsupported XML declarations in the CustomLabels file")
    root = ET.fromstring(content)
    if root.tag != tag("CustomLabels"):
        raise ValueError("Expected a Salesforce CustomLabels file")
    labels = {}
    for entry in root.findall(tag("labels")):
        name = entry.findtext(tag("fullName")) or ""
        if not LABEL_NAME.fullmatch(name) or name in labels:
            raise ValueError("A CustomLabel identifier is missing, duplicated, or unsupported")
        labels[name] = entry
    return labels


def audit(templates, labels):
    reviewed = {name: audit_body(body.decode("utf-8")) for name, (body, _) in sorted(templates.items())}
    referenced = {label for entry in reviewed.values() for label in entry["url_labels"]}
    return {
        "template_count": len(reviewed),
        "templates": reviewed,
        "referenced_label_hosts": {
            key: host_of(labels[key].findtext(tag("value")) or "") if key in labels else None
            for key in sorted(referenced)
        },
        "missing_referenced_labels": sorted(referenced - labels.keys()),
    }


def sandbox_origin(value):
    try:
        parsed = urlsplit(value)
    except ValueError:
        return False
    host = parsed.hostname or ""
    return (
        parsed.scheme == "https" and parsed.netloc == host and host in SANDBOX_HOSTS
        and value == f"https://{host}"
    )


def checked_url(value):
    if not isinstance(value, str) or re.search(r"[\s\\<>\"']", value):
        raise ValueError("A URL replacement requires one complete, single-line literal URL")
    parsed = urlsplit(value)
    if parsed.scheme not in ("http", "https") or parsed.netloc != parsed.hostname:
        raise ValueError("A URL replacement has an unsupported host or authority")
    return parsed


def approved_destination(value, origins):
    if not isinstance(value, str):
        return False
    if value == "mailto:tech@veteranpcs.com":
        return True
    inline = INLINE_IMAGE.fullmatch(value)
    if inline and len(inline[2]) <= 512_000:
        try:
            return base64.b64decode(inline[2], validate=True).startswith(IMAGE_SIGNATURES[inline[1]])
        except binascii.Error:
            return False
    parsed = checked_url(value)
    return f"{parsed.scheme}://{parsed.netloc}" in origins


def unresolved_template_links(body, labels, origins):
    parser = EmailLinks()
    parser.feed(body)
    issues = set()
    if any(host_of(value) in {PRODUCTION_PORTAL, *PRODUCTION_RECORDS} for value in HTTP_URL.findall(body)):
        issues.add("literal production portal or CRM record URL")
    for kind, original in parser.destinations + [("asset", value) for value in CSS_URL.findall(body)]:
        def label_value(match):
            label = labels.get(match[1])
            return (label.findtext(tag("value")) or "") if label is not None else match[0]

        value = unescape(URL_LABEL.sub(label_value, original)).strip()
        if kind == "asset":
            if value.startswith("cid:"):
                continue
            if value.startswith("data:") and approved_destination(value, origins):
                continue
        if kind == "link" and value.startswith("#"):
            continue
        if value == "mailto:tech@veteranpcs.com":
            continue
        try:
            target = checked_url(value)
        except ValueError:
            refs = sorted(set(MERGE_LINK.findall(value)))
            issues.add("unbound fixture link: " + ", ".join(refs) if refs else "unsupported asset or link target")
            continue
        origin = f"{target.scheme}://{target.netloc}"
        refs = set(MERGE_LINK.findall(value))
        if "{!" in value and (origin not in origins or not refs or any(ref.casefold() not in SAFE_ID_FIELDS for ref in refs)):
            issues.add("unbound fixture link: " + ", ".join(sorted(refs)) if refs else "unsupported URL merge expression")
        if kind == "asset" and origin not in origins:
            issues.add("remote asset outside approved sandbox origins")
        if kind == "link" and target.hostname in ACTION_HOSTS and origin not in origins:
            issues.add("external operational link requires a fixture destination")
        if (
            kind == "link" and target.hostname in PRODUCTION_WEBSITE
            and re.search(
                r"(?:portal|form|magic|callback|sign-in|login|/lead[s]?/|/opp[s]?/|/contact(?:/|$|-)|/get-listed|/internship)",
                target.path, re.I,
            )
        ):
            issues.add("production website operation requires a fixture destination")
    return sorted(issues)


def rewrite_literal(body, old, new, expected_count, name, attributes_only=False):
    if attributes_only:
        pattern = re.compile(r"""(\b(?:href|src|action)\s*=\s*)(['"])""" + re.escape(old) + r"\2", re.I)
        rewritten, count = pattern.subn(lambda match: match[1] + match[2] + new + match[2], body)
    else:
        # A full literal match prevents a shorter prefix from leaving another host or URL in place.
        boundary = r"(?=$|[\s<>\"')])"
        pattern = re.compile(r"(?<![A-Za-z0-9_.-])" + re.escape(old) + boundary)
        rewritten, count = pattern.subn(lambda _: new, body)
    if count != expected_count:
        raise ValueError(f"Unexpected match count for the reviewed URL in {name}")
    return rewritten


def apply_plan(plan, templates, labels):
    if not isinstance(plan, dict) or set(plan) != {"approvedOrigins", "replacements"}:
        raise ValueError("A plan must contain approvedOrigins and replacements")
    origins = plan["approvedOrigins"]
    replacements = plan["replacements"]
    if not isinstance(origins, list) or not origins or not all(isinstance(x, str) and sandbox_origin(x) for x in origins):
        raise ValueError("Every approved origin must be an exact verified sandbox HTTPS origin; preview destinations are not provisioned")
    if not isinstance(replacements, list) or not replacements:
        raise ValueError("A plan requires at least one scoped replacement")

    changed_templates = {}
    changed_labels = {}
    touched = set()
    for entry in replacements:
        if not isinstance(entry, dict) or set(entry) != {"kind", "name", "from", "to", "count"}:
            raise ValueError("Every replacement requires kind, name, from, to, and count")
        kind, name, old, new, count = (entry[key] for key in ("kind", "name", "from", "to", "count"))
        if kind not in ("template", "label") or not isinstance(name, str) or type(count) is not int or count < 1 or old == new:
            raise ValueError("A scoped replacement has an invalid name, count, or destination")
        if not isinstance(old, str) or not old:
            raise ValueError("A replacement requires the expected source target")
        symbolic = not old.strip().startswith(("http://", "https://"))
        if not symbolic:
            checked_url(old.strip())
        elif kind == "template" and name in templates and not any(c in old for c in ("<", ">", "\n", "\r")):
            source = EmailLinks()
            source.feed(changed_templates.get(name, templates[name])[0].decode("utf-8"))
            targets = [value for _, value in source.destinations]
            if targets.count(unescape(old)) != count:
                raise ValueError("A symbolic, mail, or phone source requires a complete template-link value")
        else:
            raise ValueError("A source requires a reviewed URL or complete template-link value")
        if not approved_destination(new, origins):
            raise ValueError("A replacement destination is outside the approved sandbox origins")
        if (kind, name, old) in touched:
            raise ValueError("Duplicate reviewed replacement")
        touched.add((kind, name, old))
        if kind == "template" and name in templates:
            contents, metadata = changed_templates.get(name, templates[name])
            rendered = rewrite_literal(contents.decode("utf-8"), old, new, count, name, symbolic)
            changed_templates[name] = (rendered.encode("utf-8"), metadata)
        elif kind == "label" and name in labels and count == 1 and name not in changed_labels:
            entry = deepcopy(labels[name])
            node = entry.find(tag("value"))
            if node is None or node.text != old:
                raise ValueError(f"The reviewed CustomLabel value changed for {name}")
            node.text = new
            changed_labels[name] = entry
        else:
            raise ValueError("A replacement names an unsupported or missing component")
    return changed_templates, changed_labels


def check_candidate(templates, labels, changed_templates, changed_labels, origins):
    selected = set(changed_templates)
    selected.update(
        name for name, (body, _) in templates.items()
        if set(URL_LABEL.findall(body.decode("utf-8"))).intersection(changed_labels)
    )
    return {
        name: issues
        for name in sorted(selected)
        if (issues := unresolved_template_links(
            templates[name][0].decode("utf-8"), labels, origins,
        ))
    }


def write_xml(path, root):
    with path.open("xb") as file:
        ET.ElementTree(root).write(file, encoding="UTF-8", xml_declaration=True)


def write_overlay(output, templates, labels):
    output = output.resolve()
    if output == PRIVATE_ROOT.resolve() or not output.is_relative_to(PRIVATE_ROOT.resolve()):
        raise ValueError("URL overlay output must be a new directory inside salesforce/retrieved-private")
    output.mkdir(mode=0o700, parents=True)
    try:
        package = ET.Element(tag("Package"))
        for component, names in (("EmailTemplate", templates), ("CustomLabel", labels)):
            if names:
                metadata_type = ET.SubElement(package, tag("types"))
                for name in sorted(names):
                    ET.SubElement(metadata_type, tag("members")).text = name
                ET.SubElement(metadata_type, tag("name")).text = component
        ET.SubElement(package, tag("version")).text = "62.0"
        write_xml(output / "package.xml", package)

        for name, (contents, metadata) in templates.items():
            path = output / "email" / (name + ".email")
            path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            for target, data in ((path, contents), (path.with_name(path.name + "-meta.xml"), metadata)):
                with target.open("xb") as file:
                    file.write(data)
        if labels:
            root = ET.Element(tag("CustomLabels"))
            root.extend(labels[name] for name in sorted(labels))
            (output / "labels").mkdir(mode=0o700)
            write_xml(output / "labels/CustomLabels.labels", root)
    except BaseException:
        shutil.rmtree(output)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--template-root", action="append", type=Path, required=True)
    parser.add_argument("--labels", type=Path, required=True)
    parser.add_argument("--plan", type=Path, help="Private exact replacements JSON")
    parser.add_argument("--output", type=Path, help="New private directory for a reviewed URL overlay")
    args = parser.parse_args()
    if args.output and not args.plan:
        parser.error("--output requires --plan")
    try:
        templates = read_templates(args.template_root)
        labels = read_labels(args.labels)
        report = audit(templates, labels)
        if args.plan:
            plan = json.loads(args.plan.read_text())
            changed_templates, changed_labels = apply_plan(plan, templates, labels)
            revised_templates = {**templates, **changed_templates}
            revised_labels = {**labels, **changed_labels}
            report["candidate_link_blockers"] = check_candidate(
                revised_templates, revised_labels, changed_templates, changed_labels, plan["approvedOrigins"],
            )
            if args.output:
                if report["candidate_link_blockers"]:
                    print(json.dumps({"candidate_link_blockers": report["candidate_link_blockers"]}, indent=2))
                    raise ValueError("The selected templates retain uncontained link or asset inputs")
                write_overlay(args.output, changed_templates, changed_labels)
            report["changed_templates"] = sorted(changed_templates)
            report["changed_labels"] = sorted(changed_labels)
            report["after"] = audit(revised_templates, revised_labels)
        print(json.dumps(report, indent=2))
    except (OSError, ET.ParseError, ValueError) as error:
        # Parsing exceptions can include path content or source excerpts.
        if type(error) is ValueError:
            parser.exit(1, f"{error}\n")
        parser.exit(1, "Unable to read or write the private URL overlay inputs.\n")


if __name__ == "__main__":
    main()
