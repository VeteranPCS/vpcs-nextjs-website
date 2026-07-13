import type { BlogPost } from '@/lib/blog/types';
import { resolveBlogStateSlug } from '@/lib/blog/state';

export type RankedBlog = {
  blog: BlogPost;
  score: number;
  sameComponent: boolean;
  stateMatch: boolean;
};

/**
 * Scores and sorts related-post candidates for a current post.
 * The weights are moved verbatim from CommonBlog.tsx: same component +3,
 * same resolved state +4, same primary keyword +2, +1 per shared category.
 * Excludes the current post, zero-score candidates, and unpublished
 * future-dated posts (getAllBlogs filters those upstream; kept here so the
 * ranking is safe on unfiltered input too).
 */
export function rankRelatedBlogs(all: BlogPost[], current: BlogPost): RankedBlog[] {
  const categorySet = new Set(current.categories ?? []);
  const stateSlug = resolveBlogStateSlug(current);
  const component = current.component;
  const primaryKeyword = current.primaryKeyword;
  const now = Date.now();

  return all
    .filter((blog) => blog.slug !== current.slug)
    .filter((blog) => !blog.publishedAt || new Date(blog.publishedAt).getTime() <= now)
    .map((blog) => {
      let score = 0;
      const sameComponent = Boolean(component && blog.component === component);
      if (sameComponent) score += 3;
      const candidateState = resolveBlogStateSlug(blog);
      const stateMatch = Boolean(stateSlug && candidateState === stateSlug);
      if (stateMatch) score += 4;
      if (primaryKeyword && blog.primaryKeyword === primaryKeyword) score += 2;
      score += (blog.categories ?? []).filter((category) => categorySet.has(category)).length;
      return { blog, score, sameComponent, stateMatch };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.blog.publishedAt).getTime() - new Date(a.blog.publishedAt).getTime());
}

export type PickRelatedOptions = {
  limit?: number;
  crossComponentMin?: number;
  excludeSlugs?: string[];
};

/**
 * Picks the top `limit` ranked candidates, guaranteeing at least
 * `crossComponentMin` picks from a different component than the current post
 * when such candidates exist. Cross-component candidates are swapped in for
 * the lowest-scored same-component picks; a pick whose resolved state matches
 * the current post's state is never evicted.
 */
export function pickRelated(ranked: RankedBlog[], options: PickRelatedOptions = {}): BlogPost[] {
  const { limit = 6, crossComponentMin = 2, excludeSlugs = [] } = options;
  const excluded = new Set(excludeSlugs);
  const candidates = ranked.filter(({ blog }) => !excluded.has(blog.slug));

  const picks = candidates.slice(0, limit);
  const crossPool = candidates.slice(limit).filter((entry) => !entry.sameComponent);

  let deficit = crossComponentMin - picks.filter((entry) => !entry.sameComponent).length;
  let poolIndex = 0;
  while (deficit > 0 && poolIndex < crossPool.length) {
    // Lowest-scored pick is the last one in ranked order; skip state matches.
    let evictIndex = -1;
    for (let i = picks.length - 1; i >= 0; i -= 1) {
      const pick = picks[i];
      if (pick && pick.sameComponent && !pick.stateMatch) {
        evictIndex = i;
        break;
      }
    }
    if (evictIndex === -1) break;

    const incoming = crossPool[poolIndex];
    poolIndex += 1;
    if (!incoming) break; // unreachable: poolIndex < crossPool.length, kept for noUncheckedIndexedAccess
    picks.splice(evictIndex, 1);
    picks.push(incoming);
    deficit -= 1;
  }

  // Restore ranked (score desc, date desc) ordering after swaps.
  const rankOrder = new Map(candidates.map((entry, index) => [entry.blog.slug, index]));
  picks.sort(
    (a, b) => (rankOrder.get(a.blog.slug) ?? 0) - (rankOrder.get(b.blog.slug) ?? 0),
  );

  return picks.map(({ blog }) => blog);
}

export type PickNextGuideOptions = {
  excludeSlugs?: string[];
};

/** Picks the single top-scored candidate whose slug is not excluded. */
export function pickNextGuide(ranked: RankedBlog[], options: PickNextGuideOptions = {}): BlogPost | null {
  const excluded = new Set(options.excludeSlugs ?? []);
  const first = ranked.find(({ blog }) => !excluded.has(blog.slug));
  return first?.blog ?? null;
}
