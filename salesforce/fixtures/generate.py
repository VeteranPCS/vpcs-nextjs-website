#!/usr/bin/env python3
"""Generate a deterministic WebDev fixture dossier from the private metadata snapshot."""

import argparse
from datetime import date
import json
from pathlib import Path
import re


SALESFORCE = Path(__file__).resolve().parents[1]
ORG_ID = "00Djg000000EK8YEAW"
INSTANCE = "https://veteranpcs--webdev.sandbox.my.salesforce.com"
API_ROOT = "/services/data/v62.0"
MARKER = "[VPCS WEBDEV TEST]"
INBOX = "tech@veteranpcs.com"
STATE_NAME = "Colorado"
STATE_CODE = "CO"
RUN_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{2,23}")
SF_ID = re.compile(r"(?:[A-Za-z0-9]{15}|[A-Za-z0-9]{18})")
COMPOSITE_REFERENCE = re.compile(r"@\{([A-Za-z][A-Za-z0-9]+)\.id\}")


def load_result(file: Path) -> dict:
    data = json.loads(file.read_text(encoding="utf-8"))
    if "status" in data and data["status"] != 0:
        raise ValueError(f"Unsuccessful snapshot result for {file.name}")
    result = data.get("result", data)
    if not isinstance(result, dict):
        raise ValueError(f"Unexpected snapshot result for {file.name}")
    return result


def record_type_id(describe: dict, inventory: list[dict], name: str) -> str:
    object_name = describe["name"]
    records = [row for row in inventory if row["SobjectType"] == object_name and row["DeveloperName"] == name]
    matches = [row for row in describe["recordTypeInfos"] if row["developerName"] == name
               and row["active"] is True and row["available"] is True]
    if len(records) != 1 or len(matches) != 1 or records[0]["Id"] != matches[0]["recordTypeId"]:
        raise ValueError(f"Missing or inconsistent record type {object_name}.{name}")
    return records[0]["Id"]


def confirmed_owner(snapshot: Path) -> str:
    rows = load_result(snapshot / "regional-owner-users.json")["records"]
    matches = [row for row in rows if row["Name"] == "Beth Soldner" and row["IsActive"] is True]
    if len(matches) != 1 or not SF_ID.fullmatch(matches[0]["Id"]) or not matches[0]["Id"].startswith("005"):
        raise ValueError("The copied Colorado regional owner did not match the private snapshot")
    return matches[0]["Id"]


def verify_fields(describe: dict, body: dict, reference_objects: dict[str, str]) -> None:
    fields = {field["name"]: field for field in describe["fields"]}
    for key, value in body.items():
        field = fields.get(key)
        if not field or field["createable"] is not True:
            raise ValueError(f"Fixture write to {describe['name']}.{key} is unavailable")
        reference = COMPOSITE_REFERENCE.fullmatch(value) if isinstance(value, str) else None
        if reference:
            if reference_objects.get(reference[1]) not in (field.get("referenceTo") or []):
                raise ValueError(f"Fixture reference does not match {describe['name']}.{key}")
            continue
        allowed_length = field.get("length", 0)
        if isinstance(value, str) and allowed_length and len(value) > allowed_length:
            raise ValueError(f"Fixture value exceeds {describe['name']}.{key} length")
        if field.get("restrictedPicklist"):
            available = {item["value"] for item in field.get("picklistValues", []) if item["active"]}
            if any(item not in available for item in str(value).split(";")):
                raise ValueError(f"Fixture value unavailable for {describe['name']}.{key}")
    required = {f["name"] for f in describe["fields"]
                if f["createable"] and not f["nillable"] and not f["defaultedOnCreate"]}
    if required.difference(body):
        raise ValueError(f"Missing required fields for {describe['name']}: {', '.join(sorted(required.difference(body)))}")


def build_bundle(snapshot: Path, run_id: str, close_date: str) -> dict[str, dict]:
    if not RUN_ID.fullmatch(run_id):
        raise ValueError("Use a run ID of 3 to 24 letters, digits, underscores or hyphens")
    if date.fromisoformat(close_date).isoformat() != close_date:
        raise ValueError("Use a close date in YYYY-MM-DD format")

    objects = ("Account", "Area__c", "Area_Assignment__c", "Opportunity", "Contact")
    schema = {name: load_result(snapshot / "describes" / f"{name}.json") for name in objects}
    record_types = load_result(snapshot / "record-types.json")["records"]
    owner_id = confirmed_owner(snapshot)
    agent_type = record_type_id(schema["Account"], record_types, "PersonAccountAgent")
    lender_type = record_type_id(schema["Account"], record_types, "Person_Account_Lender")
    customer_type = record_type_id(schema["Account"], record_types, "Person_Account_Customer")
    opportunity_type = record_type_id(schema["Opportunity"], record_types, "Customer")
    reference_objects: dict[str, str] = {}

    def create(ref: str, object_name: str, body: dict) -> dict:
        verify_fields(schema[object_name], body, reference_objects)
        reference_objects[ref] = object_name
        return {"method": "POST", "url": f"{API_ROOT}/sobjects/{object_name}", "referenceId": ref, "body": body}

    def person(role: str, type_id: str) -> dict:
        return {"RecordTypeId": type_id, "OwnerId": owner_id, "FirstName": MARKER,
                "LastName": f"{run_id} {role}", "Description": f"{MARKER} {run_id} rendering fixture",
                "BillingCity": "Colorado Springs", "BillingStateCode": STATE_CODE, "BillingCountryCode": "US"}

    def partner(role: str, type_id: str) -> dict:
        return {**person(role, type_id), "State_s_Licensed_in__pc": STATE_CODE,
                "Active_on_Website__pc": True, "Military_Status__pc": "Veteran", "Military_Service__pc": "Army",
                "Agent_Bio__pc": f"Synthetic {role.lower()} for the WebDev Colorado directory."}

    area_name = f"{MARKER} {run_id} Area"
    opportunity_name = f"{MARKER} {run_id} Impact"
    contact_last_name = f"{run_id} Template Contact"
    render = [
        create("fixtureAgent", "Account", partner("Agent", agent_type)),
        create("fixtureLender", "Account", partner("Lender", lender_type)),
        create("fixtureCustomer", "Account", person("Customer", customer_type)),
        create("fixtureArea", "Area__c", {"Name": area_name, "State__c": STATE_NAME, "Coverage_Target__c": 2}),
        create("fixtureAgentAssignment", "Area_Assignment__c",
               {"Agent__c": "@{fixtureAgent.id}", "Area__c": "@{fixtureArea.id}", "AA_Score__c": 90}),
        create("fixtureLenderAssignment", "Area_Assignment__c",
               {"Agent__c": "@{fixtureLender.id}", "Area__c": "@{fixtureArea.id}", "AA_Score__c": 80}),
        create("fixtureImpactOpportunity", "Opportunity", {
            "AccountId": "@{fixtureCustomer.id}", "OwnerId": owner_id, "RecordTypeId": opportunity_type,
            "Name": opportunity_name, "StageName": "Closed - Lost", "Loss_Reason__c": "Decided not to buy/sell",
            "CloseDate": close_date, "Sale_Price__c": 300000, "Payout_Amount__c": 123.45, "Charity_Amount__c": 45.67,
        }),
    ]
    contact = [create("fixtureTemplateContact", "Contact", {
        "FirstName": MARKER, "LastName": contact_last_name, "Email": INBOX, "OwnerId": owner_id,
    })]

    account_filter = f"FirstName = '{MARKER}' AND LastName IN ('{run_id} Agent', '{run_id} Lender', '{run_id} Customer')"
    contact_filter = f"FirstName = '{MARKER}' AND LastName = '{contact_last_name}'"
    plan = {
        "schemaVersion": 1,
        "mode": "generated-offline",
        "target": {"orgId": ORG_ID, "isSandbox": True, "instanceUrl": INSTANCE, "cliAlias": "vpcs-webdev"},
        "runId": run_id,
        "approvedInbox": INBOX,
        "requiredEvidenceBeforeAnyWrite": ["deployed verified HTTP capture", "verified Salesforce System email only"],
        "templateContactPhase": "after HTTP capture and System email only, before native email overlay",
        "identityQuery": "SELECT Id, IsSandbox FROM Organization",
        "ownerQuery": f"SELECT Id, IsActive FROM User WHERE Id = '{owner_id}'",
        "personAccountRecordTypeQuery": (
            "SELECT Id, DeveloperName, IsActive, IsPersonType FROM RecordType WHERE SobjectType = 'Account' "
            "AND DeveloperName IN ('PersonAccountAgent', 'Person_Account_Lender', 'Person_Account_Customer')"
        ),
        "queriesExpectedEmptyBeforeRendering": [
            f"SELECT Id FROM Account WHERE {account_filter}",
            f"SELECT Id FROM Area__c WHERE Name = '{area_name}'",
            f"SELECT Id FROM Opportunity WHERE Name = '{opportunity_name}'",
        ],
        "queriesForTemplateContact": {
            "expectedEmptyBefore": f"SELECT Id FROM Contact WHERE {contact_filter}",
            "checkPotentialDuplicates": f"SELECT Id FROM Contact WHERE Email = '{INBOX}'",
            "expectedOneAfter": f"SELECT Id, AccountId, Email FROM Contact WHERE {contact_filter}",
        },
        "renderingReconciliationQueries": [
            f"SELECT Id, AccountId_15__c, IsPersonAccount, LastName, isAgent__pc, isLender__pc, isCustomer__pc, Active_on_Website__pc, PersonEmail, PersonMobilePhone FROM Account WHERE {account_filter}",
            f"SELECT Id, Agent__c, Area__c, AA_Score__c FROM Area_Assignment__c WHERE Area__r.Name = '{area_name}'",
            f"SELECT Id, IsClosed, StageName, AccountId, Agent__c, Lender__c, Sale_Price__c, Payout_Amount__c, Charity_Amount__c FROM Opportunity WHERE Name = '{opportunity_name}'",
        ],
        "headshots": [
            {"referenceId": "fixtureAgent", "source": "public/images/agents/001000000000001.svg", "destination": "public/images/agents/<AccountId_15__c>.webp"},
            {"referenceId": "fixtureLender", "source": "public/images/lenders/001000000000002.svg", "destination": "public/images/lenders/<AccountId_15__c>.webp"},
        ],
    }
    return {
        "plan.json": plan,
        "rendering-create.json": {"allOrNone": True, "compositeRequest": render},
        "template-contact-create.json": {"allOrNone": True, "compositeRequest": contact},
    }


def write_bundle(output: Path, bundle: dict[str, dict]) -> None:
    files = {output / name: json.dumps(content, indent=2) + "\n" for name, content in bundle.items()}
    for path, text in files.items():
        if path.exists() and path.read_text(encoding="utf-8") != text:
            raise ValueError(f"Refusing to overwrite a different {path.name}; use a new output directory")
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    for path, text in files.items():
        if not path.exists():
            with path.open("x", encoding="utf-8") as stream:
                stream.write(text)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--close-date", required=True)
    parser.add_argument("--snapshot", type=Path, default=SALESFORCE / "retrieved-private")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        bundle = build_bundle(args.snapshot, args.run_id, args.close_date)
        output = args.output or SALESFORCE / "fixture-exports" / args.run_id
        write_bundle(output, bundle)
    except (OSError, ValueError, KeyError) as error:
        parser.exit(1, f"Fixture generation failed: {error}\n")
    print(output)


if __name__ == "__main__":
    main()
