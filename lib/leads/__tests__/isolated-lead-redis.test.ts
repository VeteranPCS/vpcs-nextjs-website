import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { startIsolatedLeadRedis } from '@/scripts/lib/isolated-lead-redis.mjs';
import { createLeadLimiter, leadRateLimit } from '@/lib/leads/rate-limit';

vi.mock('server-only', () => ({}));

// The ordinary test suite remains runnable in CI without Redis installed.
describe.runIf(process.env.VPCS_TEST_ISOLATED_REDIS === '1')('isolated Redis protocol', () => {
  let harness: Awaited<ReturnType<typeof startIsolatedLeadRedis>>;

  beforeAll(async () => { harness = await startIsolatedLeadRedis(); });
  afterAll(async () => { await harness?.close(); });
  afterEach(() => vi.unstubAllEnvs());

  function useWebdevBackend(url: string, token: string) {
    vi.stubEnv('VPCS_SALESFORCE_PROFILE', 'webdev');
    vi.stubEnv('VERCEL', undefined);
    vi.stubEnv('VERCEL_ENV', undefined);
    vi.stubEnv('VPCS_WEBDEV_LEAD_REDIS_URL', url);
    vi.stubEnv('VPCS_WEBDEV_LEAD_REDIS_TOKEN', token);
  }

  it('shares an atomic sliding window across independent application limiters', async () => {
    const limiters = Array.from({ length: 12 }, () => createLeadLimiter(harness));
    const attempts = await Promise.all(limiters.map(limiter => limiter.limit('same-normalized-contact')));
    expect(attempts.filter(attempt => attempt.success)).toHaveLength(5);
    expect(attempts.every(attempt => Number.isFinite(attempt.reset))).toBe(true);
    await expect(createLeadLimiter(harness).limit('different-normalized-contact'))
      .resolves.toMatchObject({ success: true });
  });

  it('checks both supplied buckets and preserves a different contact-only bucket', async () => {
    useWebdevBackend(harness.url, harness.token);
    const attempts = await Promise.all(Array.from({ length: 8 }, (_, index) =>
      leadRateLimit(['test:shared-network', `test:contact-${index}`]),
    ));
    expect(attempts.filter(attempt => attempt.allowed)).toHaveLength(5);
    await expect(leadRateLimit(['test:contact-9'])).resolves.toMatchObject({ allowed: true });
  });

  it('surfaces invalid authentication and backend outage instead of returning a clean limit', async () => {
    const outage = await startIsolatedLeadRedis();
    try {
      useWebdevBackend(outage.url, 'wrong-test-token');
      await expect(leadRateLimit(['test:bad-auth'])).rejects.toThrow();
      useWebdevBackend(outage.url, outage.token);
      await expect(leadRateLimit(['test:before-outage'])).resolves.toMatchObject({ allowed: true });
      await outage.stopRedis();
      await expect(leadRateLimit(['test:during-outage'])).rejects.toThrow();
    } finally {
      await outage.close();
    }
  });

  it('fails closed within the request budget when the REST socket accepts but hangs', async () => {
    const hanging = createServer(() => {});
    hanging.listen(0, '127.0.0.1');
    try {
      await once(hanging, 'listening');
      const address = hanging.address();
      if (!address || typeof address === 'string') throw new Error('Expected a test loopback port');
      useWebdevBackend(`http://127.0.0.1:${address.port}`, harness.token);
      const started = performance.now();
      await expect(leadRateLimit(['test:hanging-backend'])).rejects.toThrow();
      expect(performance.now() - started).toBeLessThan(4_500);
    } finally {
      hanging.closeAllConnections();
      await new Promise<void>(resolve => hanging.close(() => resolve()));
    }
  });
});
