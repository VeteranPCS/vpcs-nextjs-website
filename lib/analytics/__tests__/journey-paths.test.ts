import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import registry from '@/content/_registry/internal-links.json';
import states from '@/content/_data/us-states.json';
import paths from '@/content/_registry/journey-paths.json';

describe('public journey path allowlist', () => {
  it('matches registered public routes; regenerate with node scripts/build-journey-paths.mjs after route/content changes', () => {
    const pages = readdirSync('app/(site)', { recursive: true }).map(String)
      .filter((p) => (p === 'page.tsx' || p.endsWith('/page.tsx')) && !p.includes('['))
      .map((p) => '/' + p.replace(/(^|\/)page\.tsx$/, ''));
    const expected = [...new Set([...pages, ...states.map((s) => '/' + s.slug),
      ...registry.posts.map((p) => '/blog/' + p.slug),
      ...registry.posts.filter((p) => p.componentSlug).map((p) => '/blog/category/' + p.componentSlug)])].sort();
    expect(paths).toEqual(expected);
  });
});
