"""Verify explicitly scoped template/label URL preparation without Salesforce access."""

from copy import deepcopy
from pathlib import Path
from tempfile import TemporaryDirectory
import runpy
import unittest
from xml.etree import ElementTree as ET

module = runpy.run_path(str(Path(__file__).with_name("prepare-webdev-email-overlay.urls.py")))
ORIGIN = "https://veteranpcs--webdev.sandbox.my.salesforce.com"
HOME = f"{ORIGIN}/lightning/page/home"
PORTAL = "https://veteranpcs.my.site.com/agentportal"
ASSET = "https://www.veteranpcs.com/logo.png"
INLINE_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1T0AAAAASUVORK5CYII="
FORM = "{!Opportunity.New_Form_URL__c}"


def entry(kind, name, old, new, count=1):
    return {"kind": kind, "name": name, "from": old, "to": new, "count": count}


def label(name, value):
    ns = module["NS"]
    return ET.fromstring(f'<labels xmlns="{ns}"><fullName>{name}</fullName><value>{value}</value></labels>')


class EmailUrlOverlayTests(unittest.TestCase):
    def test_private_sanitized_audit(self):
        results = module["audit_body"](
            f'<a href="{PORTAL}">Portal</a><a href="{FORM}">Form</a>'
            f'<a href="{{!$Label.URL_Test}}">Label</a><img src="{ASSET}" width="1" />'
            '<a href="https://copied-token@example.invalid/test">Credential-bearing link</a>'
        )
        self.assertEqual(results["url_labels"], ["URL_Test"])
        self.assertEqual(results["possible_pixel_count"], 1)
        self.assertIn("Opportunity.New_Form_URL__c", results["merge_links"])
        self.assertIn("example.invalid", results["literal_hosts"])
        self.assertNotIn("copied-token", repr(results))
        self.assertNotIn(PORTAL, repr(results))

    def test_reviewed_plan_preserves_non_url_content_and_metadata(self):
        name = "Opportunity/Fixture"
        original = (
            f'<a href="{FORM}">Open form</a><img src="{ASSET}" />'
            '<a href="{!$Label.URL_Test}">Open label</a><p>Unchanged body</p>'
        ).encode()
        sources = {name: (original, b"metadata stays byte-identical")}
        original_label = label("URL_Test", PORTAL)
        labels = {"URL_Test": original_label, "Unused": label("Unused", PORTAL)}
        plan = {"approvedOrigins": [ORIGIN], "replacements": [
            entry("template", name, FORM, HOME),
            entry("template", name, ASSET, INLINE_PNG),
            entry("label", "URL_Test", PORTAL, HOME),
        ]}
        changed, changed_labels = module["apply_plan"](plan, sources, labels)
        self.assertEqual(set(changed), {name})
        self.assertEqual(set(changed_labels), {"URL_Test"})
        self.assertEqual(changed[name][1], sources[name][1])
        self.assertIn(b"<p>Unchanged body</p>", changed[name][0])
        self.assertIn(FORM.encode(), sources[name][0])
        self.assertEqual(original_label.findtext(module["tag"]("value")), PORTAL)
        self.assertEqual(module["check_candidate"](
            {**sources, **changed}, {**labels, **changed_labels}, changed, changed_labels, [ORIGIN],
        ), {})

    def test_unresolved_dynamic_css_and_contact_links_block_candidate(self):
        body = (
            f'<a href="{FORM}">Form</a>'
            '<a href="mailto:{!relatedTo.Agent_Email__c}">Message</a>'
            '<a href="tel:{!relatedTo.Lender__r.PersonMobilePhone}">Phone</a>'
            f'<div style="background-image:url({ASSET})">Asset</div>'
        )
        issues = module["unresolved_template_links"](body, {}, [ORIGIN])
        self.assertIn("unbound fixture link: Opportunity.New_Form_URL__c", issues)
        self.assertIn("unbound fixture link: relatedTo.Agent_Email__c", issues)
        self.assertIn("unbound fixture link: relatedTo.Lender__r.PersonMobilePhone", issues)
        self.assertIn("remote asset outside approved sandbox origins", issues)
        pinned_record = f'<a href="{ORIGIN}/lightning/r/Opportunity/{{!Opportunity.Id}}/view">Record</a>'
        self.assertEqual(module["unresolved_template_links"](pinned_record, {}, [ORIGIN]), [])

    def test_rejects_production_credentials_and_stale_source(self):
        name = "Leads/Fixture"
        templates = {name: (f'<a href="{PORTAL}">Link</a>'.encode(), b"metadata")}
        plan = {"approvedOrigins": [ORIGIN], "replacements": [entry("template", name, PORTAL, HOME)]}
        for origin in ["https://veteranpcs.vercel.app", "https://arbitrary-preview.vercel.app",
                       "https://new-production-veteranpcs.vercel.app",
                       "https://veteranpcs--webdev.sandbox.my.site.com.evil.invalid"]:
            with self.subTest(origin=origin):
                invalid_production = deepcopy(plan)
                invalid_production["approvedOrigins"] = [origin]
                with self.assertRaisesRegex(ValueError, "verified sandbox"):
                    module["apply_plan"](invalid_production, templates, {})
        invalid_target = deepcopy(plan)
        invalid_target["replacements"][0]["to"] = "https://outside.invalid"
        with self.assertRaisesRegex(ValueError, "outside the approved"):
            module["apply_plan"](invalid_target, templates, {})
        stale = deepcopy(plan)
        stale["replacements"][0]["count"] = 2
        with self.assertRaisesRegex(ValueError, "Unexpected match count"):
            module["apply_plan"](stale, templates, {})
        invalid_prefix = deepcopy(plan)
        invalid_prefix["replacements"][0]["from"] = "https://veteranpcs.my.site.com"
        with self.assertRaisesRegex(ValueError, "Unexpected match count"):
            module["apply_plan"](invalid_prefix, templates, {})

    def test_writes_only_selected_metadata_members(self):
        function = module["write_overlay"]
        private = function.__globals__["PRIVATE_ROOT"]
        try:
            with TemporaryDirectory() as temp:
                root = Path(temp)
                function.__globals__["PRIVATE_ROOT"] = root
                saved = root / "candidate"
                function(saved, {"Leads/Example": (b"body", b"metadata")}, {"URL_Test": label("URL_Test", HOME)})
                package = ET.parse(saved / "package.xml").getroot()
                self.assertEqual(
                    [item.text for item in package.iter(module["tag"]("members"))],
                    ["Leads/Example", "URL_Test"],
                )
                self.assertEqual((saved / "email/Leads/Example.email-meta.xml").read_bytes(), b"metadata")
                with self.assertRaises(FileExistsError):
                    function(saved, {}, {})
        finally:
            function.__globals__["PRIVATE_ROOT"] = private


if __name__ == "__main__":
    unittest.main()
