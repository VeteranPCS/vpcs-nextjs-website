#!/usr/bin/env node
// One-time cleanup: strip the leading body H1 from MDX posts that duplicate
// the page <h1> (which is rendered from frontmatter `title`).
//
// The blog detail page renders blog.title as <h1>, so a body line starting
// with `# ` results in two h1s on the page (a11y + SEO regression).
//
// Run:
//   node scripts/fix-body-h1.mjs                # apply
//   node scripts/fix-body-h1.mjs --dry-run      # preview
//
// The script:
//   - Reads each content/blog/*.mdx
//   - Splits frontmatter from body
//   - In the body, finds the first line matching /^# (?!#)/ (an H1, not H2/3)
//   - If found, removes that line plus the immediately-following blank line
//   - Writes the file back

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '..');
const CONTENT_DIR = join(ROOT, 'content', 'blog');
const dryRun = process.argv.includes('--dry-run');

function splitFrontmatter(raw) {
  // gray-matter compatibility: frontmatter is delimited by --- on its own line.
  const lines = raw.split('\n');
  if (lines[0] !== '---') return { fm: '', body: raw, lead: 0 };
  const closeIdx = lines.indexOf('---', 1);
  if (closeIdx === -1) return { fm: '', body: raw, lead: 0 };
  return {
    fm: lines.slice(0, closeIdx + 1).join('\n'),
    body: lines.slice(closeIdx + 1).join('\n'),
    lead: closeIdx + 1,
  };
}

function stripFirstBodyH1(body) {
  const lines = body.split('\n');
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (/^# (?!#)/.test(line)) {
      // Remove this line. Also remove the next line if it's blank
      // (preserves clean spacing in the rest of the body).
      const next = lines[i + 1];
      const removeCount = next === '' ? 2 : 1;
      lines.splice(i, removeCount);
      return { changed: true, removed: line, body: lines.join('\n') };
    }
  }
  return { changed: false, body };
}

function main() {
  if (!existsSync(CONTENT_DIR)) {
    console.error(`Content dir not found: ${CONTENT_DIR}`);
    process.exitCode = 1;
    return;
  }
  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.mdx'));
  let changed = 0;
  for (const filename of files) {
    const filepath = join(CONTENT_DIR, filename);
    const raw = readFileSync(filepath, 'utf-8');
    const { fm, body, lead } = splitFrontmatter(raw);
    if (lead === 0) continue;
    const result = stripFirstBodyH1(body);
    if (!result.changed) continue;
    const next = `${fm}\n${result.body}`;
    if (dryRun) {
      console.log(`[dry] ${filename}: would remove "${result.removed.slice(0, 80)}"`);
    } else {
      writeFileSync(filepath, next, 'utf-8');
      console.log(`[ok]  ${filename}: removed "${result.removed.slice(0, 80)}"`);
    }
    changed += 1;
  }
  console.log(`\n${dryRun ? 'Would change' : 'Changed'} ${changed} file${changed === 1 ? '' : 's'}.`);
}

main();
