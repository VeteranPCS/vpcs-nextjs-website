import stateMap from '@/content/_data/blog-state-map.json';
import type { BlogPost } from '@/lib/blog/types';
import { getStateForBlog, getStateDisplayName as displayNameFromSlug } from '@/lib/blog/getStateForBlog';
import { normalizeStateSlug, formatStateLabel } from '@/lib/states';

type BlogStateMap = {
  posts?: Record<string, { stateSlug: string; source: string; note?: string }>;
  aliases?: Record<string, string[]>;
};

export type BlogStateSource =
  | 'frontmatter-state-slug'
  | 'frontmatter-state'
  | 'author-state-slug'
  | 'author-state'
  | 'state-map-post'
  | 'slug-heuristic'
  | 'state-map-alias';

export type ResolvedBlogState = {
  stateSlug: string;
  source: BlogStateSource;
};

const BLOG_STATE_MAP = stateMap as BlogStateMap;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function firstValidState(
  value: string | null | undefined,
  source: BlogStateSource,
): ResolvedBlogState | null {
  const stateSlug = normalizeStateSlug(value);
  return stateSlug ? { stateSlug, source } : null;
}

function slugContainsAlias(slug: string, alias: string): boolean {
  const slugTokens = slugify(slug).split('-').filter(Boolean);
  const aliasTokens = slugify(alias).split('-').filter(Boolean);
  if (aliasTokens.length === 0 || aliasTokens.length > slugTokens.length) return false;

  for (let i = 0; i <= slugTokens.length - aliasTokens.length; i += 1) {
    const candidate = slugTokens.slice(i, i + aliasTokens.length);
    if (candidate.every((token, index) => token === aliasTokens[index])) return true;
  }

  return false;
}

function resolveFromPostMap(slug: string): ResolvedBlogState | null {
  const postEntry = BLOG_STATE_MAP.posts?.[slug];
  if (!postEntry) return null;

  return firstValidState(postEntry.stateSlug, 'state-map-post');
}

function resolveFromAliasMap(slug: string): ResolvedBlogState | null {
  for (const [alias, stateSlugs] of Object.entries(BLOG_STATE_MAP.aliases ?? {})) {
    if (!slugContainsAlias(slug, alias)) continue;
    const valid = stateSlugs.map((state) => normalizeStateSlug(state)).filter(Boolean);
    const unique = Array.from(new Set(valid));
    if (unique.length === 1) return { stateSlug: unique[0]!, source: 'state-map-alias' };
    return null;
  }

  return null;
}

export function resolveBlogState(post: Pick<BlogPost, 'slug' | 'stateSlug' | 'state' | 'author'>): ResolvedBlogState | null {
  return (
    firstValidState(post.stateSlug, 'frontmatter-state-slug') ??
    firstValidState(post.state, 'frontmatter-state') ??
    firstValidState(post.author?.stateSlug, 'author-state-slug') ??
    firstValidState(post.author?.state, 'author-state') ??
    resolveFromPostMap(post.slug) ??
    firstValidState(getStateForBlog(post.slug), 'slug-heuristic') ??
    resolveFromAliasMap(post.slug)
  );
}

export function resolveBlogStateSlug(post: Pick<BlogPost, 'slug' | 'stateSlug' | 'state' | 'author'>): string | null {
  return resolveBlogState(post)?.stateSlug ?? null;
}

export function getStateDisplayName(value: string): string {
  const formatted = formatStateLabel(value);
  return formatted || displayNameFromSlug(value);
}
