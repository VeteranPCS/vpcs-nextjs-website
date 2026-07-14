import { describe, expect, it } from 'vitest';
import { SITE_URL, absoluteUrl } from '@/lib/siteUrl';

describe('absoluteUrl', () => {
  it('prefixes a site-relative path with the site origin', () => {
    expect(absoluteUrl('/images/states/texas.webp')).toBe(`${SITE_URL}/images/states/texas.webp`);
  });

  it('handles a path with no leading slash', () => {
    expect(absoluteUrl('images/states/texas.webp')).toBe(`${SITE_URL}/images/states/texas.webp`);
  });

  it('never emits a protocol-relative //host URL for a doubled-slash input', () => {
    // The bug this helper fixes: `/${'/images/...'}` -> '//images/...' would
    // resolve against the wrong host in OG/Twitter metadata.
    expect(absoluteUrl('//images/states/texas.webp')).toBe(`${SITE_URL}/images/states/texas.webp`);
  });

  it('passes through absolute https URLs unchanged', () => {
    expect(absoluteUrl('https://cdn.example.com/a.webp')).toBe('https://cdn.example.com/a.webp');
  });

  it('passes through absolute http URLs unchanged', () => {
    expect(absoluteUrl('http://example.com/a.webp')).toBe('http://example.com/a.webp');
  });
});
