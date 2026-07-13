import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  buildBlogCardCta,
  registryPostToCardData,
  toBlogCardData,
  type BlogCardCtaContext,
} from '@/lib/blog/cards';
import type { InternalLinkRegistryPost } from '@/lib/blog/registry';
import type { BlogPost } from '@/lib/blog/types';

function post(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    title: 'PCS Checklist for Fort Carson',
    shortTitle: 'Fort Carson PCS',
    metaTitle: 'PCS Checklist for Fort Carson | VeteranPCS',
    metaDescription: 'Meta description for SERP.',
    slug: 'pcs-checklist-fort-carson',
    publishedAt: '2026-06-01T00:00:00.000Z',
    component: 'PCS Help',
    categories: ['PCS Help'],
    mainImage: { src: '/images/blog/fort-carson.jpg', alt: 'Fort Carson gate' },
    author: { name: 'Test Agent' },
    content: 'Body text for the post. '.repeat(60),
    filepath: 'content/blog/pcs-checklist-fort-carson.mdx',
    ...overrides,
  };
}

function registryPost(
  overrides: Partial<InternalLinkRegistryPost> = {},
): InternalLinkRegistryPost {
  return {
    slug: 'pcs-checklist-fort-carson',
    title: 'PCS Checklist for Fort Carson',
    url: '/blog/pcs-checklist-fort-carson',
    component: 'PCS Help',
    componentSlug: 'pcs-help',
    stateSlug: null,
    stateSource: null,
    categories: ['PCS Help'],
    description: 'Registry description.',
    publishedAt: '2026-06-01T00:00:00.000Z',
    updatedAt: null,
    primaryKeyword: null,
    ...overrides,
  };
}

describe('toBlogCardData', () => {
  it('maps BlogPost fields onto card data', () => {
    const card = toBlogCardData(post({ description: 'Card summary.' }));

    expect(card.slug).toBe('pcs-checklist-fort-carson');
    expect(card.title).toBe('PCS Checklist for Fort Carson');
    expect(card.shortTitle).toBe('Fort Carson PCS');
    expect(card.description).toBe('Card summary.');
    expect(card.publishedAt).toBe('2026-06-01T00:00:00.000Z');
    expect(card.badge).toBe('PCS Help');
    expect(card.image).toEqual({
      src: '/images/blog/fort-carson.jpg',
      alt: 'Fort Carson gate',
    });
    expect(card.authorName).toBe('Test Agent');
    expect(card.readTimeMinutes).toBeGreaterThanOrEqual(1);
  });

  it('prefers frontmatter description, then metaDescription, then a derived excerpt', () => {
    expect(
      toBlogCardData(post({ description: 'Plain summary.' })).description,
    ).toBe('Plain summary.');

    expect(toBlogCardData(post({ description: undefined })).description).toBe(
      'Meta description for SERP.',
    );

    const derived = toBlogCardData(
      post({ description: undefined, metaDescription: '', content: 'Short body only.' }),
    );
    expect(derived.description).toBe('Short body only.');
  });

  it('handles missing image, author name, and component label', () => {
    const card = toBlogCardData(
      post({
        mainImage: { src: '', alt: '' },
        author: {},
        component: '',
        categories: ['VA Loan Help'],
      }),
    );

    expect(card.image).toBeUndefined();
    expect(card.authorName).toBeUndefined();
    expect(card.badge).toBe('VA Loan Help');
  });

  it('falls back to the post title for image alt text', () => {
    const card = toBlogCardData(
      post({ mainImage: { src: '/images/blog/x.jpg', alt: '' } }),
    );
    expect(card.image?.alt).toBe('PCS Checklist for Fort Carson');
  });
});

describe('registryPostToCardData', () => {
  it('maps registry fields onto card data', () => {
    const card = registryPostToCardData(registryPost());

    expect(card.slug).toBe('pcs-checklist-fort-carson');
    expect(card.title).toBe('PCS Checklist for Fort Carson');
    expect(card.description).toBe('Registry description.');
    expect(card.publishedAt).toBe('2026-06-01T00:00:00.000Z');
    expect(card.badge).toBe('PCS Help');
  });

  it('normalizes missing registry fields (no body, image, or author available)', () => {
    const card = registryPostToCardData(
      registryPost({ description: undefined, publishedAt: null, component: '' }),
    );

    expect(card.description).toBeUndefined();
    expect(card.publishedAt).toBeUndefined();
    expect(card.badge).toBe('PCS Help');
    expect(card.image).toBeUndefined();
    expect(card.authorName).toBeUndefined();
    expect(card.readTimeMinutes).toBeUndefined();
  });
});

describe('buildBlogCardCta', () => {
  const slug = 'pcs-checklist-fort-carson';

  const contexts: Array<{ label: string; cta: BlogCardCtaContext }> = [
    {
      label: 'archive grid',
      cta: {
        ctaId: 'blog_archive_card',
        ctaPosition: 'blog_archive_grid',
        pageType: 'blog_archive',
      },
    },
    {
      label: 'related rail',
      cta: {
        ctaId: 'blog_related_card',
        ctaPosition: 'blog_related_rail',
        pageType: 'blog_post',
        ctaLocation: 'blog_post_footer',
      },
    },
    {
      label: 'search results',
      cta: {
        ctaId: 'blog_search_result_card',
        ctaPosition: 'blog_search_results',
        pageType: 'blog_search',
      },
    },
  ];

  it.each(contexts)('passes caller identity through for the $label context', ({ cta }) => {
    const built = buildBlogCardCta(cta, slug);

    expect(built.ctaId).toBe(cta.ctaId);
    expect(built.ctaPosition).toBe(cta.ctaPosition);
    expect(built.pageType).toBe(cta.pageType);
    expect(built.ctaLocation).toBe(cta.ctaLocation);
    expect(built.ctaIntent).toBe('content_navigation');
    expect(built.ctaComponent).toBe('blog_card');
    expect(built.contentSlug).toBe(slug);
    expect(built.contentType).toBe('blog_post');
    expect(built.destination).toBe(`/blog/${slug}`);
  });
});
