import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { GET } from '../route';
import { INTAKE_REOPENING_KEY } from '@/lib/leads/intake-reopening-store';

const secret = 'synthetic-diagnostic-token-at-least-32-characters';
const redisUrl = 'https://diagnostic-redis.example.test';
const request = (authorization: string | null = `Bearer ${secret}`, query = '') => new Request(`https://website.example.test/api/v1/intake-redis-check${query}`, {
  headers: authorization === null ? {} : { authorization },
});
let result: unknown;
beforeEach(() => {
  result = null;
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('INTAKE_REDIS_CHECK_TOKEN', secret);
  vi.stubEnv('UPSTASH_REDIS_REST_URL', redisUrl);
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'synthetic-redis-token');
  vi.stubEnv('UPSTASH_REDIS_REST_KV_REST_API_URL', '');
  vi.stubEnv('UPSTASH_REDIS_REST_KV_REST_API_TOKEN', '');
  // Real SDK; every HTTP call is mocked and asserted outside the implementation's catch.
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ result: typeof result === 'string' ? Buffer.from(result).toString('base64') : result })));
});
afterEach(() => {
  for (const [url, init] of vi.mocked(fetch).mock.calls) {
    expect(String(url)).toBe(redisUrl);
    expect(JSON.parse(String(init?.body))).toEqual(['get', INTAKE_REOPENING_KEY]);
    expect(init?.cache).toBe('no-store');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer synthetic-redis-token');
  }
  vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals();
});

describe('production Redis diagnostic', () => {
  it.each(['preview', 'development', ''])('rejects %s before any Redis request', async environment => {
    vi.stubEnv('VERCEL_ENV', environment);
    expect((await GET(request())).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['', 'short'])('is disabled without a sufficiently long dedicated token: %j', async token => {
    vi.stubEnv('INTAKE_REDIS_CHECK_TOKEN', token);
    expect((await GET(request())).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([null, 'Bearer wrong', `Bearer ${'x'.repeat(secret.length)}`, `Basic ${secret}`])('rejects invalid authorization without Redis', async authorization => {
    const response = await GET(request(authorization));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not accept query-string credentials', async () => {
    expect((await GET(request(null, `?token=${secret}`))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([[null, 'absent'], ['open', 'open'], ['closed', 'closed'], ['PRIVATE-provider-value', 'closed'], ['OPEN', 'closed']])('returns only a sanitized flag classification', async (stored, flag) => {
    result = stored;
    const response = await GET(request(undefined, '?key=another-key&command=SET&timeout=9999'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, flag, elapsedMs: expect.any(Number), withinBudget: true, budgetMs: 1000 });
    expect(fetch).toHaveBeenCalledTimes(1);
    for (const header of ['cache-control', 'cdn-cache-control', 'vercel-cdn-cache-control']) expect(response.headers.get(header)).toContain('no-store');
    expect(response.headers.get('vary')).toBe('Authorization');
  });
  it('checks before the scheduled cutoff and rereads on each deliberate invocation', async () => {
    vi.stubEnv('LEAD_INTAKE_MAINTENANCE', 'off');
    await GET(request()); await GET(request());
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.signal).not.toBe(vi.mocked(fetch).mock.calls[1]?.[1]?.signal);
  });
  it('fails without Redis credentials', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, failure: 'missing_credentials', withinBudget: false });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['rejected', 'provider'])('does not leak or retry a %s failure', async kind => {
    if (kind === 'rejected') vi.mocked(fetch).mockRejectedValue(new Error('PRIVATE-url-token-provider-error'));
    else vi.mocked(fetch).mockResolvedValue(Response.json({ error: 'PRIVATE-url-token-provider-error' }, { status: 401 }));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, failure: 'read_failed', elapsedMs: expect.any(Number), withinBudget: false, budgetMs: 1000 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('reports a slow successful read as outside budget', async () => {
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(1001);
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: true, elapsedMs: 1001, withinBudget: false });
  });
  it('uses the actual one-second abort and makes no retry on a stalled read', async () => {
    vi.mocked(fetch).mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('PRIVATE-timeout')), { once: true });
    }));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, failure: 'timeout', elapsedMs: expect.any(Number), withinBudget: false });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
