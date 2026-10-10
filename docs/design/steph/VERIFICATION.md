# Steph redesign — integrated verification

## Delivery and acceptance status

All six implementation lanes are integrated on `codex/steph-integration`, based on `748f5ce21bc7f69658f627a82763d4ea89f8b7a7`. The original checkout and its unrelated untracked analytics files are preserved. GPT-6.1 Sol agents with high reasoning implemented independent lanes and reviewed other authors' checkpoints in separate browser contexts.

The implemented behavior and available-source composition have independent review evidence. **Final fidelity acceptance remains open** for the missing full hero originals, larger card photographs, deployable font sources, and the Resources installation-photo differences. See [DISCREPANCIES.md](DISCREPANCIES.md). Passing automated checks does not resolve those items.

## Code and source records

- [Execution board and lane commits](README.md)
- [Drive IDs, SHA-256 checksums, PDF pages and extracted assets](sources.json)
- [Asset retrieval findings](asset-retrieval.md)
- Lane decisions: [Homepage](../steph-homepage-decisions.md), [Resources](../steph-resources-decisions.md), [VA Loan](../steph-va-loan-decisions.md), [Blog](../steph-blog-decisions.md)

Six original PDFs and the branding guide are preserved under:

`/Users/harperfoley/.codex/visualizations/2026/10/10/01a1238e-ff79-78f3-a921-ff8ccdbb7759/steph-redesign/references/`

The asset agent searched the permitted page/branding folders, Drive image/font records and repository assets. It recovered exact clean photo regions and confirmed the branding guide specifies Tahoma Regular/Bold. The original lower VA hero is obscured in the flattened PDF. No licensed full webfont files or kit were located. On 2026-10-10 the user authorized inspection of the editing folder. All 40 files were retrieved and reviewed, including decoded Illustrator private data; the exact Resources/VA PNGs are the same flattened images, and no usable replacements or deployable font sources were found. The audit is in [editing-source-inspection.md](editing-source-inspection.md). This follow-up changes only documentation and source inventory; website rendering and the recorded browser evidence remain unchanged.

## Automated gates

| Gate | Final result |
|---|---|
| ESLint | PASS; two warnings in a homepage test image mock, no production-component warnings |
| TypeScript | PASS |
| Vitest | 903 tests passed across 107 files |
| Playwright | 222 passed, zero failed/skipped/flaky, six viewports; 5.0 minutes |
| Production build | Required final commit hook; successful integration commit confirms this gate. Exact result and commit are preserved in `evidence/gates.json`. |

The final browser JSON and screenshots are preserved under `evidence/final-suite-v2/`. The final commit hook repeats lint, type-check and tests before its production build; it is never bypassed.

The initial complete browser run passed 193 of 198 checks. It exposed an early-typing Resources search race and existing fixed-width text escaping its columns on Texas and Guides at 1024px. The related Military Spouse resource list was also corrected. All corrections received tests and independent browser review before the final rerun.

The corrected Resources commit `cdff4e0` was promoted as `7d9dc10`; both independent reviewers then rechecked the integrated page at all six responsive widths and both desktop widths.

The search regression explicitly delays client chunks, types into the server-rendered input, then verifies the submitted query after hydration. The fix submits the native field value and only synchronizes the field on an actual URL/category change. It retains browser history and reset behavior.

## Independent browser coverage

| Lane | Responsive review | Desktop and interactions |
|---|---|---|
| Navigation | Homepage agent and coordinator correction checks | BAH agent; final Homepage agent desktop checks |
| Homepage | BAH agent; coordinator integrated review | Navigation agent |
| BAH | Homepage agent | Coordinator and Navigation agent |
| Resources | Coordinator; Homepage agent final correction review | Navigation agent |
| VA Loan | BAH agent; coordinator integrated review | Coordinator and Navigation agent |
| Blog | Homepage agent | Coordinator |

Required sizes: 360×800, 390×844, 768×1024, 1024×768, 1440×1000 and 1920×1080. Adjacent breakpoint checks cover 767/768, 1023/1024 and 1279/1280. Reviewers viewed full-page and region screenshots, compared source designs and exercised controls. Browser checks include reduced motion and a 200% equivalent layout viewport; this is reflow coverage, not a claim of testing every browser's native zoom UI.

Shared routes: `/`, `/texas`, `/contact-agent`, `/contact-lender`, real articles, `/how-it-works`, `/spanish`, `/guides`, `/va-loan-calculator`, `/blog`; targeted shared-copy checks also cover `/military-spouse` and the other AboutOurStory consumers.

Interaction coverage includes disclosure, keyboard focus, Escape, route cleanup, open-menu resizing, local search resolution/clarification, map destinations, carousel controls, explicit BAH submission/retry/dependency reuse, annual totals, bonus boundaries, resource search/history/deep links, VA form validation/retry, MDX insertion boundaries, TOC targets, canonical sharing, guide prefilling and article/chat clearance.

Only Navigation and BAH regions received committed visual snapshots after independent approval. The remaining pages have screenshot evidence and layout assertions while their source dependencies remain open. Snapshot-only contexts bypass CSP to permit Playwright's temporary screenshot stylesheet; normal health and interaction tests use the application CSP.

## Data and lead verification

- Normal application data smoke checks returned HTTP 200 for impact data, Texas resolution, Springfield state clarification, Austin's real city anchor and the 2026 BAH lookup. No read-data fixtures were used for these checks.
- Screenshots use test-confined deterministic impact/BAH fixtures and the repository's genuine versioned review corpus. Production application code has no screenshot-fixture switch.
- All form submissions used isolated local development origins with `LEAD_DRY_RUN=1`. The real local VA question flow constructed the existing Contact Form payload, retained spam fields and the local return URL, and logged skipped Salesforce POST, notifications and conversion capture. Shared guide capture exercised the same dry-run service path.
- Existing service tests verify Salesforce writes, Slack/OpenPhone, lead-owner routing and conversion capture remain suppressed in dry-run mode. No production lead was submitted.

## Console and network observations

The normal browser contexts retain the pre-existing development CSP/analytics diagnostics (including Google/Bing/Clarity/Speed Insights). The CSP policy was not changed. Reports distinguish these from application exceptions, hydration/key errors, failed local requests and deliberate mocked 503 retry tests. Do not interpret a passed layout check as an assertion of an empty console.

## Evidence location

Durable evidence root:

`/Users/harperfoley/.codex/visualizations/2026/10/10/01a1238e-ff79-78f3-a921-ff8ccdbb7759/steph-redesign/evidence/`

- `final-responsive/REPORT.md`: independent responsive findings, viewed captures and corrections.
- `final-desktop/REVIEW.md`: desktop/interaction findings and corrected Resources hero/search.
- `final-coordinator/REPORT.md`: integrated Homepage/VA review and approved snapshot inspection.
- `final-suite-v2/results.json`: final full browser results and attached browser-health observations.
- `normal-data-smoke.json`: normal read-service checks.
- `lead-dry-run-excerpt.txt`: actual local VA payload and skipped side effects.
- `gates.json`: final commit identity, automated results and cleanup status.
- Lane-specific directories retain earlier frozen-checkpoint evidence and baseline captures.

## Reproduce

```bash
E2E_BASE_URL=http://127.0.0.1:3100 npm run test:e2e:server
# In a separate terminal, with the above dry-run server running:
E2E_BASE_URL=http://127.0.0.1:3100 E2E_LEAD_DRY_RUN=1 npm run test:e2e
# Stop the server before production build:
npm run lint
npm run type-check
npm test
npm run build
```

No article content files changed, so the conditional editorial audit was not needed. The integration worktree is retained for review. All six lane servers are stopped. Managed archival was attempted for all six lane worktrees, but Codex returned: “This worktree is protected by a pinned task or workspace.” The worktrees remain intact; no manual deletion or unpinning was performed. Their committed changes and external evidence are preserved. The integration server is also stopped following the 222-test passing browser run.
