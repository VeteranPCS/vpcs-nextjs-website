import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import nextConfig from '@/next.config.mjs';
import { proxy } from '@/proxy';

type HeaderEntry = { key: string; value: string };
type HeaderRule = { source: string; headers: HeaderEntry[] };

let rules: HeaderRule[];

beforeAll(async () => {
  // withBotId wraps headers() as an async function; resolve the full merged array.
  if (!nextConfig.headers) throw new Error('next.config headers() is not defined');
  rules = (await nextConfig.headers()) as HeaderRule[];
});

const rule = (source: string) => {
  const found = rules.find((r) => r.source === source);
  if (!found) throw new Error(`no header rule for source ${source}`);
  return found;
};

const value = (r: HeaderRule, key: string) =>
  r.headers.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;

describe('CORS headers (next.config.mjs)', () => {
  it('does NOT send Access-Control-Allow-Credentials on any route', () => {
    const offenders = rules.flatMap((r) =>
      r.headers
        .filter((h) => h.key.toLowerCase() === 'access-control-allow-credentials')
        .map(() => r.source)
    );
    expect(offenders).toEqual([]);
  });

  it('still exposes the wildcard CORS policy on /api/:path*', () => {
    const api = rule('/api/:path*');
    expect(value(api, 'Access-Control-Allow-Origin')).toBe('*');
    expect(value(api, 'Access-Control-Allow-Methods')).toContain('POST');
  });

  it('keeps the HSTS header', () => {
    expect(value(rule('/(.*)'), 'Strict-Transport-Security')).toContain('max-age=');
  });
});

describe('CORS headers (proxy.ts)', () => {
  it('does NOT set Access-Control-Allow-Credentials on /api requests', () => {
    const res = proxy(new NextRequest('https://veteranpcs.com/api/v1/states'));
    expect(res.headers.get('access-control-allow-credentials')).toBeNull();
    // wildcard origin retained (credentials + wildcard would be invalid together)
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});

describe('Content-Security-Policy (enforced)', () => {
  const siteRule = () => rule('/((?!studio).*)');
  const studioRule = () => rule('/studio/:path*');

  it('sets an ENFORCED (not Report-Only) CSP on the site route', () => {
    const site = siteRule();
    expect(value(site, 'Content-Security-Policy')).toBeTruthy();
    expect(value(site, 'Content-Security-Policy-Report-Only')).toBeUndefined();
  });

  it('site CSP allows every source the site actually uses', () => {
    const csp = value(siteRule(), 'Content-Security-Policy')!;
    // baseline hardening
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain('upgrade-insecure-requests');
    // Next.js inline hydration + runtime style injectors
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    // analytics + CDNs the site depends on
    expect(csp).toContain('https://www.googletagmanager.com');
    expect(csp).toContain('https://us.i.posthog.com');
    expect(csp).toContain('https://vitals.vercel-insights.com');
    expect(csp).toContain('https://cdn.sanity.io');
    expect(csp).toContain('https://veteranpcs.my.salesforce.com');
    expect(csp).toContain('https://lh3.googleusercontent.com');
    expect(csp).toContain('https://www.youtube-nocookie.com');
    // the tighter site policy must NOT carry the Studio-only escape hatch
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('studio CSP relaxes eval/blob/websockets for Sanity Studio', () => {
    const csp = value(studioRule(), 'Content-Security-Policy')!;
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain('blob:');
    expect(csp).toContain('wss://*.api.sanity.io');
    expect(csp).toContain('https://*.api.sanity.io');
  });
});
