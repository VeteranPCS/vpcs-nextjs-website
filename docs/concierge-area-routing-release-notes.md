# Concierge Area Routing Release Notes

## Behavior

- Destination routing is deterministic for military bases, ZIP codes, `city, state`, and state-only requests.
- The concierge resolves a destination, routes it to active VeteranPCS coverage areas, then fetches top partners for the selected area.
- Military aliases now cover Fort Carson, Peterson SFB, USAFA, Naval Station Norfolk, Fort Cavazos/Fort Hood, JBLM, MacDill AFB, and Fort Liberty/Fort Bragg.
- If exact city coverage is missing, the concierge says so and shows the closest active same-state VeteranPCS coverage area.
- Partner cards are capped at 3 and include contact-form hrefs plus state/profile hrefs. Tool outputs do not expose partner email or phone.

## Limitations

- ZIP and city routing uses local ZIP centroids and straight-line distance, not drive time or MLS boundaries.
- Coverage-area coordinates are curated for known military/compound markets and otherwise inferred from local ZIP city lookup.
- City-only inputs without a state are treated as ambiguous. The concierge should ask for the state instead of guessing.
- Lenders route by selected area when lender area assignments exist; otherwise they fall back to top state lenders with a caveat.

## Follow-Up Data Needs

- Move canonical coverage-area coordinates and aliases into Salesforce or Sanity.
- Add a scheduled coverage-index export/cache once routing traffic grows.
- Expand military installation aliases as real concierge transcripts reveal new base nicknames and misspellings.
- Add drive-time or service-radius data if the business wants tighter local-fit claims.
