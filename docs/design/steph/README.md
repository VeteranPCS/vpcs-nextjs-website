# Steph redesign execution record

Baseline: `748f5ce21bc7f69658f627a82763d4ea89f8b7a7`. Original checkout remains untouched.

Sources: `sources.json`; six reviewed PDFs in the user Downloads folder. Ignore `steph editing files`.

## Lane board

| Lane | Branch | Port | Status |
|---|---|---|---|
| Integration / foundation | codex/steph-integration | 3100 | In progress |
| Navigation | codex/steph-navigation | 3101 | In progress |
| Homepage | codex/steph-homepage | 3102 | In progress |
| BAH | codex/steph-bah | 3103 | In progress |
| Resources | codex/steph-resources | 3104 | Queued |
| VA Loan | codex/steph-va-loan | 3105 | Queued |
| Blog | codex/steph-blog | 3106 | Queued |

## Accepted design differences

- Mobile home omits the inline bonus calculator; Resources retains access. Recruitment, internship, and newsletter remain below the supplied mobile composition.
- BAH does not invent affordability from allowance alone: VA calculator link plus user-entered home price and genuine bonus tiers.
- Mission is the consistent navigation label.
- Real data replaces sample financial figures, ratings and testimonial identities. Unavailable impact metrics receive nonnumeric copy.
- Existing name/email fields are collected in capture dialogs; existing lead mappings and single-submit behavior remain unchanged.
- PCS checklist is an article: link says View Checklist.
- Request a Call uses the existing lender contact flow; phone is 719-782-5065.

## Asset acceptance ledger

Clean PDF assets extracted: guide covers, home hero family/house, lender family, featured family photo, blog bonus photo, waving flag. Photos must not be attached to unsupported named testimonials.

Open: VA hero photo is partially obscured by the mock calculator card in its flattened source. Resources and VA PDFs have no separate image layers. Recover only clean image regions; never reuse text/control screenshots as UI. Matching full-resolution exports and deployable Tahoma/Myriad Pro fonts remain acceptance dependencies if no matching source can be recovered.

## Verification

Every lane gets independent responsive and desktop/interaction review. Viewports:360x800,390x844,768x1024,1024x768,1440x1000;1920x1080 final. Header boundaries1279/1280. Browser evidence lives outside Git, under `/private/tmp/vpcs-steph-qa/`.

Use only local servers with LEAD_DRY_RUN=1 and each lane's own NEXT_PUBLIC_API_BASE_URL. Stop dev before build. No live lead submissions. No force-push or hook bypass.
