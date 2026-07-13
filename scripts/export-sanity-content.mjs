#!/usr/bin/env node
// Export the 25 live Sanity document types into the repo (content/_data/site/ +
// public/images/). Commit 1 of the Sanity repo-migration plan
// (docs/sanity-migration-plan.md); fidelity gates per docs/sanity-migration-decision.md.
//
// Run:
//   node --env-file=.env.local scripts/export-sanity-content.mjs [flags]
//
// Flags:
//   --dry-run     No writes, no downloads; full log of what would happen
//   --force       Rewrite/redownload everything, even unchanged files
//   --check       Verify committed artifacts, then drift-scan: manifest report must
//                 be clean (no errors/warnings), every manifest image must exist on
//                 disk with a matching sha256, every per-type JSON must parse and
//                 match the manifest's count/_id set AND its recorded sha256 (so
//                 field-level corruption that preserves ids is caught), and live
//                 _id/_rev sets must match the manifest. Exit 1 on ANY problem.
//                 Fast (one live query, no asset downloads).
//   --allow-warn  Warnings do not fail the run (default: warnings are FATAL)
//
// Outputs (committed):
//   content/_data/site/<type>.json       cleaned doc arrays (no _rev; image fields
//                                        rewritten to local paths; Portable Text
//                                        block arrays kept byte-identical)
//   content/_data/site/_manifest.json    _id→_rev drift map, per-image provenance
//                                        (sha256, source/materialized URLs), report
//   public/images/states/<slug>.<ext>    state_list.state_map images
//   public/images/content/<section>/*    every other referenced image
//
// Hard fidelity gates (exit non-zero on failure):
//   - warnings fatal (unless --allow-warn)
//   - per-type doc count + _id set parity between query result and written JSON
//   - reference closure: every _ref resolves to an exported doc or downloaded asset
//     (explicit REF_ALLOWLIST below for known dead/legacy references)
//   - every image: HTTP 200, image/* content-type, non-empty, sha256 recorded,
//     width/height decoded for raster formats (SVG: MIME check only)
//   - byte fidelity: originals are fetched via `?dlRaw=true` + Authorization (the
//     CDN otherwise transcodes, e.g. webp → png) and the sha1 of the downloaded
//     bytes must equal the hash embedded in the asset _id. Exemptions:
//       * SVG — the CDN sanitizes SVGs on every request shape (XSS defense), so
//         byte-exactness is impossible; accepted iff mime is image/svg+xml, the
//         byte length equals the asset's recorded size, and the body parses as
//         SVG. Recorded as sha1Verified:false + cdnSanitized:true.
//       * materialized crop/hotspot renditions — transformed by definition; the
//         HTTP/MIME/dimension checks still apply.
//   - _manifest.json is only written when the export finished with zero errors
//   - 1:1 image-reference ↔ manifest-entry mapping
//
// NEVER log env var values (especially NEXT_PUBLIC_SANITY_API_TOKEN).

import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import imageUrlModule from '@sanity/image-url';

// @sanity/image-url ships CJS; depending on the interop path the factory is the
// default export or nested one level deeper.
const createImageUrlBuilder =
  typeof imageUrlModule === 'function' ? imageUrlModule : imageUrlModule.default;

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '..');
const CONTENT_DIR = join(ROOT, 'content', '_data', 'site');
const MANIFEST_PATH = join(CONTENT_DIR, '_manifest.json');

// ── Constants ────────────────────────────────────────────────────────────────

/**
 * Expected per-type doc counts from the appendix table in
 * docs/sanity-migration-decision.md (audited 2026-07-13). A live count that
 * differs is a WARNING (fatal by default) — it means content changed since the
 * audit and the appendix (or this table) needs a refresh.
 *
 * Two counts are adjusted from the appendix because the audit counted drafts
 * while this export only ships published docs (verified 2026-07-13):
 *   - state_list: appendix 54 = 52 published + 2 drafts (New Jersey, Pennsylvania)
 *   - trusted_resources: appendix 14 = 13 published + 1 draft (Johns Hopkins University)
 */
export const EXPECTED_COUNTS = {
  state_list: 52,
  trusted_resources: 13,
  real_state_agents: 13,
  member_info: 8,
  how_veterence_pcs_works: 7,
  approved_company_list: 7,
  users: 7,
  frequently_asked_questions: 6,
  life_resources: 6,
  additionalSuccessStories: 4,
  support_veterence: 4,
  media_account: 4,
  aboutUsPage: 3,
  internship_action: 3,
  military_spouse_employment: 3,
  moving_your_life: 3,
  video_success_stories: 3,
  impact_page: 1,
  video_review: 1,
  stories_poster: 1,
  moveInBonus: 1,
  internship_benefits: 1,
  internship_offer: 1,
  military_spouse_approved: 1,
  aboutSupportComponent: 1,
};

export const LIVE_TYPES = Object.keys(EXPECTED_COUNTS);

/**
 * References to dead/legacy documents that are intentionally NOT exported.
 * Entries may be a document _id or a _type (matched against the referenced
 * doc's looked-up type). Start empty: the first real run reports every
 * unresolved ref so allowlisting is an explicit, reviewed decision.
 */
export const REF_ALLOWLIST = [];

/** Key order for cleaned docs: system keys first, everything else alphabetical. */
const SYSTEM_KEY_ORDER = ['_id', '_type', '_createdAt', '_updatedAt', '_sanityAssetId'];

const EXT_TO_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
};

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
};

// ── Pure helpers (exported for unit tests) ──────────────────────────────────

export function parseArgs(argv) {
  const out = { dryRun: false, force: false, check: false, allowWarn: false };
  for (const a of argv) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--force') out.force = true;
    else if (a === '--check') out.check = true;
    else if (a === '--allow-warn') out.allowWarn = true;
    else {
      console.error(`Unknown flag: ${a}`);
      process.exit(1);
    }
  }
  return out;
}

/** `member_info` → `member-info`, `additionalSuccessStories` → `additional-success-stories`. */
export function kebabCase(name) {
  return String(name ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase()
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Filesystem/URL-safe slug: NFKD, strip diacritics, non-alnum → '-'. */
export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Deterministic 8-hex-char hash for filename collision suffixes. */
export function shortHash(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 8);
}

/** Strip a short trailing extension ("photo.HEIC.jpg" → "photo.HEIC"). */
export function stripExtension(filename) {
  return String(filename ?? '').replace(/\.[a-zA-Z0-9]{1,5}$/, '');
}

export function extFromUrl(url) {
  const m = String(url ?? '').match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  return m ? m[1].toLowerCase() : null;
}

export function extFromContentType(contentType) {
  const mime = String(contentType ?? '').split(';')[0].trim().toLowerCase();
  return MIME_TO_EXT[mime] ?? null;
}

export function extsEquivalent(a, b) {
  const norm = (e) => (e === 'jpeg' ? 'jpg' : e);
  return norm(String(a).toLowerCase()) === norm(String(b).toLowerCase());
}

const FLOAT_EPS = 1e-6;

/** Sanity Studio's default hotspot (x=0.5, y=0.5, w=1, h=1) is a no-op transform. */
export function isDefaultHotspot(hotspot) {
  if (!hotspot || typeof hotspot !== 'object') return false;
  const near = (value, target) =>
    typeof value === 'number' && Math.abs(value - target) < FLOAT_EPS;
  return (
    near(hotspot.x, 0.5) && near(hotspot.y, 0.5) && near(hotspot.width, 1) && near(hotspot.height, 1)
  );
}

/**
 * True when an image object carries a non-zero crop or a non-default hotspot.
 * An all-zero crop plus Sanity's default full-frame hotspot renders identically
 * to the raw asset, so it must NOT trigger the materialized-rendition path
 * (which is exempt from sha1 verification) — it goes through dlRaw like
 * everything else.
 */
export function hasMeaningfulCropOrHotspot(imageNode) {
  const crop = imageNode?.crop;
  const hotspot = imageNode?.hotspot;
  const cropSet =
    crop && ['top', 'bottom', 'left', 'right'].some((side) => (crop[side] ?? 0) > FLOAT_EPS);
  const hotspotSet = hotspot && !isDefaultHotspot(hotspot);
  return Boolean(cropSet || hotspotSet);
}

export function isImageAssetId(ref) {
  return typeof ref === 'string' && ref.startsWith('image-');
}

/** Sanity image object: has `asset` with an image `_ref` (or dereferenced `_id`). */
export function isImageObject(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
  const asset = node.asset;
  if (!asset || typeof asset !== 'object') return false;
  return isImageAssetId(asset._ref) || isImageAssetId(asset._id);
}

export function imageAssetIdOf(node) {
  return node?.asset?._ref ?? node?.asset?._id ?? null;
}

/** Portable Text array: any item is a `block`. Those arrays are exported verbatim. */
export function isPortableTextArray(value) {
  return (
    Array.isArray(value) &&
    value.some((item) => item && typeof item === 'object' && item._type === 'block')
  );
}

/**
 * Walk a doc and collect every image reference occurrence.
 * @returns {{ fieldPath: string, node: object, inPortableText: boolean }[]}
 */
export function collectImageOccurrences(doc) {
  const out = [];
  const visit = (node, path, inPT) => {
    if (Array.isArray(node)) {
      const pt = inPT || isPortableTextArray(node);
      node.forEach((item, i) => visit(item, `${path}[${i}]`, pt));
      return;
    }
    if (!node || typeof node !== 'object') return;
    if (isImageObject(node)) {
      out.push({ fieldPath: path, node, inPortableText: inPT });
      return; // asset/crop/hotspot subfields are consumed here, not walked further
    }
    for (const [k, v] of Object.entries(node)) {
      visit(v, path ? `${path}.${k}` : k, inPT);
    }
  };
  visit(doc, '', false);
  return out;
}

/**
 * Walk a doc and collect every `_ref` (any kind) with its path.
 * @returns {{ ref: string, fieldPath: string }[]}
 */
export function collectRefs(doc) {
  const out = [];
  const visit = (node, path) => {
    if (Array.isArray(node)) {
      node.forEach((item, i) => visit(item, `${path}[${i}]`));
      return;
    }
    if (!node || typeof node !== 'object') return;
    if (typeof node._ref === 'string') out.push({ ref: node._ref, fieldPath: path });
    for (const [k, v] of Object.entries(node)) {
      visit(v, path ? `${path}.${k}` : k);
    }
  };
  visit(doc, '');
  return out;
}

/**
 * Drop `_rev` (it lives only in the manifest, for drift detection) and
 * `_system` (Sanity-internal `{base: {id, rev}}` noise present on some docs).
 */
export function cleanDoc(doc) {
  const { _rev, _system, ...rest } = doc;
  return rest;
}

/**
 * Recursively order object keys (system keys first, then alphabetical) for
 * stable diffs. Portable Text block arrays pass through verbatim.
 */
export function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    if (isPortableTextArray(value)) return value;
    return value.map(sortKeysDeep);
  }
  if (!value || typeof value !== 'object') return value;
  const keys = Object.keys(value);
  const system = SYSTEM_KEY_ORDER.filter((k) => keys.includes(k));
  const rest = keys.filter((k) => !SYSTEM_KEY_ORDER.includes(k)).sort();
  const out = {};
  for (const k of [...system, ...rest]) out[k] = sortKeysDeep(value[k]);
  return out;
}

export function stableStringify(value) {
  return `${JSON.stringify(sortKeysDeep(value), null, 2)}\n`;
}

/** Slug used for state map filenames and filename fallbacks. */
export function docSlugOrId(doc) {
  return (
    doc?.state_slug?.current ??
    doc?.slug?.current ??
    doc?._id ??
    'unknown'
  );
}

/**
 * Derive a filename for an asset: slugified originalFilename, falling back to
 * `<docSlugOrId>-<fieldPath>.<ext>`.
 */
export function deriveImageFilename({ asset, doc, fieldPath }) {
  const ext = (asset.extension ?? extFromUrl(asset.url) ?? 'jpg').toLowerCase();
  const base = slugify(stripExtension(asset.originalFilename));
  if (base) return `${base}.${ext}`;
  return `${slugify(docSlugOrId(doc))}-${slugify(fieldPath)}.${ext}`;
}

/**
 * Assign collision-free local paths. Each item is a unique download unit
 * (rendition of an asset targeting one dir/filename).
 * @param {{ unitKey: string, dir: string, filename: string }[]} items
 * @returns {Map<string, string>} unitKey → web path ("<dir>/<filename>")
 */
export function assignUniquePaths(items) {
  const byPath = new Map();
  const result = new Map();
  const sorted = [...items].sort((a, b) => (a.unitKey < b.unitKey ? -1 : a.unitKey > b.unitKey ? 1 : 0));
  for (const item of sorted) {
    if (result.has(item.unitKey)) continue;
    let path = posix.join(item.dir, item.filename);
    const owner = byPath.get(path);
    if (owner !== undefined && owner !== item.unitKey) {
      const dot = item.filename.lastIndexOf('.');
      const stem = dot === -1 ? item.filename : item.filename.slice(0, dot);
      const ext = dot === -1 ? '' : item.filename.slice(dot);
      path = posix.join(item.dir, `${stem}-${shortHash(item.unitKey)}${ext}`);
    }
    byPath.set(path, item.unitKey);
    result.set(item.unitKey, path);
  }
  return result;
}

/**
 * Parse a Sanity image asset _id (`image-<sha1>-<W>x<H>-<ext>`). The 40-hex
 * hash is the sha1 of the original uploaded bytes — the byte-fidelity anchor.
 * @returns {{ sha1: string, width: number, height: number, ext: string } | null}
 */
export function assetIdParts(assetId) {
  const m = /^image-([0-9a-fA-F]{40})-(\d+)x(\d+)-([a-zA-Z0-9]+)$/.exec(String(assetId ?? ''));
  if (!m) return null;
  // Mandatory capture groups of a matched regex — always present.
  return {
    sha1: m[1].toLowerCase(),
    width: Number(m[2]),
    height: Number(m[3]),
    ext: m[4].toLowerCase(),
  };
}

export function sha1Hex(buf) {
  return createHash('sha1').update(buf).digest('hex');
}

export function sha256Hex(input) {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Body is an actual SVG document: after skipping BOM, whitespace, XML
 * declaration / processing instructions, comments, and DOCTYPE, the root
 * element must be `<svg`. An XML declaration alone is NOT enough — a
 * same-length XML error body labeled image/svg+xml must not slip through
 * the sha1-mismatch exemption.
 */
export function looksLikeSvg(buf) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) return false;
  let text = buf.subarray(0, 4096).toString('utf-8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (;;) {
    text = text.trimStart();
    if (text.startsWith('<?')) {
      const end = text.indexOf('?>');
      if (end === -1) return false;
      text = text.slice(end + 2);
    } else if (text.startsWith('<!--')) {
      const end = text.indexOf('-->');
      if (end === -1) return false;
      text = text.slice(end + 3);
    } else if (/^<!doctype/i.test(text)) {
      const end = text.indexOf('>');
      if (end === -1) return false;
      text = text.slice(end + 1);
    } else {
      break;
    }
  }
  return /^<svg[\s>/]/i.test(text);
}

/**
 * The documented SVG exemption from sha1 verification: Sanity's CDN sanitizes
 * SVGs on every request shape (no way to get original bytes), but the
 * sanitized output keeps the asset's recorded byte length.
 */
export function isCdnSanitizedSvgAcceptable({ buf, mimeType, assetSize }) {
  return (
    mimeType === 'image/svg+xml' &&
    Number.isFinite(assetSize) &&
    buf.byteLength === assetSize &&
    looksLikeSvg(buf)
  );
}

/**
 * Verify downloaded raw-asset bytes against the sha1 embedded in the asset _id.
 * @returns {{ sha1: string, expectedSha1: string | null, sha1Verified: boolean,
 *             cdnSanitized?: true, error?: string }}
 */
export function verifyRawAssetBytes(buf, asset) {
  const expectedSha1 = assetIdParts(asset._id)?.sha1 ?? null;
  const sha1 = sha1Hex(buf);
  if (expectedSha1 && sha1 === expectedSha1) {
    return { sha1, expectedSha1, sha1Verified: true };
  }
  if (isCdnSanitizedSvgAcceptable({ buf, mimeType: asset.mimeType, assetSize: asset.size })) {
    return { sha1, expectedSha1, sha1Verified: false, cdnSanitized: true };
  }
  return {
    sha1,
    expectedSha1,
    sha1Verified: false,
    error: `sha1 ${sha1} != expected ${expectedSha1 ?? '(unparseable asset id)'}`,
  };
}

/**
 * Materialized rendered URL, exactly how the app builds it
 * (sanity/lib/image.ts: `.auto('format').fit('max')`).
 */
export function buildMaterializedUrl(imageNode, { projectId, dataset }) {
  return createImageUrlBuilder({ projectId, dataset })
    .image(imageNode)
    .auto('format')
    .fit('max')
    .url();
}

// ── Image header parsers (pure; fixtures in unit tests) ─────────────────────

export function readPngDimensions(buf) {
  if (buf.length < 24) return null;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!sig.every((b, i) => buf[i] === b)) return null;
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export function readGifDimensions(buf) {
  if (buf.length < 10 || buf.toString('ascii', 0, 4) !== 'GIF8') return null;
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

export function readJpegDimensions(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1];
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    // Standalone markers with no length payload
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const length = buf.readUInt16BE(offset + 2);
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    if (length < 2) return null;
    offset += 2 + length;
  }
  return null;
}

export function readWebpDimensions(buf) {
  if (buf.length < 30) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    return null;
  }
  const fourCC = buf.toString('ascii', 12, 16);
  if (fourCC === 'VP8 ') {
    // Lossy: 3-byte frame tag, then sync code 9D 01 2A, then 14-bit LE dims
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
    return {
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff,
    };
  }
  if (fourCC === 'VP8L') {
    if (buf[20] !== 0x2f) return null;
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (fourCC === 'VP8X') {
    return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  }
  return null;
}

/** Sniff format from magic bytes and decode dimensions. Returns null when unknown. */
export function readImageDimensions(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50) return readPngDimensions(buf);
  if (buf[0] === 0xff && buf[1] === 0xd8) return readJpegDimensions(buf);
  if (buf.toString('ascii', 0, 4) === 'GIF8') return readGifDimensions(buf);
  if (buf.toString('ascii', 0, 4) === 'RIFF') return readWebpDimensions(buf);
  return null;
}

// ── Manifest diffing (pure; used by --check) ─────────────────────────────────

/**
 * Diff two `{ _id: _rev }` maps.
 * @returns {{ added: string[], removed: string[], changed: string[] }}
 */
export function diffIdRevMaps(previous, next) {
  const prev = previous ?? {};
  const nxt = next ?? {};
  const added = Object.keys(nxt).filter((id) => !(id in prev)).sort();
  const removed = Object.keys(prev).filter((id) => !(id in nxt)).sort();
  const changed = Object.keys(nxt)
    .filter((id) => id in prev && prev[id] !== nxt[id])
    .sort();
  return { added, removed, changed };
}

/** Compare two manifests ignoring the volatile `exportedAt` (idempotent rewrites). */
export function manifestsEquivalent(a, b) {
  if (!a || !b) return false;
  const strip = (m) => {
    const { exportedAt, ...rest } = m;
    return rest;
  };
  return stableStringify(strip(a)) === stableStringify(strip(b));
}

// ── Sanity access (network; not unit-tested) ────────────────────────────────

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SANITY_PROJECT_ID',
  'NEXT_PUBLIC_SANITY_DATASET',
  'NEXT_PUBLIC_SANITY_API_VERSION',
  'NEXT_PUBLIC_SANITY_API_TOKEN',
];

function validateEnv() {
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      console.error(`Missing env var: ${key}`);
      process.exit(1);
    }
  }
}

const SANITY = {
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
  token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
};

async function sanityQuery(groq) {
  const apiVersion = SANITY.apiVersion.startsWith('v') ? SANITY.apiVersion : `v${SANITY.apiVersion}`;
  const url = new URL(
    `https://${SANITY.projectId}.api.sanity.io/${apiVersion}/data/query/${SANITY.dataset}`,
  );
  url.searchParams.set('query', groq);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${SANITY.token}` } });
  if (!res.ok) throw new Error(`Sanity ${res.status}: ${await res.text()}`);
  return (await res.json()).result;
}

/** Published docs only — with a token, an unfiltered query would include drafts. */
const NO_DRAFTS = '!(_id in path("drafts.**"))';

async function fetchDocsForType(type) {
  const docs = await sanityQuery(`*[_type == "${type}" && ${NO_DRAFTS}] | order(_id asc)`);
  return [...docs].sort((a, b) => (a._id < b._id ? -1 : 1));
}

async function lookupAssets(assetIds) {
  const result = new Map();
  const CHUNK = 50;
  for (let i = 0; i < assetIds.length; i += CHUNK) {
    const chunk = assetIds.slice(i, i + CHUNK);
    const groq = `*[_id in ${JSON.stringify(chunk)}]{_id, url, originalFilename, extension, mimeType, size, sha1hash, metadata{dimensions{width, height}}}`;
    const assets = await sanityQuery(groq);
    for (const a of assets ?? []) result.set(a._id, a);
  }
  return result;
}

async function lookupDocTypes(ids) {
  const result = new Map();
  const CHUNK = 50;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const docs = await sanityQuery(`*[_id in ${JSON.stringify(chunk)}]{_id, _type}`);
    for (const d of docs ?? []) result.set(d._id, d._type);
  }
  return result;
}

async function decodeDimensionsWithFallback(buf) {
  const pure = readImageDimensions(buf);
  if (pure) return pure;
  try {
    // sharp is already a dependency; used only when the pure parsers can't
    // read a header (e.g. an exotic JPEG variant).
    const sharp = (await import('sharp')).default;
    const meta = await sharp(buf).metadata();
    if (meta.width && meta.height) return { width: meta.width, height: meta.height };
  } catch {
    // fall through — caller records the failure
  }
  return null;
}

// ── Export run ───────────────────────────────────────────────────────────────

const log = (...p) => console.log(...p);

async function runCheck() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`--check: no manifest at ${MANIFEST_PATH} — run a full export first.`);
    process.exit(2);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  log('═══ Sanity Content Export — artifact + drift check ═══');

  // ── Local artifact verification (no network) ──
  const problems = [];

  // (a) The manifest must describe a clean export.
  const reportErrors = manifest.report?.errors ?? [];
  const reportWarnings = manifest.report?.warnings ?? [];
  if (reportErrors.length > 0) {
    problems.push(`manifest.report.errors is non-empty (${reportErrors.length}) — the recorded export failed`);
  }
  if (reportWarnings.length > 0) {
    problems.push(`manifest.report.warnings is non-empty (${reportWarnings.length}) — the recorded export had warnings`);
  }

  // (b) Every per-type JSON must exist, parse, match the manifest's count/_id
  // set, and hash to the manifest's recorded sha256 (field-level integrity).
  for (const type of LIVE_TYPES) {
    const filePath = join(CONTENT_DIR, `${type}.json`);
    const manifestIds = Object.keys(manifest.types?.[type]?.ids ?? {});
    if (!existsSync(filePath)) {
      problems.push(`${type}: content/_data/site/${type}.json is missing`);
      continue;
    }
    const raw = readFileSync(filePath);
    const expectedJsonSha = manifest.types?.[type]?.sha256;
    if (!expectedJsonSha) {
      problems.push(`${type}: manifest has no sha256 for the type JSON — re-run the export`);
    } else {
      const actualJsonSha = sha256Hex(raw);
      if (actualJsonSha !== expectedJsonSha) {
        problems.push(`${type}: JSON sha256 mismatch (disk ${actualJsonSha.slice(0, 12)}… != manifest ${expectedJsonSha.slice(0, 12)}…) — content corrupted or hand-edited`);
      }
    }
    let parsed;
    try {
      parsed = JSON.parse(raw.toString('utf-8'));
    } catch (err) {
      problems.push(`${type}: content/_data/site/${type}.json does not parse (${err.message})`);
      continue;
    }
    if (!Array.isArray(parsed)) {
      problems.push(`${type}: content/_data/site/${type}.json is not an array`);
      continue;
    }
    const fileIds = new Set(parsed.map((d) => d?._id));
    const expectedCount = manifest.types?.[type]?.count ?? manifestIds.length;
    if (parsed.length !== expectedCount) {
      problems.push(`${type}: JSON has ${parsed.length} docs, manifest says ${expectedCount}`);
    }
    for (const id of manifestIds) {
      if (!fileIds.has(id)) problems.push(`${type}: _id ${id} in manifest but missing from JSON`);
    }
    for (const id of fileIds) {
      if (!manifestIds.includes(id)) problems.push(`${type}: _id ${id} in JSON but not in manifest`);
    }
  }

  // Extra artifacts: JSON files in the content dir that no live type owns.
  for (const name of readdirSync(CONTENT_DIR)) {
    if (!name.endsWith('.json') || name === '_manifest.json') continue;
    if (!LIVE_TYPES.includes(name.replace(/\.json$/, ''))) {
      problems.push(`extra file content/_data/site/${name} is not a live type`);
    }
  }

  // (c) Every manifest image must exist on disk with a matching sha256.
  const shaByPath = new Map(); // localPath → expected sha256
  for (const entry of manifest.images ?? []) {
    if (!entry.localPath || !entry.sha256) {
      problems.push(`image ${entry.assetId} (${entry.docId} ${entry.fieldPath}): manifest entry lacks localPath/sha256`);
      continue;
    }
    const prior = shaByPath.get(entry.localPath);
    if (prior !== undefined && prior !== entry.sha256) {
      problems.push(`image ${entry.localPath}: conflicting sha256 values across manifest entries`);
    }
    shaByPath.set(entry.localPath, entry.sha256);
  }
  for (const [localPath, expectedSha] of shaByPath) {
    const abs = join(ROOT, 'public', ...localPath.split('/').filter(Boolean));
    if (!existsSync(abs)) {
      problems.push(`image public${localPath}: missing on disk`);
      continue;
    }
    const actualSha = sha256Hex(readFileSync(abs));
    if (actualSha !== expectedSha) {
      problems.push(`image public${localPath}: sha256 mismatch (disk ${actualSha.slice(0, 12)}… != manifest ${expectedSha.slice(0, 12)}…)`);
    }
  }

  if (problems.length === 0) {
    log(`  [ok] local artifacts: ${LIVE_TYPES.length} JSON files + ${shaByPath.size} image file(s) match the manifest`);
  } else {
    for (const p of problems) log(`  [bad] ${p}`);
  }

  // ── Live drift scan (one query) ──
  const live = await sanityQuery(
    `*[_type in ${JSON.stringify(LIVE_TYPES)} && ${NO_DRAFTS}]{_id, _type, _rev}`,
  );
  const liveByType = new Map(LIVE_TYPES.map((t) => [t, {}]));
  for (const doc of live) {
    const bucket = liveByType.get(doc._type);
    if (bucket) bucket[doc._id] = doc._rev;
  }
  let drift = 0;
  for (const type of LIVE_TYPES) {
    const expected = manifest.types?.[type]?.ids ?? {};
    const actual = liveByType.get(type) ?? {};
    const { added, removed, changed } = diffIdRevMaps(expected, actual);
    const total = added.length + removed.length + changed.length;
    if (total === 0) {
      log(`  [ok] ${type}: ${Object.keys(actual).length} docs, no drift`);
      continue;
    }
    drift += total;
    log(`  [drift] ${type}: +${added.length} added, -${removed.length} removed, ~${changed.length} changed`);
    for (const id of added) log(`      + ${id}`);
    for (const id of removed) log(`      - ${id}`);
    for (const id of changed) log(`      ~ ${id}`);
  }
  log('');
  if (problems.length > 0 || drift > 0) {
    if (problems.length > 0) log(`Artifact problems: ${problems.length} (listed above).`);
    if (drift > 0) log(`Drift detected: ${drift} document(s) differ from the manifest.`);
    process.exit(1);
  }
  log('No drift. Local artifacts and live Sanity both match the manifest.');
}

async function runExport(args) {
  const errors = [];
  const warnings = [];
  const warn = (msg) => {
    warnings.push(msg);
    log(`  [warn] ${msg}`);
  };
  const fail = (msg) => {
    errors.push(msg);
    log(`  [err] ${msg}`);
  };

  log('═══ Sanity Content Export → content/_data/site + public/images ═══');
  log(`Mode: ${args.dryRun ? 'DRY RUN' : 'WRITE'}, force=${args.force}, allowWarn=${args.allowWarn}`);
  log('');

  // 1. Fetch all docs per type
  log('Fetching documents...');
  const docsByType = new Map();
  const perTypeCounts = {};
  for (const type of LIVE_TYPES) {
    const docs = await fetchDocsForType(type);
    docsByType.set(type, docs);
    perTypeCounts[type] = docs.length;
    const expected = EXPECTED_COUNTS[type];
    if (docs.length !== expected) {
      warn(`${type}: live count ${docs.length} != expected ${expected} (appendix table)`);
    } else {
      log(`  [ok] ${type}: ${docs.length} docs`);
    }
  }
  const exportedDocIds = new Set(
    [...docsByType.values()].flat().map((d) => d._id),
  );
  log('');

  // 2. Collect image occurrences + all refs
  const occurrences = []; // { type, doc, fieldPath, node, inPortableText }
  const allRefs = []; // { type, docId, ref, fieldPath }
  for (const [type, docs] of docsByType) {
    for (const doc of docs) {
      for (const occ of collectImageOccurrences(doc)) {
        occurrences.push({ type, doc, ...occ });
      }
      for (const r of collectRefs(doc)) {
        allRefs.push({ type, docId: doc._id, ...r });
      }
    }
  }
  const imageAssetIds = [...new Set(occurrences.map((o) => imageAssetIdOf(o.node)))];
  log(`Collected ${occurrences.length} image reference(s) across ${imageAssetIds.length} unique asset(s).`);
  const inPtCount = occurrences.filter((o) => o.inPortableText).length;
  if (inPtCount > 0) {
    log(`  (${inPtCount} live inside Portable Text arrays — downloaded but JSON left verbatim)`);
  }

  // 3. Look up asset metadata
  log('Looking up asset metadata...');
  const assets = await lookupAssets(imageAssetIds);
  const missingAssets = imageAssetIds.filter((id) => !assets.has(id));
  for (const id of missingAssets) fail(`asset ${id} referenced but not found in Sanity`);
  log(`  → ${assets.size}/${imageAssetIds.length} assets resolved`);
  // Cross-check: the hash embedded in the asset _id must equal the asset
  // document's sha1hash (both describe the original bytes).
  for (const [id, asset] of assets) {
    const idSha1 = assetIdParts(id)?.sha1;
    if (!idSha1) {
      warn(`asset ${id}: cannot parse sha1 from asset _id`);
    } else if (!asset.sha1hash) {
      warn(`asset ${id}: no sha1hash on the asset document`);
    } else if (String(asset.sha1hash).toLowerCase() !== idSha1) {
      warn(`asset ${id}: sha1hash ${asset.sha1hash} != hash embedded in asset _id`);
    }
  }
  log('');

  // 4. Plan download units and local paths
  for (const occ of occurrences) {
    const assetId = imageAssetIdOf(occ.node);
    const asset = assets.get(assetId);
    if (!asset) continue; // already an error
    occ.assetId = assetId;
    occ.asset = asset;
    occ.alt = typeof occ.node.alt === 'string' && occ.node.alt.trim() ? occ.node.alt : undefined;
    occ.crop = hasMeaningfulCropOrHotspot(occ.node) ? occ.node.crop : undefined;
    occ.hotspot = hasMeaningfulCropOrHotspot(occ.node) ? occ.node.hotspot : undefined;
    occ.materializedUrl = hasMeaningfulCropOrHotspot(occ.node)
      ? buildMaterializedUrl(occ.node, { projectId: SANITY.projectId, dataset: SANITY.dataset })
      : undefined;
    if (occ.type === 'state_list' && occ.fieldPath === 'state_map') {
      occ.dir = '/images/states';
      const ext = (asset.extension ?? extFromUrl(asset.url) ?? 'jpg').toLowerCase();
      occ.filename = `${slugify(docSlugOrId(occ.doc))}.${ext}`;
    } else {
      occ.dir = `/images/content/${kebabCase(occ.type)}`;
      occ.filename = deriveImageFilename({ asset, doc: occ.doc, fieldPath: occ.fieldPath });
    }
    occ.unitKey = `${assetId}|${occ.materializedUrl ?? 'raw'}|${occ.dir}/${occ.filename}`;
  }
  const planned = occurrences.filter((o) => o.asset);
  const pathByUnit = assignUniquePaths(planned);
  for (const occ of planned) occ.localPath = pathByUnit.get(occ.unitKey);

  const croppedOutsideStateMap = planned.filter(
    (o) => o.materializedUrl && !(o.type === 'state_list' && o.fieldPath === 'state_map'),
  );
  if (croppedOutsideStateMap.length > 0) {
    log(`Note: ${croppedOutsideStateMap.length} crop/hotspot image(s) outside state_list.state_map:`);
    for (const o of croppedOutsideStateMap) log(`  - ${o.type} ${o.doc._id} ${o.fieldPath}`);
  }

  // 5. Download / validate each unique unit
  log('');
  log('Downloading images...');
  const unitResults = new Map(); // unitKey → { sha256, bytes, mime, width, height, localPath }
  let downloaded = 0;
  let skippedExisting = 0;
  let validationFailed = 0;
  const uniqueUnits = [...new Map(planned.map((o) => [o.unitKey, o])).values()];
  for (const occ of uniqueUnits) {
    const isMaterialized = Boolean(occ.materializedUrl);
    // Raw originals: `?dlRaw=true` + Authorization returns the stored bytes
    // byte-exact (the CDN otherwise transcodes, e.g. webp → png). Materialized
    // crop/hotspot renditions are transforms — fetched as the app would.
    const fetchUrl = isMaterialized ? occ.materializedUrl : `${occ.asset.url}?dlRaw=true`;
    let localPath = occ.localPath;
    let destAbs = join(ROOT, 'public', ...localPath.split('/').filter(Boolean));
    const isSvg = (occ.asset.extension ?? '') === 'svg' || occ.asset.mimeType === 'image/svg+xml';

    if (args.dryRun) {
      log(`  [dry] would download ${fetchUrl} → public${localPath}`);
      unitResults.set(occ.unitKey, {
        localPath,
        sha256: null,
        bytes: occ.asset.size ?? null,
        mime: occ.asset.mimeType ?? EXT_TO_MIME[occ.asset.extension] ?? null,
        width: occ.asset.metadata?.dimensions?.width ?? null,
        height: occ.asset.metadata?.dimensions?.height ?? null,
        resolved: true,
      });
      continue;
    }

    try {
      let buf;
      let mime;
      if (existsSync(destAbs) && !args.force) {
        buf = readFileSync(destAbs);
        mime = EXT_TO_MIME[extFromUrl(localPath) ?? ''] ?? occ.asset.mimeType ?? null;
        skippedExisting += 1;
      } else {
        // Accept header is a safety net for the materialized path (content
        // negotiation); dlRaw ignores it and serves the stored bytes.
        const headers = {
          accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif,image/svg+xml,image/*;q=0.9,*/*;q=0.8',
        };
        // dlRaw requires auth (unauthenticated dlRaw is a 401).
        if (!isMaterialized) headers.authorization = `Bearer ${SANITY.token}`;
        const res = await fetch(fetchUrl, { headers });
        const contentType = res.headers.get('content-type') ?? '';
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!contentType.startsWith('image/')) {
          throw new Error(`content-type "${contentType}" is not image/*`);
        }
        buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength === 0) throw new Error('empty body');
        mime = contentType.split(';')[0].trim();
        // auto=format can serve a different encoding than the asset's extension
        const actualExt = extFromContentType(mime);
        const plannedExt = extFromUrl(localPath);
        if (actualExt && plannedExt && !extsEquivalent(actualExt, plannedExt)) {
          localPath = localPath.replace(/\.[a-zA-Z0-9]+$/, `.${actualExt}`);
          destAbs = join(ROOT, 'public', ...localPath.split('/').filter(Boolean));
          occ.localPath = localPath;
        }
        mkdirSync(dirname(destAbs), { recursive: true });
        writeFileSync(destAbs, buf);
        downloaded += 1;
      }

      // Byte-fidelity gate: raw originals must hash to the sha1 embedded in the
      // asset _id. Materialized renditions are transforms — exempt (the
      // HTTP/MIME/dimension checks above/below still apply). Also verifies
      // pre-existing files kept from an earlier run.
      let fidelity = null;
      if (!isMaterialized) {
        fidelity = verifyRawAssetBytes(buf, { ...occ.asset, _id: occ.assetId });
        if (fidelity.error) {
          throw new Error(`byte fidelity: ${fidelity.error} (public${localPath})`);
        }
        if (fidelity.cdnSanitized) {
          log(`  [note] ${occ.assetId.slice(0, 24)}…: CDN-sanitized SVG accepted (same byte length, sha1 differs)`);
        }
      }

      const sha256 = createHash('sha256').update(buf).digest('hex');
      let dims = null;
      if (isSvg || mime === 'image/svg+xml') {
        dims = occ.asset.metadata?.dimensions ?? null; // SVG: MIME check only
      } else {
        dims = await decodeDimensionsWithFallback(buf);
        if (!dims) {
          validationFailed += 1;
          fail(`${occ.assetId}: could not decode width/height for public${localPath}`);
        }
      }
      unitResults.set(occ.unitKey, {
        localPath,
        sha256,
        bytes: buf.byteLength,
        mime,
        width: dims?.width ?? null,
        height: dims?.height ?? null,
        sha1: fidelity?.sha1 ?? null,
        sha1Verified: fidelity?.sha1Verified ?? false,
        cdnSanitized: fidelity?.cdnSanitized ?? false,
        expectedSha1: fidelity?.expectedSha1 ?? null,
        resolved: true,
      });
      log(`  [ok] ${occ.assetId.slice(0, 24)}… → public${localPath}`);
    } catch (err) {
      validationFailed += 1;
      fail(`${occ.assetId} → public${localPath}: ${err.message}`);
      unitResults.set(occ.unitKey, { localPath, resolved: false });
    }
  }
  // Propagate finalized paths (extension swaps) to every occurrence of a unit
  for (const occ of planned) {
    const unit = unitResults.get(occ.unitKey);
    if (unit?.localPath) occ.localPath = unit.localPath;
  }
  log(`  → ${downloaded} downloaded, ${skippedExisting} existing kept, ${validationFailed} failed`);
  log('');

  // 6. Reference closure
  const downloadedAssetIds = new Set(
    planned.filter((o) => unitResults.get(o.unitKey)?.resolved).map((o) => o.assetId),
  );
  const unresolvedRefs = [];
  const docRefIds = [
    ...new Set(
      allRefs
        .map((r) => r.ref)
        .filter((ref) => !isImageAssetId(ref) && !exportedDocIds.has(ref)),
    ),
  ];
  const refTypeById = docRefIds.length > 0 ? await lookupDocTypes(docRefIds) : new Map();
  for (const r of allRefs) {
    if (isImageAssetId(r.ref)) {
      if (!downloadedAssetIds.has(r.ref) && !args.dryRun) {
        unresolvedRefs.push({ ...r, reason: 'image asset not downloaded' });
      } else if (args.dryRun && !assets.has(r.ref)) {
        unresolvedRefs.push({ ...r, reason: 'image asset not found in Sanity' });
      }
      continue;
    }
    if (exportedDocIds.has(r.ref)) continue;
    const refType = refTypeById.get(r.ref) ?? '(dangling — no such document)';
    if (REF_ALLOWLIST.includes(r.ref) || REF_ALLOWLIST.includes(refType)) continue;
    unresolvedRefs.push({ ...r, refType, reason: 'not an exported doc or downloaded asset' });
  }
  for (const u of unresolvedRefs) {
    fail(
      `unresolved _ref ${u.ref}${u.refType ? ` (type: ${u.refType})` : ''} at ${u.docId} ${u.fieldPath}`,
    );
  }

  // 7. Rewrite docs and write per-type JSON
  log('Writing content JSON...');
  const occByDocAndPath = new Map(
    planned.map((o) => [`${o.doc._id}|${o.fieldPath}`, o]),
  );
  const rewriteDoc = (doc) => {
    const replace = (node, path) => {
      const occ = occByDocAndPath.get(`${doc._id}|${path}`);
      if (!occ || !occ.localPath) return node; // unresolved: left as-is, already errored
      const unit = unitResults.get(occ.unitKey) ?? {};
      const out = {
        _sanityAssetId: occ.assetId,
        path: occ.localPath,
      };
      if (occ.alt !== undefined) out.alt = occ.alt;
      if (unit.width != null) out.width = unit.width;
      if (unit.height != null) out.height = unit.height;
      if (occ.crop) out.crop = occ.crop;
      if (occ.hotspot) out.hotspot = occ.hotspot;
      return out;
    };
    const visit = (value, path, inPT) => {
      if (Array.isArray(value)) {
        if (inPT || isPortableTextArray(value)) return value; // Portable Text: verbatim
        return value.map((v, i) => visit(v, `${path}[${i}]`, inPT));
      }
      if (!value || typeof value !== 'object') return value;
      if (isImageObject(value)) return replace(value, path);
      const out = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = visit(v, path ? `${path}.${k}` : k, inPT);
      }
      return out;
    };
    return visit(cleanDoc(doc), '', false);
  };

  let filesAdded = 0;
  let filesChanged = 0;
  let filesUnchanged = 0;
  const typesManifest = {};
  for (const type of LIVE_TYPES) {
    const docs = docsByType.get(type) ?? [];
    const serialized = stableStringify(docs.map(rewriteDoc));
    const filePath = join(CONTENT_DIR, `${type}.json`);

    // Parity gate: count + _id set between query result and (to-be-)written JSON
    const parsed = JSON.parse(serialized);
    const writtenIds = new Set(parsed.map((d) => d._id));
    const queryIds = new Set(docs.map((d) => d._id));
    if (
      parsed.length !== docs.length ||
      writtenIds.size !== queryIds.size ||
      [...queryIds].some((id) => !writtenIds.has(id))
    ) {
      fail(`${type}: written JSON does not match query result (count/_id set)`);
    }

    const existing = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : null;
    if (existing === serialized && !args.force) {
      filesUnchanged += 1;
    } else if (args.dryRun) {
      log(`  [dry] would write ${existing === null ? 'new' : 'changed'} content/_data/site/${type}.json (${docs.length} docs)`);
      if (existing === null) filesAdded += 1;
      else filesChanged += 1;
    } else {
      mkdirSync(CONTENT_DIR, { recursive: true });
      writeFileSync(filePath, serialized);
      if (existing === null) filesAdded += 1;
      else filesChanged += 1;
      log(`  [ok] content/_data/site/${type}.json (${docs.length} docs, ${existing === null ? 'added' : 'changed'})`);
    }

    typesManifest[type] = {
      count: docs.length,
      // sha256 of the serialized JSON: --check recomputes it from disk, so
      // field-level corruption that preserves the count/_id set is caught.
      sha256: sha256Hex(serialized),
      ids: Object.fromEntries(docs.map((d) => [d._id, d._rev])),
    };

    // Post-write verification against the file actually on disk
    if (!args.dryRun) {
      const onDisk = JSON.parse(readFileSync(filePath, 'utf-8'));
      const diskIds = new Set(onDisk.map((d) => d._id));
      if (onDisk.length !== docs.length || [...queryIds].some((id) => !diskIds.has(id))) {
        fail(`${type}: on-disk JSON does not match query result (count/_id set)`);
      }
    }
  }
  log(`  → ${filesAdded} added, ${filesChanged} changed, ${filesUnchanged} unchanged`);
  log('');

  // 8. Manifest (1:1 image-reference ↔ manifest entry)
  const imagesManifest = planned
    .map((occ) => {
      const unit = unitResults.get(occ.unitKey) ?? {};
      const entry = {
        assetId: occ.assetId,
        sourceUrl: occ.asset.url,
        sha1hash: occ.asset.sha1hash ?? null,
        size: occ.asset.size ?? null,
        localPath: unit.localPath ?? occ.localPath ?? null,
        sha256: unit.sha256 ?? null,
        bytes: unit.bytes ?? null,
        mime: unit.mime ?? null,
        docId: occ.doc._id,
        fieldPath: occ.fieldPath,
      };
      if (occ.materializedUrl) entry.materializedUrl = occ.materializedUrl;
      if (!args.dryRun && unit.resolved) {
        entry.sha1 = unit.sha1 ?? null;
        entry.sha1Verified = unit.sha1Verified ?? false;
        if (unit.cdnSanitized) {
          entry.cdnSanitized = true;
          entry.expectedSha1 = unit.expectedSha1 ?? null;
        }
      }
      if (unit.width != null) entry.width = unit.width;
      if (unit.height != null) entry.height = unit.height;
      if (occ.alt !== undefined) entry.alt = occ.alt;
      if (occ.crop) entry.crop = occ.crop;
      if (occ.hotspot) entry.hotspot = occ.hotspot;
      return entry;
    })
    .sort((a, b) => {
      const ka = `${a.docId}|${a.fieldPath}`;
      const kb = `${b.docId}|${b.fieldPath}`;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });

  // 1:1 gate: every image occurrence has exactly one manifest entry
  const entryKeys = imagesManifest.map((e) => `${e.docId}|${e.fieldPath}`);
  if (new Set(entryKeys).size !== entryKeys.length) {
    fail('duplicate (docId, fieldPath) manifest entries — image mapping is not 1:1');
  }
  if (imagesManifest.length !== occurrences.length) {
    fail(
      `image mapping is not 1:1: ${occurrences.length} references vs ${imagesManifest.length} manifest entries`,
    );
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    types: typesManifest,
    images: imagesManifest,
    report: {
      errors,
      warnings,
      perTypeCounts,
      referenceClosure: {
        unresolvedRefs: unresolvedRefs.map(({ ref, refType, docId, fieldPath, reason }) => ({
          ref,
          ...(refType ? { refType } : {}),
          docId,
          fieldPath,
          reason,
        })),
      },
      imageValidation: {
        checked: args.dryRun ? 0 : uniqueUnits.length,
        failed: validationFailed,
      },
    },
  };

  if (args.dryRun) {
    log('  [dry] would write content/_data/site/_manifest.json');
  } else if (errors.length > 0) {
    // Never bless a failed export: --check trusts the manifest, so a manifest
    // is only written when the run finished with zero errors.
    log(`  [skip] manifest NOT written (${errors.length} error(s); previous manifest left intact)`);
  } else {
    const existing = existsSync(MANIFEST_PATH)
      ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))
      : null;
    if (existing && manifestsEquivalent(existing, manifest) && !args.force) {
      log('  [ok] manifest unchanged');
    } else {
      mkdirSync(CONTENT_DIR, { recursive: true });
      writeFileSync(MANIFEST_PATH, stableStringify(manifest));
      log('  [ok] content/_data/site/_manifest.json written');
    }
  }

  // 9. Summary + gates
  const totalDocs = Object.values(perTypeCounts).reduce((a, b) => a + b, 0);
  log('');
  log('═══ Summary ═══');
  log(`  Types exported:     ${LIVE_TYPES.length}`);
  log(`  Documents:          ${totalDocs}`);
  log(`  Image references:   ${occurrences.length} (${imageAssetIds.length} unique assets, ${uniqueUnits.length} files)`);
  log(`  Images downloaded:  ${args.dryRun ? '(dry run — none)' : `${downloaded} (+${skippedExisting} existing kept)`}`);
  log(`  JSON files:         ${filesAdded} added, ${filesChanged} changed, ${filesUnchanged} unchanged`);
  log(`  Unresolved refs:    ${unresolvedRefs.length}`);
  log(`  Warnings:           ${warnings.length}`);
  log(`  Errors:             ${errors.length}`);

  if (errors.length > 0) {
    log('');
    log(`FAILED: ${errors.length} error(s).`);
    process.exit(1);
  }
  if (warnings.length > 0 && !args.allowWarn) {
    log('');
    log(`FAILED: ${warnings.length} warning(s) and warnings are fatal (pass --allow-warn to iterate).`);
    process.exit(1);
  }
  log('');
  log(args.dryRun ? 'Dry run clean.' : 'Export clean.');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  validateEnv();
  if (args.check) return runCheck();
  return runExport(args);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
