# Homepage Follow-ups (T1–T7) Implementation Plan — rev 3

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Rev 2 incorporated the first Codex adversarial plan-gate findings of 2026-07-08; rev 3 incorporates the second gate pass (see "Adversarial gate response" at the end).

**Goal:** Ship all seven post-PR-#165 homepage follow-up tickets from `docs/ai-first/homepage-followups.md` on branch `homepage-followups`, verified in a real browser, gated by Codex reviews, and opened as a PR against `main`.

**Architecture:** Pure presentation-layer work: Tailwind/JSX layout changes in `components/homepage/*`, `components/spanishpage/*`, `components/Header.tsx`, `app/layout.tsx`, plus a repo-wide dead-class sweep. No data, route, or API changes except the one approved href fix (T6). Parallelizable tickets run in subagents with disjoint file ownership; the repo-wide sweep (T4) runs alone after them because it touches the same files.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind, CSS modules, react-slick, Playwright MCP for browser verification (no playwright npm package in repo — use the `mcp__plugin_playwright_playwright__browser_*` tools). Dev server: `npm run dev` → `http://127.0.0.1:3000`.

## Global Constraints (verbatim from the spec)

- Brand locked: navy `#292F6C`, red `#a81f23`; light mode only; WCAG AA; tap targets ≥44px on touched elements.
- No route/href/`ctaId`/form/data-attribute changes except where a ticket explicitly says so (T6).
- Spacing rhythm: `py-16 md:py-24` default, `py-10 md:py-12` utility bands; use `bg-surface`/`bg-surface-dark` tokens, no new hardcoded hexes or arbitrary px values.
- All browser verification against local dev server only. Never submit lead forms on production.
- Never touch `services/`, `actions/`, `app/api/`, `proxy.ts`, `.env*`.
- Never commit to `main`. Stage by name. Pre-commit hook runs `lint && type-check && build` on every commit — group commits sensibly (5 commits total, see Phase ordering).
- No unit-test infrastructure exists for these components (Vitest covers `lib/`); acceptance is browser/grep/build verification per ticket, not TDD. This is a deliberate, spec-sanctioned deviation from the TDD default.

## Execution phases & delegation strategy

| Phase | What | Who | Files (disjoint) |
|---|---|---|---|
| A1 | T1 Covered demotion | subagent A | `components/homepage/Covered/*` |
| A2 | T2 empty-review filter | subagent B | `components/homepage/ReviewsList/ReviewList.tsx`, `components/homepage/ReviewTestimonial/ReviewTestimonialSlider.tsx` |
| A3 | T3 Spanish flex migration | subagent C | `components/spanishpage/SkillsFuturesBuild/SkillsFuturesBuildSpanish.tsx`, `components/homepage/SkillsFuturesBuild/SkillsFuturesBuild.tsx`, `components/homepage/SkillsFuturesBuild/SkillsFuturesBuild.module.css` |
| A4 | T5+T6+T7 one-liners | main session (inline) | `app/layout.tsx`, `components/homepage/VeteranPCSWorksComp/VeteranPCSWorks.tsx`, `components/Header.tsx` |
| B | T4 tahoma sweep (repo-wide, overlaps everyone) | subagent D, **after A completes** | ~104 files |
| C | Browser verification of all acceptance checks (incl. T1 measure-iterate) | main session | — |
| D | Codex implementation gate, fix P1/P2, re-run until clean | main session | — |
| E | Commits (5: T1 / T2 / T3 / T5+T6+T7 / T4), push, PR | main session | — |

Commits happen at the END (phase E), after verification and a clean Codex gate, in file-disjoint groups so staging by name is exact. Codex gate reviews the working tree (`--scope working-tree`) before any commit.

---

### Task 1 (T1): Covered card-wall demotion — the height lever

**Files:**
- Modify: `components/homepage/Covered/Covered.tsx`
- Modify: `components/homepage/Covered/CoveredComp.tsx`
- Modify: `components/homepage/Covered/CoveredComp.module.css`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: same default exports; `CoveredComp` keeps prop `card: { img, imgred, title, subTitle, link }`. `TrackedCtaLink` cta object must remain byte-identical (`ctaId: 'homepage_covered_card'` etc.).

**Acceptance:** homepage `document.documentElement.scrollHeight` at 390×844 ≤ 10,500px after scrolling to bottom (was 11,281). All 6 cards keep their link, title, and subTitle. Hover image-swap still works.

**Height budget note (gate response):** the required page-level reduction is ~781px. Expected contributions at 390px: Covered section restructure (1-col → 2-col grid: 6 card-rows become 3; section padding 128px → 80px; tighter heading margin) ≈ 500–700px, plus T3's min-height removal on the shared internship band ≈ 100–150px. Step 4 defines a deep fallback-knob list confined to `Covered/*`; if exhausted, stop and report.

- [ ] **Step 1: Rewrite the section wrapper + grid in `Covered.tsx`**

Replace the outer wrapper (line 61) and grid classes (line 77). Heading block and `cardsData` are untouched.

```tsx
  return (
    <div className="container mx-auto w-full py-10 md:py-12">
      <div
        className="px-4 bg-[#ffffff] mx-auto text-center"
        data-aos="fade-up"
        data-aos-duration="1000"
      >
        <div>
          <h2 className="text-[#292F6C] font-bold lg:text-[48px] md:text-[29px] sm:text-[25px] text-[20px] md:block">
            We’ve got you covered
          </h2>
          <p className="normal text-[#7E1618] lg:text-[18px] md:text-[19px] text-[16px] leading-[32px] font-medium md:block">
            Military community helping our military community move.
          </p>
        </div>
      </div>
      <div
        className="grid grid-cols-2 md:grid-cols-3 mt-6 md:mt-10 justify-center gap-3 md:gap-6 md:px-10 px-3"
        data-aos="fade-up"
        data-aos-duration="1000"
      >
        {cardsData.map((card, index) => (
          <CoveredComp
            key={index}
            card={card} // Only pass 'card' object here
          />
        ))}
      </div>
    </div>
  );
```

Rationale: `py-10 md:py-12` = utility-band rhythm (demotion); 2-col mobile grid halves the card stack; `xl:grid-cols-3 md:grid-cols-2` → `md:grid-cols-3` gives 2 tight rows from tablet up.

- [ ] **Step 2: Compact the card in `CoveredComp.tsx`**

Replace the returned JSX body inside `<TrackedCtaLink>` (keep the cta object EXACTLY as-is, keep `isMounted` gate, keep both `Image`s with their `coverd-link-img` / `coverd-link-imgred` classes and the `cover-card` class hook):

```tsx
      <div className={ClassNames.coveredwrappercontainer}>
        <div className="p-4 md:p-6 cover-card mx-auto h-full">
          <div className="text-center">
            <div className="flex justify-center">
              <Image
                width={80}
                height={80}
                className="coverd-link-img w-10 h-10 md:w-12 md:h-12 object-contain"
                src={img}
                alt=""
              />
              <Image
                width={80}
                height={80}
                className="coverd-link-imgred w-10 h-10 md:w-12 md:h-12 object-contain"
                src={imgred}
                alt=""
              />
            </div>
            <h4 className="text-[#292F6C] text-base md:text-lg font-bold mt-2 md:mt-3">
              {title}
            </h4>
            <span className="text-[#000000] text-[13px] md:text-sm mt-1 block">
              {subTitle}
            </span>
            <span className="text-[#A81F23] text-sm md:text-base mt-1 md:mt-2 block">
              Learn more
            </span>
          </div>
        </div>
      </div>
```

Value-hygiene note (gate response): every class above is Tailwind scale except `text-[13px]`, which is retained unchanged from the current file (line 73) — no NEW arbitrary values are introduced. Hexes `#292F6C` / `#A81F23` / `#000000` / `#ffffff` are pre-existing in these files. Whole card remains one big link, so tap target ≥44px trivially.

- [ ] **Step 3: Dedupe `CoveredComp.module.css` (values unchanged)**

The four `@media (min-width: …)` blocks and the `max-width:575px` block are byte-identical re-declarations of the base rule — delete them. Keep the existing `32px` radius and `10px` accent border exactly as-is (no new values; gate response). Add `height: 100%` so grid cells equalize. Full new file content:

```css
.coveredwrappercontainer {
  height: 100%;
  border-radius: 32px;
  border: 1px solid #eee;
  border-bottom: 10px solid transparent;
  background: #fff;
  box-shadow: 0px 1px 0px 0px #eee;
}

.coveredwrappercontainer:hover {
  border-radius: 32px;
  border-bottom: 10px solid #a81f23;
  background: #fff;
  box-shadow:
    0.29px 6.646px 30.11px 0px rgba(90, 114, 234, 0.06),
    0.117px 2.673px 13.186px 0px rgba(90, 114, 234, 0.04),
    0.026px 0.598px 5.707px 0px rgba(90, 114, 234, 0.03);
  transition: all 0.3s ease-in-out;
}
```

- [ ] **Step 4 (Phase C, main session): Measure and iterate**

With dev server running, via Playwright MCP at 390×844: navigate `http://127.0.0.1:3000` → scroll to bottom in steps (trigger lazy-load) → wait for idle → evaluate `document.documentElement.scrollHeight` AND the Covered section's own `getBoundingClientRect().height` (to quantify the section's contribution). Expected: page ≤ 10500.

If over budget, iterate ONLY inside `components/homepage/Covered/*`, re-measuring after each knob, in this order:
1. mobile grid `gap-3` → `gap-2`
2. card padding `p-4` → `p-3` (mobile only; keep `md:p-6`)
3. icons `w-10 h-10` → `w-8 h-8` (mobile only; keep `md:w-12`)
4. subTitle `text-[13px]` → `text-xs`; "Learn more" `text-sm` → `text-xs`, `mt-1` → `mt-0.5`
5. heading block: grid `mt-6` → `mt-4`; heading `text-[20px]` → `text-lg` mobile; drop the `leading-[32px]` on the subheading to `leading-normal` (mobile net ~10-20px)

Each knob stays inside the spec's constraints (Tailwind scale or values already in the file). The section padding stays at the utility-band rhythm `py-10 md:py-12` — no `py-8` escape hatch, that would break the spacing contract (gate-2 response). If ALL knobs are exhausted and the page is still >10,500px, STOP and report the blocker (ticket premise wrong: the lever isn't big enough) rather than compacting sections outside `Covered/*`.

---

### Task 2 (T2): Drop empty reviews from the reviews pipeline (filter upstream)

**Files:**
- Modify: `components/homepage/ReviewsList/ReviewList.tsx`
- Modify: `components/homepage/ReviewTestimonial/ReviewTestimonialSlider.tsx`

**Interfaces:**
- Consumes: `Review` type where `comment: string | null`.
- Produces: same component signatures. `ReviewTestimonial.tsx` untouched (pass-through). Filtering ONCE in `ReviewList.tsx` keeps the JSON-LD `reviewSchema` and the rendered slider consistent (gate response). `averageRating` / `totalReviewCount` stay as fetched — they are Google-business aggregates, not derived from the displayed list.

**Acceptance:** no "No review provided." card renders on the homepage; rendered review count ≥ 2 so the slider works. (Data check: current `public/json/reviews.json` has 50 reviews, 44 with comments.)

- [ ] **Step 1: Filter once after fetch in `ReviewList.tsx`**

After line 29 (`const { reviews: reviewsList, ... }`), add the filtered list and use it for BOTH the schema map (line 31) and the `<ReviewTestimonial>` prop (line 68):

```tsx
    const { reviews: reviewsList, averageRating, totalReviewCount } = reviewsData;

    const reviewsWithComments = reviewsList.filter((review) => review.comment?.trim());

    const reviewSchema: WithContext<Testimonial>[] = reviewsWithComments.map((review) => ({
```

and

```tsx
            <ReviewTestimonial
                reviewsList={reviewsWithComments}
                averageRating={averageRating}
                totalReviewCount={totalReviewCount}
            />
```

(No other line in the file changes; `reviewBody: review.comment || ""` may stay — it is now always non-empty.)

- [ ] **Step 2: Remove the dead fallback + harden the slider for small counts**

In `ReviewTestimonialSlider.tsx`:

1. Line 58, replace:
```tsx
  const comment = review.comment?.trim() || "No review provided.";
```
   with:
```tsx
  const comment = review.comment?.trim() ?? "";
```
2. Derive the slider settings from the actual count (gate response — react-slick misbehaves when `slidesToShow` exceeds the slide count, and `infinite` with exactly 2 slides at `slidesToShow: 2` duplicates them). Lines 103-111, replace the settings head:
```tsx
  const sliderSettings = {
    infinite: reviews.length > 2,
    speed: 500,
    slidesToShow: Math.min(2, reviews.length),
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    arrows: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: Math.min(2, reviews.length),
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
    nextArrow: <SampleNextArrow />,
    prevArrow: <SamplePrevArrow />
  };
```

- [ ] **Step 3: Verify the string is gone**

Run: `rg -n "No review provided" components/` — expect no matches.

- [ ] **Step 4 (Phase C): Browser check**

Homepage at 1280: read the slider DOM; assert no card text contains "No review provided."; count rendered unique review cards ≥ 2.

---

### Task 3 (T3): Migrate SkillsFuturesBuildSpanish off the absolute overlay; delete ALL min-heights

**Files:**
- Modify: `components/spanishpage/SkillsFuturesBuild/SkillsFuturesBuildSpanish.tsx`
- Modify: `components/homepage/SkillsFuturesBuild/SkillsFuturesBuild.tsx`
- Modify: `components/homepage/SkillsFuturesBuild/SkillsFuturesBuild.module.css`

**Interfaces:**
- Consumes: shared `classes.SkillsFuturesBuildContainer` (Spanish file already imports the English module — keep that import).
- Produces: same default exports. DO NOT switch `Link` → `TrackedCtaLink` and DO NOT change `h1` → `h2` (no new ctaIds allowed; heading semantics out of scope). Layout classes only.

**Decision (gate response):** the ticket acceptance says "min-heights gone" — ALL `min-height` rules are removed, including the base `446px`. The band's height then comes from in-flow content plus explicit vertical padding `py-16 md:py-24` (the spec's default band rhythm) added to the inner content wrapper of BOTH variants, so the background band survives without any magic heights. This intentionally makes the English band's height uniform-by-content across breakpoints (previously 446/636/438/362) — regression-screenshotted in Phase C at 390/640/768/1024/1280.

**Acceptance:** `/spanish` section renders equivalent composition at 320/390/768/1280 (screenshots); ALL min-heights gone from the module CSS; no clipped text.

- [ ] **Step 1: English component — add band padding**

`SkillsFuturesBuild.tsx` line 9, change the inner wrapper only:

```tsx
        <div className="w-full text-center py-16 md:py-24">
```

(Everything else — copy, `TrackedCtaLink` cta object — byte-identical.)

- [ ] **Step 2: Replicate the in-flow flex layout in the Spanish component**

Full new file content for `SkillsFuturesBuildSpanish.tsx`:

```tsx
import Button from "@/components/common/Button";
import classes from "@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild.module.css";
import Link from "next/link";

const SkillFuturesBuildSpanish = () => {
    return (
        <div className="w-full lg:mb-8 mb-0">
            <div className={`${classes.SkillsFuturesBuildContainer} flex items-center`}>
                <div className="w-full text-center py-16 md:py-24">
                    <h1 className="text-white lg:text-[48px] text-[30px] font-bold poppins px-10 sm:px-0 mb-5">
                        Las habilidades para compartir. Los futuros a construir.
                    </h1>
                    <p className="font-medium text-[18px] leading-[30px] text-white roboto w-full mx-auto">
                        ¿Interesado en comenzar una carrera como agente inmobiliario o oficial de préstamos hipotecarios?
                    </p>
                    <Link href="/internship">
                        <Button buttonText="Infórmate sobre nuestra pasantía" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SkillFuturesBuildSpanish;
```

(Changes: drop `relative` from outer div; add `flex items-center` to the container; replace the `absolute top-[50%]…` wrapper + `container mx-auto` with the English `w-full text-center py-16 md:py-24`. Copy, `h1`, `Link`, `Button` untouched.)

- [ ] **Step 3: Delete ALL min-heights from the shared module CSS**

Full new file content for `SkillsFuturesBuild.module.css`:

```css
.SkillsFuturesBuildContainer{
    background-image: url("/assets/Internship-section.webp");
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
}
```

- [ ] **Step 4 (Phase C): Screenshot verification**

Playwright MCP against `http://127.0.0.1:3000/spanish` at 320, 390, 768, 1280 widths: screenshot the section each time; assert heading/paragraph/button visible, centered, not clipped, background band intact. English band regression on `/` at 390, 640, 768, 1024, 1280 (shared CSS — heights change by design; check composition + no clipping). **Gate-2 response:** `SkillFuturesBuild` is ALSO rendered on `/impact`, `/charity`, and `/contact` — check each of those routes at 390 and 1280: band composition intact, no clipped text, and `document.documentElement.scrollWidth === window.innerWidth` (no horizontal overflow).

---

### Task 4 (T4): Repo-wide dead `tahoma` class sweep (token-aware)

**Files:** ~104 files matching `rg -l '\btahoma\b' --type-add 'code:*.{tsx,ts,jsx,js,css}' -tcode`. Runs AFTER Tasks 1-3 and 5-7 are in the working tree (it overlaps their files).

**Verified facts (gate response):** `tahoma` appears NOWHERE in `tailwind.config.ts` or `app/globals.css`, and no `.tahoma` CSS class is defined anywhere — so BOTH the bare `tahoma` token (103 files) and the `font-tahoma` token (3 files: `components/Impact/ImpactVaLoan/ImpactVaLoan.tsx`, `components/Impact/VeteranPcsGivesBack/VeteranPcsGivesBack.tsx`, `components/About/HowVetPcsStarted/HowVetPcsStarted.tsx`) are dead classes, and both match the acceptance grep `\btahoma\b`. The sweep must remove complete class tokens only — a naive `s/\btahoma\b//` would corrupt `font-tahoma` into `font-` (the high-severity gate finding). The only legit "Tahoma" is the CSS **value** `font-family: Tahoma;` in `components/contactpage/ContactForm/ContactForm.module.css:52` — capital T, untouched by a case-sensitive sweep; that file must show NO diff. No solitary `className="tahoma"` exists (verified).

**Acceptance:** `rg -l '\btahoma\b' --type-add 'code:*.{tsx,ts,jsx,js,css}' -tcode` returns nothing; build green. Do NOT define the class.

- [ ] **Step 1: Re-verify no definition exists (at execution time)**

Run: `rg -n '\.tahoma\b' -g '*.css' -g '*.scss'` and `rg -in 'tahoma' tailwind.config.ts app/globals.css`
Expected: no output from either.

- [ ] **Step 2: Token-aware scripted sweep + className-scoped whitespace normalization**

Capture the file list ONCE (also used for staging in Phase E), then three ordered removal rules — middle position first so exactly one space survives between the token's neighbors — followed by a whitespace cleanup that touches ONLY the inside of `className="…"` strings in the swept files (gate-2 response: repo-wide whitespace has pre-existing noise; normalize only what the sweep touches):

```bash
rg -l '\btahoma\b' --type-add 'code:*.{tsx,ts,jsx,js,css}' -tcode > /tmp/tahoma-files.txt
xargs perl -pi -e '
  s/ (?:font-)?tahoma(?![-\w])(?= )//g;         # middle: space+token followed by space -> keep the following space
  s/(?<![-\w])(?:font-)?tahoma(?![-\w]) //g;    # leading: token+space (start of string/quote)
  s/ (?:font-)?tahoma(?![-\w])//g;              # trailing: space+token before closing quote/backtick
' < /tmp/tahoma-files.txt
# normalize whitespace ONLY inside double-quoted className strings of swept files
xargs perl -pi -e '
  1 while s/(className="[^"]*?)  ([^"]*")/$1 $2/;   # collapse doubles
  s/className=" ([^"]*")/className="$1/g;            # leading space
  s/(className="[^"]*?) "/$1"/g;                     # trailing space
' < /tmp/tahoma-files.txt
```

(The `(?<![-\w])`/`(?![-\w])` guards make `font-tahoma` match only as a WHOLE token, never corrupting it into `font-`. The className cleanup may incidentally fix PRE-EXISTING doubles in swept files — acceptable, they are in-diff mechanical cleanups; it must never touch non-className strings.)

- [ ] **Step 3: Verify zero remain, no corrupted tokens, no NEW whitespace damage (diff-scoped)**

```bash
# acceptance grep — must return nothing
rg -n '\btahoma\b' --type-add 'code:*.{tsx,ts,jsx,js,css}' -tcode
# corrupted-token check on ADDED lines — must return nothing (the gate-1 failure mode)
git diff -U0 -- . | rg '^\+.*font-[" ]'
git diff -U0 -- . | rg '^\+.*font-$'
# NEW whitespace anomalies: added lines with doubled/leading/trailing spaces inside className strings
git diff -U0 -- . | rg '^\+.*className="[^"]*  '
git diff -U0 -- . | rg '^\+.*className=" '
# ContactForm.module.css must be untouched
git diff --stat components/contactpage/ContactForm/ContactForm.module.css   # expect empty
```

All four `git diff` greps must return nothing (checks are scoped to lines this sweep ADDS, so pre-existing repo noise can't fail the gate — gate-2 response). Then hand-check the 2 template-literal usages (`components/StatePage/StatePageCityAgents/StatePageCityAgents.tsx:72`, `components/StatePage/StatePageVaLoan/StatePageVaLoan.tsx:41`) and the 3 `font-tahoma` files in the diff; eyeball `git diff --stat` (expect ~104 files, tiny deltas) and spot-check ≥10 diffs for collateral damage.

Run: `npm run type-check` → exit 0.

---

### Task 5 (T5): Remove vestigial `data-scroll-behavior="smooth"`

**Files:**
- Modify: `app/layout.tsx` (line 158)

**Acceptance:** attribute gone; no new Next scroll warning in dev console during route navigation.

- [ ] **Step 1: Edit**

```tsx
    <html lang="en" className={`scroll-pt-20 ${inter.variable} ${poppins.variable} ${roboto.variable} ${lora.variable}`}>
```

(only ` data-scroll-behavior="smooth"` removed.)

- [ ] **Step 2 (Phase C): Console check**

Playwright MCP: navigate `/` → click to another route → read console messages; assert no warning mentioning scroll behavior.

---

### Task 6 (T6): `how-it-works` leading slash

**Files:**
- Modify: `components/homepage/VeteranPCSWorksComp/VeteranPCSWorks.tsx` (line 23)

**Acceptance:** card navigates correctly from any path; grep shows no other relative `link:` values in that file.

- [ ] **Step 1: Edit**

```tsx
    link: "/how-it-works",
```

The tracked `destination` is derived in `VeteranPCSWorksComp.tsx` as `destination: link`, so the analytics destination updates automatically — that satisfies the ticket's "update the tracked `destination` to match" with zero extra edits. Do not touch `"#state-map"` (in-page anchor, not a relative path) or `"/va-loan-help"`.

- [ ] **Step 2: Grep**

Run: `rg -n 'link:' components/homepage/VeteranPCSWorksComp/VeteranPCSWorks.tsx`
Expected: only `"#state-map"`, `"/va-loan-help"`, `"/how-it-works"`.

- [ ] **Step 3 (Phase C): Click check**

From `/` click the Bonus card → lands on `/how-it-works`.

---

### Task 7 (T7): Ultrawide nav gap parity

**Files:**
- Modify: `components/Header.tsx` (line 238)

**Acceptance:** at 1280 the nav row still fits unwrapped with a visible logo↔links gap; at 1920 the ul gap is 32px.

- [ ] **Step 1: Edit**

In the nav `<ul>` className, change `min-[1280px]:gap-6` → `min-[1280px]:gap-6 min-[1536px]:gap-8` (insert the new token immediately after the existing one; nothing else changes).

- [ ] **Step 2 (Phase C): Browser check**

Playwright MCP at 1280×800: nav links on one row, no wrap, visible gap between logo and first link. At 1920×1080: `getComputedStyle(ul).columnGap === '32px'`.

---

### Phase C: Full verification checklist (main session, dev server on 127.0.0.1:3000)

- [ ] T1 height ≤10,500 @390×844 (post-lazy-load) + Covered section height noted — iterate per Task 1 Step 4 if needed
- [ ] T2 no "No review provided." card; ≥2 review cards render
- [ ] T3 `/spanish` screenshots @320/390/768/1280 + English band regression @390/640/768/1024/1280 on `/` + band check on `/impact`, `/charity`, `/contact` @390/1280 (composition, no clip, no horizontal overflow)
- [ ] T5 no scroll warning in console during route nav
- [ ] T6 Bonus card navigates to `/how-it-works`
- [ ] T7 nav unwrapped @1280; gap 32px @1920
- [ ] No horizontal overflow at 320/390/768/1280/1440 on `/`: `document.documentElement.scrollWidth === window.innerWidth`
- [ ] Kill the dev server; delete temp screenshots (never commit them)

### Phase D: Codex implementation gate

- [ ] `node "$HOME/.claude/plugins/cache/openai-codex/codex/1.0.4/scripts/codex-companion.mjs" review "--wait --scope working-tree"`
- [ ] Fix ALL P1/P2 findings, re-run until zero P1/P2. (3 failed loops on one ticket = stop and report.)

### Phase E: Commit, push, PR

- [ ] 5 commits, staged by name, in order: T1 (`components/homepage/Covered/*`), T2 (ReviewList.tsx + slider), T3 (Spanish + English tsx + module css), T5+T6+T7 (layout.tsx, VeteranPCSWorks.tsx, Header.tsx), T4 (sweep file list captured via `rg -l` at sweep time; stage that exact list). Each message: `<summary> (T<n>)` + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- [ ] `git push -u origin homepage-followups`
- [ ] `gh pr create` against `main`: body describes each ticket + evidence summary; ends with the Claude Code attribution line. Print the PR URL.

## Adversarial gate response (rev 1 → rev 2)

| Gate finding | Severity | Resolution in rev 2 |
|---|---|---|
| Perl sweep corrupts `font-tahoma` → `font-` | high | Token-aware regex with `(?<![-\w])`/`(?![-\w])` guards; `font-tahoma` verified dead (not in tailwind config) and removed as a whole token; corrupted-token + whitespace post-checks; ContactForm.module.css no-diff check |
| Keeping base 446px contradicts "min-heights gone" | medium | ALL min-heights deleted; band height restored via in-flow `py-16 md:py-24` on both variants (spec's default rhythm); English regression screenshots at 5 widths |
| T2 filters too late (JSON-LD + count inconsistency; react-slick small-count) | medium | Filter moved upstream to `ReviewList.tsx` (single source for schema + UI); slider settings derived from count (`infinite: >2`, `slidesToShow: min(2, n)`); aggregates intentionally stay as Google-reported |
| T1 fallback knobs too weak for a 781px miss | medium | Section-height measurement added; 6-knob ordered fallback list (gap, padding, icons, type scale, heading, band padding); T3's min-height removal contributes ~100-150px; explicit stop-and-report if exhausted |
| Plan weakened the no-new-arbitrary-values constraint | low | Constraint restored verbatim; T1 CSS keeps existing 32px/10px values (dedupe only); JSX uses Tailwind scale + pre-existing `text-[13px]`; per-step value-hygiene notes replace the blanket exception |

Gate pass 2 (rev 2 → rev 3):

| Gate finding | Severity | Resolution in rev 3 |
|---|---|---|
| T4 whitespace gate fails on pre-existing repo noise; sweep can leave whitespace artifacts | medium | Rules reordered (middle-position first); className-scoped normalization pass on swept files only; all whitespace/corruption gates diff-scoped (`git diff -U0` added lines) so pre-existing noise can't fail them |
| T1 `py-8` fallback knob breaks the verbatim spacing rhythm | medium | Knob removed; section stays `py-10 md:py-12`; stop-and-report remains the terminal state |
| `SkillFuturesBuild` also renders on `/impact` `/charity` `/contact` — unverified | medium | Added band composition + no-clip + no-horizontal-overflow checks on all three routes at 390/1280 to Phase C |
