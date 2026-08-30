---
name: vpcs-agent-headshots
description: Process VeteranPCS agent-headshot intake from an urgent Linear ticket through Google Drive download, Salesforce role verification, repo installation, validation, a branch commit and PR, Drive archival, and Linear completion. Use for requests such as "process the latest agent uploads," "get Steph's urgent headshots," or "upload the new agent headshots and archive the Drive files."
---

# VeteranPCS Agent Headshots

Process one Linear ticket as an ordered transaction. Keep Google Drive source files in place until the exact website assets have passed validation and the commit is durable on the remote.

## Prerequisites

- Read `CLAUDE.md` before acting.
- Use the Linear and Google Drive skills for connector operations.
- **Preflight, before mutating anything:** confirm the Linear and Google Drive connectors actually respond, and that the Salesforce variables in `.env.local` are present. Linear is an MCP server and can fail to connect at session start; if any connector is unavailable, stop and report that rather than beginning a transaction you cannot close.
- Work from the repository root. Preserve unrelated worktree changes and stage files by exact path.

## Why a branch, not `main`

Earlier versions of this skill committed and pushed directly to `main`. The global `git-guard.sh` PreToolUse hook blocks both committing on `main` and pushing to `main` (exit 2), which would abort this transaction *after* installing headshots and *before* Drive archival, stranding a half-processed batch.

The real safety invariant was never "the commit is on `main`" — it is **"the repo copy is durable on the remote before the Drive source is archived."** A pushed feature branch satisfies that invariant exactly as well.

## Workflow

1. Create a task plan covering ticket discovery, Drive intake, local validation, branch/commit/push, Drive archival, and Linear closure.
2. Inspect `git status --short --branch`. Do not discard, overwrite, stage, or commit unrelated changes. Create a task branch off up-to-date `main` (for example `headshots/<ticket-id>`); stop if overlapping edits make that unsafe.
3. Find the newest open **Urgent** VeteranPCS issue created by Stephanie whose title or description concerns agent headshots/uploads. Prefer an explicit issue identifier from the user. If multiple issues remain equally plausible, ask before mutating anything.
4. Fetch the full issue and comments. Extract and ground the linked Drive folder. List its direct children and identify the `uploaded` child folder. Treat only direct image files outside `uploaded` as the ticket batch.
5. Read metadata for every candidate and record its file ID, name, MIME type, and exact current parents. Accept `.webp`, `.png`, `.jpg`, and `.jpeg`; ignore folders and unrelated files.
6. Download raw bytes into a fresh temporary directory. Do not write directly into `public/images/agents/` during download.
7. Run the bundled validator without `--install`:

   ```sh
   node .claude/skills/vpcs-agent-headshots/scripts/validate-headshots.mjs /tmp/Name-001XXXXXXXXXXXX.webp
   ```

   Require one unique Salesforce Account ID per filename, readable image metadata, and no unsupported or animated images. Review every reported collision as `new`, `identical`, or `replacement`.
8. Verify every extracted ID against Salesforce before installation:

   ```sh
   node --env-file=.env.local scripts/classify-headshot-ids.mjs <id> [<id> ...]
   ```

   Continue only when every record classifies as `agent`. Stop on `lender`, `OTHER`, missing records, or authentication failure; do not guess a destination.
9. Install the validated batch. Add `--allow-replacements` only after confirming each replacement is intended by the ticket:

   ```sh
   node .claude/skills/vpcs-agent-headshots/scripts/validate-headshots.mjs --install --allow-replacements <downloaded-files...>
   ```

   The helper preserves WebP bytes, converts PNG/JPEG inputs to WebP without resizing or cropping, and writes `public/images/agents/{15-character-id}.webp`.
10. Visually inspect every installed file and verify its dimensions and WebP format. Remove any temporary artifacts after inspection.
11. Run `git diff --check`, review the exact image-only diff, and run `npm run build`. Stage only the installed headshot paths. Commit on the task branch with the affected agent names, push the branch to `origin`, and open a PR against `main`. Never bypass the pre-commit hook.
12. Confirm the pushed branch head matches local `HEAD`. If the push fails, leave every Drive file in its source folder.
13. Move each successfully pushed Drive file by adding the verified `uploaded` folder parent and removing only its verified source-folder parent. Preserve unrelated parents. If a move partially succeeds, retry only the remaining file.
14. Verify each moved file's parent metadata, confirm it appears in `uploaded`, and confirm it no longer appears among the source folder's direct children.
15. Add a Linear completion comment containing agent names, destination paths, commit hash, PR URL, validation results, and Drive archival confirmation. Mark the issue `Done` only after all previous checks pass and the PR is open.

## Failure boundaries

- Never archive Drive files before the task branch is successfully pushed to `origin`.
- Never commit or push directly to `main`. `git-guard.sh` blocks it, and an aborted push here strands a half-processed Drive batch.
- Never mark the Linear issue `Done` while any file, build, push, or Drive verification is incomplete.
- Never route a headshot by filename or ticket wording alone; Salesforce classification is authoritative.
- Never replace an existing repo asset silently. Report the collision and require the ticket to support an update/replacement.
- Retry connector authentication once after the user completes reauthentication. Re-read metadata before retrying a parent change.
- On partial failure, report the exact completed and pending files instead of repeating successful mutations.

## Completion report

Report the Linear issue, agent names and IDs, installed paths, commit hash, branch and PR URL, build status, and verified Drive destination. Mention preserved unrelated worktree files when present.
