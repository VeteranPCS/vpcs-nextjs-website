#!/usr/bin/env python3
"""Prepare, post once, or reconcile the reviewed WebDev rendering fixture."""

import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

from generate import API_ROOT, INSTANCE, ORG_ID, SALESFORCE, SF_ID, build_bundle, load_result
from verify import read_json, reconcile, require


PRIVATE = SALESFORCE / "retrieved-private"
EXPORTS = SALESFORCE / "fixture-exports"
DEFAULT_BUNDLE = EXPORTS / "webdev-initial-20261125"
ATTEMPTS = PRIVATE / "rendering-fixture-attempts"
TARGET = "vpcs-webdev"
CAPTURE_LABEL_QUERY = (
    "SELECT Name, Value FROM ExternalString WHERE Name = 'VPCS_Webdev_Capture_Run_Id' "
    "AND NamespacePrefix = null"
)
CAPTURE_RECEIPT = PRIVATE / "outbound-capture-deploy-evidence" / (
    "deployment-2026-11-25T19-56-39.711Z-b5f8b1a5-531e-492c-8477-4ee01c5ef21c.json"
)
EMAIL_RECEIPT = PRIVATE / "webdev-email-combined-deployment.json"
CAPTURE_DEPLOYMENT = "0Afjg0000004c58CAA"
EMAIL_DEPLOYMENT = "0Afjg0000004azOCAQ"
CLI_ENV = {**os.environ, "SF_AUTOUPDATE_DISABLE": "true", "SF_DISABLE_TELEMETRY": "true"}


def cli_args(*command):
    return ["sf", *command, "--target-org", TARGET, "--json"]


def cli_read(label, *command):
    response = subprocess.run(cli_args(*command), cwd=SALESFORCE, env=CLI_ENV,
                              capture_output=True, timeout=30, check=False)
    try:
        payload = json.loads(response.stdout)
    except (UnicodeError, ValueError):
        raise ValueError(f"{label} returned no structured Salesforce result") from None
    require(response.returncode == 0 and payload.get("status") == 0, f"{label} failed")
    return payload


def query(label, soql, *, tooling=False):
    command = ["data", "query", "--query", soql]
    if tooling:
        command.append("--use-tooling-api")
    return cli_read(label, *command)


def verify_target(plan):
    result = cli_read("WebDev CLI identity", "org", "display")["result"]
    require(result["id"] == ORG_ID and result["instanceUrl"] == INSTANCE, "Wrong Salesforce CLI target")
    organization = query("WebDev Organization identity", plan["identityQuery"])["result"]["records"]
    require(len(organization) == 1 and organization[0]["Id"] == ORG_ID
            and organization[0]["IsSandbox"] is True, "Salesforce did not confirm the exact WebDev sandbox")


def packet_from(bundle):
    require(bundle.is_relative_to(EXPORTS.resolve()), "Use a bundle in the ignored fixture-exports directory")
    plan = read_json(bundle / "plan.json")
    raw = (bundle / "rendering-create.json").read_bytes()
    rendering = json.loads(raw)
    close_date = rendering["compositeRequest"][-1]["body"]["CloseDate"]
    expected = build_bundle(PRIVATE, plan["runId"], close_date)
    for name, packet in expected.items():
        actual = rendering if name == "rendering-create.json" else read_json(bundle / name)
        require(json.dumps(actual, sort_keys=True) == json.dumps(packet, sort_keys=True),
                f"{name} differs from the reviewed fixture generator")
    return plan, rendering, raw, hashlib.sha256(raw).hexdigest()


def verify_deployment(path, deployment_id, expected_tests):
    receipt = load_result(path)
    require(receipt.get("id") == deployment_id and receipt.get("checkOnly") is False
            and receipt.get("done") is True and receipt.get("success") is True
            and receipt.get("status") == "Succeeded" and receipt.get("numberComponentErrors") == 0
            and receipt.get("numberTestErrors") == 0 and receipt.get("numberTestsCompleted") == expected_tests,
            "Expected passing WebDev deployment receipt is missing or invalid")


def attestation_for(path, run_id, digest):
    require(path is not None and not path.is_symlink(), "Supply a private fixture attestation")
    path = path.resolve()
    require(path.is_relative_to(PRIVATE.resolve()) and path.is_file() and not path.stat().st_mode & 0o077,
            "Attestation must be a private file under retrieved-private")
    data = read_json(path)
    expected = {
        "orgId": ORG_ID, "instanceUrl": INSTANCE, "runId": run_id, "renderingSha256": digest,
        "captureDeploymentId": CAPTURE_DEPLOYMENT, "emailDeploymentId": EMAIL_DEPLOYMENT,
        "deliverability": "System email only", "liveAutomationReviewed": True, "idleWindowConfirmed": True,
    }
    require(all(data.get(key) == value for key, value in expected.items())
            and data.get("liveAutomationReviewed") is True and data.get("idleWindowConfirmed") is True,
            "Attestation does not match the rendering request and release gates")
    try:
        checked_at, expires_at = (datetime.fromisoformat(data[key].replace("Z", "+00:00"))
                                  for key in ("checkedAt", "expiresAt"))
    except (AttributeError, KeyError, TypeError, ValueError):
        raise ValueError("Attestation timestamps must be UTC ISO values") from None
    now = datetime.now(timezone.utc)
    require(checked_at.utcoffset() == timedelta(0) and expires_at.utcoffset() == timedelta(0)
            and checked_at <= now < expires_at and expires_at - checked_at <= timedelta(minutes=30),
            "Attestation must cover this attempt in a current UTC window of at most 30 minutes")
    return path, expires_at


def captures_for(run_id):
    return (
        "SELECT Action__c, Item_Count__c, Run_Id__c, Digest__c, CreatedDate "
        f"FROM Webdev_Outbound_Capture__c WHERE Run_Id__c = '{run_id}' ORDER BY CreatedDate"
    )


def verify_preflight(plan, rendering):
    accounts = rendering["compositeRequest"][:3]
    owner_id = accounts[0]["body"]["OwnerId"]
    owners = query("Copied fixture owner", plan["ownerQuery"])["result"]["records"]
    require(len(owners) == 1 and owners[0]["Id"] == owner_id and owners[0]["IsActive"] is True,
            "The exact copied fixture owner must be active")
    types = query("Person Account record types", plan["personAccountRecordTypeQuery"])["result"]["records"]
    require(len(types) == 3 and {row["Id"] for row in types} == {item["body"]["RecordTypeId"] for item in accounts}
            and all(row["IsActive"] is True and row["IsPersonType"] is True for row in types),
            "The three exact active Person Account record types are required")
    opportunity_type = rendering["compositeRequest"][-1]["body"]["RecordTypeId"]
    types = query("Opportunity record type", "SELECT Id FROM RecordType "
                  f"WHERE Id = '{opportunity_type}' AND SobjectType = 'Opportunity' "
                  "AND DeveloperName = 'Customer' AND IsActive = true")["result"]["records"]
    require(len(types) == 1 and types[0]["Id"] == opportunity_type, "The exact active Customer type is required")
    empties = {
        **dict(zip(("Account marker", "Area marker", "Opportunity marker"), plan["queriesExpectedEmptyBeforeRendering"])),
        "Async Apex": ("SELECT COUNT() FROM AsyncApexJob "
                       "WHERE Status IN ('Holding','Queued','Preparing','Processing')"),
        "SMS queue": "SELECT COUNT() FROM SMS_Message_Queue__c WHERE Status__c IN ('New','Retry')",
        "Flow interviews": "SELECT COUNT() FROM FlowInterview",
        "Capture marker": captures_for(plan["runId"]),
    }
    for label, soql in empties.items():
        result = query(label, soql)["result"]
        require(result["totalSize"] == 0 and not result["records"], f"{label} is not empty")


def verify_capture_label(run_id):
    labels = query("Capture run label", CAPTURE_LABEL_QUERY, tooling=True)["result"]["records"]
    require(len(labels) == 1 and labels[0]["Name"] == "VPCS_Webdev_Capture_Run_Id"
            and labels[0]["Value"] == run_id, "Capture label does not match this run")


def write_new(path, content):
    with path.open("xb") as stream:
        stream.write(content)
        stream.flush()
        os.fsync(stream.fileno())


def check_post_receipt(path, rendering):
    response = load_result(path)
    require(response["statusCode"] == 200, "Unexpected composite HTTP status")
    body = response["body"]
    items = (json.loads(body) if isinstance(body, str) else body)["compositeResponse"]
    require(len(items) == 7 and {item["referenceId"] for item in items}
            == {item["referenceId"] for item in rendering["compositeRequest"]}, "Unexpected composite subresponses")
    for item in items:
        require(item["httpStatusCode"] == 201 and item["body"]["success"] is True
                and SF_ID.fullmatch(item["body"]["id"]), "Composite contains an unsuccessful create")
    require(len({item["body"]["id"] for item in items}) == 7, "Composite returned duplicate IDs")


def execute(bundle, attempt, attestation, plan, rendering, raw, digest):
    require(not attempt.exists() and not attempt.is_symlink() and not os.path.lexists(bundle / "rendering-response.json"),
            "An attempt already exists. Use --reconcile and preserve its receipts")
    verify_deployment(CAPTURE_RECEIPT, CAPTURE_DEPLOYMENT, 66)
    verify_deployment(EMAIL_RECEIPT, EMAIL_DEPLOYMENT, 28)
    attestation, expires_at = attestation_for(attestation, plan["runId"], digest)
    verify_target(plan)
    verify_preflight(plan, rendering)
    verify_target(plan)
    verify_capture_label(plan["runId"])
    require(datetime.now(timezone.utc) < expires_at, "Attestation expired during pre-flight")

    # Reserve the run independently of bundle location. A crash leaves the reservation in place.
    ATTEMPTS.mkdir(mode=0o700, exist_ok=True)
    attempt.mkdir(mode=0o700)
    request_path = attempt / "rendering-request.json"
    response_path = attempt / "rendering-response.json"
    write_new(attempt / "attempt.json", (json.dumps({
        "orgId": ORG_ID, "instanceUrl": INSTANCE, "runId": plan["runId"], "renderingSha256": digest,
        "captureDeploymentId": CAPTURE_DEPLOYMENT, "emailDeploymentId": EMAIL_DEPLOYMENT,
        "attestation": str(attestation.relative_to(PRIVATE.resolve())),
        "attemptedAt": datetime.now(timezone.utc).isoformat(),
    }, indent=2) + "\n").encode())
    write_new(request_path, raw)
    request_path.chmod(0o400)
    print(f"Attempt reserved at {attempt}", flush=True)

    try:
        with response_path.open("xb") as stdout, (attempt / "rendering-stderr.log").open("xb") as stderr:
            response = subprocess.run(
                cli_args("api", "request", "rest", f"{API_ROOT}/composite", "--method", "POST",
                         "--header", "Content-Type:application/json", "--body", f"@{request_path}"),
                cwd=SALESFORCE, env=CLI_ENV, stdout=stdout, stderr=stderr, timeout=90, check=False,
            )
        require(response.returncode == 0, "Salesforce CLI did not confirm the composite")
        check_post_receipt(response_path, rendering)
    except (KeyError, OSError, TypeError, ValueError, subprocess.TimeoutExpired):
        raise ValueError("Composite outcome needs reconciliation. The attempted response was preserved. "
                         "Use --reconcile.") from None
    print("Salesforce reported seven creates. Reconcile persisted records and asynchronous capture separately.")


def reconcile_attempt(bundle, attempt, plan, digest):
    receipt = attempt / "attempt.json"
    if receipt.is_file() and receipt.stat().st_size:
        require(read_json(receipt)["renderingSha256"] == digest, "Bundle hash differs from the recorded attempt")
    verify_target(plan)
    queries = dict(zip(
        ("accounts", "area", "assignments", "opportunity", "captures"),
        (plan["renderingReconciliationQueries"][0], plan["queriesExpectedEmptyBeforeRendering"][1],
         *plan["renderingReconciliationQueries"][1:], captures_for(plan["runId"])),
    ))
    ATTEMPTS.mkdir(mode=0o700, exist_ok=True)
    evidence = Path(tempfile.mkdtemp(prefix=f"reconcile-{plan['runId']}-", dir=ATTEMPTS))
    print(f"Read-only reconciliation exports: {evidence}", flush=True)
    for name, soql in queries.items():
        data = query(f"{name} reconciliation", soql)
        write_new(evidence / f"{name}.json", (json.dumps(data, indent=2) + "\n").encode())
    response_path = attempt / "rendering-response.json"
    if not response_path.exists():
        response_path = bundle / response_path.name
    if response_path.is_file():
        shutil.copyfile(response_path, evidence / response_path.name)
    reconcile(evidence, plan["runId"], digest)


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path, nargs="?", default=DEFAULT_BUNDLE)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--execute", action="store_true")
    mode.add_argument("--reconcile", action="store_true")
    parser.add_argument("--attestation", type=Path, help="Private UTC attestation for --execute")
    args = parser.parse_args()
    try:
        bundle = args.bundle.resolve()
        plan, rendering, raw, digest = packet_from(bundle)
        print(f"Verified {plan['runId']} rendering request. SHA-256 {digest}.")
        require(not ATTEMPTS.is_symlink(), "Attempt directory must be local to retrieved-private")
        attempt = ATTEMPTS / plan["runId"]
        if args.execute:
            execute(bundle, attempt, args.attestation, plan, rendering, raw, digest)
        elif args.reconcile:
            reconcile_attempt(bundle, attempt, plan, digest)
        else:
            print("Offline dry run. No Salesforce requests made.")
    except (AttributeError, IndexError, KeyError, OSError, TypeError, ValueError, subprocess.TimeoutExpired) as error:
        # JSON decoder and filesystem errors can include private values. Keep reports local.
        message = str(error) if type(error) is ValueError else "See private attempt evidence and check the CLI inputs."
        parser.exit(1, f"Fixture command failed: {message}\n")


if __name__ == "__main__":
    main()
