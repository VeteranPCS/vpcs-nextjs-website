import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
// Sanity-backed state list is external; the invariants under test are the blog
// URL sets, which come from the local MDX corpus.
vi.mock('@/services/stateService', () => ({
  default: { fetchStateList: vi.fn(async () => []) },
}));

import sitemap from '@/app/sitemap';
import { BLOG_COMPONENTS } from '@/lib/blog/components';
import { BLOG_CATEGORY_PAGE_SIZE, getAllBlogs, pageCount } from '@/lib/blog/mdx';
import { SITE_URL } from '@/lib/siteUrl';

describe('sitemap blog invariants', () => {
  async function build() {
    const entries = await sitemap();
    return { entries, urls: new Set(entries.map((entry) => entry.url)) };
  }

  it('includes /blog', async () => {
    const { urls } = await build();
    expect(urls.has(`${SITE_URL}/blog`)).toBe(true);
  });

  it('includes every post URL and its .md twin', async () => {
    const [{ urls }, blogs] = await Promise.all([build(), getAllBlogs()]);
    expect(blogs.length).toBeGreaterThan(300);
    for (const post of blogs) {
      expect(urls.has(`${SITE_URL}/blog/${post.slug}`), `missing /blog/${post.slug}`).toBe(true);
      expect(
        urls.has(`${SITE_URL}/blog/${post.slug}/page.md`),
        `missing /blog/${post.slug}/page.md`,
      ).toBe(true);
    }
  });

  it('includes every category hub and its full page/N range, and nothing beyond', async () => {
    const [{ urls }, blogs] = await Promise.all([build(), getAllBlogs()]);
    for (const component of BLOG_COMPONENTS) {
      const posts = blogs.filter((post) => post.component === component.label);
      const hubUrl = `${SITE_URL}/blog/category/${component.slug}`;
      if (posts.length === 0) {
        expect(urls.has(hubUrl)).toBe(false);
        continue;
      }
      expect(urls.has(hubUrl), `missing hub ${component.slug}`).toBe(true);
      const totalPages = pageCount(posts.length, BLOG_CATEGORY_PAGE_SIZE);
      for (let page = 2; page <= totalPages; page += 1) {
        expect(urls.has(`${hubUrl}/page/${page}`), `missing ${component.slug} page ${page}`).toBe(true);
      }
      expect(urls.has(`${hubUrl}/page/1`)).toBe(false);
      expect(urls.has(`${hubUrl}/page/${totalPages + 1}`)).toBe(false);
    }
  });

  it('includes the all-posts archive /blog/page/2..N, and nothing beyond', async () => {
    const [{ urls }, blogs] = await Promise.all([build(), getAllBlogs()]);
    const totalPages = pageCount(blogs.length, BLOG_CATEGORY_PAGE_SIZE);
    expect(totalPages).toBeGreaterThanOrEqual(2);
    for (let page = 2; page <= totalPages; page += 1) {
      expect(urls.has(`${SITE_URL}/blog/page/${page}`), `missing /blog/page/${page}`).toBe(true);
    }
    // Page 1 is /blog itself and must never be listed as /blog/page/1.
    expect(urls.has(`${SITE_URL}/blog/page/1`)).toBe(false);
    expect(urls.has(`${SITE_URL}/blog/page/${totalPages + 1}`)).toBe(false);
  });
});
