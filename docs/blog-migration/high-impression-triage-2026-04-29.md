# High-Impression / Low-CTR Triage — 2026-04-29

## Data sources

- GSC: [`gsc-performance-2026-04-29.md`](./gsc-performance-2026-04-29.md) — 28-day window ending 2026-04-26
- GA4: [`ga4-performance-2026-04-29.md`](./ga4-performance-2026-04-29.md) — 28-day window
- MDX inventory: scripted read of `content/blog/*.mdx` frontmatter on 2026-05-02

## Triage rubric

For each post in the GSC "High Impression / Low CTR" table (41 entries):

1. **Is there a higher-performing sibling URL competing for the same keyword?** → 301 to the winner.
2. **Is the search intent fundamentally mismatched (post about X, query about Y)?** → Rewrite or remove.
3. **Default**: rewrite `metaTitle` (50–60 chars) + `metaDescription` (150–160 chars) to include the GSC top query verbatim.

**This batch:** Rule 3 applies to all 41 posts.

- Rule 1 didn't trigger: every `what-military-bases-are-in-{state}` post is the canonical URL for its state — no sibling slugs in `content/blog/`. Alabama and Tennessee similarly have only one URL each.
- Rule 2 didn't trigger: every top query maps cleanly to post topic.

## Cohorts

- **Cohort A (30 posts):** state military bases. 28 `what-military-bases-are-in-{state}` slugs + `alabama-military-bases` + `tennessee-military-bases-...`.
- **Cohort B (11 posts):** unique topic posts (VA loan, PCS checklist, things-to-do, credit, calculator mistakes, temporary housing, etc.).

## Methodology

### Cohort A title strategy

**Standard template (17 posts):** `Active Military Bases in {State}: A Veteran PCS Guide`

The non-state portion is exactly 46 characters, so the template lands within 50–60 chars for every state in the cohort (Iowa = 50 floor, North Carolina = 60 ceiling).

**Overrides (13 posts):** state-specific titles where the GSC top query diverges from "military bases in {state}". Examples: California → "California Air Force Bases…" (top query: "california air force bases"); Kentucky → "Army Bases in Kentucky: Fort Knox, Campbell & More" (top query: "army base in kentucky").

### Cohort A description strategy

**Template:** `Find every active military base in {State}—{1–2 named bases}—plus PCS housing tips, VA-loan guidance, and veteran-friendly real-estate agents who know the area.`

Named bases extracted per-state from each post's existing "List of Military Bases" body section. Override-title posts get descriptions that lead with the top query phrase instead of the templated opener.

### Cohort B strategy

Bespoke per-post titles and descriptions that include the GSC top query verbatim. See decision table below.

### Frontmatter housekeeping (every touched file)

- `metaTitle`: rewrite per cohort logic
- `metaDescription`: rewrite per cohort logic
- `updatedAt: '2026-05-02'`: bump (or set if absent) to emit fresh JSON-LD `dateModified`
- `primaryKeyword`: backfill with the GSC top query (most files have this empty)

No other fields change. No body content changes.

## Decision table (41 posts)

Title cells show new value; char counts in parens for old → new. Description char counts in parens for old → new. Sessions/Conversions are 28-day GA4.

### Cohort A — State Military Bases (30)

| Slug | New metaTitle | Title (old → new) | Desc (old → new) | GSC Top Query | Sessions | Conv |
|---|---|---:|---:|---|---:|---:|
| `what-military-bases-are-in-california` | California Air Force Bases & Active Military Posts | 47 → 50 | 159 → ~155 | california air force bases | 17,646 | 6 |
| `what-military-bases-are-in-georgia` | Military Forts in Georgia: Active Bases & PCS Guide | 43 → 51 | 195 → ~155 | military forts in georgia | 24,725 | 8 |
| `what-military-bases-are-in-north-carolina` | Active Military Bases in North Carolina: A Veteran PCS Guide | 48 → 60 | 198 → ~155 | military bases in north carolina | 14,766 | 2 |
| `what-military-bases-are-in-florida` | Active Military Bases in Florida: A Veteran PCS Guide | 47 → 53 | 201 → ~155 | military bases in florida | 11,629 | 4 |
| `what-military-bases-are-in-hawaii` | All 11 Active Military Bases in Hawaii: A PCS Guide | 47 → 51 | 213 → ~155 | what are the 11 military bases in hawaii | 4,250 | 6 |
| `what-military-bases-are-in-new-york` | Active Military Bases in New York: A Veteran PCS Guide | 47 → 54 | 197 → ~155 | military bases in new york | 6,166 | 2 |
| `what-military-bases-are-in-arizona` | Military Bases in Arizona (AZ): A Veteran PCS Guide | 47 → 51 | 199 → ~155 | military bases in az | 6,186 | 0 |
| `what-military-bases-are-in-colorado` | Air Force Bases in Colorado: Active Posts & PCS Guide | 47 → 53 | 171 → ~155 | air force bases in colorado | 3,595 | 0 |
| `what-military-bases-are-in-alaska` | Active Military Bases in Alaska: A Veteran PCS Guide | 47 → 52 | 201 → ~155 | alaska military bases | 5,735 | 0 |
| `alabama-military-bases` | Army Forts in Alabama: Active Military Bases Guide | 47 → 50 | 199 → ~155 | army forts in alabama | 12,926 | 6 |
| `what-military-bases-are-in-kansas` | Active Military Bases in Kansas: A Veteran PCS Guide | 47 → 52 | 201 → ~155 | military bases in kansas | 5,473 | 0 |
| `what-military-bases-are-in-kentucky` | Army Bases in Kentucky: Fort Knox, Campbell & More | 47 → 50 | 199 → ~155 | army base in kentucky | 3,099 | 6 |
| `tennessee-military-bases-...` | Tennessee Military Bases: A Veteran's PCS Move Guide | 107 → 52 | 229 → ~155 | tennessee military bases | 1,294 | 2 |
| `what-military-bases-are-in-louisiana` | Active Military Bases in Louisiana: A Veteran PCS Guide | 47 → 55 | 203 → ~155 | louisiana military bases | 6,258 | 4 |
| `what-military-bases-are-in-new-mexico` | Active Military Bases in New Mexico: A Veteran PCS Guide | 47 → 56 | 201 → ~155 | new mexico military bases | 10,288 | 2 |
| `what-military-bases-are-in-indiana` | Active Military Bases in Indiana: A Veteran PCS Guide | 47 → 53 | 200 → ~155 | military bases in indiana | 13,855 | 16 |
| `what-military-bases-are-in-illinois` | Chicago Military Bases: Active Illinois Posts & Forts | 47 → 53 | 201 → ~155 | chicago military base | 2,404 | 4 |
| `what-military-bases-are-in-montana` | Active Military Bases in Montana: A Veteran PCS Guide | 47 → 53 | 197 → ~155 | montana military bases | 3,065 | 0 |
| `what-military-bases-are-in-wisconsin` | Active Military Bases in Wisconsin: A Veteran PCS Guide | 47 → 55 | 203 → ~155 | military bases in wisconsin | 1,583 | 0 |
| `what-military-bases-are-in-wyoming` | Active Military Bases in Wyoming: A Veteran PCS Guide | 47 → 53 | 201 → ~155 | military bases in wyoming | 843 | 0 |
| `what-military-bases-are-in-arkansas` | Arkansas Army Base: Little Rock AFB & Active Posts | 47 → 50 | 199 → ~155 | arkansas army base | 2,520 | **34** |
| `what-military-bases-are-in-minnesota` | Army Base in Minnesota: Camp Ripley & PCS Move Guide | 47 → 52 | 197 → ~155 | army base minnesota | 3,029 | 2 |
| `what-military-bases-are-in-idaho` | Idaho Air Force Base Locations: PCS to Mountain Home | 47 → 52 | 200 → ~155 | idaho air force base locations | 1,893 | 0 |
| `what-military-bases-are-in-maine` | Active Military Bases in Maine: A Veteran PCS Guide | 47 → 51 | 201 → ~155 | military bases in maine | 3,185 | 0 |
| `what-military-bases-are-in-nebraska` | Active Military Bases in Nebraska: A Veteran PCS Guide | 47 → 54 | 199 → ~155 | military bases in nebraska | 1,683 | 0 |
| `what-military-bases-are-in-connecticut` | Active Military Bases in Connecticut: A Veteran PCS Guide | 47 → 57 | 203 → ~155 | military bases connecticut | 2,318 | 2 |
| `what-military-bases-are-in-west-virginia` | Army Bases in West Virginia: Active Forts & PCS Guide | 47 → 53 | 201 → ~155 | army bases in west virginia | 1,953 | 0 |
| `what-military-bases-are-in-iowa` | Active Military Bases in Iowa: A Veteran PCS Guide | 47 → 50 | 201 → ~155 | military bases in iowa | 872 | 2 |
| `what-military-bases-are-in-north-dakota` | Active Military Bases in North Dakota: A Veteran PCS Guide | 47 → 58 | 201 → ~155 | north dakota military bases | 2,473 | 0 |
| `what-military-bases-are-in-delaware` | Active Military Bases in Delaware: A Veteran PCS Guide | 47 → 54 | 201 → ~155 | military bases in delaware | 3,143 | 0 |

### Cohort B — Bespoke (11)

| Slug | New metaTitle | Title (old → new) | Desc (old → new) | GSC Top Query | Sessions | Conv |
|---|---|---:|---:|---|---:|---:|
| `how-does-a-0-down-va-loan-work` | How a 0% Down VA Home Loan Works: Veteran Buyer Guide | 47 → 52 | 201 → ~155 | va home loan 0 down | 880 | 0 |
| `new-home-builders-offering-...` | Builders Offering Low Interest Rates: A Veteran's Guide | 108 → 54 | 242 → ~155 | builders offering low interest rates | 5,865 | **14** |
| `the-ultimate-pcs-checklist-...` | Ultimate PCS Checklist: 8-Week Timeline for Service Members | 95 → 58 | 240 → ~155 | pcs checklist | 3,671 | 2 |
| `9-things-to-do-near-ft-bragg` | 9 Things to Do Near Fort Bragg NC: PCS Family Guide | 39 → 51 | 213 → ~155 | things to do near fort bragg nc | 1,311 | 0 |
| `prepare-to-pcs-...` | PCS Benefits & Entitlements: A Veteran's PCS Move Guide | 94 → 54 | 240 → ~155 | pcs benefits | 1,217 | 2 |
| `the-military-members-complete-guide-...credit` | Does Military Star Card Build Credit? A Service Member Guide | 99 → 60 | 243 → ~155 | does military star card build credit | 100 | **8** |
| `va-loan-calculator-mistakes` | Are VA Mortgage Calculators Accurate? 7 Mistakes to Avoid | 91 → 56 | 229 → ~155 | how accurate are va mortgage calculators? | 69 | 0 |
| `navigating-temporary-housing-...` | Temporary Military Housing: A PCS Move Survival Guide | 100 → 52 | 320 → ~155 | temporary military housing | 1,707 | 0 |
| `military-quick-guide-q-a` | CONUS vs OCONUS PCS: Differences Military Movers Should Know | 39 → 60 | 223 → ~155 | differences between conus and oconus pcs military | 360 | 2 |
| `pcsing-to-san-diego-...` | Military-Friendly Apartments & Neighborhoods in San Diego | 99 → 56 | 208 → ~155 | military friendly apartments san diego | 1,001 | 0 |
| `pcsing-oconus-...` | OCONUS Meaning in the Military: PCS Home-Decision Guide | 57 → 54 | 320 → ~155 | oconus meaning military | 747 | **12** |

**Bolded conversion counts** = preservation outliers (above-average CR within the cohort). Rewrites only touch SERP surface, not body — these conversion paths stay intact.

## Outcomes to watch

Re-run `node scripts/ingest/gsc-performance.mjs` at the next bi-weekly ingest (2026-05-13). Compare 28-day CTR on the 41 affected URLs vs the 2026-04-29 baseline below.

| Metric | 2026-04-29 baseline | Target (2026-05-13) |
|---|---:|---:|
| Mean CTR across 41 posts | ~0.4% | ≥ 1.5% |
| Posts with CTR < 0.5% | 41 / 41 | < 15 / 41 |
| Total clicks (28-day) | ~735 | ≥ 2,750 |

Per-post CTR deltas land in the next ingest's report. Flat URLs after one ingest cycle become candidates for body-content rewrites or redirects in a follow-up PR.

## Final audit deltas

(Populated after PR finalization in Task 5.4.)

- **Baseline (2026-04-29):** high:0, medium:76, low:207
- **After this PR:** _TBD_
- **Expected:** high:0 (unchanged), medium:76 (unchanged — body word counts and other findings untouched), low ≈ 125 (drops by ~80 from `meta-title-length` and `meta-description-length` clearing across 41 posts)
