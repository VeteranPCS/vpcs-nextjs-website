import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { INTAKE_REOPENING_KEY, isIntakeExplicitlyReopened } from '../intake-reopening-store';

// Real SDK, synthetic credentials, strictly mocked HTTP. No Redis instance is contacted.
const redisUrl = 'https://maintenance-redis.example.test';
const warnings = vi.fn();
let value: unknown;
let signals: AbortSignal[];
let attempts: number;
let failure: 'network' | 'http' | 'timeout' | undefined;
beforeEach(() => {
  value = null; signals = []; attempts = 0; failure = undefined;
  warnings.mockClear(); vi.spyOn(console, 'warn').mockImplementation(warnings);
  for (const name of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'UPSTASH_REDIS_REST_KV_REST_API_URL', 'UPSTASH_REDIS_REST_KV_REST_API_TOKEN']) vi.stubEnv(name, '');
  vi.stubEnv('UPSTASH_REDIS_REST_KV_REST_API_URL', redisUrl);
  vi.stubEnv('UPSTASH_REDIS_REST_KV_REST_API_TOKEN', 'synthetic-token');
  vi.stubGlobal('fetch', vi.fn(async (url, init) => {
    expect(String(url)).toBe(redisUrl);
    expect(JSON.parse(init.body)).toEqual(['get', INTAKE_REOPENING_KEY]);
    expect(init.cache).toBe('no-store');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    signals.push(init.signal); attempts++;
    if (failure === 'network') throw new Error('sensitive-url-and-token-must-not-appear');
    if (failure === 'http') return Response.json({ error: 'sensitive-provider-response' }, { status: 503 });
    if (failure === 'timeout') return new Promise<Response>((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
    });
    return Response.json({ result: typeof value === 'string' ? Buffer.from(value).toString('base64') : value });
  }));
});
afterEach(() => {
  // Assert outside the reader's catch too: an unexpected mocked request must fail the test.
  for (const [url, init] of vi.mocked(fetch).mock.calls) {
    expect(String(url)).toBe(redisUrl);
    expect(JSON.parse(String(init?.body))).toEqual(['get', INTAKE_REOPENING_KEY]);
    expect(init?.cache).toBe('no-store');
  }
  vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals();
});

describe('dated production reopening flag', () => {
  it.each([null, '', 'closed', 'OPEN', ' open', 'open ', '"open"', 1, true])('fails closed for stored value %j', async flag => {
    value = flag;
    expect(await isIntakeExplicitlyReopened()).toBe(false);
    expect(attempts).toBe(1);
  });
  it('accepts only exact open, rereads without caching, and sees deletion/re-pausing', async () => {
    value = 'open'; expect(await isIntakeExplicitlyReopened()).toBe(true);
    value = null; expect(await isIntakeExplicitlyReopened()).toBe(false);
    value = 'open'; expect(await isIntakeExplicitlyReopened()).toBe(true);
    value = 'closed'; expect(await isIntakeExplicitlyReopened()).toBe(false);
    expect(attempts).toBe(4);
    expect(new Set(signals).size).toBe(4);
  });
  it('fails closed without credentials and never attempts HTTP', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_KV_REST_API_TOKEN', '');
    expect(await isIntakeExplicitlyReopened()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    expect(warnings.mock.calls).toEqual([['[intake-maintenance] missing_credentials']]);
  });
  it.each(['network', 'http'] as const)('does not retry %s errors or log provider details', async kind => {
    failure = kind;
    expect(await isIntakeExplicitlyReopened()).toBe(false);
    expect(attempts).toBe(1);
    expect(warnings.mock.calls).toEqual([['[intake-maintenance] read_failed']]);
  });
  it('bounds a stalled read to one second and gives the next read a fresh timeout', async () => {
    failure = 'timeout';
    const started = performance.now();
    expect(await isIntakeExplicitlyReopened()).toBe(false);
    expect(performance.now() - started).toBeGreaterThanOrEqual(900);
    expect(performance.now() - started).toBeLessThan(1800);
    expect(signals[0]?.aborted).toBe(true);
    expect(warnings.mock.calls).toEqual([['[intake-maintenance] timeout']]);
    failure = undefined; value = 'open';
    expect(await isIntakeExplicitlyReopened()).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
    expect(signals[1]).not.toBe(signals[0]);
    expect(attempts).toBe(2);
  });
});
