import { describe, expect, it } from 'vitest';
import { blogContactTracking, internalBlogHref } from '../contact-link';
import { buildCtaProperties } from '@/lib/analytics/cta';

describe('editorial contact links', () => {
  it.each(['https://www.veteranpcs.com', 'https://veteranpcs.com', 'http://veteranpcs.com', ''])('recognizes first-party links from %s', (origin) => {
    expect(internalBlogHref(`${origin}/contact-agent?state=texas#form`)).toBe('/contact-agent?state=texas#form');
  });

  it.each(['https://veteranpcs.com.example.org/contact-agent', 'https://example.org/contact-agent', 'mailto:info@example.org', '#section'])('does not rewrite %s', (href) => {
    expect(internalBlogHref(href)).toBeNull();
    expect(blogContactTracking(href, 'guide')).toBeNull();
  });

  it.each(['agent', 'lender'])('tracks the actual %s destination without query strings or personal labels', (partner) => {
    const input = blogContactTracking(`/contact-${partner}/?state=texas&fn=Private&email=private@example.org`, 'guide');
    expect(input).not.toBeNull();
    const properties = buildCtaProperties(input!); // Non-null was asserted above.
    expect(properties).toMatchObject({
      cta_id: `blog_mdx_contact_${partner}`, cta_intent: `contact_${partner}`,
      page_type: 'blog_post', content_slug: 'guide', content_type: 'blog_post',
      state_code: 'TX', state_slug: 'texas', partner_type: partner,
      destination_path: `/contact-${partner}`,
    });
    expect(JSON.stringify(properties)).not.toMatch(/Private|private@|\?/);
  });

  it('leaves general contact, listing, and non-post links outside the customer CTA event', () => {
    expect(blogContactTracking('/contact', 'guide')).toBeNull();
    expect(blogContactTracking('/get-listed-agents', 'guide')).toBeNull();
    expect(blogContactTracking('/contact-agent')).toBeNull();
  });
});
