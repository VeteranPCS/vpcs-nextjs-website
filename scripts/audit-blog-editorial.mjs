#!/usr/bin/env node
// Editorial conformance audit for content/blog/*.mdx.
//
// Distinct from recon-blog-migration.mjs:
//   - recon checks Sanity vs MDX parity, file presence, required-field presence
//   - this checks editorial standards once content is in MDX
//
// Run:
//   node scripts/audit-blog-editorial.mjs [--strict]
//
// Outputs:
//   docs/blog-migration/editorial-audit-{ISO}.md          (committed)
//   docs/blog-migration/raw/editorial-audit-{ISO}.json    (gitignored)
//
// Process exit:
//   0 - clean (no findings) OR --strict not set
//   1 - findings present AND --strict set (use in CI)

import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '..');
const CONTENT_DIR = join(ROOT, 'content', 'blog');
const REPORT_DIR = join(ROOT, 'docs', 'blog-migration');
const RAW_DIR = join(REPORT_DIR, 'raw');

const args = { strict: process.argv.includes('--strict') };

// .impeccable.md Principle #3 - "No emoji. No excessive symbols."
const EMOJI_RE = /\p{Extended_Pictographic}/u;

// .impeccable.md voice rules: standard 800-1,200 words, pillar 1,500+. Cap warning at 2,500.
const WORD_LOWER = 800;
const WORD_UPPER = 2500;

// Title/desc bands per the prior session's editorial standards.
const META_TITLE_LOWER = 50;
const META_TITLE_UPPER = 60;
const META_DESC_LOWER = 150;
const META_DESC_UPPER = 160;

// Old subcategorized URLs that next.config.mjs redirects. Anchors pointing here
// add an unnecessary 301 hop - fix to the flat /blog/{slug}.
const REDIRECTED_PREFIXES = [
  '/blog/us-military-bases/',
  '/blog/va-loan-help/',
  '/blog/pcs-help/',
  '/blog/military-transition-help/',
  '/blog/things-to-do/',
];

// Person-name shape we can resolve via lib/blog/authors.ts:querySalesforceByName.
// Roughly: "First Last" or "First Middle Last" - no &, no commas, each word capitalized.
const PERSON_NAME_RE = /^[A-Z][A-Za-z'’-]+(?: [A-Z][A-Za-z'’-]+){1,3}$/;

function readPosts() {
  if (!existsSync(CONTENT_DIR)) return [];
  return readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((filename) => {
      const filepath = join(CONTENT_DIR, filename);
      const raw = readFileSync(filepath, 'utf-8');
      const { data, content } = matter(raw);
      return { slug: filename.replace(/\.mdx$/, ''), filepath, data, content };
    });
}

function stripFences(md) {
  // Remove fenced code blocks so we don't false-positive on # in fenced content.
  return md.replace(/```[\s\S]*?```/g, '');
}

function wordCount(md) {
  const stripped = stripFences(md)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~`]/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
  if (!stripped) return 0;
  return stripped.split(/\s+/).length;
}

function findBodyH1s(md) {
  const lines = stripFences(md).split('\n');
  const hits = [];
  lines.forEach((line, idx) => {
    if (/^# (?!#)/.test(line)) hits.push({ line: idx + 1, text: line.trim() });
  });
  return hits;
}

function findEmoji(md) {
  const stripped = stripFences(md);
  if (!EMOJI_RE.test(stripped)) return [];
  const lines = stripped.split('\n');
  const hits = [];
  lines.forEach((line, idx) => {
    if (EMOJI_RE.test(line)) {
      hits.push({ line: idx + 1, sample: line.slice(0, 80) });
    }
  });
  return hits;
}

function findRedirectedLinks(md) {
  const stripped = stripFences(md);
  const re = /\[[^\]]*\]\(([^)]+)\)/g;
  const hits = [];
  let match;
  while ((match = re.exec(stripped)) !== null) {
    const href = match[1];
    if (REDIRECTED_PREFIXES.some((p) => href.startsWith(p))) {
      hits.push(href);
    }
  }
  return hits;
}

function evaluatePost(post) {
  const findings = [];
  const fm = post.data;
  const md = post.content;

  // 1. Body H1 collision with page <h1>
  const h1s = findBodyH1s(md);
  if (h1s.length > 0) {
    findings.push({
      kind: 'body-h1',
      severity: 'high',
      detail: `${h1s.length} body H1${h1s.length === 1 ? '' : 's'} (page already renders title as h1)`,
      hits: h1s.slice(0, 3),
    });
  }

  // 2. Emoji in body - .impeccable.md Principle #3
  const emojiHits = findEmoji(md);
  if (emojiHits.length > 0) {
    findings.push({
      kind: 'emoji',
      severity: 'medium',
      detail: `${emojiHits.length} line${emojiHits.length === 1 ? '' : 's'} contain emoji (use /public/icon SVGs instead)`,
      hits: emojiHits.slice(0, 3),
    });
  }

  // 3. Word count band
  const words = wordCount(md);
  if (words < WORD_LOWER) {
    findings.push({
      kind: 'word-count-low',
      severity: 'medium',
      detail: `${words} words (target >= ${WORD_LOWER})`,
    });
  } else if (words > WORD_UPPER) {
    findings.push({
      kind: 'word-count-high',
      severity: 'low',
      detail: `${words} words (consider splitting; pillar threshold ${WORD_UPPER})`,
    });
  }

  // 4. Author name set, no SF ID, name shape won't match SOQL First/Last lookup
  const author = fm.author ?? {};
  if (author.name && !author.salesforceId && author.name !== 'VeteranPCS') {
    if (!PERSON_NAME_RE.test(author.name)) {
      findings.push({
        kind: 'author-unresolvable',
        severity: 'low',
        detail: `author.name="${author.name}" has no salesforceId and won't match the First-Last SOQL lookup; will render bare-name byline without headshot`,
      });
    }
  }

  // 5. metaTitle length band
  if (typeof fm.metaTitle === 'string') {
    const len = fm.metaTitle.length;
    if (len < META_TITLE_LOWER || len > META_TITLE_UPPER) {
      findings.push({
        kind: 'meta-title-length',
        severity: 'low',
        detail: `${len} chars (target ${META_TITLE_LOWER}-${META_TITLE_UPPER})`,
      });
    }
  }

  // 6. metaDescription length band
  if (typeof fm.metaDescription === 'string') {
    const len = fm.metaDescription.length;
    if (len < META_DESC_LOWER || len > META_DESC_UPPER) {
      findings.push({
        kind: 'meta-description-length',
        severity: 'low',
        detail: `${len} chars (target ${META_DESC_LOWER}-${META_DESC_UPPER})`,
      });
    }
  }

  // 7. Links to deprecated/redirected blog routes
  const redirected = findRedirectedLinks(md);
  if (redirected.length > 0) {
    findings.push({
      kind: 'redirected-link',
      severity: 'low',
      detail: `${redirected.length} link${redirected.length === 1 ? '' : 's'} to redirected blog paths (each adds a 301 hop)`,
      hits: redirected.slice(0, 5),
    });
  }

  return { slug: post.slug, words, findings };
}

function evaluateGlobals(posts) {
  const findings = [];

  // Component case-collision (e.g., "Things To Do Near You" vs. "Things to Do Near You")
  const components = new Set();
  for (const p of posts) {
    if (typeof p.data.component === 'string') components.add(p.data.component);
  }
  const lowered = new Map();
  for (const c of components) {
    const key = c.toLowerCase();
    if (!lowered.has(key)) lowered.set(key, []);
    lowered.get(key).push(c);
  }
  for (const [key, variants] of lowered.entries()) {
    if (variants.length > 1) {
      findings.push({
        kind: 'component-case-collision',
        severity: 'medium',
        detail: `Component "${key}" appears with ${variants.length} casings: ${variants.map((v) => `"${v}"`).join(', ')}`,
      });
    }
  }

  return findings;
}

function bySeverity(findings) {
  const out = { high: 0, medium: 0, low: 0 };
  for (const f of findings) out[f.severity] = (out[f.severity] ?? 0) + 1;
  return out;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Blog Editorial Audit');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Posts scanned: ${report.postsScanned}`);
  lines.push(`- Posts with findings: ${report.postsWithFindings}`);
  lines.push(`- Total findings: ${report.totals.findings} (high: ${report.totals.severity.high}, medium: ${report.totals.severity.medium}, low: ${report.totals.severity.low})`);
  lines.push('');

  if (report.globalFindings.length > 0) {
    lines.push('## Global findings');
    for (const f of report.globalFindings) {
      lines.push(`- **[${f.severity}] ${f.kind}** - ${f.detail}`);
    }
    lines.push('');
  }

  const grouped = new Map();
  for (const p of report.posts) {
    for (const f of p.findings) {
      if (!grouped.has(f.kind)) grouped.set(f.kind, []);
      grouped.get(f.kind).push({ slug: p.slug, ...f });
    }
  }

  if (grouped.size === 0) {
    lines.push('## Per-post findings');
    lines.push('');
    lines.push('**All clean.**');
    return lines.join('\n');
  }

  lines.push('## Per-post findings (grouped by kind)');
  for (const [kind, hits] of [...grouped.entries()].sort()) {
    lines.push('');
    lines.push(`### ${kind} (${hits.length})`);
    for (const h of hits) {
      lines.push(`- **${h.slug}** - ${h.detail}`);
      if (h.hits) {
        for (const sub of h.hits) {
          if (typeof sub === 'string') {
            lines.push(`    - \`${sub}\``);
          } else if (sub.line && sub.text) {
            lines.push(`    - L${sub.line}: \`${sub.text.slice(0, 100)}\``);
          } else if (sub.line && sub.sample) {
            lines.push(`    - L${sub.line}: \`${sub.sample}\``);
          }
        }
      }
    }
  }
  return lines.join('\n');
}

function main() {
  const posts = readPosts();
  const evaluations = posts.map(evaluatePost);
  const globalFindings = evaluateGlobals(posts);

  const allFindings = evaluations.flatMap((p) => p.findings).concat(globalFindings);
  const report = {
    generatedAt: new Date().toISOString(),
    postsScanned: posts.length,
    postsWithFindings: evaluations.filter((p) => p.findings.length > 0).length,
    totals: {
      findings: allFindings.length,
      severity: bySeverity(allFindings),
    },
    globalFindings,
    posts: evaluations,
  };

  mkdirSync(RAW_DIR, { recursive: true });
  const stamp = report.generatedAt.replace(/[:.]/g, '-');
  const jsonPath = join(RAW_DIR, `editorial-audit-${stamp}.json`);
  const mdPath = join(REPORT_DIR, `editorial-audit-${stamp.slice(0, 10)}.md`);

  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, renderMarkdown(report));

  console.log(`Wrote ${mdPath}`);
  console.log(`Wrote ${jsonPath}`);
  console.log(
    `Summary: ${report.postsWithFindings}/${report.postsScanned} posts have findings ` +
      `(high:${report.totals.severity.high} med:${report.totals.severity.medium} low:${report.totals.severity.low})`,
  );

  if (args.strict && allFindings.length > 0) process.exitCode = 1;
}

main();
