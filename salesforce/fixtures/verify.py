#!/usr/bin/env python3
"""Check a fixture bundle and optional Salesforce reconciliation exports offline."""

import argparse
import hashlib
import json
from pathlib import Path
import re

from generate import SALESFORCE, SF_ID, build_bundle, load_result


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def records(directory: Path, name: str, count: int) -> list[dict]:
    result = load_result(directory / f"{name}.json")
    rows = result["records"]
    require(result["totalSize"] == count and len(rows) == count, f"Expected {count} {name} rows")
    return rows


def reconcile(directory: Path, run_id: str, digest: str) -> None:
    accounts = records(directory, "accounts", 3)
    area, = records(directory, "area", 1)
    assignments = records(directory, "assignments", 2)
    opportunity, = records(directory, "opportunity", 1)
    captures = load_result(directory / "captures.json")
    ids = {"fixtureArea": area["Id"], "fixtureImpactOpportunity": opportunity["Id"]}
    for role in ("Agent", "Lender", "Customer"):
        row, = [account for account in accounts if account["LastName"] == f"{run_id} {role}"]
        require(row["IsPersonAccount"] is True and row["AccountId_15__c"] == row["Id"][:15],
                f"{role} has an unexpected account identity")
        require(all(row[f"is{expected}__pc"] is (role == expected)
                    for expected in ("Agent", "Lender", "Customer")),
                f"{role} role formula mismatch")
        require(row["Active_on_Website__pc"] is (role != "Customer"), f"{role} website status mismatch")
        require(row["PersonEmail"] is None and row["PersonMobilePhone"] is None,
                f"{role} contains contact details")
        ids[f"fixture{role}"] = row["Id"]

    for role, score in (("Agent", 90), ("Lender", 80)):
        row, = [assignment for assignment in assignments if assignment["Agent__c"] == ids[f"fixture{role}"]]
        require(row["Area__c"] == area["Id"] and row["AA_Score__c"] == score, f"{role} assignment mismatch")
        ids[f"fixture{role}Assignment"] = row["Id"]
    require(all(SF_ID.fullmatch(record_id) for record_id in ids.values()) and len(set(ids.values())) == 7,
            "Invalid or duplicate record IDs")
    require(opportunity["AccountId"] == ids["fixtureCustomer"] and opportunity["IsClosed"] is True
            and opportunity["StageName"] == "Closed - Lost"
            and opportunity["Agent__c"] is None and opportunity["Lender__c"] is None,
            "Opportunity is outside the reviewed Customer Closed - Lost path")
    require([opportunity[key] for key in ("Sale_Price__c", "Payout_Amount__c", "Charity_Amount__c")]
            == [300000, 123.45, 45.67], "Opportunity impact amounts mismatch")

    capture_rows = captures["records"]
    require(captures["totalSize"] == len(capture_rows) and len(capture_rows) >= 2,
            "Expected at least two AccountRevalidation captures after asynchronous work finishes")
    for row in capture_rows:
        require(row["Run_Id__c"] == run_id and row["Action__c"] == "AccountRevalidation"
                and row["Item_Count__c"] == 1 and re.fullmatch(r"[0-9a-f]{64}", row["Digest__c"])
                and bool(row["CreatedDate"]), "Unexpected capture activity for this run")
    require(len({row["Digest__c"] for row in capture_rows}) == len(capture_rows),
            "Duplicate capture evidence")

    response_path = directory / "rendering-response.json"
    if response_path.exists() and response_path.stat().st_size:
        response = load_result(response_path)["body"]
        responses = (json.loads(response) if isinstance(response, str) else response)["compositeResponse"]
        require(len(responses) == len(ids), "Unexpected composite response count")
        for response in responses:
            require(response["httpStatusCode"] == 201 and response["body"]["success"] is True,
                    "Composite contains a failed subrequest")
        require({item["referenceId"]: item["body"]["id"] for item in responses} == ids,
                "Composite IDs do not match persisted marker results")
    else:
        print("Persisted reconciliation only. Composite receipt unavailable.")
    print(f"Reconciled seven rendering records and {len(capture_rows)} capture rows for {run_id} ({digest}).")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--snapshot", type=Path, default=SALESFORCE / "retrieved-private")
    parser.add_argument("--evidence-dir", type=Path)
    args = parser.parse_args()
    try:
        plan = read_json(args.bundle / "plan.json")
        rendering_file = args.bundle / "rendering-create.json"
        rendering = read_json(rendering_file)
        close_date = rendering["compositeRequest"][-1]["body"]["CloseDate"]
        expected = build_bundle(args.snapshot, plan["runId"], close_date)
        for name, packet in expected.items():
            require(json.dumps(read_json(args.bundle / name), sort_keys=True)
                    == json.dumps(packet, sort_keys=True), f"{name} differs from the reviewed generator")
        digest = hashlib.sha256(rendering_file.read_bytes()).hexdigest()
        print(f"Verified offline rendering packet for {plan['runId']} with close date {close_date}. SHA-256 {digest}.")
        if args.evidence_dir:
            reconcile(args.evidence_dir, plan["runId"], digest)
    except (AttributeError, IndexError, KeyError, OSError, TypeError, ValueError) as error:
        parser.exit(1, f"Fixture verification failed: {error}\n")


if __name__ == "__main__":
    main()
