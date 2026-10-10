# Steph redesign execution record

Baseline: `748f5ce21bc7f69658f627a82763d4ea89f8b7a7`. Original checkout remains untouched.

Sources: `sources.json`; six reviewed PDFs in the user Downloads folder. Ignore `steph editing files`.

## Lane board

| Lane | Branch | Port | Status |
|---|---|---|---|
| Integration / foundation | codex/steph-integration | 3100 | Foundation c4999c0 passed all gates; integrated browser checks running |
| Navigation | codex/steph-navigation | 3101 | b751efd passed both independent roles; integrated as 46d47f4 |
| Homepage | codex/steph-homepage | 3102 | 733bac1 passed both independent roles; integrated as b869e1e |
| BAH | codex/steph-bah | 3103 | 1318e6f passed both independent roles; integrated as d6c3e92 |
| Resources | codex/steph-resources | 3104 | Implementing |
| VA Loan | codex/steph-va-loan | 3105 | Implementing |
| Blog | codex/steph-blog | 3106 | Implementing |

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

Scope of pass: lane-owned rendering and behavior. Shared header integration is independently retested. Font source and missing clean Resources/VA images remain open; these are not signed off by passing functional tests.

Evidence directories: `/private/tmp/vpcs-steph-qa/navigation-independent`, `/private/tmp/vpcs-steph-qa/bah-independent`, `/private/tmp/homepage-independent-*.png`, and each lane's Playwright artifacts. All visual reviewers viewed screenshots; they did not rely only on test exit codes.

## Repeatable browser runs

Run `E2E_BASE_URL=http://127.0.0.1:3100 npm run test:e2e:server` for a local dry-run fixture preview. This test-only launcher selects the versioned, genuine review corpus by omitting remote review credentials; impact and calculator responses use browser route fixtures. No fixture switch is added to application code. Normal development servers provide a separate smoke test of the real data path.

Then run `E2E_BASE_URL=http://127.0.0.1:3100 E2E_LEAD_DRY_RUN=1 npm run test:e2e`. The lead flag in the test runner is an explicit assertion that the chosen development server was launched with LEAD_DRY_RUN=1; never use a production server for submission tests. Artifacts default to a separate temporary folder per port.
