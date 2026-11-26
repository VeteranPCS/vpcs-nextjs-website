#!/usr/bin/env python3
"""Operator-only, scoped retrieval of the two newly provisioned WebDev app secrets.

Temporarily enables the documented Connect REST credentials endpoint and always
restores the original disabled setting. Never prints tokens, keys, or secrets.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = ROOT / "retrieved-private"
ORG = "00Djg000000EK8YEAW"
ORIGIN = "https://veteranpcs--webdev.sandbox.my.salesforce.com"
NAMES = {"VPCS_Webdev_Preview", "VPCS_Webdev_Workflow"}
NS = {"m": "http://soap.sforce.com/2006/04/metadata"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sf", default="sf")
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if not args.execute:
        print(json.dumps({"target": ORG, "apps": sorted(NAMES), "output": str(PRIVATE / "app-credentials")}))
        return
    os.umask(0o077)

    def sf(*command, evidence=None):
        result = subprocess.run([args.sf, *command, "--target-org", "vpcs-webdev", "--json"],
                                cwd=ROOT, capture_output=True, text=True, check=False)
        payload = json.loads(result.stdout)
        if evidence:
            (PRIVATE / evidence).write_text(result.stdout)
        if result.returncode or payload.get("status") != 0:
            raise RuntimeError("Salesforce operation failed: " + str(payload.get("name", "unknown")))
        return payload["result"]

    org = sf("data", "query", "--query", "SELECT Id, IsSandbox FROM Organization")["records"]
    if len(org) != 1 or org[0]["Id"] != ORG or org[0]["IsSandbox"] is not True:
        raise RuntimeError("Refusing operation outside the verified WebDev sandbox")
    auth = sf("org", "display")  # Only retained in memory; never evidence or output.
    if auth["id"] != ORG or auth["instanceUrl"] != ORIGIN:
        raise RuntimeError("Unexpected authenticated instance")
    apps = sf("data", "query", "--query", "SELECT Id, DeveloperName FROM ExternalClientApplication "
              "WHERE DeveloperName IN ('VPCS_Webdev_Preview','VPCS_Webdev_Workflow')")["records"]
    if {row["DeveloperName"] for row in apps} != NAMES or len(apps) != 2:
        raise RuntimeError("The two expected sandbox apps were not found")
    consumers = {}
    for name in NAMES:
        candidates = list((PRIVATE / "webdev-apps-generated").rglob(name + "_oauth.ecaOauth"))
        if len(candidates) != 1:
            raise RuntimeError("Expected one generated sandbox OAuth configuration")
        link = ET.parse(candidates[0]).getroot().findtext("m:oauthLink", namespaces=NS)
        org_id, consumer_id = (link or "").split(":")
        if org_id != ORG[:15] or not consumer_id.startswith("888") or not consumer_id.isalnum():
            raise RuntimeError("OAuth consumer is not bound to the verified sandbox")
        consumers[name] = consumer_id
    output = PRIVATE / "app-credentials"
    output.mkdir(mode=0o700, exist_ok=True)
    try:
        enabled = sf("project", "deploy", "start", "--metadata-dir",
                     "retrieved-private/webdev-apps-secret-access-enable.zip", "--single-package", "--wait", "10",
                     evidence="webdev-apps-secret-rest-enable-result.json")
        if enabled.get("success") is not True:
            raise RuntimeError("Could not enable scoped administrator credential retrieval")
        for app in apps:
            name = app["DeveloperName"]
            if not app["Id"].startswith("0xI") or not app["Id"].isalnum():
                raise RuntimeError("Invalid app identity")
            # Relative, fixed Salesforce endpoint through the CLI's authenticated
            # transport. `org display` masks tokens in recent CLI versions.
            endpoint = "/services/data/v62.0/apps/oauth/credentials/" + app["Id"] + "/" + consumers[name] + "?part=keyandsecret"
            response = sf("api", "request", "rest", endpoint)
            if response.get("statusCode") != 200 or not isinstance(response.get("body"), dict):
                raise RuntimeError("Scoped credential endpoint did not return a successful object response")
            payload = response["body"]
            destination = output / (name + ".json")
            with destination.open("x") as stream:
                json.dump(payload, stream)
            destination.chmod(0o600)
            print(json.dumps({"app": name, "savedPrivately": True, "responseFields": sorted(payload.keys())}))
    finally:
        restored = sf("project", "deploy", "start", "--metadata-dir",
                      "retrieved-private/webdev-apps-secret-access-restore.zip", "--single-package", "--wait", "10",
                      evidence="webdev-apps-secret-rest-restore-result.json")
        if restored.get("success") is not True:
            raise RuntimeError("REST secret retrieval setting restoration failed; resolve before continuing")
        print(json.dumps({"restoredOriginalRestriction": True, "deploymentId": restored.get("id")}))


if __name__ == "__main__":
    main()
