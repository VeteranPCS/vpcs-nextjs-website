import registry from '@/content/_registry/internal-links.json';
import { normalizeStateSlug } from '@/lib/states';

export type InternalLinkRegistryPost = {
  slug: string;
  title: string;
  url: string;
  component: string;
  componentSlug: string | null;
  stateSlug: string | null;
  stateSource: string | null;
  categories: string[];
  description?: string;
  publishedAt?: string | null;
  updatedAt?: string | null;
  primaryKeyword?: string | null;
};

type InternalLinkRegistry = {
  byState: Record<string, string[]>;
  posts: InternalLinkRegistryPost[];
};

const INTERNAL_LINK_REGISTRY = registry as unknown as InternalLinkRegistry;
const POSTS_BY_SLUG = new Map(
  INTERNAL_LINK_REGISTRY.posts.map((post) => [post.slug, post]),
);

export function getRegistryPost(slug: string): InternalLinkRegistryPost | null {
  return POSTS_BY_SLUG.get(slug) ?? null;
}

export function getStateGuidePosts(
  stateSlugInput: string | null | undefined,
  limit = 6,
): InternalLinkRegistryPost[] {
  const stateSlug = normalizeStateSlug(stateSlugInput);
  if (!stateSlug) return [];

  return (INTERNAL_LINK_REGISTRY.byState[stateSlug] ?? [])
    .map((slug) => getRegistryPost(slug))
    .filter((post): post is InternalLinkRegistryPost => Boolean(post))
    .slice(0, limit);
}
