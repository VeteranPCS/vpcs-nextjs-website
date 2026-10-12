---
name: vpcs-agent-headshots
description: Process VeteranPCS agent-headshot intake from a Linear ticket through Drive intake, Salesforce verification, installation, all checks, PR merge to main, live image verification, Drive archival, branch cleanup, local main sync, and Linear completion. Use for requests such as "process the latest agent uploads," "get Steph's urgent headshots," or "upload the new agent headshots and archive the Drive files."
---

# VeteranPCS Agent Headshots

Process one Linear ticket as an ordered transaction. Keep Google Drive source files in place until the exact website assets have passed validation and the commit is durable on the remote.

The default workflow finishes with the PR merged into `main`, the production images verified, the task branches removed locally and remotely, and local `main` synchronized with `origin/main`. An open PR alone is not completion. Honor an explicit user request to stop earlier, and report the remaining steps.

## Prerequisites

- Read `CLAUDE.md` before acting.
- Use the Linear and Google Drive skills for connector operations.
- Use `vpcs-verify` for rendered verification and the available Vercel deployment tooling to track the exact production commit. Confirm GitHub and Vercel access during preflight as well; an authenticated CLI fallback is acceptable when a connector cannot access the intended team/project.
- **Preflight, before mutating anything:** confirm the Linear and Google Drive connectors actually respond, and that the Salesforce variables in `.env.local` are present. Linear is an MCP server and can fail to connect at session start; if any connector is unavailable, stop and report that rather than beginning a transaction you cannot close.
- Work from the repository root. Preserve unrelated worktree changes and stage files by exact path.

## Why a branch, not `main`

Earlier versions of this skill committed and pushed directly to `main`. The global `git-guard.sh` PreToolUse hook blocks both committing on `main` and pushing to `main` (exit 2), which would abort this transaction *after* installing headshots and *before* Drive archival, stranding a half-processed batch.

The real safety invariant was never "the commit is on `main`" — it is **"the repo copy is durable on the remote before the Drive source is archived."** A pushed feature branch satisfies that invariant exactly as well.

## Workflow

1. Create a task plan covering ticket discovery, Drive intake, local validation, branch/commit/push, all PR checks, merge, production verification, Drive archival, branch cleanup, local main sync, and Linear closure.
2. Inspect `git status --short --branch`. Do not discard, overwrite, stage, or commit unrelated changes. Fetch `origin`, fast-forward local `main`, and create a task branch off up-to-date `main` (for example `codex/<ticket-id>-agent-headshots`); stop if overlapping edits or divergent local commits make that unsafe.
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
10. Visually inspect every installed file and verify its dimensions and WebP format. Record each installed file's SHA-256 hash for production verification; retain the batch records until completion.
11. Run `git diff --check`, review the exact image-only diff, and run `npm run build`. Stage only the installed headshot paths. Commit on the task branch with the affected agent names, push the branch to `origin`, and open a PR against `main`. Never bypass the pre-commit hook.
12. Confirm the pushed branch head matches local `HEAD`. If the push fails, leave every Drive file in its source folder.
13. Move each successfully pushed Drive file by adding the verified `uploaded` folder parent and removing only its verified source-folder parent. Preserve unrelated parents. If a move partially succeeds, retry only the remaining file.
14. Verify each moved file's parent metadata, confirm it appears in `uploaded`, and confirm it no longer appears among the source folder's direct children.
15. Wait for **all applicable PR checks** on the exact current head commit to finish successfully, including CI, security scans, and the preview deployment. Inspect deployment status directly when it is not posted as a PR check. Pending, failed, canceled, or missing expected checks block the merge. An intentionally skipped manual-only job (such as concierge eval) is not a failure; do not launch it just to turn a skip green. If the branch changes, wait for checks on the new head.
16. Merge the checked PR into `main` through GitHub, matching the verified head SHA (for example `gh pr merge <number> --merge --match-head-commit <sha>`). Do not bypass protections or commit/push directly to `main`. Read back the PR's merged state and record its merge commit.
17. Wait for the production deployment of that merge commit to become `READY` and confirm the intended production domains are assigned to it. Wait for post-merge `main` CI to pass as well. Use the repo's linked Vercel team/project rather than CLI defaults; do not treat the preview deployment as proof that production is live.
18. Verify every installed headshot on the production domain:
    - Fetch `/images/agents/{15-character-id}.webp`; require HTTP 200, WebP content type, readable dimensions, and a SHA-256 hash identical to the installed, committed file.
    - Ground the affected state/area pages in Salesforce website activity and assignments. Inspect each portrait on its actual agent card at desktop and narrow mobile widths, using screenshots you actually review. Check the browser's optimized image source too; a correct raw file can coexist with a stale displayed portrait. Never submit a live lead form.
    - If a portrait is stale, inspect the optimizer response and browser cache, refresh/revalidate as appropriate, and verify the normal card again. A cache-busting test URL alone is not evidence that normal visitors get the replacement. Do not declare success until the normal image path and card show the new portrait. Report inactive or unassigned accounts that cannot be verified on a live card.
19. After production verification and post-merge checks pass, fetch `origin`, switch to `main`, and fast-forward it from `origin/main`. Delete only this task's remote branch and local branch, using safe deletion (`git branch -d`), then fetch with pruning and fast-forward local `main` again. If GitHub already deleted the remote branch, verify its absence rather than treating that as a failure. Confirm the task branch is absent locally and remotely, `HEAD` equals `origin/main`, and unrelated files remain intact. Never force-delete a branch, reset local work, or remove unrelated branches to finish cleanup.
20. Add a Linear completion comment containing agent names/IDs, destination paths, task and merge commit hashes, PR URL, local and remote check results, production deployment and live-image evidence, Drive archival confirmation, branch removal, and local main sync. Mark the issue `Done` only after all previous steps pass. Remove task-created temporary artifacts and close verification tabs/servers.

## Failure boundaries

- Never archive Drive files before the task branch is successfully pushed to `origin`.
- Never commit or push directly to `main`. `git-guard.sh` blocks it, and an aborted push here strands a half-processed Drive batch.
- Never merge while any applicable PR check or preview deployment is pending or unsuccessful; never bypass branch protections.
- Never mark the Linear issue `Done` while any file, check, merge, production deployment, live image/card verification, Drive verification, branch cleanup, or local main sync is incomplete.
- Never route a headshot by filename or ticket wording alone; Salesforce classification is authoritative.
- Never replace an existing repo asset silently. Report the collision and require the ticket to support an update/replacement.
- Retry connector authentication once after the user completes reauthentication. Re-read metadata before retrying a parent change.
- On partial failure, report the exact completed and pending files and workflow stages instead of repeating successful mutations. Keep the issue open. After a merge, preserve the remaining task state and diagnose a deployment/verification failure; do not automatically revert, redeploy, or delete the task branch to conceal an incomplete release.

## Completion report

Report the Linear issue, agent names and IDs, installed paths, task and merge commit hashes, PR URL, checks and production deployment status, live hash and rendered-card verification, verified Drive destination, local/remote task branch removal, and local main synchronization. Mention preserved unrelated worktree files when present.
