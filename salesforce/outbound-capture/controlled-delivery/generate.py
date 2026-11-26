#!/usr/bin/env python3
"""Prepare a private, WebDev-only live SMS overlay and a capture restoration package."""
import argparse
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import json
from pathlib import Path
import re
import shutil

HERE = Path(__file__).resolve().parent
ORG = "00Djg000000EK8YEAW"
TEMPLATES = ["WebdevControlledSms", "WebdevControlledSmsTest", "WebdevControlledSmsNativeTest"]
TARGET_CLASSES = ["OpenPhoneClient", "VpcsRegionalSmsWorker"]
SCENARIOS = {"AgentSelectedCO", "LenderSelectedCO", "AgentSelectedFL", "LenderSelectedFL"}
ID = re.compile(r"[A-Za-z0-9]{15}(?:[A-Za-z0-9]{3})?\Z")
TOKEN = re.compile(r"[A-Za-z0-9_-]{1,64}\Z")
EVENT = re.compile(r"[A-Za-z0-9:_-]{1,160}\Z")
NS = "http://soap.sforce.com/2006/04/metadata"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def instant(value):
    require(isinstance(value, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z", value),
            "Use UTC ISO timestamps")
    return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(microsecond=0)


def validate(data, now):
    require(data.get("orgId") == ORG and data.get("isSandbox") is True, "Exact WebDev identity is required")
    run = data["runId"]
    require(TOKEN.fullmatch(run) and run != "baseline-capture", "A dedicated run marker is required")
    issued, expires = instant(data["issuedAt"]), instant(data["expiresAt"])
    require(issued <= now < expires and timedelta(0) < expires - issued <= timedelta(minutes=30),
            "The approved window must be current and at most 30 minutes")
    slots = data["slots"]
    require(isinstance(slots, list) and 1 <= len(slots) <= 4, "Provide one to four exact SMS slots")
    seen_queues, seen_leads, seen_scenarios, seen_sids = set(), set(), set(), set()
    for slot in slots:
        require(all(ID.fullmatch(slot[name]) for name in ("queueId", "leadId", "partnerId")),
                "Slot Salesforce IDs are invalid")
        require(slot["leadId"].startswith("00Q") and slot["partnerId"].startswith("001"),
                "Each live slot must identify a Lead and a partner Account")
        scenario = slot["scenario"]
        require(scenario in SCENARIOS and scenario not in seen_scenarios, "Use only distinct approved scenarios")
        expected = f'{sha256(run.encode()).hexdigest()[:16]}-{scenario}'
        require(slot["lastName"] == expected, "Synthetic surname does not match run and scenario")
        require(TOKEN.fullmatch(slot["submissionId"]) and slot["submissionId"] not in seen_sids,
                "Use distinct approved website submission IDs")
        key = slot["eventKey"]
        require(EVENT.fullmatch(key) is not None, "Event identity is not valid")
        parts = key.split(":")
        role = "AGENT" if scenario.startswith("Agent") else "LENDER"
        require(len(parts) == 3 and parts[0][:15] == slot["leadId"][:15] and
                parts[1] == f"INITIAL_{role}" and parts[2][:15] == slot["partnerId"][:15],
                "Event identity does not match the reviewed Lead, role and partner")
        queue, lead = slot["queueId"][:15], slot["leadId"][:15]
        require(queue not in seen_queues and lead not in seen_leads, "Live slots must have unique queue rows and Leads")
        seen_queues.add(queue)
        seen_leads.add(lead)
        seen_scenarios.add(scenario)
        seen_sids.add(slot["submissionId"])
    return run, issued, expires, slots


def replace_once(text, anchor, replacement):
    require(text.count(anchor) == 1, "Baseline does not have the expected scoped integration anchor")
    return text.replace(anchor, replacement, 1)


def patch_worker(source):
    for before, after in [
        ("for (SMS_Message_Queue__c row : rows) {",
         "for (SMS_Message_Queue__c row : WebdevControlledSms.liveFirst(rows)) {"),
        ("SendMessageResult result = service.sendSMS(request);",
         "SendMessageResult result = WebdevControlledSms.sendOrCapture(jobId, row.Id, service, request);"),
        ("        update as system unclaimed;",
         "        update as system unclaimed;\n        WebdevControlledSms.reserve(ids, jobId);"),
    ]:
        source = replace_once(source, before, after)
    return source


def patch_client(source):
    anchor = ("      resolveSenderPhoneNumber(req);")
    require(source.count(anchor) == 1, "Missing current OpenPhoneClient send method")
    start = source.rfind("if (outboundMode != WebdevOutboundCapture.Mode.Production) {", 0, source.index(anchor))
    require(start >= 0, "WebDev OpenPhone capture boundary is missing")
    boundary = "if (outboundMode != WebdevOutboundCapture.Mode.Production) {"
    require("WebdevOutboundCapture.Action.Sms" in source[start:source.index(anchor)], "Target boundary is not SMS capture")
    return source[:start] + source[start:].replace(boundary,
        "if (outboundMode != WebdevOutboundCapture.Mode.Production &&\n"
        "           !WebdevControlledSms.consumePermit(req, this.namedCredentialName)) {", 1)


def apex_date(value):
    parts = (value.year, value.month, value.day, value.hour, value.minute, value.second)
    return "Datetime.newInstanceGmt(" + ", ".join(map(str, parts)) + ")"


def write_policy(destination, run, issued, expires, slots):
    fields = ("queueId", "leadId", "partnerId", "scenario", "lastName", "submissionId", "eventKey")
    constructors = ",\n".join(
        "            new WebdevControlledSms.Slot(" + ", ".join("'" + slot[key] + "'" for key in fields) + ")"
        for slot in slots
    )
    destination.write_text(
        "public class WebdevControlledSmsPolicy {\n"
        "    public static WebdevControlledSms.DeliveryWindow window() {\n"
        f"        return new WebdevControlledSms.DeliveryWindow('{run}', {apex_date(issued)}, {apex_date(expires)},\n"
        "            new List<WebdevControlledSms.Slot>{\n" + constructors + "\n        });\n    }\n}\n"
    )


def manifest(output, classes, reservation=False):
    members = "".join(f"        <members>{name}</members>\n" for name in classes)
    object_type = (
        "    <types><members>Webdev_Live_SMS_Reservation__c</members><name>CustomObject</name></types>\n"
        if reservation else ""
    )
    (output / "package.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="{NS}">\n'
        "    <types>\n" + members + "        <name>ApexClass</name>\n    </types>\n" +
        object_type + "    <version>67.0</version>\n</Package>\n"
    )


def prepare(config, original, worker, output, restore, now):
    run, issued, expires, slots = validate(config, now)
    before_client, before_worker = original.read_text(), worker.read_text()
    patched_client, patched_worker = patch_client(before_client), patch_worker(before_worker)
    require(output != restore and not output.exists() and not restore.exists(), "Use two fresh private output directories")
    for target in (output, restore):
        target.mkdir(mode=0o700)
        (target / "classes").mkdir()
        for source in (original, worker):
            shutil.copy2(source.with_name(source.name + "-meta.xml"), target / "classes" / (source.name + "-meta.xml"))
    (restore / "classes/OpenPhoneClient.cls").write_text(before_client)
    (restore / "classes/VpcsRegionalSmsWorker.cls").write_text(before_worker)
    (output / "classes/OpenPhoneClient.cls").write_text(patched_client)
    (output / "classes/VpcsRegionalSmsWorker.cls").write_text(patched_worker)
    for name in TEMPLATES:
        shutil.copy2(HERE / (name + ".cls"), output / "classes" / (name + ".cls"))
    write_policy(output / "classes/WebdevControlledSmsPolicy.cls", run, issued, expires, slots)
    for name in TEMPLATES + ["WebdevControlledSmsPolicy"]:
        (output / f"classes/{name}.cls-meta.xml").write_text(
            f'<?xml version="1.0" encoding="UTF-8"?>\n<ApexClass xmlns="{NS}">\n'
            "    <apiVersion>67.0</apiVersion>\n    <status>Active</status>\n</ApexClass>\n"
        )
    (output / "objects").mkdir()
    shutil.copy2(HERE / "Webdev_Live_SMS_Reservation__c.object", output / "objects")
    manifest(output, TARGET_CLASSES + TEMPLATES + ["WebdevControlledSmsPolicy"], reservation=True)
    manifest(restore, TARGET_CLASSES)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for arg in ("config", "openphone", "worker", "output", "restore"):
        parser.add_argument(f"--{arg}", required=True, type=Path)
    args = parser.parse_args()
    try:
        prepare(json.loads(args.config.read_text()), args.openphone, args.worker,
                args.output.resolve(), args.restore.resolve(), datetime.now(timezone.utc))
    except (OSError, KeyError, TypeError, ValueError):
        parser.exit(1, "Could not prepare the reviewed WebDev-only live SMS overlay and restore package.\n")


if __name__ == "__main__":
    main()
