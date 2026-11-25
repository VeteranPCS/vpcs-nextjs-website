#!/usr/bin/env python3
"""Bind the two WebDev apps to their narrowly scoped, API-only integration users.

Requires the tested owner guard deployment. No production target, credential
output, profile assignment or broad administrative permission is supported.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = ROOT / "retrieved-private"
ORG = "00Djg000000EK8YEAW"
PROFILE = "00eRg000002nW0nIAE"
NS = "http://soap.sforce.com/2006/04/metadata"
APPS = [("VPCS_Webdev_Preview", "tech+webdev-preview@veteranpcs.com.webdev", "VPCS_Webdev_Read"),
        ("VPCS_Webdev_Workflow", "tech+webdev-workflow@veteranpcs.com.webdev", "VPCS_Webdev_Test")]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sf", default="sf")
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if not args.execute:
        print(json.dumps({"orgId": ORG, "appBindings": APPS, "sessionTimeoutMinutes": 60}))
        return
    os.umask(0o077)

    def sf(*command, evidence=None):
        proc = subprocess.run([args.sf, *command, "--target-org", "vpcs-webdev", "--json"],
                              cwd=ROOT, capture_output=True, text=True, check=False)
        result = json.loads(proc.stdout)
        if evidence:
            (PRIVATE / evidence).write_text(proc.stdout)
        if proc.returncode or result.get("status") != 0:
            raise RuntimeError("Salesforce operation failed: " + str(result.get("name", "unknown")))
        return result["result"]

    orgs = sf("data", "query", "--query", "SELECT Id, IsSandbox FROM Organization")["records"]
    if len(orgs) != 1 or orgs[0]["Id"] != ORG or orgs[0]["IsSandbox"] is not True:
        raise RuntimeError("Refusing access setup outside the verified WebDev sandbox")
    receipt = json.loads((PRIVATE / "webdev-access-deployment.json").read_text())["result"]
    coverage = receipt.get("details", {}).get("runTestResult", {}).get("codeCoverage", [])
    if receipt.get("success") is not True or receipt.get("numberTestErrors") != 0 \
            or receipt.get("numberTestsCompleted", 0) < 11 \
            or not any(c["name"] == "VpcsWebdevLeadOwnerGuard" and c["numLocations"] > 0
                       and c.get("numLocationsNotCovered", 0) / c["numLocations"] <= .25 for c in coverage):
        raise RuntimeError("A successful tested guard deployment receipt is required")
    guard = sf("data", "query", "--use-tooling-api", "--query",
               "SELECT Id, Status FROM ApexTrigger WHERE Name='VpcsWebdevLeadOwnerGuardTrigger'")["records"]
    if len(guard) != 1 or guard[0]["Status"] != "Active":
        raise RuntimeError("The live WebDev lead-owner guard is not active")

    ET.register_namespace("", NS)
    package = ET.Element("{" + NS + "}Package")
    package_type = ET.SubElement(package, "{" + NS + "}types")
    files = {}
    ledger = []
    for app, username, permission in APPS:
        users = sf("data", "query", "--query", "SELECT Id, Username, ProfileId, IsActive, Email "
                   "FROM User WHERE Username='" + username + "'")["records"]
        if len(users) != 1 or users[0]["Username"] != username or users[0]["ProfileId"] != PROFILE \
                or not users[0]["IsActive"] or users[0]["Email"] != "tech@veteranpcs.com":
            raise RuntimeError("Unexpected integration identity")
        sets = sf("data", "query", "--query", "SELECT Id, Name, IsOwnedByProfile FROM PermissionSet "
                  "WHERE Name='" + permission + "'")["records"]
        if len(sets) != 1 or sets[0]["IsOwnedByProfile"]:
            raise RuntimeError("Expected scoped permission set is missing")
        uid, pid = users[0]["Id"], sets[0]["Id"]
        assignments = sf("data", "query", "--query", "SELECT Id, PermissionSetId FROM PermissionSetAssignment "
                         "WHERE AssigneeId='" + uid + "' AND PermissionSet.IsOwnedByProfile=false")["records"]
        if any(row["PermissionSetId"] != pid for row in assignments):
            raise RuntimeError("Unexpected additional permission set on the integration user")
        if not assignments:
            sf("data", "create", "record", "--sobject", "PermissionSetAssignment", "--values",
               f"AssigneeId='{uid}' PermissionSetId='{pid}'")
        name = app + "_oauth_defaultPolicy"
        element = ET.Element("{" + NS + "}ExtlClntAppOauthConfigurablePolicies")
        # WebDev Metadata API validates developer names here, despite the
        # reference describing IDs. IDs remain in the assignment evidence.
        fields = {"clientCredentialsFlowUser": username, "commaSeparatedPermissionSet": permission,
                  "externalClientApplication": app, "ipRelaxationPolicyType": "Enforce",
                  "isClientCredentialsFlowEnabled": "true", "isGuestCodeCredFlowEnabled": "false",
                  "isNamedUserJwtEnabled": "false", "isTokenExchangeFlowEnabled": "false", "label": name,
                  "permittedUsersPolicyType": "AdminApprovedPreAuthorized", "refreshTokenPolicyType": "Zero",
                  "requiredSessionLevel": "STANDARD", "sessionTimeoutInMinutes": "60"}
        for key, value in fields.items():
            ET.SubElement(element, "{" + NS + "}" + key).text = value
        ET.indent(element)
        files["extlClntAppOauthPolicies/" + name + ".ecaOauthPlcy"] = ET.tostring(element, encoding="utf-8", xml_declaration=True)
        ET.SubElement(package_type, "{" + NS + "}members").text = name
        ledger.append({"app": app, "username": username, "userId": uid, "permissionSetId": pid})
    ET.SubElement(package_type, "{" + NS + "}name").text = "ExtlClntAppOauthConfigurablePolicies"
    ET.SubElement(package, "{" + NS + "}version").text = "62.0"
    ET.indent(package)
    files["package.xml"] = ET.tostring(package, encoding="utf-8", xml_declaration=True)
    archive = PRIVATE / "webdev-app-policies.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as zipped:
        for path, data in files.items():
            zipped.writestr(path, data)
    validation = sf("project", "deploy", "start", "--metadata-dir", str(archive), "--single-package",
                    "--dry-run", "--wait", "10", evidence="webdev-app-policies-validation.json")
    if validation.get("success") is not True:
        raise RuntimeError("App policies failed validation; inspect private evidence")
    deployed = sf("project", "deploy", "start", "--metadata-dir", str(archive), "--single-package",
                  "--wait", "10", evidence="webdev-app-policies-deployment.json")
    if deployed.get("success") is not True:
        raise RuntimeError("App policies did not deploy")
    evidence = {"orgId": ORG, "bindings": ledger, "deploymentId": deployed["id"],
                "packageSha256": hashlib.sha256(archive.read_bytes()).hexdigest()}
    (PRIVATE / "webdev-app-bindings.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps(evidence))


if __name__ == "__main__":
    main()
