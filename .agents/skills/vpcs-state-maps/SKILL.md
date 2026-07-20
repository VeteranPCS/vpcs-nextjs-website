---
name: vpcs-state-maps
description: Process VeteranPCS state-map image updates from urgent Linear tickets through Google Drive discovery, safe repo installation, state_list.json metadata updates, single-image enforcement, tests, commit and push to main, Drive archival, and Linear completion. Use for requests such as "process the latest state update," "get Steph's new state maps," or "replace the state images and ensure only one file exists per state."
---

# VeteranPCS State Maps

Process one Linear ticket as an ordered transaction. Keep Drive files in place until the exact state assets and metadata have passed tests and the commit is visible on `origin/main`.

## Prerequisites

- Read `CLAUDE.md` before acting.
- Use the Linear and Google Drive skills for connector operations.
- Require connected Linear and Google Drive apps.
- Work from the repository root. Preserve unrelated worktree changes and stage files by exact path.

## Workflow

1. Create a task plan covering ticket discovery, Drive intake, local installation, tests, commit/push, Drive archival, and Linear closure.
2. Inspect `git status --short --branch`. Do not discard, overwrite, stage, or commit unrelated changes. Ensure the requested commit targets `main`; stop if overlapping edits make that unsafe.
3. Find the newest open **Urgent** VeteranPCS issue created by Stephanie whose title or description concerns a state update or state map. Prefer an explicit issue identifier from the user. Fetch the full issue and comments.
4. List recent completed state-update issues and identify the immediately preceding completed ticket. Use its `completedAt` as the lower time boundary for the current Drive batch. If no trustworthy boundary exists, ask before selecting files.
5. Ground the ticket's linked Drive folder and its `uploaded` child folder. Snapshot direct image children and select only files created after the previous ticket's completion and present at snapshot time. Accept `.svg`, `.webp`, `.png`, `.jpg`, and `.jpeg`. Do not pull stale files merely because they remain outside `uploaded`.
6. Read metadata for each candidate and record its Drive ID, exact parents, name, MIME type, creation time, and size. The filename stem must exactly normalize to one `state_name` or `state_slug.current` in `content/_data/site/state_list.json`.
7. Download raw bytes into a fresh temporary directory. Do not write directly into `public/images/states/` during download.
8. Run the bundled helper without `--install`:

   ```sh
   node .agents/skills/vpcs-state-maps/scripts/update-state-maps.mjs /tmp/texas.svg [/tmp/other-state.webp ...]
   ```

   Review each state match, image dimensions, collision, destination, and exact old files that will be removed. Stop on unknown/duplicate states, unreadable images, animated files, or unsafe SVG content.
9. Visually inspect every downloaded image. For SVG files, render a temporary raster preview if the image viewer cannot display SVG directly.
10. Install the batch only after confirming every replacement belongs to the ticket:

   ```sh
   node .agents/skills/vpcs-state-maps/scripts/update-state-maps.mjs --install --allow-replacements <downloaded-files...>
   ```

   The helper preserves source bytes and extensions, writes `public/images/states/{state-slug}.{ext}`, updates the state's `state_map.path`, `alt`, `width`, `height`, and `_updatedAt`, removes the stale `_sanityAssetId`, and deletes every other supported image with that exact state slug. It rolls back local writes if the post-install audit fails.
11. Audit the complete state-image directory:

   ```sh
   node .agents/skills/vpcs-state-maps/scripts/update-state-maps.mjs --audit
   ```

   Require exactly one recognized image per state, no orphan state images, metadata dimensions matching the file, and every JSON path matching the sole file.
12. Review `git diff --check`, the image additions/deletions, and only the intended `state_list.json` entries. Run `npm test` because state-map disk coverage is not part of the pre-commit hook, then run `npm run build`.
13. Stage only `content/_data/site/state_list.json` and the exact added/deleted state image paths. Commit on `main`, push `origin main`, and confirm `HEAD` equals `origin/main`. Never bypass the pre-commit hook.
14. Only after the push succeeds, move each current-batch Drive file by adding the verified `uploaded` parent and removing only its verified source parent. Preserve unrelated parents. Never archive stale files excluded by the time boundary.
15. Verify each moved file's parent metadata, its presence in `uploaded`, and its absence from the source folder's direct children.
16. Add a Linear completion comment with states, installed paths, removed paths, commit hash, test/build results, Drive archival confirmation, and any stale Drive files deliberately excluded. Mark the issue `Done` only after all checks pass.

## Failure boundaries

- Never select all unarchived Drive files without applying the previous-ticket time boundary.
- Never archive Drive files before a successful push to `origin/main`.
- Never mark the Linear issue `Done` while any file, test, push, or Drive verification is incomplete.
- Never infer a state from a partial filename match; require an exact normalized state name or slug.
- Never leave multiple extensions for one state slug in `public/images/states/`.
- Retry connector authentication once after reauthentication. Re-read parent metadata before retrying a move.
- On partial failure, report the exact completed and pending files instead of repeating successful mutations.

## Completion report

Report the Linear issue, state names, installed and removed paths, commit hash, push status, test/build status, and verified Drive destination. Mention preserved unrelated worktree changes and excluded stale Drive files when present.
