# Steph redesign: composition, assets and download tracking review

## Scope and conclusion

Reviewed the local integrated redesign against all six Steph PDFs. The user prioritized composition and matching images over font matching. Independent agents reviewed frozen checkpoints, and lane owners corrected the findings before integration. This report does not describe a production deployment.

The reviewed corrections improve the intended composition. Full image fidelity remains open for the Resources/VA hero originals, larger card images and the duty-station image substitutions listed below. Font files remain a lower-priority follow-up.

## Corrections

| Surface | Verified correction |
|---|---|
| Shared navigation | Compact Contact panel and Mission promotion proportions; disclosure, focus and responsive behavior preserved. |
| Homepage | Desktop hero artwork scale/position and flag treatment; larger impact ribbon with source wave/emblem/icons; lender badge, benefit row and CTA proportions; narrow-phone guide card wraps into two rows. Corrected impact destination to `/impact`. |
| BAH | Fresh comparison retained the agreed 2026 explicit-submit and separate entered-home-price interpretation. No new material composition finding. |
| Resources | Removed the hero image seam; restored Military OneSource, Hiring Our Heroes, Military Spouse Chamber, Bunker Labs and USO in reference order; existing full resource list remains expandable. |
| VA Loan | Removed the tablet photo/calculator gap; compacted the question/contact panel; blended the final flag background across the full CTA. |
| Blog article | Blended the genuine bonus-family photo into the purple promotion; corrected intrinsic image dimensions. |
| Shared guide forms | Isolated native dialogs in a body portal to prevent page-card styles from changing title, close button and privacy text; kept prefilling, keyboard focus and dismissal. |

## Asset assessment

- The homepage family/house composition, lender family, article bonus family, guide covers and available decorative assets match the recovered reference assets. HTML remains real text and controls.
- The clean USO vector comes unchanged from the [official USO header](https://www.uso.org/). Its checksum and provenance are in `sources.json`. Other organization logos are genuine repository brand variants.
- The Resources hero uses the exact recoverable 424×247 photo rectangle; part of the child on the left is missing from that rectangle.
- The VA hero uses the exact recoverable 462×219 upper photo. The lower hand, keys and bodies are obscured by the flattened mock calculator.
- Eight Resources/VA card photos are exact native strips, approximately 179–186 pixels wide; they soften on larger displays.
- Six duty-station tiles use the existing linked article photographs, which differ from the mockup city photos.

Two asset agents retrieved all 40 files from the authorized editing folder and inspected the standalone images, PDF-compatible Illustrator objects, and metadata in decoded private Illustrator streams. No usable full hero originals, larger card/installation originals, or webfont kit were found. Proprietary raster payloads were not exhaustively reconstructed. No missing photograph was synthesized. See `editing-source-inspection.md` and `DISCREPANCIES.md`.

## Resources download tracking

Resources reuses two real PDFs: `VA-Loan-Guide.pdf` and `first-time-home-buyer-guide.pdf`. The checklist and duty-station guides are articles and are not counted as downloads.

The five tested placements are featured VA, library VA, library Homebuyer, strip VA and strip Homebuyer. Events include canonical guide/form IDs, placement, page type and a path-only asset destination:

1. Opening emits `cta_clicked` and the existing form-start event.
2. A valid submission emits `guide_download_requested`.
3. Only an accepted response initiates the PDF and emits `guide_download_started`.
4. A manual success-state download emits its own requested/started pair with `download_trigger=manual_link`, without resubmitting the lead.

Invalid forms, dismissal and pending duplicate submissions create no download start. Retry behavior is tested. A start means the download was initiated, not that the user saved or read the PDF.

The outgoing sanitizer also covers SDK-added top-level `$set`/`$set_once` person metadata; current/initial URLs become safe paths. The browser audit checks the entire decoded outgoing envelope for raw form values and private query markers. All SDK traffic is intercepted before navigation; all lead submissions use a loopback development server with `LEAD_DRY_RUN=1`. No synthetic events or leads are sent to production. Implementation follows [PostHog custom-event capture](https://posthog.com/docs/libraries/js/usage#custom-event-capture).

## Verification environment and evidence

Local integration URL: `http://127.0.0.1:3100`. Browser plugin not available; pinned Playwright Chromium was used. Viewports: 360×800, 390×844, 768×1024, 1024×768, 1440×1000, 1920×1080. Adjacent breakpoints and a 200% equivalent reflow viewport are covered; this does not claim every browser’s native zoom UI was tested.

Normal contexts preserve application CSP. Existing development analytics/CSP diagnostics are distinguished from application exceptions, hydration errors and failing local requests. Screenshot fixtures remain test-only; the normal service path is smoke checked separately. No article content changed.

Durable evidence directory:

`/Users/harperfoley/.codex/visualizations/2026/10/10/01a1238e-ff79-78f3-a921-ff8ccdbb7759/steph-redesign/evidence/fidelity-review-2026-10-10/`

- `navigation/REVIEW.md`: independent source comparisons and correction approvals.
- `bah/CORRECTION-REVIEWS.md`: independent correction and SDK reviews.
- `download-audit/REPORT.md`: outgoing SDK audit and allowlisted event evidence.
- `coordinator/`: fresh independent correction captures and geometry/health results.
- `integrated-suite/`: final combined application browser suite and full-page matrix.

The execution baseline for this follow-up was `d65579d`; all original lane histories, references and earlier acceptance evidence are retained. The original checkout and its unrelated files remain intact.

## Final gate results

| Gate | Result |
|---|---|
| Lint / TypeScript | Pass; zero lint errors, two existing test-image mock warnings |
| Unit/component tests | 913 passed across109 files |
| Combined browser suite | 274 passed across6viewports; zero failures/flaky |
| Actual SDK download audit | 30/30 passed; complete outgoing envelope and realPDF downloads checked |
| Independent final review | Passed assigned composition/interaction scopes; source asset limits remain open |
| Production build | Required normal final commit hook; immutable result in external final gate record |

The normal suite’s50skips are30SDK cases run separately and20redundant viewport/project combinations. Final SDK server logs show30 Salesforce write paths,30notification paths and30conversion captures skipped by dry-run. All owned servers are stopped. Managed worktrees remain intact because earlier archive attempts were refused by pinned-task/workspace protection. No production deployment.

Exact final commit and evidence: `VERIFICATION.md` and `evidence/fidelity-review-2026-10-10/final-gates.json`.

## Example evidence

Corrected desktop homepage composition:

![Corrected homepage](/Users/harperfoley/.codex/visualizations/2026/10/10/01a1238e-ff79-78f3-a921-ff8ccdbb7759/steph-redesign/evidence/fidelity-review-2026-10-10/coordinator/home-1440-hero.png)

Resources organizations, including clean official USO logo:

![Resources organization assets](/Users/harperfoley/.codex/visualizations/2026/10/10/01a1238e-ff79-78f3-a921-ff8ccdbb7759/steph-redesign/evidence/fidelity-review-2026-10-10/coordinator/resources-vector-1440-organizations.png)
