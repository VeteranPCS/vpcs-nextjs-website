import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import stateList from '@/content/_data/site/state_list.json';
import subjectStateMap from '@/content/_data/blog-subject-state-map.json';
import { getStateForBlog } from '@/lib/blog/getStateForBlog';
import { getStateDisplayName, resolveBlogState, resolveBlogSubjectState } from '@/lib/blog/state';
import type { BlogPost } from '@/lib/blog/types';

type SubjectInput = Pick<BlogPost, 'slug' | 'stateSlug' | 'state' | 'author'>;

const HUB_SLUGS = new Set(stateList.map((state) => state.state_slug.current));
const BLOG_DIR = path.join(process.cwd(), 'content/blog');
const POSTS: SubjectInput[] = fs.readdirSync(BLOG_DIR)
  .filter((name) => name.endsWith('.mdx'))
  .map((name) => matter(fs.readFileSync(path.join(BLOG_DIR, name), 'utf8')).data as SubjectInput);
const POSTS_BY_SLUG = new Map(POSTS.map((post) => [post.slug, post]));

function subjectOf(slug: string): string | null {
  const post = POSTS_BY_SLUG.get(slug);
  if (!post) throw new Error(`Missing blog post: ${slug}`);
  return resolveBlogSubjectState(post)?.stateSlug ?? null;
}

describe('slug to state mapping with ambiguous state names', () => {
  it.each([
    ['what-military-bases-are-in-virginia', 'virginia'],
    ['what-military-bases-are-in-west-virginia', 'west-virginia'],
    ['what-military-bases-are-in-new-york', 'new-york'],
    ['what-military-bases-are-in-new-mexico', 'new-mexico'],
    ['what-military-bases-are-in-new-jersey', 'new-jersey'],
    ['what-military-bases-are-in-new-hampshire', 'new-hampshire'],
    ['what-military-bases-are-in-washington', 'washington'],
    ['what-military-bases-are-in-washington-dc', 'washington-dc'],
    ['what-military-bases-are-in-kansas', 'kansas'],
    ['what-military-bases-are-in-arkansas', 'arkansas'],
    ['what-military-bases-are-in-north-carolina', 'north-carolina'],
    ['what-military-bases-are-in-south-carolina', 'south-carolina'],
    ['what-military-bases-are-in-north-dakota', 'north-dakota'],
    ['what-military-bases-are-in-south-dakota', 'south-dakota'],
    ['pcsing-to-washington-state-guide', 'washington'],
    ['virginia-military-bases', 'virginia'],
    ['west-virginia-military-bases', 'west-virginia'],
    ['alabama-military-bases', 'alabama'],
  ])('%s resolves to %s', (slug, expected) => {
    expect(getStateForBlog(slug)).toBe(expected);
  });

  it.each([
    // "new", "va", "in", "or", "me" and "co" are words here, not states.
    'new-home-builders-offering-low-rates-here-is-the-clarity-you-need-to-know',
    'pcs-to-new-braunfels-a-veterans-guide-to-military-life-near-san-antonio-bases',
    'va-loan-vs-conventional-loan',
    'rent-or-sell-your-home-when-you-pcs',
    'military-bases-near-me-how-to-find-bases-by-state',
    'va-joint-loan-non-veteran-co-borrower',
    'pcsing-to-another-state-how-veteranpcs-eases-the-transition-with-veteran-real-estate-experts',
    'house-hunting-leave-pcs-guide',
  ])('%s has no state in its slug', (slug) => {
    expect(getStateForBlog(slug)).toBeNull();
  });
});

describe('resolveBlogSubjectState', () => {
  it('uses frontmatter first and accepts state names, including DC', () => {
    expect(resolveBlogSubjectState({ slug: 'x', stateSlug: 'west-virginia', state: 'Virginia' })).toEqual({ stateSlug: 'west-virginia', source: 'frontmatter-state-slug' });
    expect(resolveBlogSubjectState({ slug: 'x', state: 'New Mexico' })?.stateSlug).toBe('new-mexico');
    expect(resolveBlogSubjectState({ slug: 'x', state: 'Washington, DC' })?.stateSlug).toBe('washington-dc');
    expect(resolveBlogSubjectState({ slug: 'x', state: 'Washington' })?.stateSlug).toBe('washington');
  });

  it('never takes the state from the author', () => {
    const post: SubjectInput = { slug: 'national-topic', author: { stateSlug: 'maryland', state: 'Maryland' } };
    expect(resolveBlogState(post)?.stateSlug).toBe('maryland');
    expect(resolveBlogSubjectState(post)).toBeNull();
    expect(subjectOf('va-loan-assumption-seller-little-equity-case-study')).toBeNull();
  });

  it('keeps explicit post pins ahead of the slug rules', () => {
    expect(subjectOf('fort-meade-bah-2026-what-your-allowance-buys')).toBe('maryland');
    expect(subjectOf('pcs-to-joint-base-lewis-mcchord-jblm-2026-guide')).toBe('washington');
    expect(resolveBlogSubjectState({ slug: 'housing-near-fort-campbell' })).toBeNull();
  });

  it('formats hub names for display', () => {
    expect(getStateDisplayName('north-carolina')).toBe('North Carolina');
    expect(getStateDisplayName('west-virginia')).toBe('West Virginia');
    expect(getStateDisplayName('washington-dc')).toBe('District of Columbia');
  });
});

describe('subject state across the committed blog corpus', () => {
  it('resolves every post to a real state hub or to nothing', () => {
    for (const post of POSTS) {
      const resolved = resolveBlogSubjectState(post);
      if (resolved) expect(HUB_SLUGS.has(resolved.stateSlug), post.slug).toBe(true);
    }
  });

  it('resolves each state-family post to the state named in its slug', () => {
    const families = [
      /^what-military-bases-are-in-(.+)$/,
      /^(?:air-force|army|naval|marine-corps)-bases-in-(.+?)(?:-state)?$/,
      /^(.+)-veteran-property-tax-exemptions-2026$/,
    ];
    let checked = 0;
    for (const post of POSTS) {
      for (const family of families) {
        const named = family.exec(post.slug)?.[1];
        if (!named) continue;
        expect(HUB_SLUGS.has(named), post.slug).toBe(true);
        expect(resolveBlogSubjectState(post)?.stateSlug, post.slug).toBe(named);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(120);
  });

  it('sends Washington State posts to /washington and nothing to DC by accident', () => {
    for (const slug of ['what-military-bases-are-in-washington', 'army-bases-in-washington-state', 'naval-bases-in-washington-state']) {
      expect(subjectOf(slug)).toBe('washington');
    }
    for (const post of POSTS) {
      if (resolveBlogSubjectState(post)?.stateSlug === 'washington-dc') {
        expect(`${post.stateSlug ?? ''} ${post.state ?? ''}`.toLowerCase(), post.slug).toMatch(/dc|columbia/);
      }
    }
  });

  it('maps the priority posts from the analytics review', () => {
    expect(subjectOf('house-hunting-leave-pcs-guide')).toBeNull();
    expect(subjectOf('what-military-bases-are-in-california')).toBe('california');
    expect(subjectOf('what-military-bases-are-in-north-carolina')).toBe('north-carolina');
    expect(subjectOf('what-military-bases-are-in-washington')).toBe('washington');
    expect(subjectOf('what-military-bases-are-in-alaska')).toBe('alaska');
    expect(subjectOf('what-military-bases-are-in-florida')).toBe('florida');
    expect(subjectOf('what-military-bases-are-in-georgia')).toBe('georgia');
  });

  it('keeps the hub-only subject map valid and effective', () => {
    const entries = Object.entries(subjectStateMap.posts);
    expect(entries.length).toBeGreaterThan(0);
    for (const [slug, stateSlug] of entries) {
      expect(HUB_SLUGS.has(stateSlug), slug).toBe(true);
      expect(subjectOf(slug), slug).toBe(stateSlug);
    }
  });
});
