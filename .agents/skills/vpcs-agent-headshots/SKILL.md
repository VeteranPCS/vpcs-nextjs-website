---
name: vpcs-agent-headshots
description: Process VeteranPCS agent-headshot intake from an urgent Linear ticket through Google Drive download, Salesforce role verification, repo installation, validation, commit and push to main, Drive archival, and Linear completion. Use for requests such as "process the latest agent uploads," "get Steph's urgent headshots," or "upload the new agent headshots and archive the Drive files."
---

# VeteranPCS Agent Headshots

Process one Linear ticket as an ordered transaction. Keep Google Drive source files in place until the exact website assets have passed validation and the commit is visible on `origin/main`.

## Prerequisites

- Read `CLAUDE.md` before acting.
- Use the Linear and Google Drive skills for connector operations.
- Require connected Linear and Google Drive apps plus the Salesforce variables in `.env.local`.
- Work from the repository root. Preserve unrelated worktree changes and stage files by exact path.

## Workflow

1. Create a task plan covering ticket discovery, Drive intake, local validation, commit/push, Drive archival, and Linear closure.
2. Inspect `git status --short --branch`. Do not discard, overwrite, stage, or commit unrelated changes. Ensure the requested commit targets `main`; stop if overlapping edits make that unsafe.
3. Find the newest open **Urgent** VeteranPCS issue created by Stephanie whose title or description concerns agent headshots/uploads. Prefer an explicit issue identifier from the user. If multiple issues remain equally plausible, ask before mutating anything.
4. Fetch the full issue and comments. Extract and ground the linked Drive folder. List its direct children and identify the `uploaded` child folder. Treat only direct image files outside `uploaded` as the ticket batch.
5. Read metadata for every candidate and record its file ID, name, MIME type, and exact current parents. Accept `.webp`, `.png`, `.jpg`, and `.jpeg`; ignore folders and unrelated files.
6. Download raw bytes into a fresh temporary directory. Do not write directly into `public/images/agents/` during download.
7. Run the bundled validator without `--install`:

   ```sh
   node .agents/skills/vpcs-agent-headshots/scripts/validate-headshots.mjs /tmp/Name-001XXXXXXXXXXXX.webp
   ```

   Require one unique Salesforce Account ID per filename, readable image metadata, and no unsupported or animated images. Review every reported collision as `new`, `identical`, or `replacement`.
8. Verify every extracted ID against Salesforce before installation:

   ```sh
   node --env-file=.env.local scripts/classify-headshot-ids.mjs <id> [<id> ...]
   ```

   Continue only when every record classifies as `agent`. Stop on `lender`, `OTHER`, missing records, or authentication failure; do not guess a destination.
9. Install the validated batch. Add `--allow-replacements` only after confirming each replacement is intended by the ticket:

   ```sh
   node .agents/skills/vpcs-agent-headshots/scripts/validate-headshots.mjs --install --allow-replacements <downloaded-files...>
   ```

   The helper preserves WebP bytes, converts PNG/JPEG inputs to WebP without resizing or cropping, and writes `public/images/agents/{15-character-id}.webp`.
10. Visually inspect every installed file and verify its dimensions and WebP format. Remove any temporary artifacts after inspection.
11. Run `git diff --check`, review the exact image-only diff, and run `npm run build`. Stage only the installed headshot paths. Commit on `main` with the affected agent names and push `origin main`. Never bypass the pre-commit hook.
12. Confirm `HEAD`, `origin/main`, and the pushed commit agree. If the push fails, leave every Drive file in its source folder.
13. Move each successfully committed Drive file by adding the verified `uploaded` folder parent and removing only its verified source-folder parent. Preserve unrelated parents. If a move partially succeeds, retry only the remaining file.
14. Verify each moved file's parent metadata, confirm it appears in `uploaded`, and confirm it no longer appears among the source folder's direct children.
15. Add a Linear completion comment containing agent names, destination paths, commit hash, validation results, and Drive archival confirmation. Mark the issue `Done` only after all previous checks pass.

## Failure boundaries

- Never archive Drive files before a successful push to `origin/main`.
- Never mark the Linear issue `Done` while any file, build, push, or Drive verification is incomplete.
- Never route a headshot by filename or ticket wording alone; Salesforce classification is authoritative.
- Never replace an existing repo asset silently. Report the collision and require the ticket to support an update/replacement.
- Retry connector authentication once after the user completes reauthentication. Re-read metadata before retrying a parent change.
- On partial failure, report the exact completed and pending files instead of repeating successful mutations.

## Completion report

Report the Linear issue, agent names and IDs, installed paths, commit hash, push status, build status, and verified Drive destination. Mention preserved unrelated worktree files when present.
