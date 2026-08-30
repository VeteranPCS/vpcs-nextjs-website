---
name: vpcs-state-maps
description: Process VeteranPCS state-map image updates from urgent Linear tickets through Google Drive discovery, safe repo installation, state_list.json metadata updates, single-image enforcement, tests, a branch commit and PR, Drive archival, and Linear completion. Use for requests such as "process the latest state update," "get Steph's new state maps," or "replace the state images and ensure only one file exists per state."
---

# VeteranPCS State Maps

Process one Linear ticket as an ordered transaction. Keep Drive files in place until the exact state assets and metadata have passed tests and the commit is durable on the remote.

## Prerequisites

- Read `CLAUDE.md` before acting.
- Use the Linear and Google Drive skills for connector operations.
- **Preflight, before mutating anything:** confirm the Linear and Google Drive connectors actually respond. Linear is an MCP server and can fail to connect at session start; if it is unavailable, stop and report that rather than beginning a transaction you cannot close.
- Work from the repository root. Preserve unrelated worktree changes and stage files by exact path.

## Why a branch, not `main`

Earlier versions of this skill committed and pushed directly to `main`. The global `git-guard.sh` PreToolUse hook blocks both committing on `main` and pushing to `main` (exit 2), which would abort this transaction *after* repo installation and *before* Drive archival, stranding a half-processed batch.

The real safety invariant was never "the commit is on `main`" — it is **"the repo copy is durable on the remote before the Drive source is archived."** A pushed feature branch satisfies that invariant exactly as well. Archive Drive files once the branch is pushed; the PR can merge later without risk to the assets.

## Workflow

1. Create a task plan covering ticket discovery, Drive intake, local installation, tests, branch/commit/push, Drive archival, and Linear closure.
2. Inspect `git status --short --branch`. Do not discard, overwrite, stage, or commit unrelated changes. Create a task branch off up-to-date `main` (for example `state-maps/<ticket-id>`); stop if overlapping edits make that unsafe.
3. Find the newest open **Urgent** VeteranPCS issue created by Stephanie whose title or description concerns a state update or state map. Prefer an explicit issue identifier from the user. Fetch the full issue and comments.
4. List recent completed state-update issues and identify the immediately preceding completed ticket. Use its `completedAt` as the lower time boundary for the current Drive batch. If no trustworthy boundary exists, ask before selecting files.
5. Ground the ticket's linked Drive folder and its `uploaded` child folder. Snapshot direct image children and select only files created after the previous ticket's completion and present at snapshot time. Accept `.svg`, `.webp`, `.png`, `.jpg`, and `.jpeg`. Do not pull stale files merely because they remain outside `uploaded`.
6. Read metadata for each candidate and record its Drive ID, exact parents, name, MIME type, creation time, and size. The filename stem must exactly normalize to one `state_name` or `state_slug.current` in `content/_data/site/state_list.json`.
7. Download raw bytes into a fresh temporary directory. Do not write directly into `public/images/states/` during download.
8. Run the bundled helper without `--install`:

   ```sh
   node .claude/skills/vpcs-state-maps/scripts/update-state-maps.mjs /tmp/texas.svg [/tmp/other-state.webp ...]
   ```

   Review each state match, image dimensions, collision, destination, and exact old files that will be removed. Stop on unknown/duplicate states, unreadable images, animated files, or unsafe SVG content.
9. Visually inspect every downloaded image. For SVG files, render a temporary raster preview if the image viewer cannot display SVG directly.
10. Install the batch only after confirming every replacement belongs to the ticket:

   ```sh
   node .claude/skills/vpcs-state-maps/scripts/update-state-maps.mjs --install --allow-replacements <downloaded-files...>
   ```

   The helper preserves source bytes and extensions, writes `public/images/states/{state-slug}.{ext}`, updates the state's `state_map.path`, `alt`, `width`, `height`, and `_updatedAt`, removes the stale `_sanityAssetId`, and deletes every other supported image with that exact state slug. It rolls back local writes if the post-install audit fails.
11. Audit the complete state-image directory:

    ```sh
    node .claude/skills/vpcs-state-maps/scripts/update-state-maps.mjs --audit
    ```

    Require exactly one recognized image per state, no orphan state images, metadata dimensions matching the file, and every JSON path matching the sole file.
12. Review `git diff --check`, the image additions/deletions, and only the intended `state_list.json` entries. Run `npm test`, then `npm run build`.
13. Stage only `content/_data/site/state_list.json` and the exact added/deleted state image paths. Commit on the task branch, push it to `origin`, and confirm the remote branch head matches local `HEAD`. Open a PR against `main` with the states, installed paths, and removed paths in the body. Never bypass the pre-commit hook.
14. Only after the branch push succeeds, move each current-batch Drive file by adding the verified `uploaded` parent and removing only its verified source parent. Preserve unrelated parents. Never archive stale files excluded by the time boundary.
15. Verify each moved file's parent metadata, its presence in `uploaded`, and its absence from the source folder's direct children.
16. Add a Linear completion comment with states, installed paths, removed paths, commit hash, PR URL, test/build results, Drive archival confirmation, and any stale Drive files deliberately excluded. Mark the issue `Done` only after all checks pass and the PR is open.

## Failure boundaries

- Never select all unarchived Drive files without applying the previous-ticket time boundary.
- Never archive Drive files before the task branch is successfully pushed to `origin`.
- Never commit or push directly to `main`. `git-guard.sh` blocks it, and an aborted push here strands a half-processed Drive batch.
- Never mark the Linear issue `Done` while any file, test, push, or Drive verification is incomplete.
- Never infer a state from a partial filename match; require an exact normalized state name or slug.
- Never leave multiple extensions for one state slug in `public/images/states/`.
- Retry connector authentication once after reauthentication. Re-read parent metadata before retrying a move.
- On partial failure, report the exact completed and pending files instead of repeating successful mutations.

## Completion report

Report the Linear issue, state names, installed and removed paths, commit hash, branch and PR URL, test/build status, and verified Drive destination. Mention preserved unrelated worktree changes and excluded stale Drive files when present.
