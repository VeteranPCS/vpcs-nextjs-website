#!/usr/bin/env python3
"""Build the scoped uniqueness package from a freshly retrieved org baseline."""

import argparse
from copy import deepcopy
from pathlib import Path
import xml.etree.ElementTree as ET

NS = "http://soap.sforce.com/2006/04/metadata"
FIELD = "VPCS_Submission_ID__c"


def q(name):
    return f"{{{NS}}}{name}"


def write(root, path):
    ET.indent(root, space="    ")
    ET.ElementTree(root).write(path, encoding="UTF-8", xml_declaration=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("baseline", type=Path,
                        help="Fresh target-specific Lead.object or VPCS_Submission_ID__c.field-meta.xml")
    parser.add_argument("output", type=Path, help="New private directory for the scoped metadata package")
    args = parser.parse_args()

    source = ET.parse(args.baseline).getroot()
    if source.tag == q("CustomObject"):
        matches = [child for child in source.findall(q("fields")) if child.findtext(q("fullName")) == FIELD]
    elif source.tag == q("CustomField") and source.findtext(q("fullName")) == FIELD:
        matches = [source]
    else:
        matches = []
    if len(matches) != 1:
        parser.error(f"expected exactly one {FIELD} field in the retrieved baseline")
    original = matches[0]
    if original.findtext(q("type")) != "Text" or original.findtext(q("length")) != "128":
        parser.error("submission field differs from the reviewed Text(128) contract")
    if original.findtext(q("required")) == "true":
        parser.error("submission field must allow null historical values")

    field = deepcopy(original)
    field.tag = q("fields")
    for name, value in [("caseSensitive", "false"), ("unique", "true")]:
        property_node = field.find(q(name))
        if property_node is None:
            property_node = ET.SubElement(field, q(name))
        property_node.text = value
    field[:] = sorted(field, key=lambda child: child.tag)

    lead = ET.Element(q("CustomObject"))
    lead.append(field)
    package = ET.Element(q("Package"))
    types = ET.SubElement(package, q("types"))
    ET.SubElement(types, q("members")).text = f"Lead.{FIELD}"
    ET.SubElement(types, q("name")).text = "CustomField"
    ET.SubElement(package, q("version")).text = "67.0"

    args.output.mkdir(parents=True, exist_ok=False)
    (args.output / "objects").mkdir()
    ET.register_namespace("", NS)
    write(lead, args.output / "objects" / "Lead.object")
    write(package, args.output / "package.xml")


if __name__ == "__main__":
    main()
