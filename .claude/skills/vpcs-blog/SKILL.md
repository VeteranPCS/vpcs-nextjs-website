---
name: vpcs-blog
description: Authoring, editing, and maintaining VeteranPCS blog posts in MDX. Use when creating a new post, refreshing an existing post, fixing editorial findings, or evaluating whether a draft meets brand voice and SEO bands.
---

# VeteranPCS Blog Skill

A reference for working with the blog content stored at `content/blog/*.mdx`. Pointer-heavy by design — when the underlying source moves, update the pointer here, not the content.

## Voice and brand

Source of truth: [.impeccable.md](../../../.impeccable.md). Read it before drafting or rewriting prose.

Hard rules from `.impeccable.md` Principle #3:
- No emoji. Inline SVG from `/public/icon` instead.
- 5th–7th grade reading level.
- No urgency timers, "limited spots," or exclamation-stacking.
- Military terms explained on first use.

Default byline when no author is set: **VeteranPCS** (not "The VeteranPCS Team", not "VPCS Team"). Resolver fallback lives in `lib/blog/authors.ts`. JSON-LD fallback lives in `app/(site)/blog/[slug]/page.tsx`.

## Frontmatter schema

Authoritative type: `lib/blog/types.ts` (interface `Blog`).

Required:
- `title` — H1 displayed by the page (do **not** repeat as `# Title` in the body)
- `slug` — must match the filename and be URL-safe
- `publishedAt` — ISO datetime string
- `component` — one of the canonical category labels (see "Component categorization" below)
- `mainImage.src` and `mainImage.alt`

Recommended:
- `metaTitle` — 50–60 chars (SERP)
- `metaDescription` — 150–160 chars (SERP)
- `description` — plain-language card/hero copy. **Diverged from `metaDescription`**: SERP copy is for ranking; this is for in-page reading. Falls back to `excerpt(content, 250)` when absent.
- `categories` — secondary tags (an array)
- `author.name` — surfaced as byline; if it matches a Salesforce contact (First Last shape), the headshot resolves automatically via `lib/blog/authors.ts`. For best-fidelity match, supply `author.salesforceId`.
- `updatedAt` — ISO datetime; emitted as JSON-LD `dateModified`. Set this on any meaningful edit.
- `reviewBy` — ISO date the freshness pipeline should re-evaluate the post.
- `primaryKeyword` / `secondaryKeywords` — GSC join keys for SEO performance reports.

## Hard editorial limits

These are enforced by `scripts/audit-blog-editorial.mjs` — change the constants there, not in this file.

| Check                       | Severity | Bound                                           |
|-----------------------------|----------|-------------------------------------------------|
| body H1 (`# `, not `##`)    | high     | 0 — page renders `title` as `<h1>` already      |
| emoji (Extended_Pictographic)| medium  | 0 — use SVGs from `/public/icon` instead        |
| word count                  | medium   | ≥ 800 (low) and ≤ 2,500 (high warn)             |
| `metaTitle` length          | low      | 50–60 chars                                     |
| `metaDescription` length    | low      | 150–160 chars                                   |
| redirected blog link        | low      | Avoid old subcategorized paths in `next.config.mjs` |
| component case-collision    | medium   | Each `component` value must have one canonical casing |

Run after edits:
```sh
node scripts/audit-blog-editorial.mjs              # write report
node scripts/audit-blog-editorial.mjs --strict     # exit 1 on any finding (CI)
```
Reports land in `docs/blog-migration/editorial-audit-{date}.md`.

## Component categorization

Canonical `component` labels (sourced from the link registry):

| `component`                    | Posts | Notes                                                |
|--------------------------------|-------|------------------------------------------------------|
| `PCS Help`                     | 53    |                                                      |
| `U.S. Military Bases`          | 44    |                                                      |
| `VA Loan Help`                 | 22    |                                                      |
| `Military Transition Help`     | 7     |                                                      |
| `Things to Do Near You`        | 6     | Lowercase "to". "Things **To** Do" is a known prior typo |
| `Real Estate Insights`         | 3     |                                                      |
| `Financial Guidance`           | 3     |                                                      |

The current breakdown lives in `content/_registry/internal-links.json` under `byComponent`. Re-run `node scripts/build-internal-link-registry.mjs` after adding or moving posts.

URLs are flat (`/blog/{slug}`); `next.config.mjs` carries 301 redirects for the legacy subcategorized paths (`/blog/us-military-bases/...`, `/blog/pcs-help/...`).

## Links

Internal links: prefer the flat `/blog/{slug}` form. The audit flags the old subcategorized prefixes (e.g., `/blog/us-military-bases/...`) because they each cost a 301 hop.

Use the link registry to find related posts before drafting cross-references:
```sh
node scripts/build-internal-link-registry.mjs
# writes content/_registry/internal-links.json
```

The registry exposes slug, title, description, component, primary/secondary keywords, and the H2 outline of every post — enough context to pick relevant cross-links without re-reading each MDX file.

External links: open in a new tab only when the user is leaving for a third-party tool. For internal navigation, never use `target="_blank"`.

## Imagery

- Stored under `public/images/blog/{slug}/`. Hero is `main.webp`.
- Always supply meaningful `alt`. Decorative images get `alt=""`.
- No oversaturated American-flag overlays, no salute-at-sunset stock photography (per `.impeccable.md`).

## CTAs

In-body CTAs go through MDX components, not raw HTML. The agent CTA component lives at `components/Blog/mdx/AgentCTA.tsx`. Use it for the standard "Find an Agent" / "Find a Lender" prompts so styling stays consistent if the design refreshes.

```mdx
<AgentCTA state="North Carolina" />
```

## Workflow checklist

When drafting a new post:
1. Confirm slug uniqueness (`ls content/blog/{slug}.mdx`).
2. Pick a `component` from the canonical list above.
3. Write frontmatter first; copy from a similar post for shape.
4. Body must **not** start with `# Title` — the page renders `title` as `<h1>`.
5. Use H2 (`##`) for top-level body sections, H3 (`###`) for subsections.
6. Cross-link from the registry where natural; aim for ≥ 2 internal links per post.
7. Set `updatedAt` if editing an existing post.
8. Run the audit; fix any new high or medium findings before commit.
9. Run `npm run type-check` (the pre-commit hook also runs lint + type-check + build).

When refreshing an existing post:
1. Bump `updatedAt` to today.
2. Refresh figures, BAH/VA-loan limits, and base/market data — these are the most common rot sources.
3. Re-run the audit. Address any new findings.
