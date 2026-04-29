#!/usr/bin/env node
// Google Search Console performance ingest. Joins per-page click/impression
// data against content/blog/*.mdx frontmatter to flag decay, keyword mismatch,
// and high-impression / low-CTR posts. Suggest-only — no MDX writes.
//
// Run:
//   node --env-file=.env.local scripts/ingest-gsc-performance.mjs [--window 28] [--strict] [--list-sites] [--slug <name>]
//
// Outputs:
//   content/_registry/gsc-performance.json                 (committed)
//   docs/blog-migration/gsc-performance-{YYYY-MM-DD}.md    (committed)
//   docs/blog-migration/raw/gsc-performance-{ISO}.json     (gitignored)

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
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '..');

// ---- Tunables (top-of-file constants per architecture plan) -----------------

const DEFAULT_WINDOW_DAYS = 28;
const GSC_LAG_DAYS = 3; // 2-day GSC final-data lag + 1 safety
const ROW_LIMIT = 25_000;
const MAX_TOTAL_ROWS = 100_000;
const TOP_QUERIES_PER_POST = 5;
const KEYWORD_SUGGESTIONS_PER_POST = 3;
const SUGGESTION_DIGEST_LIMIT = 10;

const LEGACY_BLOG_PREFIXES = [
  '/blog/us-military-bases/',
  '/blog/va-loan-help/',
  '/blog/pcs-help/',
  '/blog/military-transition-help/',
  '/blog/things-to-do/',
];

// Mirrors lib/states.ts STATE_ABBR_TO_SLUG values. Used to bucket /<state> paths
// in the non-blog page registry. Inlined to keep this script .mjs-only.
const STATE_SLUGS = new Set([
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
  'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
  'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine',
  'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi',
  'missouri', 'montana', 'nebraska', 'nevada', 'new-hampshire', 'new-jersey',
  'new-mexico', 'new-york', 'north-carolina', 'north-dakota', 'ohio',
  'oklahoma', 'oregon', 'pennsylvania', 'puerto-rico', 'rhode-island',
  'south-carolina', 'south-dakota', 'tennessee', 'texas', 'utah', 'vermont',
  'virginia', 'washington', 'washington-dc', 'west-virginia', 'wisconsin',
  'wyoming',
]);

// How many non-blog pages to surface per digest table.
const NON_BLOG_DIGEST_TOP_N = 20;

// TUNE: single-token brand only. Multi-token brand filter (e.g., 'veteran',
// 'pcs') would shred legitimate suggestions like "pcs checklist" or "va loans".
const BRAND_TERMS = ['veteranpcs'];

// Signal thresholds.
const DECAY_MIN_CURRENT_CLICKS = 25;
const DECAY_MIN_PRIOR_CLICKS = 40;
const DECAY_PCT_THRESHOLD = -0.10;
const HIGH_IMPR_THRESHOLD = 500;
const LOW_CTR_THRESHOLD = 0.02;
const POSITION_BAND = [5, 15];
const JACCARD_MISMATCH_THRESHOLD = 0.15;

// ---- Args + env -------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));

if (!process.env.GSC_SERVICE_ACCOUNT_CREDENTIALS) {
  console.error('Missing env var: GSC_SERVICE_ACCOUNT_CREDENTIALS');
  process.exit(1);
}
if (!process.env.GSC_SITE_URL) {
  console.error('Missing env var: GSC_SITE_URL');
  process.exit(1);
}

const SITE_URL = process.env.GSC_SITE_URL;

function parseArgs(argv) {
  const out = {
    window: DEFAULT_WINDOW_DAYS,
    strict: false,
    listSites: false,
    slug: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--strict') out.strict = true;
    else if (a === '--list-sites') out.listSites = true;
    else if (a === '--window') {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n < 1) {
        console.error(`Invalid --window value: ${argv[i]}`);
        process.exit(1);
      }
      out.window = n;
    } else if (a === '--slug') {
      out.slug = argv[++i];
      if (!out.slug) {
        console.error('--slug requires a value');
        process.exit(1);
      }
    } else {
      console.error(`Unknown argument: ${a}`);
      process.exit(1);
    }
  }
  return out;
}

// ---- Auth -------------------------------------------------------------------

let cachedAuth = null;
function getAuthClient() {
  if (cachedAuth) return cachedAuth;
  const decoded = Buffer.from(
    process.env.GSC_SERVICE_ACCOUNT_CREDENTIALS,
    'base64',
  ).toString('utf-8');
  const sa = JSON.parse(decoded);
  cachedAuth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  return cachedAuth;
}

async function listAccessibleSites(auth) {
  const sc = google.searchconsole({ version: 'v1', auth });
  const res = await sc.sites.list();
  return (res.data.siteEntry ?? []).map((s) => ({
    siteUrl: s.siteUrl,
    permissionLevel: s.permissionLevel,
  }));
}

async function assertSiteAccess(auth, siteUrl) {
  const sites = await listAccessibleSites(auth);
  const match = sites.find((s) => s.siteUrl === siteUrl);
  if (!match) {
    const sa = JSON.parse(
      Buffer.from(process.env.GSC_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8'),
    );
    const verified = sites.map((s) => `${s.siteUrl} (${s.permissionLevel})`);
    console.error(
      `GSC_SITE_URL=${siteUrl} not accessible to SA ${sa.client_email}. ` +
        `Verified properties: [${verified.join(', ') || 'none'}]. ` +
        `Update the GHA secret or .env.local to one of those.`,
    );
    process.exit(1);
  }
}

// ---- Fetch ------------------------------------------------------------------

async function fetchPerformance(auth, siteUrl, startDate, endDate) {
  const sc = google.searchconsole({ version: 'v1', auth });
  const allRows = [];
  let startRow = 0;
  while (true) {
    const res = await sc.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page', 'query'],
        rowLimit: ROW_LIMIT,
        startRow,
        dataState: 'final',
      },
    });
    const rows = res.data.rows ?? [];
    allRows.push(...rows);
    if (rows.length < ROW_LIMIT) break;
    if (allRows.length >= MAX_TOTAL_ROWS) {
      console.error(
        `WARN: hit MAX_TOTAL_ROWS=${MAX_TOTAL_ROWS} for ${startDate}..${endDate}; truncating.`,
      );
      break;
    }
    startRow += ROW_LIMIT;
  }
  return allRows;
}

// ---- URL + slug normalization ----------------------------------------------

function normalizeUrl(rawUrl) {
  let path;
  try {
    path = new URL(rawUrl).pathname;
  } catch {
    return null;
  }
  for (const prefix of LEGACY_BLOG_PREFIXES) {
    if (path.startsWith(prefix)) {
      const slug = path.split('/').filter(Boolean).pop();
      return slug ? `/blog/${slug}` : null;
    }
  }
  return path.replace(/\/$/, '');
}

function extractSlug(path) {
  if (!path || !path.startsWith('/blog/')) return null;
  const rest = path.slice('/blog/'.length);
  if (!rest || rest.includes('/')) return null;
  return rest;
}

// Bucket non-blog paths so the digest + GA4 join can group them. Returns null
// for blog paths (handled separately by extractSlug). Empty string is the
// normalized homepage form (normalizeUrl strips trailing slash).
function bucketNonBlogPath(path) {
  if (path === null || path === undefined) return null;
  if (path === '' || path === '/') return 'homepage';
  if (path.startsWith('/blog/')) return null;
  const firstSegment = path.slice(1).split('/')[0];
  if (STATE_SLUGS.has(firstSegment) && !path.slice(1).includes('/')) return 'state';
  if (firstSegment === 'agents') return 'agent-profile';
  if (firstSegment === 'lenders') return 'lender-profile';
  return 'other';
}

// ---- Frontmatter loader -----------------------------------------------------

function loadFrontmatter() {
  const dir = join(ROOT, 'content', 'blog');
  if (!existsSync(dir)) return new Map();
  const map = new Map();
  for (const filename of readdirSync(dir)) {
    if (!filename.endsWith('.mdx')) continue;
    const raw = readFileSync(join(dir, filename), 'utf-8');
    const { data } = matter(raw);
    const slug = data?.slug;
    if (!slug) continue;
    map.set(slug, {
      primaryKeyword: data.primaryKeyword ?? null,
      secondaryKeywords: Array.isArray(data.secondaryKeywords) ? data.secondaryKeywords : [],
      title: data.title ?? null,
    });
  }
  return map;
}

// ---- Tokenization + Jaccard -------------------------------------------------

function tokenize(s) {
  return new Set(
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function jaccardScore(a, b) {
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.size === 0 || B.size === 0) return 0;
  const inter = [...A].filter((t) => B.has(t)).length;
  const union = new Set([...A, ...B]).size;
  return union ? inter / union : 0;
}

function isBrandQuery(query) {
  const tokens = [...tokenize(query)];
  if (tokens.length === 0) return false;
  const brandHits = tokens.filter((t) => BRAND_TERMS.includes(t)).length;
  return brandHits / tokens.length >= 0.5;
}

// ---- Aggregation ------------------------------------------------------------

function buildSlugMap(rawRows, droppedCounter) {
  // slug -> { totals, queries: Map<query, totals> }
  const out = new Map();
  for (const row of rawRows) {
    const [pageUrl, query] = row.keys ?? [];
    const normalized = normalizeUrl(pageUrl);
    const slug = extractSlug(normalized);
    if (!slug) {
      droppedCounter.count += 1;
      continue;
    }
    let entry = out.get(slug);
    if (!entry) {
      entry = {
        clicks: 0,
        impressions: 0,
        positionWeighted: 0,
        queries: new Map(),
      };
      out.set(slug, entry);
    }
    const clicks = row.clicks ?? 0;
    const impressions = row.impressions ?? 0;
    const position = row.position ?? 0;
    entry.clicks += clicks;
    entry.impressions += impressions;
    entry.positionWeighted += position * impressions;
    let q = entry.queries.get(query);
    if (!q) {
      q = { query, clicks: 0, impressions: 0, positionWeighted: 0 };
      entry.queries.set(query, q);
    }
    q.clicks += clicks;
    q.impressions += impressions;
    q.positionWeighted += position * impressions;
  }
  return out;
}

// Aggregate non-blog pages (homepage, /<state>, agent/lender profiles, other
// landing pages). Mirrors buildSlugMap but keys by full normalized path and
// records bucket on the entry.
function buildNonBlogPageMap(rawRows) {
  const out = new Map();
  for (const row of rawRows) {
    const [pageUrl, query] = row.keys ?? [];
    const normalized = normalizeUrl(pageUrl);
    if (normalized === null) continue;
    if (extractSlug(normalized)) continue;
    const bucket = bucketNonBlogPath(normalized);
    if (!bucket) continue;
    const path = normalized || '/';
    let entry = out.get(path);
    if (!entry) {
      entry = {
        path,
        bucket,
        clicks: 0,
        impressions: 0,
        positionWeighted: 0,
        queries: new Map(),
      };
      out.set(path, entry);
    }
    const clicks = row.clicks ?? 0;
    const impressions = row.impressions ?? 0;
    const position = row.position ?? 0;
    entry.clicks += clicks;
    entry.impressions += impressions;
    entry.positionWeighted += position * impressions;
    let q = entry.queries.get(query);
    if (!q) {
      q = { query, clicks: 0, impressions: 0, positionWeighted: 0 };
      entry.queries.set(query, q);
    }
    q.clicks += clicks;
    q.impressions += impressions;
    q.positionWeighted += position * impressions;
  }
  return out;
}

function summarizeSlugEntry(entry) {
  if (!entry) {
    return { clicks: 0, impressions: 0, ctr: 0, position: 0, topQueries: [] };
  }
  const ctr = entry.impressions > 0 ? entry.clicks / entry.impressions : 0;
  const position = entry.impressions > 0 ? entry.positionWeighted / entry.impressions : 0;
  const topQueries = [...entry.queries.values()]
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, TOP_QUERIES_PER_POST)
    .map((q) => ({
      query: q.query,
      clicks: q.clicks,
      impressions: q.impressions,
      ctr: q.impressions > 0 ? q.clicks / q.impressions : 0,
      position: q.impressions > 0 ? q.positionWeighted / q.impressions : 0,
    }));
  return { clicks: entry.clicks, impressions: entry.impressions, ctr, position, topQueries };
}

// ---- Classification ---------------------------------------------------------

function classifyPost(slug, current, prior, frontmatter) {
  const fm = frontmatter ?? { primaryKeyword: null, secondaryKeywords: [] };
  const signals = [];

  const clicksDelta = current.clicks - prior.clicks;
  const clicksPctChange = prior.clicks > 0 ? clicksDelta / prior.clicks : null;
  const isDecaying =
    current.clicks > DECAY_MIN_CURRENT_CLICKS &&
    prior.clicks > DECAY_MIN_PRIOR_CLICKS &&
    clicksPctChange !== null &&
    clicksPctChange < DECAY_PCT_THRESHOLD;
  if (isDecaying) signals.push('decaying');

  if (
    current.impressions > HIGH_IMPR_THRESHOLD &&
    current.ctr < LOW_CTR_THRESHOLD &&
    current.position >= POSITION_BAND[0] &&
    current.position <= POSITION_BAND[1]
  ) {
    signals.push('high-impression-low-ctr');
  }

  let topQueryVsPrimary = null;
  let bestJaccard = null;
  let isMismatch = false;
  // Mismatch signal only runs against queries with real engagement. We drop:
  //   * 0-click rows — usually off-topic GSC spam
  //   * very long queries — document-paste / prompt-shaped strings, not searches
  const MAX_QUERY_LEN_FOR_MATCH = 80;
  const engagedQueries = current.topQueries.filter(
    (q) => q.clicks > 0 && q.query.length <= MAX_QUERY_LEN_FOR_MATCH,
  );
  if (fm.primaryKeyword && engagedQueries.length > 0) {
    const candidates = [fm.primaryKeyword, ...(fm.secondaryKeywords ?? [])];
    let best = 0;
    for (const q of engagedQueries) {
      for (const k of candidates) {
        const score = jaccardScore(q.query, k);
        if (score > best) best = score;
      }
    }
    bestJaccard = best;
    topQueryVsPrimary = jaccardScore(engagedQueries[0].query, fm.primaryKeyword);
    isMismatch = best < JACCARD_MISMATCH_THRESHOLD;
    if (isMismatch) signals.push('keyword-mismatch');
  }

  if (!fm.primaryKeyword && current.clicks > 0) signals.push('no-keyword');

  let keywordSuggestions = [];
  if (!fm.primaryKeyword) {
    keywordSuggestions = current.topQueries
      .filter((q) => !isBrandQuery(q.query))
      .slice(0, KEYWORD_SUGGESTIONS_PER_POST)
      .map((q) => q.query);
  }

  return {
    slug,
    url: `/blog/${slug}`,
    primaryKeyword: fm.primaryKeyword,
    secondaryKeywords: fm.secondaryKeywords ?? [],
    current,
    prior,
    decay: { clicksDelta, clicksPctChange, isDecaying },
    signals,
    keywordMatch: { topQueryVsPrimary, jaccardScore: bestJaccard, isMismatch },
    keywordSuggestions,
  };
}

// Non-blog pages don't carry primaryKeyword — only decay and high-impr/low-CTR
// signals apply. Output shape matches blog posts where possible so the GA4
// join can read both with one accessor.
function classifyNonBlogPage(path, bucket, current, prior) {
  const signals = [];

  const clicksDelta = current.clicks - prior.clicks;
  const clicksPctChange = prior.clicks > 0 ? clicksDelta / prior.clicks : null;
  const isDecaying =
    current.clicks > DECAY_MIN_CURRENT_CLICKS &&
    prior.clicks > DECAY_MIN_PRIOR_CLICKS &&
    clicksPctChange !== null &&
    clicksPctChange < DECAY_PCT_THRESHOLD;
  if (isDecaying) signals.push('decaying');

  if (
    current.impressions > HIGH_IMPR_THRESHOLD &&
    current.ctr < LOW_CTR_THRESHOLD &&
    current.position >= POSITION_BAND[0] &&
    current.position <= POSITION_BAND[1]
  ) {
    signals.push('high-impression-low-ctr');
  }

  return {
    path,
    bucket,
    current,
    prior,
    decay: { clicksDelta, clicksPctChange, isDecaying },
    signals,
  };
}

// ---- Date helpers -----------------------------------------------------------

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function addDaysUTC(base, days) {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function computeWindows(windowDays, now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const currentEnd = addDaysUTC(today, -GSC_LAG_DAYS);
  const currentStart = addDaysUTC(currentEnd, -(windowDays - 1));
  const priorEnd = addDaysUTC(currentStart, -1);
  const priorStart = addDaysUTC(priorEnd, -(windowDays - 1));
  return {
    current: { start: isoDate(currentStart), end: isoDate(currentEnd) },
    prior: { start: isoDate(priorStart), end: isoDate(priorEnd) },
  };
}

// ---- Markdown digest --------------------------------------------------------

function fmtPct(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}
function fmtNum(n) {
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}
function fmtPos(n) {
  return Number.isFinite(n) && n > 0 ? n.toFixed(1) : '—';
}

function renderMarkdown(report) {
  const lines = [];
  lines.push(`# GSC Performance Ingest — ${report.generatedAt.slice(0, 10)}`);
  lines.push('');
  lines.push(`- Site: \`${report.siteUrl}\``);
  lines.push(`- Window: ${report.windowDays} days`);
  lines.push(`- Current: ${report.currentWindow.start} → ${report.currentWindow.end}`);
  lines.push(`- Prior:   ${report.priorWindow.start} → ${report.priorWindow.end}`);
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|---|---:|');
  lines.push(`| Posts with current-window data | ${report.summary.postsWithData} |`);
  lines.push(`| Posts without data | ${report.summary.postsWithoutData} |`);
  lines.push(`| Decaying | ${report.summary.decaying} |`);
  lines.push(`| High-impression / low-CTR | ${report.summary.highImpressionLowCtr} |`);
  lines.push(`| Keyword mismatch | ${report.summary.keywordMismatch} |`);
  lines.push(`| Untagged with traffic | ${report.summary.noKeywordTagged} |`);
  lines.push(`| Non-blog pages with data | ${report.summary.nonBlogPagesWithData ?? 0} |`);
  lines.push(`| Non-blog decaying | ${report.summary.nonBlogDecaying ?? 0} |`);
  lines.push(`| Non-blog high-impr / low-CTR | ${report.summary.nonBlogHighImpressionLowCtr ?? 0} |`);
  lines.push('');

  const decaying = report.posts.filter((p) => p.signals.includes('decaying'));
  lines.push(`## Decaying Posts (${decaying.length})`);
  lines.push('');
  if (decaying.length === 0) {
    lines.push('_None._');
  } else {
    lines.push('| Slug | Current Clicks | % Change | Top Query |');
    lines.push('|---|---:|---:|---|');
    for (const p of decaying.sort((a, b) => a.decay.clicksPctChange - b.decay.clicksPctChange)) {
      const top = p.current.topQueries[0]?.query ?? '—';
      lines.push(`| \`${p.slug}\` | ${fmtNum(p.current.clicks)} | ${fmtPct(p.decay.clicksPctChange)} | ${top} |`);
    }
  }
  lines.push('');

  const lowCtr = report.posts.filter((p) => p.signals.includes('high-impression-low-ctr'));
  lines.push(`## High Impression / Low CTR (${lowCtr.length})`);
  lines.push('');
  if (lowCtr.length === 0) {
    lines.push('_None._');
  } else {
    lines.push('| Slug | Impressions | CTR | Avg Position | Top Query |');
    lines.push('|---|---:|---:|---:|---|');
    for (const p of lowCtr.sort((a, b) => b.current.impressions - a.current.impressions)) {
      const top = p.current.topQueries[0]?.query ?? '—';
      lines.push(
        `| \`${p.slug}\` | ${fmtNum(p.current.impressions)} | ${fmtPct(p.current.ctr)} | ${fmtPos(p.current.position)} | ${top} |`,
      );
    }
  }
  lines.push('');

  const mismatch = report.posts.filter((p) => p.signals.includes('keyword-mismatch'));
  lines.push(`## Keyword Mismatch (${mismatch.length})`);
  lines.push('');
  if (mismatch.length === 0) {
    lines.push('_None._');
  } else {
    lines.push('| Slug | Primary Keyword | Top Queries | Max Jaccard |');
    lines.push('|---|---|---|---:|');
    for (const p of mismatch.sort((a, b) => (a.keywordMatch.jaccardScore ?? 0) - (b.keywordMatch.jaccardScore ?? 0))) {
      const top3 = p.current.topQueries.slice(0, 3).map((q) => q.query).join(' · ') || '—';
      const j = p.keywordMatch.jaccardScore;
      lines.push(`| \`${p.slug}\` | ${p.primaryKeyword} | ${top3} | ${j === null ? '—' : j.toFixed(2)} |`);
    }
  }
  lines.push('');

  const untagged = report.posts
    .filter((p) => p.signals.includes('no-keyword') && p.keywordSuggestions.length > 0)
    .sort((a, b) => b.current.impressions - a.current.impressions)
    .slice(0, SUGGESTION_DIGEST_LIMIT);
  lines.push(`## Keyword Suggestions — Top ${SUGGESTION_DIGEST_LIMIT} Untagged by Impressions (${untagged.length})`);
  lines.push('');
  if (untagged.length === 0) {
    lines.push('_None._');
  } else {
    lines.push('| Slug | Impressions | Clicks | Suggested Queries |');
    lines.push('|---|---:|---:|---|');
    for (const p of untagged) {
      lines.push(
        `| \`${p.slug}\` | ${fmtNum(p.current.impressions)} | ${fmtNum(p.current.clicks)} | ${p.keywordSuggestions.join(' · ')} |`,
      );
    }
  }
  lines.push('');

  const nonBlog = report.nonBlogPages ?? [];
  lines.push(`## Non-Blog Page Performance (${nonBlog.length})`);
  lines.push('');
  if (nonBlog.length === 0) {
    lines.push('_None._');
  } else {
    const topByImpressions = [...nonBlog]
      .sort((a, b) => b.current.impressions - a.current.impressions)
      .slice(0, NON_BLOG_DIGEST_TOP_N);
    lines.push(`### Top ${topByImpressions.length} by Impressions`);
    lines.push('');
    lines.push('| Path | Bucket | Impressions | Clicks | CTR | Avg Position | Top Query |');
    lines.push('|---|---|---:|---:|---:|---:|---|');
    for (const p of topByImpressions) {
      const top = p.current.topQueries[0]?.query ?? '—';
      lines.push(
        `| \`${p.path}\` | ${p.bucket} | ${fmtNum(p.current.impressions)} | ${fmtNum(p.current.clicks)} | ${fmtPct(p.current.ctr)} | ${fmtPos(p.current.position)} | ${top} |`,
      );
    }
    lines.push('');

    const nonBlogDecaying = nonBlog.filter((p) => p.signals.includes('decaying'));
    lines.push(`### Decaying Non-Blog Pages (${nonBlogDecaying.length})`);
    lines.push('');
    if (nonBlogDecaying.length === 0) {
      lines.push('_None._');
    } else {
      lines.push('| Path | Bucket | Current Clicks | % Change | Top Query |');
      lines.push('|---|---|---:|---:|---|');
      for (const p of nonBlogDecaying.sort((a, b) => a.decay.clicksPctChange - b.decay.clicksPctChange)) {
        const top = p.current.topQueries[0]?.query ?? '—';
        lines.push(
          `| \`${p.path}\` | ${p.bucket} | ${fmtNum(p.current.clicks)} | ${fmtPct(p.decay.clicksPctChange)} | ${top} |`,
        );
      }
    }
    lines.push('');

    const nonBlogLowCtr = nonBlog.filter((p) => p.signals.includes('high-impression-low-ctr'));
    lines.push(`### Non-Blog High Impression / Low CTR (${nonBlogLowCtr.length})`);
    lines.push('');
    if (nonBlogLowCtr.length === 0) {
      lines.push('_None._');
    } else {
      lines.push('| Path | Bucket | Impressions | CTR | Avg Position | Top Query |');
      lines.push('|---|---|---:|---:|---:|---|');
      for (const p of nonBlogLowCtr.sort((a, b) => b.current.impressions - a.current.impressions)) {
        const top = p.current.topQueries[0]?.query ?? '—';
        lines.push(
          `| \`${p.path}\` | ${p.bucket} | ${fmtNum(p.current.impressions)} | ${fmtPct(p.current.ctr)} | ${fmtPos(p.current.position)} | ${top} |`,
        );
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---- Main -------------------------------------------------------------------

async function main() {
  const auth = getAuthClient();

  if (args.listSites) {
    const sites = await listAccessibleSites(auth);
    if (sites.length === 0) {
      console.error('No accessible sites for this service account.');
      process.exit(1);
    }
    for (const s of sites) console.log(`${s.siteUrl}\t${s.permissionLevel}`);
    return;
  }

  await assertSiteAccess(auth, SITE_URL);

  const windows = computeWindows(args.window);
  console.log(`Fetching current ${windows.current.start}..${windows.current.end}`);
  const currentRaw = await fetchPerformance(auth, SITE_URL, windows.current.start, windows.current.end);
  console.log(`  rows: ${currentRaw.length}`);
  console.log(`Fetching prior   ${windows.prior.start}..${windows.prior.end}`);
  const priorRaw = await fetchPerformance(auth, SITE_URL, windows.prior.start, windows.prior.end);
  console.log(`  rows: ${priorRaw.length}`);

  const RAW_DIR = join(ROOT, 'docs', 'blog-migration', 'raw');
  const REPORT_DIR = join(ROOT, 'docs', 'blog-migration');
  const REGISTRY_DIR = join(ROOT, 'content', '_registry');
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(REPORT_DIR, { recursive: true });
  mkdirSync(REGISTRY_DIR, { recursive: true });

  const generatedAt = new Date().toISOString();
  writeFileSync(
    join(RAW_DIR, `gsc-performance-${generatedAt.replace(/[:.]/g, '-')}.json`),
    JSON.stringify({ current: currentRaw, prior: priorRaw }, null, 2),
  );

  const dropped = { count: 0 };
  const currentMap = buildSlugMap(currentRaw, dropped);
  const priorMap = buildSlugMap(priorRaw, dropped);
  if (dropped.count > 0) {
    console.log(`Note: ${dropped.count} non-blog rows captured by parallel non-blog pipeline.`);
  }

  const currentNonBlog = buildNonBlogPageMap(currentRaw);
  const priorNonBlog = buildNonBlogPageMap(priorRaw);

  const frontmatter = loadFrontmatter();

  const slugUniverse = new Set([
    ...frontmatter.keys(),
    ...currentMap.keys(),
    ...priorMap.keys(),
  ]);
  const slugList = args.slug
    ? [...slugUniverse].filter((s) => s === args.slug)
    : [...slugUniverse];
  if (args.slug && slugList.length === 0) {
    console.error(`--slug ${args.slug} not found in MDX or GSC data.`);
    process.exit(1);
  }

  const posts = [];
  const postsWithoutData = [];
  for (const slug of slugList.sort()) {
    const cEntry = currentMap.get(slug);
    const pEntry = priorMap.get(slug);
    if (!cEntry && !pEntry) {
      postsWithoutData.push(slug);
      continue;
    }
    const current = summarizeSlugEntry(cEntry);
    const prior = summarizeSlugEntry(pEntry);
    posts.push(classifyPost(slug, current, prior, frontmatter.get(slug)));
  }

  const nonBlogPages = [];
  if (!args.slug) {
    const pathUniverse = new Set([
      ...currentNonBlog.keys(),
      ...priorNonBlog.keys(),
    ]);
    for (const path of [...pathUniverse].sort()) {
      const cEntry = currentNonBlog.get(path);
      const pEntry = priorNonBlog.get(path);
      const bucket = (cEntry ?? pEntry)?.bucket ?? bucketNonBlogPath(path);
      if (!bucket) continue;
      const current = summarizeSlugEntry(cEntry);
      const prior = summarizeSlugEntry(pEntry);
      nonBlogPages.push(classifyNonBlogPage(path, bucket, current, prior));
    }
  }

  const summary = {
    postsWithData: posts.length,
    postsWithoutData: postsWithoutData.length,
    decaying: posts.filter((p) => p.signals.includes('decaying')).length,
    highImpressionLowCtr: posts.filter((p) => p.signals.includes('high-impression-low-ctr')).length,
    keywordMismatch: posts.filter((p) => p.signals.includes('keyword-mismatch')).length,
    noKeywordTagged: posts.filter((p) => p.signals.includes('no-keyword')).length,
    nonBlogPagesWithData: nonBlogPages.length,
    nonBlogDecaying: nonBlogPages.filter((p) => p.signals.includes('decaying')).length,
    nonBlogHighImpressionLowCtr: nonBlogPages.filter((p) => p.signals.includes('high-impression-low-ctr')).length,
  };

  const report = {
    generatedAt,
    windowDays: args.window,
    currentWindow: windows.current,
    priorWindow: windows.prior,
    siteUrl: SITE_URL,
    summary,
    posts,
    postsWithoutData,
    nonBlogPages,
  };

  writeFileSync(
    join(REGISTRY_DIR, 'gsc-performance.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  const dateStamp = generatedAt.slice(0, 10);
  const mdPath = join(REPORT_DIR, `gsc-performance-${dateStamp}.md`);
  writeFileSync(mdPath, renderMarkdown(report));

  console.log('');
  console.log(`Posts with data:    ${summary.postsWithData}`);
  console.log(`Posts without data: ${summary.postsWithoutData}`);
  console.log(`Decaying:           ${summary.decaying}`);
  console.log(`High-impr/low-CTR:  ${summary.highImpressionLowCtr}`);
  console.log(`Keyword mismatch:   ${summary.keywordMismatch}`);
  console.log(`Untagged w/ clicks: ${summary.noKeywordTagged}`);
  console.log(`Non-blog pages:     ${summary.nonBlogPagesWithData}`);
  console.log(`Non-blog decaying:  ${summary.nonBlogDecaying}`);
  console.log(`Non-blog low-CTR:   ${summary.nonBlogHighImpressionLowCtr}`);
  console.log(`Digest:   ${mdPath}`);
  console.log(`Registry: ${join(REGISTRY_DIR, 'gsc-performance.json')}`);

  if (args.strict) {
    const failing = summary.decaying + summary.keywordMismatch;
    if (failing > 0) {
      console.error(`--strict: ${failing} post(s) flagged decaying or keyword-mismatch.`);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
