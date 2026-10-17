# Independent homepage desktop and interaction review — PASS

Final integrated checkpoint: `7f5e3dd51d149ed177745f646a44732f2a29512a`, verified at `http://127.0.0.1:3100` in dry run.
Final reviewed lane SHA: `615bddb8deb26148eb7723405fbaff7cea64fc82`.
Visual and behavioral freeze: `d73ff0c87381bf54b1d9e46aee28a01163a22870`.
Origin: `http://127.0.0.1:3102`, confirmed local dry run.

The final integrated hero returned HTTP 200, its exact accessible name and visibility passed, and I personally viewed `final-integration-hero-1440.png`. A Git comparison confirms homepage component source is identical between final lane and integrated checkpoint.

The final follow-up changes only the hero image alt text and an exact accessible-name assertion. I reviewed that diff and verified the exact accessible name in the rendered final page. All preceding composition and interaction evidence therefore carries forward without a visual or behavioral change.

Reviewer did not author homepage code. No repository files were edited and no lead or guide capture forms were submitted.

## Result

PASS. No actionable findings remain in the requested desktop/interaction scope.

## Source comparison and personally viewed composition

The new Doc screenshots governed the comparison, including:

- `kix.xmj168rmuh6o.png`: supplied hero art and flag composition.
- `kix.wg2nntczo4ti.png`: home underline treatment.
- `kix.6ug5lm9hilf3.png`: navy resting map, white state labels, red interacted Texas, and adjacent state card.
- `kix.x7gkt7qlt42p.png`: map benefit strip.
- `kix.d3etrjtrocw1.png`: lender composition and full family/check image.

Personally viewed hero, map, bonus, impact, and partner screenshots at 1440px, 768px, and 390px, plus the 1920px hero and its red lower edge. The supplied hero is clean, the underline is present, and the curved red edge is visible against the white lower area at 1920px. The thin gray benefit separators are present; computed width is 1px and color is `rgb(212, 213, 220)`.

All four sampled widths fit the document width with no horizontal overflow. Dynamic impact amounts use the live local data response, so their numbers appropriately differ from the reference's sample amounts.

## Map and search interactions

- All 52 state links have navy resting shapes (`rgb(41, 47, 108)`) and red keyboard focus (`rgb(169, 31, 35)`). All 52 also turn red on pointer hover over a filled hit region. The map has 104 white label paths, all computed white.
- Eleven initial bounding-box hover centers fell in water or between geographic/callout regions. Sampling actual hit regions resolved every case; this is expected for irregular SVG geometry, not a state interaction failure.
- Right-hand small-state callout badges were separately hovered and correctly turn the linked state red. Texas turns red on mouse press and opens `/texas` on release. Personally viewed a clean Texas-only hover screenshot.
- Both search form inputs have a 3px solid navy keyboard outline.
- ArrowRight moves focus to Browse by State while leaving Find an Agent selected and preserving the current scroll position. Enter explicitly activates the state tab and focuses the map heading.
- Agent and resource query values survive switching tabs. `  VA    loan  ` navigates to `/pcs-resources?q=VA+loan#resource-library`; an empty resource query navigates to `/pcs-resources?view=all#resource-library`.
- Switching from a pending agent search to Browse Resources aborts that request (`net::ERR_ABORTED`), keeps the resource panel active, and ignores the delayed resolved result. No stale navigation occurred.
- Hero and lender guide entry points open the correct accessible dialogs; Escape closes them and restores trigger focus. No submissions were necessary.

## Mobile bonus and impact

The bonus remains visible on mobile. At 390px, the price field precedes the bonus amount, which precedes the CTA. A home price of 650000 yields the established $2,000 bonus. At 390px only the Experts impact column is hidden; Giveback, Military Charities, Military Focused, and the Impact CTA remain visible. The Experts column is visible at 768px and desktop.

## Partner carousel

- All 17 stable organization IDs, names, and destination URLs are distinct, and all 17 logos load. Traversing the 13 possible five-logo windows reaches every organization and wraps correctly.
- Five logos are visible at 1440/1920px, three at 768px, and two at 390px.
- Personally inspected the full Johns Hopkins University crest/wordmark. Hiring Our Heroes and Hire Heroes USA remain separate names, logos, IDs, and destinations. The final window also shows Spouse-ly, Veteran Owned Business, and the full MSCC mark.
- Previous and Next move the existing horizontal track. An actual transition measured X positions `0 → -90.395 → -224px` with a 0.28s transition; personally inspected the intermediate sliding frame.
- Real 3.35-second waits confirmed autoplay advances, hover pauses, keyboard focus pauses, explicit Pause stops rotation, and Play resumes after focus leaves the carousel.
- A controlled document-hidden property plus `visibilitychange` event confirmed the component's hidden-document pause path. This was a browser event simulation, not an operating-system background-window test.
- Real reduced-motion media emulation stops autoplay and sets track transition duration to `0s`.
- Native Tab order visits the five currently visible logo links in source order, then Previous partners. Offscreen items are inert, with zero hidden non-inert items; no duplicate/offscreen focus links were encountered.

## Final accessibility follow-up

Verified exact final hero image name on both the final lane and integrated checkpoint: `Military family holding their VeteranPCS Bonus check in front of their home`. The duplicated VeteranPCS word from the preceding freeze is removed. The final follow-up does not change image source, size, layout, or behavior.

## Evidence personally viewed

Directory: `/private/tmp/vet-675-homepage-desktop-d73ff0c/`.

- `hero-{1440,768,390,1920}.png`, `final-integration-hero-1440.png`.
- `map-{1440,768,390}.png`, `map-texas-clean-hover.png`.
- `bonus-{1440,768,390}.png` and `impact-{1440,768,390}.png`.
- `partners-{768,390}.png`, `partners-first-five.png`, `partners-window-5.png`, `partners-window-12.png`.
- `partners-horizontal-mid.png`, `partners-keyboard-window.png`, `resource-input-keyboard-focus.png`.

Measurements: `composition-results.json`, `hover-hitpoint-results.json`, `carousel-results.json`, `final-check-results.json`, `final-accessible-name.json`, and `final-integration-accessible-name.json`. Composition captures recorded no application page errors. Existing local Next/CSP issue badges were not treated as page content regressions.
