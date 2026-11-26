import copy
import importlib.util
import shutil
import tempfile
import unittest
from pathlib import Path

CHECKER_PATH = Path(__file__).resolve().parent.parent / "check-customer-routing.py"
spec = importlib.util.spec_from_file_location("check_customer_routing", CHECKER_PATH)
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)
ROOT = CHECKER_PATH.parent.parent
METADATA = ROOT / checker.ROUTING / "metadata"


class RoutingPolicyTests(unittest.TestCase):
    def setUp(self):
        self.policy = checker.json_file(ROOT / "config/routing/customer-admins.json")
        self.catalog = checker.json_file(ROOT / "content/_data/us-states.json")
        self.source = (METADATA / checker.POLICY_CLASS).read_text(encoding="utf-8")

    def test_contract_passes_offline(self):
        checker.check(ROOT)

    def test_independent_legacy_comparison_detects_an_extra_transfer(self):
        changed = copy.deepcopy(self.policy)
        changed["territories"]["BETH"].remove("CO")
        changed["territories"]["STEPHANIE"].append("CO")
        with self.assertRaisesRegex(checker.CheckFailure, "independent 13-transfer review"):
            checker.check_reviewed_policy(changed, self.catalog, self.source)

    def test_apex_alias_drift_fails_independently_of_renderer(self):
        changed = self.source.replace("'DELEWARE' => 'DE'", "'DELEWARE' => 'DC'")
        with self.assertRaisesRegex(checker.CheckFailure, "Apex aliases"):
            checker.check_reviewed_policy(self.policy, self.catalog, changed)

    def test_assignment_rejects_removed_open_status(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            bindings = root / "bindings.json"
            bindings.write_text(
                '{"orgId":"00D000000000001","portalUrl":"https://portal.example.invalid",'
                '"admins":{"BETH":{"username":"west@example.invalid","notificationEmail":"test@example.invalid"},'
                '"STEPHANIE":{"username":"east@example.invalid","notificationEmail":"test@example.invalid"}}}',
                encoding="utf-8",
            )
            baseline = root / "baseline.assignmentRules"
            baseline.write_text(checker.BASELINE_ASSIGNMENT, encoding="utf-8")
            target = root / "metadata"
            checker.generate(ROOT, target, "--bindings", str(bindings), "--assignment-baseline", str(baseline))
            assignment = target / checker.ASSIGNMENT_RULE
            edited = assignment.read_text(encoding="utf-8").replace('TEXT(Status)="Prospect",', "", 1)
            assignment.write_text(edited, encoding="utf-8")
            with self.assertRaisesRegex(checker.CheckFailure, "Generated formulas"):
                checker.check_assignment_rules(target, self.policy)

    def test_schema_rejects_a_queue_key_without_unique_enforcement(self):
        with tempfile.TemporaryDirectory() as tmp:
            metadata = Path(tmp) / "metadata"
            shutil.copytree(METADATA, metadata)
            queue = metadata / "objects/SMS_Message_Queue__c.object"
            changed = queue.read_text(encoding="utf-8").replace("<unique>true</unique>", "<unique>false</unique>")
            queue.write_text(changed, encoding="utf-8")
            with self.assertRaisesRegex(checker.CheckFailure, "SMS event key must be a unique external ID"):
                checker.check_schema(metadata, ROOT / "salesforce/routing-migration/apex")


if __name__ == "__main__":
    unittest.main()
