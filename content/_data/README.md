# Shared Data Contracts

These JSON files are script-safe sources of truth. Plain Node scripts can read
them without importing TypeScript or Next aliases, and app code wraps the same
files from `lib/` modules.

- `us-states.json` is canonical for state normalization and validation in code,
  including DC and Puerto Rico.
- Sanity `state_list` documents remain the source for which state pages are
  published and what CMS copy/images those pages use.
- `blog-components.json` is canonical for blog component labels and URL slugs.
- `blog-state-map.json` adds explicit post and token-alias state mappings until
  content frontmatter backfills top-level `stateSlug`.
