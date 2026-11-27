import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import mockMetadata from '@/config/salesforce/mock.json';
import productionMetadata from '@/config/salesforce/production.json';
import { proxy } from '@/proxy';

type HeaderEntry = { key: string; value: string };
type HeaderRule = { source: string; headers: HeaderEntry[] };

let rules: HeaderRule[];
const productionOrigin = 'https://veteranpcs.my.salesforce.com';
const sandboxOrigin = 'https://veteranpcs--webdev.sandbox.my.salesforce.com';
const webToLeadPath = '/servlet/servlet.WebToLead?encoding=UTF-8';

async function loadConfig(env: Record<string, string | undefined>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [key, setting] of Object.entries(env)) vi.stubEnv(key, setting);
  return (await import('@/next.config.mjs')).default;
}

beforeAll(async () => {
  const nextConfig = await loadConfig({
    VERCEL: '1', VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'main',
    VPCS_SALESFORCE_PROFILE: 'production', VPCS_DELIVERY_MODE: 'live',
    VPCS_SALESFORCE_ORG_ID: productionMetadata.orgId,
    SALESFORCE_LOGIN_BASE_URL: productionOrigin, VPCS_SALESFORCE_BASE_URL: productionOrigin,
    SALESFORCE_API_VERSION: 'v62.0', SALESFORCE_AUTH_GRANT: 'client_credentials',
    VPCS_SALESFORCE_WEB_TO_LEAD_URL: `https://webto.salesforce.com${webToLeadPath}`,
  });
  // withBotId wraps headers() as an async function; resolve the full merged array.
  if (!nextConfig.headers) throw new Error('next.config headers() is not defined');
  rules = (await nextConfig.headers()) as HeaderRule[];
  expect(nextConfig.env?.NEXT_PUBLIC_VPCS_ANALYTICS_ENABLED).toBe('1');
  expect(JSON.stringify(await nextConfig.rewrites?.())).toContain('https://us.i.posthog.com');
  expect(nextConfig.images?.maximumRedirects).toBeUndefined();
});

afterAll(() => vi.unstubAllEnvs());

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
  const siteRule = () => rule('/(.*)');

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
    expect(csp).toContain('https://veteranpcs.my.salesforce.com');
    expect(csp).toContain('https://lh3.googleusercontent.com');
    expect(csp).toContain('https://www.youtube-nocookie.com');
    // GTM-injected third-party tags allowlisted so production tracking keeps working
    // (Microsoft Clarity, Ahrefs, Google Ads / DoubleClick).
    expect(csp).toContain('https://www.clarity.ms');
    expect(csp).toContain('https://analytics.ahrefs.com');
    expect(csp).toContain('https://www.googleadservices.com');
    expect(csp).toContain('https://*.doubleclick.net');
    // the site policy must never carry an eval escape hatch
    expect(csp).not.toContain("'unsafe-eval'");
  });
});

describe('non-production integrations', () => {
  const orgId = '00DTESTORG00001';

  it.each(['mock', 'webdev'] as const)('uses isolated CSP and disables ingestion in the %s profile', async profile => {
    const config = await loadConfig({
      VERCEL: undefined, VERCEL_ENV: undefined, VERCEL_GIT_COMMIT_REF: undefined,
      VPCS_SALESFORCE_PROFILE: profile, VPCS_DELIVERY_MODE: 'capture',
      VPCS_SALESFORCE_ORG_ID: orgId, VPCS_SALESFORCE_METADATA_JSON: JSON.stringify({ ...mockMetadata, orgId }),
      SALESFORCE_LOGIN_BASE_URL: sandboxOrigin, VPCS_SALESFORCE_BASE_URL: sandboxOrigin,
      SALESFORCE_API_VERSION: 'v62.0', SALESFORCE_AUTH_GRANT: 'client_credentials',
      VPCS_SALESFORCE_WEB_TO_LEAD_URL: `https://test.salesforce.com${webToLeadPath}`,
    });
    const siteRule = (await config.headers?.())?.find(header => header.source === '/(.*)');
    if (!siteRule) throw new Error('No site security header rule');
    const csp = value(siteRule, 'Content-Security-Policy');

    expect(config.env?.NEXT_PUBLIC_VPCS_ANALYTICS_ENABLED).toBe('0');
    expect(config.env?.NEXT_PUBLIC_CONCIERGE_ENABLED).toBe('0');
    expect(await config.rewrites?.()).toEqual([]);
    expect(config.images?.maximumRedirects).toBe(0);
    expect(csp).not.toMatch(/posthog|googletagmanager|google-analytics|vercel-insights|veteranpcs\.my\.salesforce/);
    if (profile === 'mock') {
      expect(csp).toContain("connect-src 'self';");
      expect(csp).toContain("frame-src 'self';");
      expect(csp).not.toMatch(/recaptcha|gstatic/);
      expect(csp).not.toContain(sandboxOrigin);
      expect(config.images?.remotePatterns).toEqual([]);
    } else {
      expect(csp).toContain("connect-src 'self' https://www.google.com/recaptcha/;");
      expect(csp).toContain("frame-src 'self' https://www.youtube-nocookie.com https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/;");
      expect(csp).toContain("https://www.gstatic.com/recaptcha/");
      expect(csp).not.toContain('https://*.google.com');
      expect(csp).toContain(sandboxOrigin);
      expect(config.images?.remotePatterns).toEqual([{ protocol: 'https', hostname: new URL(sandboxOrigin).hostname }]);
    }
  });
});
