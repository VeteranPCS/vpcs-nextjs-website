import copy
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import unittest

import generate


class ControlledOverlayTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 26, 6, tzinfo=timezone.utc)
        run = "offline-approval"
        self.config = {
            "orgId": generate.ORG, "isSandbox": True, "runId": run,
            "issuedAt": "2026-11-26T05:55:00Z", "expiresAt": "2026-11-26T06:15:00Z",
            "slots": [{
                "scenario": "AgentSelectedCO", "submissionId": "synthetic-sid",
                "lastName": sha256(run.encode()).hexdigest()[:16] + "-AgentSelectedCO",
                "queueId": "a01000000000001", "leadId": "00Q000000000001", "partnerId": "001000000000001",
                "eventKey": "00Q000000000001:INITIAL_AGENT:001000000000001",
            }],
        }

    def test_accepts_only_current_reviewed_webdev_identity(self):
        self.assertEqual("offline-approval", generate.validate(self.config, self.now)[0])
        for changes in ({"isSandbox": False}, {"orgId": "00D000000000001"}, {"runId": "baseline-capture"}):
            with self.assertRaises(ValueError):
                generate.validate({**self.config, **changes}, self.now)
        with self.assertRaises(ValueError):
            generate.validate(self.config, self.now + timedelta(minutes=20))
        with self.assertRaises(ValueError):
            generate.validate({**self.config, "expiresAt": "2026-11-26T06:26:00Z"}, self.now)

    def test_rejects_duplicates_excess_slots_and_wrong_event_relation(self):
        for slots in ([self.config["slots"][0]] * 2, [self.config["slots"][0]] * 5):
            with self.assertRaises(ValueError):
                generate.validate({**self.config, "slots": slots}, self.now)
        broken = copy.deepcopy(self.config)
        broken["slots"][0]["eventKey"] = "00Q000000000002:INITIAL_AGENT:001000000000001"
        with self.assertRaises(ValueError):
            generate.validate(broken, self.now)
        broken = copy.deepcopy(self.config)
        broken["slots"][0]["lastName"] = "Non-synthetic"
        with self.assertRaises(ValueError):
            generate.validate(broken, self.now)

    def test_client_patch_only_targets_sms_capture_boundary(self):
        boundary = "if (outboundMode != WebdevOutboundCapture.Mode.Production) {"
        sender_registry = boundary + " WebdevOutboundCapture.Action.SenderRegistry; }\n"
        send_capture = boundary + " WebdevOutboundCapture.Action.Sms; }\n"
        patched = generate.patch_client(sender_registry + send_capture + "      resolveSenderPhoneNumber(req);")
        self.assertTrue(patched.startswith(sender_registry))
        self.assertEqual(1, patched.count("WebdevControlledSms.consumePermit"))
        with self.assertRaises(ValueError):
            generate.patch_client(sender_registry + "      resolveSenderPhoneNumber(req);")


if __name__ == "__main__":
    unittest.main()
