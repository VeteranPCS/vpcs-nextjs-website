#!/usr/bin/env node
// One-time cleanup: normalize frontmatter `categories` entries to the canonical
// component labels from content/_data/blog-components.json.
//
// The only known drift is "US Military Bases" -> "U.S. Military Bases" (171
// posts carry the unpunctuated form as a categories dash-item). The rewrite is
// a targeted line edit on frontmatter dash-list lines only - never a YAML
// reserialization (frontmatter has mixed quoting, folded scalars, and unstable
// field order that gray-matter's stringify would reflow).
//
// Run:
//   node scripts/normalize-blog-categories.mjs --dry-run   # preview
//   node scripts/normalize-blog-categories.mjs             # apply
//
// The script:
//   - Reads each content/blog/*.mdx
//   - Locates the frontmatter block (--- ... ---)
//   - Rewrites dash-list lines that exactly match an alias key, preserving
//     indentation and any surrounding quotes
//   - Errors if a `component:` line matches an alias (component labels are
//     expected to already be canonical; a hit means new, unmodeled drift)
//   - Leaves the body untouched

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '..');
const CONTENT_DIR = join(ROOT, 'content', 'blog');

export const CATEGORY_ALIASES = {
  'US Military Bases': 'U.S. Military Bases',
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Rewrites alias dash-items inside the frontmatter block of one raw MDX file.
// Returns { changed, changedLines, content }.
export function rewriteCategories(raw, aliases = CATEGORY_ALIASES) {
  const lines = raw.split('\n');
  if (lines[0] !== '---') return { changed: false, changedLines: 0, content: raw };
  const closeIdx = lines.indexOf('---', 1);
  if (closeIdx === -1) return { changed: false, changedLines: 0, content: raw };

  let changedLines = 0;
  for (let i = 1; i < closeIdx; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    for (const [from, to] of Object.entries(aliases)) {
      if (/^component:/.test(line) && line.includes(from)) {
        throw new Error(
          `component line matches alias "${from}" - component labels were expected to be canonical already; investigate before rerunning: ${line.trim()}`,
        );
      }
      const dashItem = new RegExp(`^(\\s*)- (['"]?)${escapeRegExp(from)}\\2\\s*$`);
      const match = line.match(dashItem);
      if (match) {
        const quote = match[2] ?? '';
        lines[i] = `${match[1] ?? ''}- ${quote}${to}${quote}`;
        changedLines += 1;
      }
    }
  }

  return { changed: changedLines > 0, changedLines, content: lines.join('\n') };
}

export function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (!existsSync(CONTENT_DIR)) {
    console.error(`Content dir not found: ${CONTENT_DIR}`);
    process.exitCode = 1;
    return;
  }
  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.mdx'));
  let changedFiles = 0;
  let totalLines = 0;
  for (const filename of files) {
    const filepath = join(CONTENT_DIR, filename);
    const raw = readFileSync(filepath, 'utf-8');
    const result = rewriteCategories(raw);
    if (!result.changed) continue;
    if (dryRun) {
      console.log(`[dry] ${filename}: would rewrite ${result.changedLines} line${result.changedLines === 1 ? '' : 's'}`);
    } else {
      writeFileSync(filepath, result.content, 'utf-8');
      console.log(`[ok]  ${filename}: rewrote ${result.changedLines} line${result.changedLines === 1 ? '' : 's'}`);
    }
    changedFiles += 1;
    totalLines += result.changedLines;
  }
  console.log(
    `\n${dryRun ? 'Would change' : 'Changed'} ${changedFiles} file${changedFiles === 1 ? '' : 's'} (${totalLines} line${totalLines === 1 ? '' : 's'}).`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
