import { describe, expect, it } from 'vitest';
import { rankBlogSearch, scoreBlogSearch } from '@/lib/blog/search';
import type { BlogPost } from '@/lib/blog/types';

function makePost(overrides: Partial<BlogPost>): BlogPost {
  return {
    title: 'Untitled',
    metaTitle: 'Untitled',
    metaDescription: '',
    slug: 'untitled',
    publishedAt: '2026-01-01',
    component: 'PCS Help',
    categories: [],
    mainImage: { src: '/images/blog/x.png', alt: '' },
    author: {},
    content: '',
    filepath: '/content/blog/x.mdx',
    ...overrides,
  };
}

describe('rankBlogSearch', () => {
  it('ranks a title match above a body match', () => {
    const titleHit = makePost({ slug: 'title-hit', title: 'BAH rates explained' });
    const bodyHit = makePost({
      slug: 'body-hit',
      title: 'Moving checklist',
      content: 'Your BAH covers most of the rent.',
      publishedAt: '2026-06-01', // newer, so only the score can put it second
    });

    const results = rankBlogSearch([bodyHit, titleHit], 'bah');
    expect(results.map((p) => p.slug)).toEqual(['title-hit', 'body-hit']);
  });

  it('excludes posts that do not match every term (AND semantics)', () => {
    const both = makePost({ slug: 'both', title: 'VA loan basics' });
    const onlyVa = makePost({ slug: 'only-va', title: 'VA benefits overview' });

    const results = rankBlogSearch([both, onlyVa], 'va loan');
    expect(results.map((p) => p.slug)).toEqual(['both']);
  });

  it('adds a bonus when the whole phrase appears in the title', () => {
    const phraseInTitle = makePost({ slug: 'phrase', title: 'VA loan guide' });
    const termsScattered = makePost({
      slug: 'scattered',
      title: 'Loan tips for VA buyers',
      publishedAt: '2026-06-01', // newer; without the bonus recency would win
    });

    const results = rankBlogSearch([termsScattered, phraseInTitle], 'va loan');
    expect(results.map((p) => p.slug)).toEqual(['phrase', 'scattered']);
  });

  it('breaks score ties by newer publishedAt', () => {
    const older = makePost({ slug: 'older', title: 'PCS timeline', publishedAt: '2025-03-01' });
    const newer = makePost({ slug: 'newer', title: 'PCS checklist', publishedAt: '2026-05-01' });

    const results = rankBlogSearch([older, newer], 'pcs');
    expect(results.map((p) => p.slug)).toEqual(['newer', 'older']);
  });

  it('returns [] for empty or whitespace-only queries', () => {
    const post = makePost({ slug: 'any', title: 'Anything' });
    expect(rankBlogSearch([post], '')).toEqual([]);
    expect(rankBlogSearch([post], '   ')).toEqual([]);
  });

  it('matches case-insensitively', () => {
    const post = makePost({ slug: 'caps', title: 'Fort Bragg Housing' });
    expect(rankBlogSearch([post], 'FORT bragg').map((p) => p.slug)).toEqual(['caps']);
  });
});

describe('scoreBlogSearch', () => {
  it('sums the weight of every field a term matches', () => {
    const post = makePost({
      title: 'BAH rates',
      primaryKeyword: 'bah rates',
      content: 'bah',
    });
    // title 8 + primaryKeyword 6 + content 1
    expect(scoreBlogSearch(post, ['bah'], 'bah')).toBe(15);
  });

  it('returns 0 when any term matches nothing', () => {
    const post = makePost({ title: 'VA benefits overview' });
    expect(scoreBlogSearch(post, ['va', 'loan'], 'va loan')).toBe(0);
  });
});
