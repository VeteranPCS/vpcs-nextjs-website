import { describe, expect, it } from 'vitest';
import { BLOG_COMPONENTS, normalizeBlogComponentSlug } from '@/lib/blog/components';
import { normalizeStateSlug } from '@/lib/states';

describe('script-safe blog data reader', () => {
  it('stays in parity with the TypeScript wrappers', async () => {
    const scriptData = await import('../lib/blog-data.mjs');

    expect(scriptData.BLOG_COMPONENTS).toEqual(BLOG_COMPONENTS);
    expect(scriptData.normalizeBlogComponentSlug('U.S. Military Bases')).toBe(
      normalizeBlogComponentSlug('U.S. Military Bases'),
    );
    expect(scriptData.normalizeStateSlug('Washington, DC')).toBe(normalizeStateSlug('Washington, DC'));
    expect(scriptData.resolveBlogState({
      slug: 'complete-fort-campbell-pcs-guide',
      data: {},
    })).toEqual({ stateSlug: 'kentucky', source: 'state-map-post' });
  });
});
