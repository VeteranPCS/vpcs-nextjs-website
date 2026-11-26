import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { leadRateLimit, resolveLeadRedisEnv } from '@/lib/leads/rate-limit';

vi.mock('server-only', () => ({}));

const local = 'http://127.0.0.1:34127';
const webdev = 'https://webdev-test.upstash.io';
const token = 'test-local-token';
const integrationUrl = 'VPCS_WEBDEV_LEAD_REDIS_KV_REST_API_URL';
const integrationToken = 'VPCS_WEBDEV_LEAD_REDIS_KV_REST_API_TOKEN';
const readOnlyToken = 'VPCS_WEBDEV_LEAD_REDIS_KV_REST_API_READ_ONLY_TOKEN';
const protocolUrl = 'VPCS_WEBDEV_LEAD_REDIS_KV_URL';
const alternateProtocolUrl = 'VPCS_WEBDEV_LEAD_REDIS_REDIS_URL';

beforeEach(() => {
  vi.stubEnv('VERCEL', undefined);
  vi.stubEnv('VERCEL_ENV', undefined);
  vi.stubEnv('VERCEL_GIT_COMMIT_REF', undefined);
  vi.stubEnv('VPCS_SALESFORCE_PROFILE', 'webdev');
  for (const key of [
    'VPCS_WEBDEV_LEAD_REDIS_URL', 'VPCS_WEBDEV_LEAD_REDIS_TOKEN',
    integrationUrl, integrationToken, readOnlyToken, protocolUrl, alternateProtocolUrl,
    'VPCS_WEBDEV_UPSTASH_REDIS_REST_URL', 'VPCS_WEBDEV_UPSTASH_REDIS_REST_TOKEN',
    'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN',
    'UPSTASH_REDIS_REST_KV_REST_API_URL', 'UPSTASH_REDIS_REST_KV_REST_API_TOKEN',
  ]) vi.stubEnv(key, undefined);
});
afterEach(() => vi.unstubAllEnvs());

function setLeadRedis(url: string) {
  vi.stubEnv('VPCS_WEBDEV_LEAD_REDIS_URL', url);
  vi.stubEnv('VPCS_WEBDEV_LEAD_REDIS_TOKEN', token);
}

function usePreview() {
  vi.stubEnv('VERCEL', '1');
  vi.stubEnv('VERCEL_ENV', 'preview');
}

describe('lead-specific rate configuration', () => {
  it('accepts a loopback backend only in local WebDev', () => {
    setLeadRedis(local);
    expect(resolveLeadRedisEnv()).toEqual({ url: local, token });
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(() => resolveLeadRedisEnv()).toThrow();
    setLeadRedis(webdev);
    expect(resolveLeadRedisEnv()).toEqual({ url: webdev, token });
  });

  it('uses the complete Preview integration write pair and ignores other generated credentials', () => {
    usePreview();
    vi.stubEnv(integrationUrl, webdev);
    vi.stubEnv(integrationToken, token);
    vi.stubEnv(readOnlyToken, 'different-read-only-token');
    vi.stubEnv(protocolUrl, 'rediss://example.test:6379');
    vi.stubEnv(alternateProtocolUrl, 'redis://example.test:6379');
    expect(resolveLeadRedisEnv()).toEqual({ url: webdev, token });
  });

  it('accepts matching complete pairs but rejects a conflicting URL or token', () => {
    usePreview();
    setLeadRedis(webdev);
    vi.stubEnv(integrationUrl, webdev);
    vi.stubEnv(integrationToken, token);
    expect(resolveLeadRedisEnv()).toEqual({ url: webdev, token });
    vi.stubEnv(integrationUrl, 'https://different-test.upstash.io');
    expect(() => resolveLeadRedisEnv()).toThrow(/conflicting/);
    vi.stubEnv(integrationUrl, webdev);
    vi.stubEnv(integrationToken, 'different-write-token');
    expect(() => resolveLeadRedisEnv()).toThrow(/conflicting/);
  });

  it.each([
    ['VPCS_WEBDEV_LEAD_REDIS_URL', integrationToken],
    [integrationUrl, 'VPCS_WEBDEV_LEAD_REDIS_TOKEN'],
    [integrationUrl, readOnlyToken],
    [protocolUrl, integrationToken],
    [alternateProtocolUrl, integrationToken],
  ])('does not build a write pair from %s and %s', (urlEnv, tokenEnv) => {
    usePreview();
    vi.stubEnv(urlEnv, webdev);
    vi.stubEnv(tokenEnv, token);
    expect(() => resolveLeadRedisEnv()).toThrow();
  });

  it('rejects a partial second pair even when the other pair is complete', () => {
    usePreview();
    setLeadRedis(webdev);
    vi.stubEnv(integrationUrl, webdev);
    expect(() => resolveLeadRedisEnv()).toThrow(/incomplete/);
  });

  it('keeps integration credentials scoped to WebDev Preview with an HTTPS Upstash endpoint', () => {
    vi.stubEnv(integrationUrl, webdev);
    vi.stubEnv(integrationToken, token);
    expect(() => resolveLeadRedisEnv()).toThrow();
    usePreview();
    vi.stubEnv(integrationUrl, local);
    expect(() => resolveLeadRedisEnv()).toThrow();
    vi.stubEnv(integrationUrl, webdev);
    vi.stubEnv('VPCS_SALESFORCE_PROFILE', 'production');
    expect(() => resolveLeadRedisEnv()).toThrow();
    vi.stubEnv('VPCS_SALESFORCE_PROFILE', 'webdev');
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(() => resolveLeadRedisEnv()).toThrow();
  });

  it('does not borrow an otherwise valid Production pair in WebDev Preview', () => {
    usePreview();
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://production-test.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'production-test-token');
    expect(() => resolveLeadRedisEnv()).toThrow();
  });

  it.each([
    ['production endpoint', 'UPSTASH_REDIS_REST_URL', webdev],
    ['alternate production endpoint', 'UPSTASH_REDIS_REST_KV_REST_API_URL', `${webdev}/`],
    ['production bearer', 'UPSTASH_REDIS_REST_TOKEN', token],
    ['existing WebDev notification endpoint', 'VPCS_WEBDEV_UPSTASH_REDIS_REST_URL', webdev],
    ['existing WebDev notification bearer', 'VPCS_WEBDEV_UPSTASH_REDIS_REST_TOKEN', token],
  ])('rejects reuse of the %s', (_description, env, value) => {
    setLeadRedis(webdev);
    vi.stubEnv(env, value);
    expect(() => resolveLeadRedisEnv()).toThrow();
  });

  it.each(['mock', 'webdev', 'production'])('never falls back to unlimited traffic in %s', async profile => {
    vi.stubEnv('VPCS_SALESFORCE_PROFILE', profile);
    if (profile === 'production') {
      vi.stubEnv('VERCEL', '1');
      vi.stubEnv('VERCEL_ENV', 'production');
      vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'main');
    }
    await expect(leadRateLimit(['test-identity'])).rejects.toThrow();
  });
});
