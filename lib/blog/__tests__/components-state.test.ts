import { describe, expect, it } from 'vitest';
import { BLOG_COMPONENTS, normalizeBlogComponentSlug, getBlogCtaIntent } from '@/lib/blog/components';
import { resolveBlogStateSlug, resolveBlogState } from '@/lib/blog/state';
import type { BlogPost } from '@/lib/blog/types';

type BlogStateInput = Pick<BlogPost, 'slug' | 'stateSlug' | 'state' | 'author'>;

function post(overrides: Partial<BlogStateInput>): BlogStateInput {
  return {
    slug: 'test-post',
    stateSlug: undefined,
    state: undefined,
    author: {},
    ...overrides,
  };
}

describe('blog component taxonomy', () => {
  it('maps all seven canonical labels to URL-safe slugs', () => {
    expect(BLOG_COMPONENTS).toHaveLength(7);
    expect(normalizeBlogComponentSlug('PCS Help')).toBe('pcs-help');
    expect(normalizeBlogComponentSlug('U.S. Military Bases')).toBe('us-military-bases');
    expect(normalizeBlogComponentSlug('va-loan-help')).toBe('va-loan-help');
    expect(normalizeBlogComponentSlug('Things to Do Near You')).toBe('things-to-do-near-you');
    expect(normalizeBlogComponentSlug('Not a Component')).toBeNull();
  });
});

describe('blog state resolver', () => {
  it('respects precedence from top-level frontmatter through slug heuristic and aliases', () => {
    expect(resolveBlogState(post({ stateSlug: 'texas', state: 'North Carolina' }))).toEqual({
      stateSlug: 'texas',
      source: 'frontmatter-state-slug',
    });
    expect(resolveBlogStateSlug(post({ state: 'North Carolina', author: { stateSlug: 'texas' } }))).toBe('north-carolina');
    expect(resolveBlogStateSlug(post({ author: { stateSlug: 'maryland' } }))).toBe('maryland');
    expect(resolveBlogStateSlug(post({ author: { state: 'Washington, DC' } }))).toBe('washington-dc');
    expect(resolveBlogStateSlug(post({ slug: 'complete-fort-campbell-pcs-guide' }))).toBe('kentucky');
    expect(resolveBlogStateSlug(post({ slug: 'what-military-bases-are-in-florida' }))).toBe('florida');
    expect(resolveBlogStateSlug(post({ slug: 'pcs-to-joint-base-lewis-mcchord-guide' }))).toBe('washington');
  });

  it('does not resolve ambiguous token aliases without an exact post pin', () => {
    expect(resolveBlogStateSlug(post({ slug: 'housing-near-fort-campbell' }))).toBeNull();
    expect(resolveBlogStateSlug(post({ slug: 'best-of-washington-state-not-dc' }))).toBeNull();
  });
});

describe('getBlogCtaIntent', () => {
  it('maps lender-led categories to lender', () => {
    expect(getBlogCtaIntent('va-loan-help')).toBe('lender');
    expect(getBlogCtaIntent('financial-guidance')).toBe('lender');
  });

  it('maps all other categories to agent', () => {
    for (const slug of ['pcs-help', 'us-military-bases', 'military-transition-help', 'things-to-do-near-you', 'real-estate-insights']) {
      expect(getBlogCtaIntent(slug)).toBe('agent');
    }
  });

  it('defaults to agent for null, undefined, and unknown slugs', () => {
    expect(getBlogCtaIntent(null)).toBe('agent');
    expect(getBlogCtaIntent(undefined)).toBe('agent');
    expect(getBlogCtaIntent('not-a-component')).toBe('agent');
  });

  it('every component declares a valid partnerIntent (fail loud on new categories)', () => {
    for (const c of BLOG_COMPONENTS) {
      expect(['agent', 'lender']).toContain(c.partnerIntent);
    }
    expect(BLOG_COMPONENTS.filter((c) => c.partnerIntent === 'lender').map((c) => c.slug).sort())
      .toEqual(['financial-guidance', 'va-loan-help']);
  });
});
