import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { buildBlogPageMarkdown } from '@/lib/blog/pageMarkdown';
import type { BlogPost } from '@/lib/blog/types';

function blogPost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    title: 'Fort Meade: BAH, Housing, and PCS Notes',
    metaTitle: 'Fort Meade PCS Guide',
    metaDescription: 'A Maryland PCS guide with punctuation-safe frontmatter.',
    slug: 'fort-meade-bah-2026-what-your-allowance-buys',
    publishedAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    component: 'U.S. Military Bases',
    categories: ['U.S. Military Bases', 'BAH: Housing'],
    mainImage: { src: '/images/blog/fort-meade/main.webp', alt: 'Fort Meade' },
    author: { name: 'VeteranPCS' },
    content: '<BAHCalculator />\n\n## Housing: What to Know\n\nUse BAH carefully.',
    filepath: '/content/blog/fort-meade.mdx',
    ...overrides,
  };
}

describe('buildBlogPageMarkdown', () => {
  it('serializes YAML-safe frontmatter with registry state and component slugs', () => {
    const markdown = buildBlogPageMarkdown(blogPost(), {
      baseUrl: 'https://example.test/',
      registryPost: {
        componentSlug: 'us-military-bases',
        stateSlug: 'maryland',
      },
    });

    const parsed = matter(markdown);

    expect(parsed.data.title).toBe('Fort Meade: BAH, Housing, and PCS Notes');
    expect(parsed.data.categories).toEqual(['U.S. Military Bases', 'BAH: Housing']);
    expect(parsed.data.componentSlug).toBe('us-military-bases');
    expect(parsed.data.stateSlug).toBe('maryland');
    expect(parsed.data.canonical).toBe(
      'https://example.test/blog/fort-meade-bah-2026-what-your-allowance-buys',
    );
    expect(parsed.content).toContain('# Fort Meade: BAH, Housing, and PCS Notes');
    expect(parsed.content).not.toContain('<BAHCalculator');
  });
});
