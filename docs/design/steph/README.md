# Steph redesign execution record

Baseline: `748f5ce21bc7f69658f627a82763d4ea89f8b7a7`. Original checkout remains untouched.

Sources: `sources.json`; six reviewed PDFs in the user Downloads folder. Ignore `steph editing files`.

## Lane board

| Lane | Branch | Port | Status |
|---|---|---|---|
| Integration / foundation | codex/steph-integration | 3100 | All six lanes integrated; 903 unit tests and 222 browser checks passed; final commit enforces the build gate |
| Navigation | codex/steph-navigation | 3101 | b751efd passed both independent roles; integrated as 46d47f4 |
| Homepage | codex/steph-homepage | 3102 | 733bac1 passed both independent roles; integrated as b869e1e |
| BAH | codex/steph-bah | 3103 | 1318e6f passed both independent roles; integrated as d6c3e92 |
| Resources | codex/steph-resources | 3104 | 0ec7e6d → eee9920; corrected cdff4e0 → 7d9dc10; both roles passed lane and integrated rechecks |
| VA Loan | codex/steph-va-loan | 3105 | e6031f5 passed both roles; integrated as 5670de3 |
| Blog | codex/steph-blog | 3106 | bc71792 passed both roles; integrated as 5ee6230 |

## Accepted design differences

- Mobile home omits the inline bonus calculator; Resources retains access. Recruitment, internship, and newsletter remain below the supplied mobile composition.
- BAH does not invent affordability from allowance alone: VA calculator link plus user-entered home price and genuine bonus tiers.
- Mission is the consistent navigation label.
- Real data replaces sample financial figures, ratings and testimonial identities. Unavailable impact metrics receive nonnumeric copy.
- Homepage guide label is FREE HOMEBUYER GUIDE because the delivered existing document is the First-Time Homebuyer Guide.
- Existing name/email fields are collected in capture dialogs; existing lead mappings and single-submit behavior remain unchanged.
- PCS checklist is an article: link says View Checklist.
- Request a Call uses the existing general contact flow; phone is 719-782-5065.

## Asset acceptance ledger

Clean PDF assets extracted: guide covers, home hero family/house, lender family, featured family photo, blog bonus photo, waving flag. Photos must not be attached to unsupported named testimonials.

Open: VA hero photo is partially obscured by the mock calculator card in its flattened source. Resources and VA PDFs have no separate image layers. Recover only clean image regions; never reuse text/control screenshots as UI. Matching full-resolution exports and deployable Tahoma/Myriad Pro fonts remain acceptance dependencies if no matching source can be recovered.

## Verification

Every lane gets independent responsive and desktop/interaction review. Viewports:360x800,390x844,768x1024,1024x768,1440x1000;1920x1080 final. Header boundaries1279/1280. Browser evidence lives outside Git, under `/private/tmp/vpcs-steph-qa/`.

Use only local servers with LEAD_DRY_RUN=1 and each lane's own NEXT_PUBLIC_API_BASE_URL. Stop dev before build. No live lead submissions. No force-push or hook bypass.

## Independent review record — first wave

| Lane | Responsive reviewer | Desktop/interaction reviewer | Findings corrected |
|---|---|---|---|
| Navigation | Homepage agent; coordinator followup | BAH agent; coordinator followup | Desktop proportions208px, invisible contact avatar, complete background inert, focus restoration, source icon motifs |
| Homepage | BAH agent; coordinator1024followup | Navigation agent | Tablet mission wrapping, invisible search icon, stale navigation after tab change |
| BAH | Homepage agent | Coordinator (did not author BAH) | Tablet tool-card wrapping |

Scope of pass: lane-owned rendering and behavior. Shared header integration is independently retested. Full-resolution Resources/VA originals and the deployable font source remain open; these are not signed off by passing functional tests.

Evidence directories: `/private/tmp/vpcs-steph-qa/navigation-independent`, `/private/tmp/vpcs-steph-qa/bah-independent`, `/private/tmp/homepage-independent-*.png`, and each lane's Playwright artifacts. All visual reviewers viewed screenshots; they did not rely only on test exit codes.

## Repeatable browser runs

Run `E2E_BASE_URL=http://127.0.0.1:3100 npm run test:e2e:server` for a local dry-run fixture preview. This test-only launcher selects the versioned, genuine review corpus by omitting remote review credentials; impact and calculator responses use browser route fixtures. No fixture switch is added to application code. Normal development servers provide a separate smoke test of the real data path.

Then run `E2E_BASE_URL=http://127.0.0.1:3100 E2E_LEAD_DRY_RUN=1 npm run test:e2e`. The lead flag in the test runner is an explicit assertion that the chosen development server was launched with LEAD_DRY_RUN=1; never use a production server for submission tests. Artifacts default to a separate temporary folder per port.

## Shared corrections and second-wave review

- Dialog Tab/Shift+Tab wrapping and Spanish narrow-screen overflow: reviewed independently by Homepage and BAH agents; corrected browser checks pass.
- Blog concierge clearance now follows the article action bar through tablet widths (below1200px); remounted launcher receives focus after Close/Escape. Navigation and Homepage agents independently passed all required viewports.
- VA Loan: BAH responsive reviewer and coordinator desktop/interaction reviewer passed. One real local dry-run contact submission built the expected Contact Form payload, preserved local return URL and spam fields, and skipped Salesforce writes, notifications and conversion capture. Exact four resource-photo crops replaced drafts; a stray hero divider was removed and rechecked.
- Blog: Homepage responsive reviewer and coordinator desktop/interaction reviewer passed. The tablet guide button width was corrected and rechecked. Canonical sharing, TOC IDs, real article content, contextual Texas lender attribution, guide prefilling, and related links were exercised.
- Resources: coordinator responsive review passed all five widths and corrected exact featured photographs. Navigation agent passed desktop interactions. Homepage and Navigation agents independently rechecked the final clean hero crop and prehydration search correction across six widths.

Source limitations remain explicit: Resources clean hero omits part of the child at the left crop boundary; VA clean hero omits obscured lower hand/keys/body. Native flattened photo strips are low resolution. Full originals and deployable font sources remain unlocated. These are open acceptance items, not final fidelity approvals.

## Final deliverables

See [VERIFICATION.md](VERIFICATION.md) for final gates, independent review coverage, preserved evidence and remaining acceptance dependencies; [DISCREPANCIES.md](DISCREPANCIES.md) is the consolidated ledger.

## Cleanup status

All six lane servers are stopped. Codex refused each managed archival request because the worktrees are protected by a pinned task or workspace. The lane worktrees remain intact and recoverable; evidence is preserved outside them. The integration worktree remains available for review.
