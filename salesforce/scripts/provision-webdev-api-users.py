#!/usr/bin/env python3
"""Idempotent operator-only setup of two API-only users in the verified WebDev org.

Does not set passwords, send credential emails, assign object permissions, or create
OAuth applications. Salesforce DML's default email headers remain disabled.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess

ORG = "00Djg000000EK8YEAW"
PROFILE = "00eRg000002nW0nIAE"
USERS = [
    ("tech+webdev-preview@veteranpcs.com.webdev", "Webdev Preview API", "wdprev"),
    ("tech+webdev-workflow@veteranpcs.com.webdev", "Webdev Workflow API", "wdflow"),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sf", default="sf")
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if not args.execute:
        print(json.dumps({"targetOrg": ORG, "profile": PROFILE, "users": [u[0] for u in USERS],
                          "email": "tech@veteranpcs.com", "credentialEmail": False,
                          "objectPermissionAssignments": 0}))
        return

    def sf(*command):
        result = subprocess.run([args.sf, *command, "--target-org", "vpcs-webdev", "--json"],
                                capture_output=True, text=True, check=False)
        try:
            payload = json.loads(result.stdout)
        except ValueError as exc:
            raise RuntimeError("Salesforce CLI returned invalid JSON; inspect privately") from exc
        if result.returncode or payload.get("status") != 0:
            raise RuntimeError("Salesforce operation failed: " + str(payload.get("name", "unknown")))
        return payload["result"]

    identity = sf("data", "query", "--query", "SELECT Id, IsSandbox FROM Organization")["records"]
    if len(identity) != 1 or identity[0]["Id"] != ORG or identity[0]["IsSandbox"] is not True:
        raise RuntimeError("Refusing mutation outside the verified webdev sandbox")
    profile = sf("data", "query", "--query", "SELECT Id, Name, PermissionsApiEnabled, "
                 "PermissionsApiUserOnly, PermissionsModifyAllData, PermissionsViewAllData "
                 "FROM Profile WHERE Id='" + PROFILE + "'")["records"]
    if len(profile) != 1 or not profile[0]["PermissionsApiEnabled"] or not profile[0]["PermissionsApiUserOnly"] \
            or profile[0]["PermissionsModifyAllData"] or profile[0]["PermissionsViewAllData"]:
        raise RuntimeError("API-only minimal profile verification failed")
    license_rows = sf("data", "query", "--query", "SELECT Id, MasterLabel, TotalLicenses, UsedLicenses "
                      "FROM PermissionSetLicense WHERE MasterLabel='Salesforce API Integration'")["records"]
    if len(license_rows) != 1:
        raise RuntimeError("Expected API Integration permission set license was not found")
    license_id = license_rows[0]["Id"]
    ledger = []
    for username, last_name, alias in USERS:
        found = sf("data", "query", "--query", "SELECT Id, Username, ProfileId, Email, IsActive FROM User "
                   "WHERE Username='" + username + "'")["records"]
        if found:
            if len(found) != 1 or found[0]["Username"] != username or found[0]["ProfileId"] != PROFILE or found[0]["Email"] != "tech@veteranpcs.com" \
                    or found[0]["IsActive"] is not True:
                raise RuntimeError("Existing integration user does not match the expected configuration")
            user_id = found[0]["Id"]
            created = False
        else:
            values = (f"Username='{username}' LastName='{last_name}' Alias='{alias}' "
                      "Email='tech@veteranpcs.com' EmailEncodingKey='UTF-8' "
                      "LanguageLocaleKey='en_US' LocaleSidKey='en_US' "
                      f"TimeZoneSidKey='America/Los_Angeles' ProfileId='{PROFILE}' IsActive=true")
            user_id = sf("data", "create", "record", "--sobject", "User", "--values", values)["id"]
            created = True
        assignments = sf("data", "query", "--query", "SELECT Id FROM PermissionSetLicenseAssign "
                         "WHERE AssigneeId='" + user_id + "' AND PermissionSetLicenseId='" + license_id + "'")["records"]
        if not assignments:
            sf("data", "create", "record", "--sobject", "PermissionSetLicenseAssign", "--values",
               f"AssigneeId='{user_id}' PermissionSetLicenseId='{license_id}'")
        ledger.append({"username": username, "id": user_id, "created": created,
                       "profileId": PROFILE, "permissionSetLicenseId": license_id})
        print(json.dumps(ledger[-1]))
    output = Path(__file__).resolve().parents[1] / "retrieved-private" / "webdev-api-users.json"
    output.parent.mkdir(exist_ok=True)
    staging = output.with_suffix(".tmp")
    descriptor = os.open(staging, os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w") as stream:
        stream.write(json.dumps({"orgId": ORG, "users": ledger}, indent=2) + "\n")
    os.replace(staging, output)


if __name__ == "__main__":
    main()
