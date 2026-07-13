import { describe, expect, it } from 'vitest';
import { rankRelatedBlogs, pickRelated, pickNextGuide } from '@/lib/blog/related';
import type { BlogPost } from '@/lib/blog/types';

function makePost(overrides: Partial<BlogPost> & { slug: string }): BlogPost {
  return {
    title: overrides.slug,
    metaTitle: overrides.slug,
    metaDescription: '',
    publishedAt: '2026-01-01',
    component: 'pcs-help',
    categories: [],
    mainImage: { src: '/images/blog/test.webp', alt: '' },
    author: {},
    content: '',
    filepath: `content/blog/${overrides.slug}.mdx`,
    ...overrides,
  };
}

const current = makePost({
  slug: 'current-post',
  component: 'pcs-help',
  stateSlug: 'texas',
  primaryKeyword: 'pcs move',
  categories: ['moving', 'housing'],
});

describe('rankRelatedBlogs score parity with CommonBlog', () => {
  it('scores same component +3', () => {
    const candidate = makePost({ slug: 'same-component', component: 'pcs-help' });
    const ranked = rankRelatedBlogs([candidate], current);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.score).toBe(3);
    expect(ranked[0]?.sameComponent).toBe(true);
  });

  it('scores same resolved state +4', () => {
    const candidate = makePost({ slug: 'same-state', component: 'other', stateSlug: 'texas' });
    const ranked = rankRelatedBlogs([candidate], current);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.score).toBe(4);
    expect(ranked[0]?.stateMatch).toBe(true);
  });

  it('scores same primary keyword +2', () => {
    const candidate = makePost({ slug: 'same-keyword', component: 'other', primaryKeyword: 'pcs move' });
    const ranked = rankRelatedBlogs([candidate], current);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.score).toBe(2);
  });

  it('scores +1 per overlapping category', () => {
    const candidate = makePost({ slug: 'two-categories', component: 'other', categories: ['moving', 'housing', 'unrelated'] });
    const ranked = rankRelatedBlogs([candidate], current);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.score).toBe(2);
  });

  it('sums all weights for a full match', () => {
    const candidate = makePost({
      slug: 'full-match',
      component: 'pcs-help',
      stateSlug: 'texas',
      primaryKeyword: 'pcs move',
      categories: ['moving'],
    });
    const ranked = rankRelatedBlogs([candidate], current);
    expect(ranked[0]?.score).toBe(3 + 4 + 2 + 1);
  });

  it('excludes the current post, zero-score posts, and future-dated posts', () => {
    const posts = [
      makePost({ slug: 'current-post', component: 'pcs-help' }),
      makePost({ slug: 'no-overlap', component: 'other' }),
      makePost({ slug: 'future-post', component: 'pcs-help', publishedAt: '2999-01-01' }),
      makePost({ slug: 'keeper', component: 'pcs-help' }),
    ];
    const ranked = rankRelatedBlogs(posts, current);
    expect(ranked.map(({ blog }) => blog.slug)).toEqual(['keeper']);
  });

  it('sorts by score desc, then newest publishedAt', () => {
    const posts = [
      makePost({ slug: 'low-old', component: 'other', categories: ['moving'], publishedAt: '2024-01-01' }),
      makePost({ slug: 'high', component: 'pcs-help', publishedAt: '2023-01-01' }),
      makePost({ slug: 'low-new', component: 'other', categories: ['moving'], publishedAt: '2025-01-01' }),
    ];
    const ranked = rankRelatedBlogs(posts, current);
    expect(ranked.map(({ blog }) => blog.slug)).toEqual(['high', 'low-new', 'low-old']);
  });
});

describe('pickRelated', () => {
  it('returns the top picks when the cross-component quota is already met', () => {
    const posts = [
      makePost({ slug: 's1', component: 'pcs-help', categories: ['moving'] }),
      makePost({ slug: 'x1', component: 'other', stateSlug: 'texas' }),
      makePost({ slug: 'x2', component: 'other', categories: ['moving', 'housing'] }),
    ];
    const ranked = rankRelatedBlogs(posts, current);
    const picks = pickRelated(ranked, { limit: 3, crossComponentMin: 2 });
    // s1 (3+1) ties x1 (state +4); stable sort keeps input order on equal score and date.
    expect(picks.map((blog) => blog.slug)).toEqual(['s1', 'x1', 'x2']);
  });

  it('swaps top cross-component candidates in for the lowest-scored same-component picks', () => {
    // Same-component scores: s1=3+2cats=5, s2=3+1cat=4, s3=3. Cross: x1=2cats, x2=1cat.
    const posts = [
      makePost({ slug: 's1', component: 'pcs-help', categories: ['moving', 'housing'] }),
      makePost({ slug: 's2', component: 'pcs-help', categories: ['moving'] }),
      makePost({ slug: 's3', component: 'pcs-help' }),
      makePost({ slug: 'x1', component: 'other', categories: ['moving', 'housing'] }),
      makePost({ slug: 'x2', component: 'other', categories: ['moving'] }),
    ];
    const ranked = rankRelatedBlogs(posts, current);
    const picks = pickRelated(ranked, { limit: 3, crossComponentMin: 2 });
    const slugs = picks.map((blog) => blog.slug);
    expect(slugs).toContain('s1');
    expect(slugs).toContain('x1');
    expect(slugs).toContain('x2');
    expect(slugs).not.toContain('s2');
    expect(slugs).not.toContain('s3');
  });

  it('never evicts a state-matched pick to satisfy the quota', () => {
    // s3 is lowest-scored same-component but state-matched; s2 is evicted instead.
    const posts = [
      makePost({ slug: 's1', component: 'pcs-help', categories: ['moving', 'housing'], primaryKeyword: 'pcs move' }), // 3+2+2 = 7
      makePost({ slug: 's2', component: 'pcs-help', categories: ['moving'] }), // 3+1 = 4
      makePost({ slug: 's3', component: 'pcs-help', stateSlug: 'texas' }), // 3+4 = 7
      makePost({ slug: 'x1', component: 'other', categories: ['moving'] }), // 1
    ];
    const ranked = rankRelatedBlogs(posts, current);
    const picks = pickRelated(ranked, { limit: 3, crossComponentMin: 1 });
    const slugs = picks.map((blog) => blog.slug);
    expect(slugs).toContain('s3');
    expect(slugs).toContain('x1');
    expect(slugs).not.toContain('s2');
  });

  it('keeps the top picks unchanged when no cross-component candidates exist', () => {
    const posts = [
      makePost({ slug: 's1', component: 'pcs-help', categories: ['moving'] }),
      makePost({ slug: 's2', component: 'pcs-help' }),
    ];
    const ranked = rankRelatedBlogs(posts, current);
    const picks = pickRelated(ranked, { limit: 2, crossComponentMin: 2 });
    expect(picks.map((blog) => blog.slug)).toEqual(['s1', 's2']);
  });

  it('excludes slugs passed via excludeSlugs', () => {
    const posts = [
      makePost({ slug: 's1', component: 'pcs-help', categories: ['moving'] }),
      makePost({ slug: 's2', component: 'pcs-help' }),
    ];
    const ranked = rankRelatedBlogs(posts, current);
    const picks = pickRelated(ranked, { limit: 2, crossComponentMin: 0, excludeSlugs: ['s1'] });
    expect(picks.map((blog) => blog.slug)).toEqual(['s2']);
  });
});

describe('pickNextGuide', () => {
  it('returns the top-scored candidate', () => {
    const posts = [
      makePost({ slug: 's1', component: 'pcs-help', categories: ['moving'] }),
      makePost({ slug: 's2', component: 'pcs-help' }),
    ];
    const ranked = rankRelatedBlogs(posts, current);
    expect(pickNextGuide(ranked)?.slug).toBe('s1');
  });

  it('skips excluded slugs', () => {
    const posts = [
      makePost({ slug: 's1', component: 'pcs-help', categories: ['moving'] }),
      makePost({ slug: 's2', component: 'pcs-help' }),
    ];
    const ranked = rankRelatedBlogs(posts, current);
    expect(pickNextGuide(ranked, { excludeSlugs: ['s1'] })?.slug).toBe('s2');
  });

  it('returns null when everything is excluded', () => {
    const posts = [makePost({ slug: 's1', component: 'pcs-help', categories: ['moving'] })];
    const ranked = rankRelatedBlogs(posts, current);
    expect(pickNextGuide(ranked, { excludeSlugs: ['s1'] })).toBeNull();
  });
});
