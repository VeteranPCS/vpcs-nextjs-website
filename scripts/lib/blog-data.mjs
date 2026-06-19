import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '..', '..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(ROOT, relativePath), 'utf-8'));
}

export const US_STATES = readJson('content/_data/us-states.json');
export const BLOG_COMPONENTS = readJson('content/_data/blog-components.json');
export const BLOG_STATE_MAP = readJson('content/_data/blog-state-map.json');

export const STATE_ABBR_TO_SLUG = Object.fromEntries(US_STATES.map((state) => [state.code, state.slug]));
export const STATE_SLUG_TO_ABBR = Object.fromEntries(US_STATES.map((state) => [state.slug, state.code]));
export const STATE_NAME_TO_ABBR = Object.fromEntries(US_STATES.map((state) => [compactStateInput(state.name), state.code]));

export const BLOG_COMPONENT_BY_SLUG = Object.fromEntries(BLOG_COMPONENTS.map((component) => [component.slug, component]));
export const BLOG_COMPONENT_BY_LABEL = Object.fromEntries(BLOG_COMPONENTS.map((component) => [component.label, component]));

const STATE_ALIAS_TO_ABBR = {
  dc: 'DC',
  dca: 'DC',
  districtcolumbia: 'DC',
  districtofcolumbia: 'DC',
  washingtondc: 'DC',
};

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function compactStateInput(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

export function normalizeStateSlug(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;

  const upper = normalized.toUpperCase();
  if (STATE_ABBR_TO_SLUG[upper]) return STATE_ABBR_TO_SLUG[upper];

  const slug = slugify(normalized.replace(/\./g, ''));
  if (STATE_SLUG_TO_ABBR[slug]) return slug;

  const code = STATE_NAME_TO_ABBR[compactStateInput(normalized)] ?? STATE_ALIAS_TO_ABBR[compactStateInput(normalized)];
  return code ? STATE_ABBR_TO_SLUG[code] : null;
}

export function normalizeBlogComponentSlug(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  if (BLOG_COMPONENT_BY_SLUG[normalized]) return normalized;
  if (BLOG_COMPONENT_BY_LABEL[normalized]) return BLOG_COMPONENT_BY_LABEL[normalized].slug;

  const slug = slugify(normalized);
  return BLOG_COMPONENT_BY_SLUG[slug] ? slug : null;
}

const STATE_SLUGS_BY_LENGTH = Object.values(STATE_ABBR_TO_SLUG).sort((a, b) => b.length - a.length);
const PREFIXES_REQUIRING_STATE_SUFFIX = ['what-military-bases-are-in-', 'pcsing-to-'];

export function getStateForBlogSlug(slug) {
  for (const prefix of PREFIXES_REQUIRING_STATE_SUFFIX) {
    if (slug.startsWith(prefix)) {
      const remainder = slug.slice(prefix.length);
      for (const state of STATE_SLUGS_BY_LENGTH) {
        if (remainder === state || remainder.startsWith(state + '-')) return state;
      }
    }
  }

  for (const state of STATE_SLUGS_BY_LENGTH) {
    if (slug.startsWith(state + '-military-bases')) return state;
  }

  return null;
}

function slugContainsAlias(slug, alias) {
  const slugTokens = slugify(slug).split('-').filter(Boolean);
  const aliasTokens = slugify(alias).split('-').filter(Boolean);
  if (aliasTokens.length === 0 || aliasTokens.length > slugTokens.length) return false;

  for (let i = 0; i <= slugTokens.length - aliasTokens.length; i += 1) {
    const candidate = slugTokens.slice(i, i + aliasTokens.length);
    if (candidate.every((token, index) => token === aliasTokens[index])) return true;
  }

  return false;
}

function firstValidState(value, source) {
  const stateSlug = normalizeStateSlug(value);
  return stateSlug ? { stateSlug, source } : null;
}

function resolveFromPostMap(slug) {
  const postEntry = BLOG_STATE_MAP.posts?.[slug];
  if (!postEntry) return null;
  return firstValidState(postEntry.stateSlug, 'state-map-post');
}

function resolveFromAliasMap(slug) {
  for (const [alias, stateSlugs] of Object.entries(BLOG_STATE_MAP.aliases ?? {})) {
    if (!slugContainsAlias(slug, alias)) continue;
    const valid = stateSlugs.map((state) => normalizeStateSlug(state)).filter(Boolean);
    const unique = Array.from(new Set(valid));
    if (unique.length === 1) return { stateSlug: unique[0], source: 'state-map-alias' };
    return null;
  }

  return null;
}

export function resolveBlogState(post) {
  return (
    firstValidState(post.data?.stateSlug, 'frontmatter-state-slug') ??
    firstValidState(post.data?.state, 'frontmatter-state') ??
    firstValidState(post.data?.author?.stateSlug, 'author-state-slug') ??
    firstValidState(post.data?.author?.state, 'author-state') ??
    resolveFromPostMap(post.slug) ??
    firstValidState(getStateForBlogSlug(post.slug), 'slug-heuristic') ??
    resolveFromAliasMap(post.slug)
  );
}

export function validateBlogStateMap() {
  const errors = [];
  for (const [slug, entry] of Object.entries(BLOG_STATE_MAP.posts ?? {})) {
    if (!normalizeStateSlug(entry.stateSlug)) errors.push(`Invalid post stateSlug for ${slug}: ${entry.stateSlug}`);
  }

  for (const [alias, states] of Object.entries(BLOG_STATE_MAP.aliases ?? {})) {
    if (!Array.isArray(states) || states.length === 0) {
      errors.push(`Alias ${alias} must list at least one state slug`);
      continue;
    }
    for (const state of states) {
      if (!normalizeStateSlug(state)) errors.push(`Invalid alias stateSlug for ${alias}: ${state}`);
    }
  }

  return errors;
}
