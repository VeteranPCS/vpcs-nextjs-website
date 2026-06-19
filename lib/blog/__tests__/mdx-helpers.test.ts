import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  extractTocHeadings,
  readingTimeMinutes,
  slugifyHeading,
} from '@/lib/blog/mdx';

describe('blog MDX helpers', () => {
  it('computes reading time from body text', () => {
    expect(readingTimeMinutes('short body')).toBe(1);
    expect(readingTimeMinutes(Array.from({ length: 226 }, () => 'word').join(' '))).toBe(2);
  });

  it('extracts occurrence-aware h2 ids', () => {
    expect(slugifyHeading('BAH & Housing: What Changes?')).toBe('bah-and-housing-what-changes');
    expect(extractTocHeadings('## Overview\n\nText\n\n## Overview\n\n## Costs')).toEqual([
      { text: 'Overview', id: 'overview' },
      { text: 'Overview', id: 'overview-2' },
      { text: 'Costs', id: 'costs' },
    ]);
  });

  it('ignores h2-looking text inside fenced code blocks', () => {
    expect(extractTocHeadings('```md\n## Not a heading\n```\n\n## Real heading')).toEqual([
      { text: 'Real heading', id: 'real-heading' },
    ]);
  });
});
