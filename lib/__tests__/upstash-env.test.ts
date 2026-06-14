import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('upstash env resolver', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    vi.stubEnv('UPSTASH_REDIS_REST_KV_REST_API_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_KV_REST_API_TOKEN', '');
    vi.stubEnv('UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN', '');
    vi.stubEnv('UPSTASH_REDIS_REST_KV_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_REDIS_URL', '');
  });

  it('accepts the canonical Upstash REST env pair', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://canonical.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'canonical-token');

    const { resolveUpstashRedisEnv, missingUpstashEnvVars } = await import('@/lib/upstash-env');

    expect(resolveUpstashRedisEnv()).toEqual({
      url: 'https://canonical.upstash.io',
      token: 'canonical-token',
      urlEnvName: 'UPSTASH_REDIS_REST_URL',
      tokenEnvName: 'UPSTASH_REDIS_REST_TOKEN',
    });
    expect(missingUpstashEnvVars()).toEqual([]);
  });

  it('accepts the Vercel integration REST API env pair', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_KV_REST_API_URL', 'https://vercel-kv.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_KV_REST_API_TOKEN', 'vercel-kv-token');

    const { resolveUpstashRedisEnv, missingUpstashEnvVars } = await import('@/lib/upstash-env');

    expect(resolveUpstashRedisEnv()).toEqual({
      url: 'https://vercel-kv.upstash.io',
      token: 'vercel-kv-token',
      urlEnvName: 'UPSTASH_REDIS_REST_KV_REST_API_URL',
      tokenEnvName: 'UPSTASH_REDIS_REST_KV_REST_API_TOKEN',
    });
    expect(missingUpstashEnvVars()).toEqual([]);
  });

  it('ignores read-only and redis-protocol integration vars for write paths', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN', 'readonly-token');
    vi.stubEnv('UPSTASH_REDIS_REST_KV_URL', 'redis://example');
    vi.stubEnv('UPSTASH_REDIS_REST_REDIS_URL', 'redis://example');

    const { resolveUpstashRedisEnv, missingUpstashEnvVars } = await import('@/lib/upstash-env');

    expect(resolveUpstashRedisEnv()).toBeNull();
    expect(missingUpstashEnvVars()).toEqual([
      'UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_KV_REST_API_URL',
      'UPSTASH_REDIS_REST_TOKEN or UPSTASH_REDIS_REST_KV_REST_API_TOKEN',
    ]);
  });
});
