#!/usr/bin/env node
// GA4 conversion-attribution ingest. Joins the existing GSC registry against
// per-landing-page conversion data from the GA4 Data API to answer:
//   1. Which pages do users land on? (entry-page distribution)
//   2. Which landing pages produce conversions? (and at what rate)
//   3. Which channels drive sessions and conversions? (branded vs non-branded organic)
//   4. Which Google queries actually drive conversions? (via GSC join on slug)
//   5. Direct vs multi-step conversion paths.
//
// Run:
//   node --env-file=.env.local scripts/ingest-ga4-performance.mjs \
//     [--window 730] [--top-landing-pages 20] [--strict] [--slug X] [--dry-run]
//
// Outputs:
//   content/_registry/ga4-performance.json                 (committed)
//   docs/blog-migration/ga4-performance-{YYYY-MM-DD}.md    (committed)
//   docs/blog-migration/raw/ga4-performance-{ISO}.json     (gitignored)

import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '..');

// ---- Tunables ---------------------------------------------------------------

const DEFAULT_WINDOW_DAYS = 730;          // 2 years per user request
const GA4_DATA_LAG_DAYS = 2;              // GA4 typically processes 24-48h behind
const TOP_LANDING_PAGES_DEFAULT = 20;     // R3 path-analysis fan-out
const QUARTER_DAYS = 91;                  // ~ 1 quarter for time-bucketing
const HIGH_CONVERSION_RATE_MULT = 2;      // signal: CR > overall × 2
const FUNNEL_LEAK_MIN_SESSIONS = 50;      // signal: high traffic, zero conversions
const REPORT_LIMIT = 10_000;              // per-request row cap (default; max 250k)
const R3_THROTTLE_MS = 200;               // sleep between R3 calls
const TOP_QUERIES_FROM_GSC = 5;
const BRAND_TERMS = ['veteranpcs'];

// Conversion events we care about. Order matters in output digests.
const CONVERSION_EVENTS = ['conversion_contact_agent', 'conversion_contact_lender'];

// State slug list mirrored from lib/states.ts. Used to bucket entry-page
// distribution. Kept in sync with the GSC ingest script.
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

// ---- Args + env -------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));

if (!process.env.GA4_PROPERTY_ID) {
  console.error('Missing env var: GA4_PROPERTY_ID');
  process.exit(1);
}
const GA4_CREDS_B64 =
  process.env.GA4_SERVICE_ACCOUNT_CREDENTIALS ||
  process.env.GSC_SERVICE_ACCOUNT_CREDENTIALS;
if (!GA4_CREDS_B64) {
  console.error(
    'Missing env var: GA4_SERVICE_ACCOUNT_CREDENTIALS (or GSC_SERVICE_ACCOUNT_CREDENTIALS as fallback)',
  );
  process.exit(1);
}

const PROPERTY_ID = String(process.env.GA4_PROPERTY_ID);

function parseArgs(argv) {
  const out = {
    window: DEFAULT_WINDOW_DAYS,
    topLandingPages: TOP_LANDING_PAGES_DEFAULT,
    strict: false,
    slug: null,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--strict') out.strict = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--window') {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n < 1) {
        console.error(`Invalid --window value: ${argv[i]}`);
        process.exit(1);
      }
      out.window = n;
    } else if (a === '--top-landing-pages') {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n < 0) {
        console.error(`Invalid --top-landing-pages value: ${argv[i]}`);
        process.exit(1);
      }
      out.topLandingPages = n;
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

let cachedClient = null;
function getClient() {
  if (cachedClient) return cachedClient;
  const credentials = JSON.parse(
    Buffer.from(GA4_CREDS_B64, 'base64').toString('utf-8'),
  );
  cachedClient = new BetaAnalyticsDataClient({ credentials });
  return cachedClient;
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
function computeWindow(windowDays, now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = addDaysUTC(today, -GA4_DATA_LAG_DAYS);
  const start = addDaysUTC(end, -(windowDays - 1));
  return { start: isoDate(start), end: isoDate(end) };
}
// Split [start, end] into ~91-day chunks. Returns most-recent-first.
function computeQuarterChunks(window) {
  const out = [];
  const startD = new Date(`${window.start}T00:00:00Z`);
  const endD = new Date(`${window.end}T00:00:00Z`);
  let cursor = endD;
  let i = 0;
  while (cursor.getTime() >= startD.getTime()) {
    const chunkEnd = cursor;
    const chunkStart = addDaysUTC(cursor, -(QUARTER_DAYS - 1));
    const clampedStart = chunkStart.getTime() < startD.getTime() ? startD : chunkStart;
    out.push({
      label: `Q${++i}`,
      start: isoDate(clampedStart),
      end: isoDate(chunkEnd),
    });
    cursor = addDaysUTC(clampedStart, -1);
  }
  // Reorder oldest → newest for trend rendering.
  return out.reverse().map((c, idx) => ({ ...c, label: `Q${idx + 1}` }));
}

// ---- Path helpers -----------------------------------------------------------

function normalizeLandingPath(raw) {
  if (raw === null || raw === undefined) return null;
  const stripped = String(raw).split('?')[0];
  const noTrailing = stripped.replace(/\/$/, '');
  return noTrailing === '' ? '/' : noTrailing;
}
function bucketPath(path) {
  if (!path) return 'other';
  if (path === '/') return 'homepage';
  if (path.startsWith('/blog/')) return 'blog';
  const firstSegment = path.slice(1).split('/')[0];
  if (STATE_SLUGS.has(firstSegment) && !path.slice(1).includes('/')) return 'state';
  if (firstSegment === 'agents') return 'agent-profile';
  if (firstSegment === 'lenders') return 'lender-profile';
  if (firstSegment === 'contact-agent' || firstSegment === 'contact-lender') return 'contact-form';
  return 'other';
}
function blogSlugFromPath(path) {
  if (!path || !path.startsWith('/blog/')) return null;
  const rest = path.slice('/blog/'.length);
  if (!rest || rest.includes('/')) return null;
  return rest;
}
function tokenize(s) {
  return new Set(
    String(s ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}
function isBrandQuery(query) {
  const tokens = [...tokenize(query)];
  if (tokens.length === 0) return false;
  const brandHits = tokens.filter((t) => BRAND_TERMS.includes(t)).length;
  return brandHits / tokens.length >= 0.5;
}

// ---- API report helpers -----------------------------------------------------

function rowsToObjects(response) {
  const dimNames = (response?.dimensionHeaders ?? []).map((h) => h.name);
  const metricNames = (response?.metricHeaders ?? []).map((h) => h.name);
  return (response?.rows ?? []).map((row) => {
    const obj = {};
    (row.dimensionValues ?? []).forEach((dv, i) => {
      obj[dimNames[i]] = dv.value ?? '';
    });
    (row.metricValues ?? []).forEach((mv, i) => {
      const v = Number(mv.value ?? 0);
      obj[metricNames[i]] = Number.isFinite(v) ? v : 0;
    });
    return obj;
  });
}

async function runReportPaginated(client, request) {
  const property = `properties/${PROPERTY_ID}`;
  const all = [];
  let offset = 0;
  while (true) {
    const [resp] = await client.runReport({
      ...request,
      property,
      limit: REPORT_LIMIT,
      offset,
    });
    const rows = rowsToObjects(resp);
    all.push(...rows);
    const total = Number(resp.rowCount ?? rows.length);
    offset += rows.length;
    if (rows.length < REPORT_LIMIT) break;
    if (offset >= total) break;
    if (offset > 250_000) {
      console.error(`WARN: paginated past 250k rows; truncating.`);
      break;
    }
  }
  return all;
}

function eventNameFilter(eventName) {
  return {
    filter: {
      fieldName: 'eventName',
      stringFilter: { matchType: 'EXACT', value: eventName },
    },
  };
}

// ---- Reports ----------------------------------------------------------------

async function fetchChunkReports(client, chunk) {
  const dateRanges = [{ startDate: chunk.start, endDate: chunk.end }];

  // R1 — landing page × channel: sessions, engagedSessions, keyEvents
  const r1 = runReportPaginated(client, {
    dateRanges,
    dimensions: [
      { name: 'landingPagePlusQueryString' },
      { name: 'sessionDefaultChannelGroup' },
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'engagedSessions' },
      { name: 'keyEvents' },
    ],
  });

  // R1a / R1b — eventCount filtered per conversion event
  const r1a = runReportPaginated(client, {
    dateRanges,
    dimensions: [
      { name: 'landingPagePlusQueryString' },
      { name: 'sessionDefaultChannelGroup' },
    ],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: eventNameFilter('conversion_contact_agent'),
  });
  const r1b = runReportPaginated(client, {
    dateRanges,
    dimensions: [
      { name: 'landingPagePlusQueryString' },
      { name: 'sessionDefaultChannelGroup' },
    ],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: eventNameFilter('conversion_contact_lender'),
  });

  // R2 — channel/source/medium attribution
  const r2 = runReportPaginated(client, {
    dateRanges,
    dimensions: [
      { name: 'sessionSource' },
      { name: 'sessionMedium' },
      { name: 'sessionDefaultChannelGroup' },
    ],
    metrics: [{ name: 'sessions' }, { name: 'keyEvents' }],
  });
  const r2a = runReportPaginated(client, {
    dateRanges,
    dimensions: [
      { name: 'sessionSource' },
      { name: 'sessionMedium' },
      { name: 'sessionDefaultChannelGroup' },
    ],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: eventNameFilter('conversion_contact_agent'),
  });
  const r2b = runReportPaginated(client, {
    dateRanges,
    dimensions: [
      { name: 'sessionSource' },
      { name: 'sessionMedium' },
      { name: 'sessionDefaultChannelGroup' },
    ],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: eventNameFilter('conversion_contact_lender'),
  });

  // R4 — referrer (covers 2 dimensions; usually small)
  const r4 = runReportPaginated(client, {
    dateRanges,
    dimensions: [
      { name: 'pageReferrer' },
      { name: 'landingPagePlusQueryString' },
    ],
    metrics: [{ name: 'sessions' }, { name: 'keyEvents' }],
  });

  const [R1, R1a, R1b, R2, R2a, R2b, R4] = await Promise.all([r1, r1a, r1b, r2, r2a, r2b, r4]);
  return { chunk, R1, R1a, R1b, R2, R2a, R2b, R4 };
}

async function fetchPathCoOccurrence(client, window, landingPath) {
  // R3 — for sessions that landed on `landingPath`, what other pages were viewed
  // and where did conversion events fire? GA4 has no sessionId dim by default,
  // so this approximates per-session paths via landingPagePlusQueryString filter.
  return runReportPaginated(client, {
    dateRanges: [{ startDate: window.start, endDate: window.end }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'eventCount' },
    ],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: 'landingPagePlusQueryString',
              stringFilter: { matchType: 'BEGINS_WITH', value: landingPath },
            },
          },
          {
            filter: {
              fieldName: 'eventName',
              inListFilter: {
                values: ['page_view', ...CONVERSION_EVENTS],
              },
            },
          },
        ],
      },
    },
  });
}

// ---- Aggregation ------------------------------------------------------------

function landingKey(path, channelGroup) {
  return `${path} ${channelGroup}`;
}

function buildLandingPageMap(chunkResults) {
  // Map<key, { path, rawPath, channelGroup, totals, quarterly: Map<label, totals> }>
  const map = new Map();
  for (const cr of chunkResults) {
    const { chunk, R1, R1a, R1b } = cr;
    // R1 gives sessions, engagedSessions, keyEvents per (landingPath, channel)
    for (const r of R1) {
      const rawPath = r.landingPagePlusQueryString || '/';
      const path = normalizeLandingPath(rawPath);
      const channelGroup = r.sessionDefaultChannelGroup || '(unassigned)';
      const k = landingKey(path, channelGroup);
      let entry = map.get(k);
      if (!entry) {
        entry = {
          path,
          rawPath,
          channelGroup,
          bucket: bucketPath(path),
          sessions: 0,
          engagedSessions: 0,
          keyEvents: 0,
          conversionsAgent: 0,
          conversionsLender: 0,
          quarterly: new Map(),
        };
        map.set(k, entry);
      }
      entry.sessions += r.sessions;
      entry.engagedSessions += r.engagedSessions;
      entry.keyEvents += r.keyEvents;
      let q = entry.quarterly.get(chunk.label);
      if (!q) {
        q = { quarter: chunk.label, start: chunk.start, end: chunk.end, sessions: 0, conversionsAgent: 0, conversionsLender: 0 };
        entry.quarterly.set(chunk.label, q);
      }
      q.sessions += r.sessions;
    }
    // R1a / R1b: eventCount per (landingPath, channel) — adds conversions
    const accum = (rows, field) => {
      for (const r of rows) {
        const path = normalizeLandingPath(r.landingPagePlusQueryString || '/');
        const channelGroup = r.sessionDefaultChannelGroup || '(unassigned)';
        const k = landingKey(path, channelGroup);
        let entry = map.get(k);
        if (!entry) {
          // Create entry if conversion exists without a matching R1 row (rare,
          // but possible when key-event registration races sessionization).
          entry = {
            path, rawPath: r.landingPagePlusQueryString || '/',
            channelGroup, bucket: bucketPath(path),
            sessions: 0, engagedSessions: 0, keyEvents: 0,
            conversionsAgent: 0, conversionsLender: 0,
            quarterly: new Map(),
          };
          map.set(k, entry);
        }
        entry[field] += r.eventCount;
        let q = entry.quarterly.get(chunk.label);
        if (!q) {
          q = { quarter: chunk.label, start: chunk.start, end: chunk.end, sessions: 0, conversionsAgent: 0, conversionsLender: 0 };
          entry.quarterly.set(chunk.label, q);
        }
        q[field] += r.eventCount;
      }
    };
    accum(R1a, 'conversionsAgent');
    accum(R1b, 'conversionsLender');
  }
  return map;
}

function buildChannelMap(chunkResults) {
  const map = new Map();
  const accum = (rows, field, withSessions, chunk) => {
    for (const r of rows) {
      const k = `${r.sessionSource}|${r.sessionMedium}|${r.sessionDefaultChannelGroup}`;
      let entry = map.get(k);
      if (!entry) {
        entry = {
          source: r.sessionSource,
          medium: r.sessionMedium,
          channelGroup: r.sessionDefaultChannelGroup,
          sessions: 0,
          keyEvents: 0,
          conversionsAgent: 0,
          conversionsLender: 0,
          quarterly: new Map(),
        };
        map.set(k, entry);
      }
      if (withSessions) {
        entry.sessions += r.sessions ?? 0;
        entry.keyEvents += r.keyEvents ?? 0;
      } else {
        entry[field] += r.eventCount ?? 0;
      }
      let q = entry.quarterly.get(chunk.label);
      if (!q) {
        q = { quarter: chunk.label, sessions: 0, conversionsAgent: 0, conversionsLender: 0 };
        entry.quarterly.set(chunk.label, q);
      }
      if (withSessions) q.sessions += r.sessions ?? 0;
      else q[field] += r.eventCount ?? 0;
    }
  };
  for (const cr of chunkResults) {
    accum(cr.R2, null, true, cr.chunk);
    accum(cr.R2a, 'conversionsAgent', false, cr.chunk);
    accum(cr.R2b, 'conversionsLender', false, cr.chunk);
  }
  return map;
}

function buildReferrerMap(chunkResults) {
  const map = new Map();
  for (const cr of chunkResults) {
    for (const r of cr.R4) {
      if (!r.pageReferrer) continue;
      const k = `${r.pageReferrer}|${normalizeLandingPath(r.landingPagePlusQueryString || '/')}`;
      let entry = map.get(k);
      if (!entry) {
        entry = {
          referrer: r.pageReferrer,
          landingPath: normalizeLandingPath(r.landingPagePlusQueryString || '/'),
          sessions: 0,
          keyEvents: 0,
        };
        map.set(k, entry);
      }
      entry.sessions += r.sessions ?? 0;
      entry.keyEvents += r.keyEvents ?? 0;
    }
  }
  return map;
}

// ---- Classification ---------------------------------------------------------

function classifyLandingPage(entry, p90Sessions, overallCR) {
  const signals = [];
  const conversions = entry.conversionsAgent + entry.conversionsLender;
  const cr = entry.sessions > 0 ? conversions / entry.sessions : 0;
  entry.conversionRate = cr;

  if (entry.sessions >= p90Sessions && conversions === 0) {
    signals.push('high-traffic-zero-conversion');
  }
  if (overallCR > 0 && cr > overallCR * HIGH_CONVERSION_RATE_MULT) {
    signals.push('high-conversion-rate');
  }
  if (
    entry.path === '/' &&
    entry.sessions > FUNNEL_LEAK_MIN_SESSIONS &&
    conversions === 0
  ) {
    signals.push('homepage-funnel-leak');
  }
  entry.signals = signals;
  return entry;
}

function classifyConversionPath(landingPath, r3Rows) {
  const conversionPaths = new Set(['/contact-agent', '/contact-lender']);
  const totalConversionEvents = r3Rows
    .filter((r) => CONVERSION_EVENTS.includes(r.eventName) || r.eventCount > 0)
    .reduce((acc, r) => acc + (r.eventCount ?? 0), 0);

  // r3 fetches eventCount across page_view + conversion events on the same
  // pagePath dim. We can't separate event types cleanly without another report;
  // approximate: a row whose pagePath is /contact-* is multi-step territory,
  // a row whose pagePath equals landingPath is direct territory.
  const direct = r3Rows.find((r) => r.pagePath === landingPath && (r.eventCount ?? 0) > 0);
  const multiStep = r3Rows.find((r) => conversionPaths.has(r.pagePath) && (r.eventCount ?? 0) > 0);
  if (multiStep) return 'multi-step';
  if (direct) return 'direct';
  if (totalConversionEvents === 0) return 'no-conversion';
  return 'unknown';
}

// ---- GSC join ---------------------------------------------------------------

function loadGscRegistry() {
  const p = join(ROOT, 'content', '_registry', 'gsc-performance.json');
  if (!existsSync(p)) {
    console.error(`GSC registry not found at ${p}; skipping join.`);
    return { posts: [], nonBlogPages: [] };
  }
  return JSON.parse(readFileSync(p, 'utf-8'));
}

function buildGscIndex(gsc) {
  const bySlug = new Map((gsc.posts ?? []).map((p) => [p.slug, p]));
  const byPath = new Map((gsc.nonBlogPages ?? []).map((p) => [p.path, p]));
  return { bySlug, byPath };
}

function attachGsc(landingPage, gscIndex) {
  const slug = blogSlugFromPath(landingPage.path);
  const blogEntry = slug ? gscIndex.bySlug.get(slug) : null;
  const pageEntry = !slug ? gscIndex.byPath.get(landingPage.path) : null;
  const joined = blogEntry ?? pageEntry;
  if (!joined) {
    landingPage.gsc = null;
    return landingPage;
  }
  const current = joined.current ?? {};
  const topQueries = (current.topQueries ?? []).slice(0, TOP_QUERIES_FROM_GSC);
  landingPage.gsc = {
    clicks: current.clicks ?? 0,
    impressions: current.impressions ?? 0,
    ctr: current.ctr ?? 0,
    position: current.position ?? 0,
    topQueries,
    isBrandedTopQuery: topQueries[0] ? isBrandQuery(topQueries[0].query) : null,
  };
  return landingPage;
}

// ---- Markdown ---------------------------------------------------------------

function fmtPct(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(2)}%`;
}
function fmtNum(n) {
  return Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—';
}
function fmtArrow(delta) {
  if (delta === null || delta === undefined || Number.isNaN(delta)) return '—';
  if (delta > 0.05) return `↑ ${(delta * 100).toFixed(0)}%`;
  if (delta < -0.05) return `↓ ${Math.abs(delta * 100).toFixed(0)}%`;
  return '→';
}

function renderMarkdown(report) {
  const lines = [];
  const date = report.generatedAt.slice(0, 10);
  lines.push(`# GA4 Conversion Attribution — ${date}`);
  lines.push('');
  lines.push(`- Property: \`${report.propertyId}\``);
  lines.push(`- Window: ${report.windowDays} days (${report.window.start} → ${report.window.end})`);
  lines.push(`- Quarters: ${report.quarters.length}`);
  lines.push('');

  // 1. Summary
  const s = report.summary;
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---:|');
  lines.push(`| Total sessions | ${fmtNum(s.totalSessions)} |`);
  lines.push(`| Conversions: contact-agent | ${fmtNum(s.totalConversionsAgent)} |`);
  lines.push(`| Conversions: contact-lender | ${fmtNum(s.totalConversionsLender)} |`);
  lines.push(`| Total key events (cross-check) | ${fmtNum(s.totalKeyEvents)} |`);
  lines.push(`| Overall conversion rate | ${fmtPct(s.overallConversionRate)} |`);
  lines.push('');
  if (s.totalKeyEvents > 0 && s.totalKeyEvents + 5 < s.totalConversionsAgent + s.totalConversionsLender) {
    lines.push('> ⚠️ `keyEvents` total is materially lower than the sum of filtered `eventCount` reports.');
    lines.push('> Confirm `conversion_contact_agent` and `conversion_contact_lender` are flagged as Key Events in GA4 Admin.');
    lines.push('');
  }

  // 2. Quarterly Trend
  lines.push('## Quarterly Trend');
  lines.push('');
  lines.push('| Quarter | Window | Sessions | Conv. Agent | Conv. Lender | CR |');
  lines.push('|---|---|---:|---:|---:|---:|');
  for (const q of s.quarterlyTotals) {
    lines.push(
      `| ${q.quarter} | ${q.start} → ${q.end} | ${fmtNum(q.sessions)} | ${fmtNum(q.conversionsAgent)} | ${fmtNum(q.conversionsLender)} | ${fmtPct(q.conversionRate)} |`,
    );
  }
  lines.push('');

  // 3. Entry Page Distribution
  lines.push('## Entry Page Distribution');
  lines.push('');
  lines.push('| Bucket | Sessions | % of Total | Conversions | CR |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const b of s.entryPageDistribution) {
    lines.push(
      `| ${b.bucket} | ${fmtNum(b.sessions)} | ${fmtPct(b.pct)} | ${fmtNum(b.conversions)} | ${fmtPct(b.conversionRate)} |`,
    );
  }
  lines.push('');

  // 4. Top Converting Landing Pages
  const topLP = report.landingPages
    .filter((p) => p.conversionsAgent + p.conversionsLender > 0)
    .sort((a, b) => (b.conversionsAgent + b.conversionsLender) - (a.conversionsAgent + a.conversionsLender))
    .slice(0, 30);
  lines.push(`## Top Converting Landing Pages (top ${topLP.length})`);
  lines.push('');
  lines.push('| Path | Channel | Bucket | Sessions | Agent | Lender | CR | QoQ Trend | Signals |');
  lines.push('|---|---|---|---:|---:|---:|---:|---|---|');
  for (const p of topLP) {
    const trend = quarterToQuarterDelta(p);
    const signals = (p.signals ?? []).join(', ') || '—';
    lines.push(
      `| \`${p.path}\` | ${p.channelGroup} | ${p.bucket} | ${fmtNum(p.sessions)} | ${fmtNum(p.conversionsAgent)} | ${fmtNum(p.conversionsLender)} | ${fmtPct(p.conversionRate)} | ${fmtArrow(trend)} | ${signals} |`,
    );
  }
  lines.push('');

  // 5. Channel Breakdown
  lines.push('## Channel Breakdown');
  lines.push('');
  const topChannels = [...report.channels]
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 15);
  lines.push('| Source | Medium | Channel Group | Sessions | Agent | Lender | CR |');
  lines.push('|---|---|---|---:|---:|---:|---:|');
  for (const c of topChannels) {
    const conv = c.conversionsAgent + c.conversionsLender;
    const cr = c.sessions > 0 ? conv / c.sessions : 0;
    lines.push(
      `| ${c.source} | ${c.medium} | ${c.channelGroup} | ${fmtNum(c.sessions)} | ${fmtNum(c.conversionsAgent)} | ${fmtNum(c.conversionsLender)} | ${fmtPct(cr)} |`,
    );
  }
  lines.push('');

  // 6. Branded vs Non-Branded Organic (joined with GSC)
  lines.push('## Branded vs Non-Branded Organic (via GSC join)');
  lines.push('');
  const joinable = report.landingPages.filter((p) => p.gsc);
  const branded = joinable.filter((p) => p.gsc.isBrandedTopQuery);
  const nonBranded = joinable.filter((p) => p.gsc.isBrandedTopQuery === false);
  const sumConv = (arr) => arr.reduce((a, p) => a + p.conversionsAgent + p.conversionsLender, 0);
  const sumSess = (arr) => arr.reduce((a, p) => a + p.sessions, 0);
  lines.push('| Bucket | Pages | Sessions | Conversions | CR |');
  lines.push('|---|---:|---:|---:|---:|');
  const bSess = sumSess(branded), bConv = sumConv(branded);
  const nSess = sumSess(nonBranded), nConv = sumConv(nonBranded);
  lines.push(`| Branded top-query | ${branded.length} | ${fmtNum(bSess)} | ${fmtNum(bConv)} | ${fmtPct(bSess > 0 ? bConv / bSess : 0)} |`);
  lines.push(`| Non-branded top-query | ${nonBranded.length} | ${fmtNum(nSess)} | ${fmtNum(nConv)} | ${fmtPct(nSess > 0 ? nConv / nSess : 0)} |`);
  lines.push('');

  // 7. Top Search Queries Driving Conversions
  lines.push('## Top Search Queries Driving Conversions');
  lines.push('');
  const queryConverters = joinable
    .filter((p) => p.conversionsAgent + p.conversionsLender > 0 && p.gsc.topQueries.length > 0)
    .sort((a, b) => (b.conversionsAgent + b.conversionsLender) - (a.conversionsAgent + a.conversionsLender))
    .slice(0, 25);
  if (queryConverters.length === 0) {
    lines.push('_No converting landing pages have GSC data._');
  } else {
    lines.push('| Path | Conversions | GSC Clicks | Top Query | Branded? |');
    lines.push('|---|---:|---:|---|---|');
    for (const p of queryConverters) {
      const conv = p.conversionsAgent + p.conversionsLender;
      const top = p.gsc.topQueries[0]?.query ?? '—';
      const branded = p.gsc.isBrandedTopQuery ? 'yes' : 'no';
      lines.push(`| \`${p.path}\` | ${fmtNum(conv)} | ${fmtNum(p.gsc.clicks)} | ${top} | ${branded} |`);
    }
  }
  lines.push('');

  // 8. Conversion Path Analysis
  lines.push('## Conversion Path Analysis');
  lines.push('');
  lines.push('> _Approximation — GA4 Data API has no `sessionId` dimension; R3 filters by `landingPagePlusQueryString BEGINS_WITH` which captures sessions where the page was the entry point._');
  lines.push('');
  const pathTypeCounts = report.landingPages.reduce((acc, p) => {
    if (!p.conversionPathType) return acc;
    acc[p.conversionPathType] = (acc[p.conversionPathType] ?? 0) + 1;
    return acc;
  }, {});
  lines.push('| Path Type | Count |');
  lines.push('|---|---:|');
  for (const [k, v] of Object.entries(pathTypeCounts)) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push('');
  const r3Pages = report.landingPages.filter((p) => p.r3Pages && p.r3Pages.length > 0).slice(0, 10);
  if (r3Pages.length > 0) {
    lines.push('### Top 10 Landing Pages — Page Co-occurrence (sessions landed here, what else was viewed)');
    lines.push('');
    for (const p of r3Pages) {
      const conv = p.conversionsAgent + p.conversionsLender;
      lines.push(`**\`${p.path}\`** (${fmtNum(p.sessions)} sessions, ${conv} conversions, type: ${p.conversionPathType ?? 'unknown'})`);
      lines.push('');
      lines.push('| Page Path | Page Views | Event Count |');
      lines.push('|---|---:|---:|');
      for (const r of p.r3Pages.slice(0, 8)) {
        lines.push(`| \`${r.pagePath}\` | ${fmtNum(r.screenPageViews)} | ${fmtNum(r.eventCount)} |`);
      }
      lines.push('');
    }
  }

  // 9. Funnel Leaks
  const leaks = report.landingPages.filter((p) =>
    p.signals.includes('high-traffic-zero-conversion') || p.signals.includes('homepage-funnel-leak'),
  );
  lines.push(`## Notable Funnel Leaks (${leaks.length})`);
  lines.push('');
  if (leaks.length === 0) {
    lines.push('_None._');
  } else {
    lines.push('| Path | Channel | Sessions | Signals |');
    lines.push('|---|---|---:|---|');
    for (const p of leaks.sort((a, b) => b.sessions - a.sessions).slice(0, 30)) {
      lines.push(`| \`${p.path}\` | ${p.channelGroup} | ${fmtNum(p.sessions)} | ${p.signals.join(', ')} |`);
    }
  }
  lines.push('');

  // 10. Decay & Growth
  lines.push('## Decay & Growth (significant QoQ CR change)');
  lines.push('');
  const moversWithDelta = report.landingPages
    .map((p) => ({ p, delta: quarterToQuarterDelta(p) }))
    .filter(({ delta }) => delta !== null && Math.abs(delta) >= 0.25)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 25);
  if (moversWithDelta.length === 0) {
    lines.push('_No landing pages with significant QoQ change._');
  } else {
    lines.push('| Path | Sessions | Conversions | CR | Latest QoQ |');
    lines.push('|---|---:|---:|---:|---|');
    for (const { p, delta } of moversWithDelta) {
      lines.push(
        `| \`${p.path}\` | ${fmtNum(p.sessions)} | ${fmtNum(p.conversionsAgent + p.conversionsLender)} | ${fmtPct(p.conversionRate)} | ${fmtArrow(delta)} |`,
      );
    }
  }
  lines.push('');

  return lines.join('\n');
}

// QoQ delta on conversion rate between latest two quarters.
function quarterToQuarterDelta(landingPage) {
  const qs = (landingPage.quarterlyMetrics ?? []).filter((q) => q.sessions > 0);
  if (qs.length < 2) return null;
  const latest = qs[qs.length - 1];
  const prior = qs[qs.length - 2];
  const a = latest.conversionRate ?? 0;
  const b = prior.conversionRate ?? 0;
  if (b === 0) return a > 0 ? 1 : null;
  return (a - b) / b;
}

// ---- Build report -----------------------------------------------------------

function landingPagesToArray(map) {
  const out = [];
  for (const entry of map.values()) {
    const quarterlyMetrics = [...entry.quarterly.values()]
      .map((q) => ({
        ...q,
        conversionRate: q.sessions > 0 ? (q.conversionsAgent + q.conversionsLender) / q.sessions : 0,
      }))
      .sort((a, b) => a.start.localeCompare(b.start));
    out.push({
      path: entry.path,
      rawPath: entry.rawPath,
      bucket: entry.bucket,
      channelGroup: entry.channelGroup,
      sessions: entry.sessions,
      engagedSessions: entry.engagedSessions,
      keyEvents: entry.keyEvents,
      conversionsAgent: entry.conversionsAgent,
      conversionsLender: entry.conversionsLender,
      conversionRate: 0,
      quarterlyMetrics,
      signals: [],
      r3Pages: [],
      conversionPathType: null,
      gsc: null,
    });
  }
  return out;
}

function channelsToArray(map) {
  return [...map.values()].map((c) => ({
    ...c,
    quarterlyMetrics: [...c.quarterly.values()].sort((a, b) => (a.quarter || '').localeCompare(b.quarter || '')),
    conversionRate: c.sessions > 0 ? (c.conversionsAgent + c.conversionsLender) / c.sessions : 0,
    quarterly: undefined,
  })).map(({ quarterly, ...rest }) => rest); // strip Map
}

function entryPageDistribution(landingPages, totalSessions) {
  const buckets = new Map();
  for (const p of landingPages) {
    let b = buckets.get(p.bucket);
    if (!b) {
      b = { bucket: p.bucket, sessions: 0, conversions: 0 };
      buckets.set(p.bucket, b);
    }
    b.sessions += p.sessions;
    b.conversions += p.conversionsAgent + p.conversionsLender;
  }
  return [...buckets.values()].map((b) => ({
    ...b,
    pct: totalSessions > 0 ? b.sessions / totalSessions : 0,
    conversionRate: b.sessions > 0 ? b.conversions / b.sessions : 0,
  })).sort((a, b) => b.sessions - a.sessions);
}

function quarterlyTotals(landingPages, quarters) {
  const totals = new Map(quarters.map((q) => [q.label, {
    quarter: q.label, start: q.start, end: q.end, sessions: 0, conversionsAgent: 0, conversionsLender: 0,
  }]));
  for (const p of landingPages) {
    for (const q of p.quarterlyMetrics ?? []) {
      const t = totals.get(q.quarter);
      if (!t) continue;
      t.sessions += q.sessions;
      t.conversionsAgent += q.conversionsAgent;
      t.conversionsLender += q.conversionsLender;
    }
  }
  return [...totals.values()].map((t) => ({
    ...t,
    conversionRate: t.sessions > 0 ? (t.conversionsAgent + t.conversionsLender) / t.sessions : 0,
  })).sort((a, b) => a.start.localeCompare(b.start));
}

// ---- Main -------------------------------------------------------------------

async function main() {
  const client = getClient();
  const window = computeWindow(args.window);
  const quarters = computeQuarterChunks(window);
  const generatedAt = new Date().toISOString();

  console.log(`Property: ${PROPERTY_ID}`);
  console.log(`Window:   ${window.start} → ${window.end} (${args.window} days)`);
  console.log(`Quarters: ${quarters.length}`);
  if (args.dryRun) console.log('[DRY RUN — no files will be written]');

  const RAW_DIR = join(ROOT, 'docs', 'blog-migration', 'raw');
  const REPORT_DIR = join(ROOT, 'docs', 'blog-migration');
  const REGISTRY_DIR = join(ROOT, 'content', '_registry');
  if (!args.dryRun) {
    mkdirSync(RAW_DIR, { recursive: true });
    mkdirSync(REPORT_DIR, { recursive: true });
    mkdirSync(REGISTRY_DIR, { recursive: true });
  }

  // Run base reports per quarter.
  const chunkResults = [];
  for (const chunk of quarters) {
    console.log(`Fetching ${chunk.label} (${chunk.start} → ${chunk.end}) …`);
    try {
      const result = await fetchChunkReports(client, chunk);
      console.log(`  R1=${result.R1.length} R1a=${result.R1a.length} R1b=${result.R1b.length} R2=${result.R2.length} R2a=${result.R2a.length} R2b=${result.R2b.length} R4=${result.R4.length}`);
      chunkResults.push(result);
    } catch (err) {
      console.error(`  ERROR fetching ${chunk.label}:`, err.message);
      if (err.code === 7 || err.code === 'PERMISSION_DENIED' || /permission/i.test(err.message ?? '')) {
        console.error(
          `\nGA4_PROPERTY_ID=${PROPERTY_ID} is not accessible by the service account. ` +
          `Check that the SA has Viewer access in GA4 Admin → Property Access Management.`,
        );
        process.exit(1);
      }
      throw err;
    }
  }

  // Build aggregates.
  const lpMap = buildLandingPageMap(chunkResults);
  const channelMap = buildChannelMap(chunkResults);
  const referrerMap = buildReferrerMap(chunkResults);

  // Convert to arrays + compute conversion rate.
  let landingPages = landingPagesToArray(lpMap);
  const totalSessions = landingPages.reduce((a, p) => a + p.sessions, 0);
  const totalConversionsAgent = landingPages.reduce((a, p) => a + p.conversionsAgent, 0);
  const totalConversionsLender = landingPages.reduce((a, p) => a + p.conversionsLender, 0);
  const totalKeyEvents = landingPages.reduce((a, p) => a + p.keyEvents, 0);
  const totalConversions = totalConversionsAgent + totalConversionsLender;
  const overallCR = totalSessions > 0 ? totalConversions / totalSessions : 0;

  // Compute p90 sessions for funnel-leak threshold.
  const sessionList = landingPages.map((p) => p.sessions).sort((a, b) => a - b);
  const p90 = sessionList.length > 0 ? sessionList[Math.floor(sessionList.length * 0.9)] : 0;

  // Classify.
  for (const lp of landingPages) classifyLandingPage(lp, p90, overallCR);

  // R3 — top-N converting landing pages, run sequentially.
  // Path-co-occurrence is keyed by path alone (not channel), so we dedupe by
  // path before fanning out: the same path across multiple channelGroups would
  // otherwise re-fetch identical R3 data.
  const topConverters = landingPages
    .filter((p) => p.conversionsAgent + p.conversionsLender > 0)
    .sort((a, b) => (b.conversionsAgent + b.conversionsLender) - (a.conversionsAgent + a.conversionsLender))
    .slice(0, args.topLandingPages);
  const r3ByPath = {};
  if (args.topLandingPages > 0) {
    const uniquePaths = [...new Set(topConverters.map((p) => p.path))];
    console.log(`\nFetching path co-occurrence for ${uniquePaths.length} unique paths (top ${topConverters.length} converters) …`);
    for (let i = 0; i < uniquePaths.length; i++) {
      const path = uniquePaths[i];
      try {
        const rows = await fetchPathCoOccurrence(client, window, path);
        const top = rows.sort((a, b) => b.screenPageViews - a.screenPageViews).slice(0, 20);
        r3ByPath[path] = top;
        const pathType = classifyConversionPath(path, rows);
        // Attach to every landing-page entry sharing this path.
        for (const lp of landingPages) {
          if (lp.path === path) {
            lp.r3Pages = top;
            lp.conversionPathType = pathType;
          }
        }
        console.log(`  [${i + 1}/${uniquePaths.length}] ${path} → ${rows.length} pages, type=${pathType}`);
      } catch (err) {
        console.error(`  ERROR R3 for ${path}:`, err.message);
      }
      await new Promise((r) => setTimeout(r, R3_THROTTLE_MS));
    }
  }

  // GSC join.
  const gscRegistry = loadGscRegistry();
  const gscIndex = buildGscIndex(gscRegistry);
  for (const lp of landingPages) attachGsc(lp, gscIndex);

  // Optional --slug filter.
  if (args.slug) {
    const before = landingPages.length;
    landingPages = landingPages.filter((p) => p.path === args.slug || p.path === `/blog/${args.slug}`);
    console.log(`--slug ${args.slug}: filtered ${before} → ${landingPages.length} entries`);
  }

  const channels = channelsToArray(channelMap);
  const referrers = [...referrerMap.values()].sort((a, b) => b.sessions - a.sessions).slice(0, 50);

  const summary = {
    totalSessions,
    totalConversionsAgent,
    totalConversionsLender,
    totalKeyEvents,
    overallConversionRate: overallCR,
    quarterlyTotals: quarterlyTotals(landingPages, quarters),
    entryPageDistribution: entryPageDistribution(landingPages, totalSessions),
    signalCounts: {
      highTrafficZeroConversion: landingPages.filter((p) => p.signals.includes('high-traffic-zero-conversion')).length,
      highConversionRate: landingPages.filter((p) => p.signals.includes('high-conversion-rate')).length,
      homepageFunnelLeak: landingPages.filter((p) => p.signals.includes('homepage-funnel-leak')).length,
    },
  };

  const report = {
    generatedAt,
    windowDays: args.window,
    propertyId: PROPERTY_ID,
    window,
    quarters,
    summary,
    landingPages,
    channels,
    referrers,
  };

  if (!args.dryRun) {
    const rawIso = generatedAt.replace(/[:.]/g, '-');
    writeFileSync(
      join(RAW_DIR, `ga4-performance-${rawIso}.json`),
      JSON.stringify({ chunkResults, r3ByPath }, null, 2),
    );
    writeFileSync(
      join(REGISTRY_DIR, 'ga4-performance.json'),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    const dateStamp = generatedAt.slice(0, 10);
    const mdPath = join(REPORT_DIR, `ga4-performance-${dateStamp}.md`);
    writeFileSync(mdPath, renderMarkdown(report));
    console.log('');
    console.log(`Digest:   ${mdPath}`);
    console.log(`Registry: ${join(REGISTRY_DIR, 'ga4-performance.json')}`);
  }

  console.log('');
  console.log(`Total sessions:           ${fmtNum(totalSessions)}`);
  console.log(`Conversions (agent):      ${fmtNum(totalConversionsAgent)}`);
  console.log(`Conversions (lender):     ${fmtNum(totalConversionsLender)}`);
  console.log(`keyEvents (cross-check):  ${fmtNum(totalKeyEvents)}`);
  console.log(`Overall conversion rate:  ${fmtPct(overallCR)}`);
  console.log(`Landing pages:            ${landingPages.length}`);
  console.log(`Channels:                 ${channels.length}`);
  console.log(`Top converters analyzed:  ${topConverters.length}`);

  if (totalKeyEvents > 0 && totalConversions > totalKeyEvents + 5) {
    console.warn(
      `\nWARN: filtered eventCount totals (${totalConversions}) exceed keyEvents total (${totalKeyEvents}). ` +
        `Confirm conversion_contact_agent and conversion_contact_lender are flagged as Key Events in GA4 Admin.`,
    );
  }

  if (args.strict && summary.signalCounts.highTrafficZeroConversion > 0) {
    console.error(`--strict: ${summary.signalCounts.highTrafficZeroConversion} pages flagged high-traffic-zero-conversion.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
