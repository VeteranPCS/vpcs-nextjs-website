#!/usr/bin/env python3
"""Prepare new, org-local OAuth app definitions; never writes credentials to source."""
from pathlib import Path
import argparse
import xml.etree.ElementTree as ET

NS = "http://soap.sforce.com/2006/04/metadata"
APPS = [("VPCS_Webdev_Preview", "Webdev Preview"), ("VPCS_Webdev_Workflow", "Webdev Workflow")]
ET.register_namespace("", NS)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stage", choices=["headers", "oauth"], default="headers")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1] / "retrieved-private" / ("webdev-apps-" + args.stage)
    root.mkdir(exist_ok=True)
    members = {}

    def write(folder, name, suffix, kind, fields):
        element = ET.Element("{" + NS + "}" + kind)
        for key, value in fields.items():
            ET.SubElement(element, "{" + NS + "}" + key).text = value
        dest = root / folder / (name + suffix)
        dest.parent.mkdir(exist_ok=True)
        ET.indent(element)
        ET.ElementTree(element).write(dest, encoding="utf-8", xml_declaration=True)
        dest.chmod(0o600)
        members.setdefault(kind, []).append(name)

    for name, label in APPS:
        if args.stage == "headers":
            write("externalClientApps", name, ".eca", "ExternalClientApplication", {
                "contactEmail": "tech@veteranpcs.com",
                "description": "Isolated webdev sandbox website connection; no production access.",
                "distributionState": "Local", "isProtected": "false", "label": label,
            })
        else:
            write("extlClntAppOauthSettings", name + "_oauth", ".ecaOauth", "ExtlClntAppOauthSettings", {
                "commaSeparatedOauthScopes": "Api", "externalClientApplication": name,
                "label": label + " API settings",
            })
            write("extlClntAppGlobalOauthSets", name + "_global", ".ecaGlblOauth", "ExtlClntAppGlobalOauthSettings", {
                "callbackUrl": "https://veteranpcs--webdev.sandbox.my.salesforce.com/services/oauth2/success",
                "externalClientApplication": name, "isClientCredentialsFlowEnabled": "true",
                "isConsumerSecretOptional": "false", "isIntrospectAllTokens": "false",
                "isPkceRequired": "true", "isSecretRequiredForRefreshToken": "true",
                "label": label + " OAuth credentials",
                "shouldRotateConsumerKey": "false", "shouldRotateConsumerSecret": "false",
            })
    package = ET.Element("{" + NS + "}Package")
    for kind, names in members.items():
        item = ET.SubElement(package, "{" + NS + "}types")
        for name in names:
            ET.SubElement(item, "{" + NS + "}members").text = name
        ET.SubElement(item, "{" + NS + "}name").text = kind
    ET.SubElement(package, "{" + NS + "}version").text = "62.0"
    ET.indent(package)
    ET.ElementTree(package).write(root / "package.xml", encoding="utf-8", xml_declaration=True)
    print(root)


if __name__ == "__main__":
    main()
