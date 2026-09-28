import { normalizeStateCode, normalizeStateSlug } from '@/lib/states';
import type { CtaTrackingInput } from '@/lib/analytics/cta';

const SITE_ORIGIN = 'https://www.veteranpcs.com';

/** Keep absolute first-party editorial links in the same navigation journey. */
export function internalBlogHref(href: string): string | null {
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  try {
    const url = new URL(href, SITE_ORIGIN);
    if (!/^https?:$/.test(url.protocol) || !['www.veteranpcs.com', 'veteranpcs.com'].includes(url.hostname) || url.port) return null;
    if (!/^https?:\/\//i.test(href) && !href.startsWith('//')) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function blogContactTracking(href: string, contentSlug?: string): CtaTrackingInput | null {
  const internalHref = internalBlogHref(href);
  if (!internalHref || !contentSlug) return null;
  const url = new URL(internalHref, SITE_ORIGIN);
  const path = url.pathname.replace(/\/$/, '');
  const partner = path === '/contact-agent' ? 'agent' : path === '/contact-lender' ? 'lender' : null;
  if (!partner) return null;
  const stateSlug = normalizeStateSlug(url.searchParams.get('state'));
  return {
    ctaId: `blog_mdx_contact_${partner}`,
    ctaIntent: `contact_${partner}`,
    ctaPosition: 'mdx_body',
    ctaComponent: 'blog_mdx_contact_link',
    destination: path,
    pageType: 'blog_post',
    contentSlug,
    contentType: 'blog_post',
    partnerType: partner,
    stateSlug,
    stateCode: normalizeStateCode(stateSlug),
  };
}
