export const SITE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://veteranpcs.com').replace(/\/$/, '');

/**
 * Normalizes a site-relative path (e.g. `/images/states/texas.webp`) to an
 * absolute URL on the site origin. Already-absolute http(s) URLs pass through
 * unchanged. Collapses any leading slashes so a doubled-up input can never
 * produce a protocol-relative `//host/...` URL (the wrong-host bug this
 * helper exists to prevent in OG/Twitter image metadata).
 */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}/${pathOrUrl.replace(/^\/+/, '')}`;
}
