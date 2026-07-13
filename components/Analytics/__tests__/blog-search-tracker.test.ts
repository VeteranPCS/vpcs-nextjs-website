import { describe, expect, it, vi } from 'vitest';
import { sanitizeAnalyticsProperties } from '@/lib/analytics/sanitizer';

// Trackers.tsx is a client module; stub its browser-only transitive imports so
// the pure property builders can be imported in the Node test environment.
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/lib/analytics/visitor', () => ({
  captureAttributionFromLocation: vi.fn(),
  getClientAnalyticsContext: vi.fn(() => ({})),
  getOrCreateVisitorId: vi.fn(() => 'vpcs_test_visitor'),
  incrementAnalyticsCounter: vi.fn(),
}));

import {
  blogSearchResultsProperties,
  blogSearchSubmittedProperties,
} from '@/components/Analytics/Trackers';

describe('blog search tracker property mapping', () => {
  it('reports the TOTAL ranked count on page 2 of a >10-result query, with page as its own property', () => {
    expect(blogSearchResultsProperties(42, 2)).toEqual({
      result_count: 42,
      result_bucket: '11_plus',
      page: 2,
    });
  });

  it('keeps blog_search_submitted properties unchanged (aggregate query metrics + total count, no page)', () => {
    const props = blogSearchSubmittedProperties('va loan', 42);

    expect(props).toEqual({
      query_length: 7,
      query_word_count: 2,
      query_word_count_bucket: '2_3',
      result_count: 42,
      result_bucket: '11_plus',
    });
    expect(props).not.toHaveProperty('page');
    expect(props).not.toHaveProperty('query');
  });

  it('buckets a no-result search as 0 on page 1', () => {
    expect(blogSearchResultsProperties(0, 1)).toEqual({
      result_count: 0,
      result_bucket: '0',
      page: 1,
    });
  });

  it('page survives the analytics sanitizer as a numeric property', () => {
    const clean = sanitizeAnalyticsProperties(blogSearchResultsProperties(42, 2));

    expect(clean.page).toBe(2);
    expect(clean.result_count).toBe(42);
    expect(clean.result_bucket).toBe('11_plus');
  });
});
