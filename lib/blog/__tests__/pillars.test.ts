import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import pillars from '@/content/_data/blog-pillars.json';
import components from '@/content/_data/blog-components.json';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

describe('blog-pillars.json', () => {
  const landing = pillars.landing as string[];
  const byComponent = pillars.byComponent as Record<string, string>;

  it('every pillar slug maps to an existing post in content/blog', () => {
    const existing = new Set(
      fs.readdirSync(BLOG_DIR).filter((file) => file.endsWith('.mdx')).map((file) => file.replace(/\.mdx$/, '')),
    );
    const allSlugs = [...landing, ...Object.values(byComponent)];
    for (const slug of allSlugs) {
      expect(existing.has(slug), `missing content/blog/${slug}.mdx`).toBe(true);
    }
  });

  it('landing has 3 to 4 pillars', () => {
    expect(landing.length).toBeGreaterThanOrEqual(3);
    expect(landing.length).toBeLessThanOrEqual(4);
  });

  it('byComponent keys are exactly the seven component slugs', () => {
    const componentSlugs = components.map((component) => component.slug).sort();
    expect(componentSlugs).toHaveLength(7);
    expect(Object.keys(byComponent).sort()).toEqual(componentSlugs);
  });
});
