import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { AxiosRequestConfig } from 'axios';

vi.mock('axios', () => ({ default: vi.fn() }));
vi.mock('@/services/loggingService', () => ({ logDebug: vi.fn(), logError: vi.fn() }));
vi.mock('@/constants/api', () => ({ BASE_API_URL: 'https://app.test', SALESFORCE_LOGIN_BASE_URL: 'https://login.test' }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const oauth = (token: string) => ({ status: 200, data: { access_token: token } });
const unauthorized = { status: 401, data: {} };
const ok = { status: 200, data: {} };

async function load() {
  vi.resetModules();
  // Axios is overloaded; this module uses only its config-object overload.
  const axios = vi.mocked((await import('axios')).default) as unknown as Mock<(config: AxiosRequestConfig) => Promise<unknown>>;
  axios.mockReset();
  axios.mockImplementation(() => { throw new Error('Unexpected HTTP request'); });
  return { axios, api: await import('@/services/api'), token: await import('@/services/salesForceTokenService') };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected fetch'); }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('real token cache and API wrapper with mocked HTTP', () => {
  it.each(['simultaneous', 'late'])('coalesces %s old-generation 401s and uses the refreshed token', async (timing) => {
    const { axios, api } = await load();
    const first401 = deferred<typeof unauthorized>();
    const second401 = deferred<typeof unauthorized>();
    const refresh = deferred<ReturnType<typeof oauth>>();
    const started = deferred<void>();
    let oauthCalls = 0;
    const authHeaders: string[] = [];
    axios.mockImplementation(async (config: AxiosRequestConfig) => {
      if (config.url?.endsWith('/token')) {
        oauthCalls++;
        return oauthCalls === 1 ? oauth('old') : refresh.promise;
      }
      const auth = String(config.headers?.Authorization);
      authHeaders.push(auth);
      if (auth === 'Bearer new') return ok;
      if (authHeaders.length === 1) return first401.promise;
      if (authHeaders.length === 2) { started.resolve(); return second401.promise; }
      throw new Error('Unexpected request');
    });
    const a = api.salesForceAPIWithRefresh({ endpoint: 'https://sf.test/query', type: api.RequestType.GET });
    const b = api.salesForceAPIWithRefresh({ endpoint: 'https://sf.test/query', type: api.RequestType.GET });
    await started.promise;
    first401.resolve(unauthorized);
    if (timing === 'simultaneous') second401.resolve(unauthorized);
    refresh.resolve(oauth('new'));
    await a;
    if (timing === 'late') second401.resolve(unauthorized);
    await b;
    expect(oauthCalls).toBe(2);
    expect(authHeaders).toEqual(['Bearer old', 'Bearer old', 'Bearer new', 'Bearer new']);
  });

  it('ends persistent 401s after one auth retry and evicts the rejected token', async () => {
    const { axios, api, token } = await load();
    axios.mockResolvedValueOnce(oauth('old')).mockResolvedValueOnce(unauthorized)
      .mockResolvedValueOnce(oauth('rejected')).mockResolvedValueOnce(unauthorized)
      .mockResolvedValueOnce(oauth('recovered'));
    expect(await api.salesForceAPIWithRefresh({ endpoint: 'https://sf.test/query', type: api.RequestType.GET })).toBe(unauthorized);
    expect(axios).toHaveBeenCalledTimes(4);
    expect(await token.getSalesforceToken()).toBe('recovered');
    expect(axios).toHaveBeenCalledTimes(5);
  });

  it.each(['cold', 'refresh'])('does not retry %s token rejection as a GET failure or reuse a rejected token', async (phase) => {
    const { axios, api, token } = await load();
    if (phase === 'refresh') axios.mockResolvedValueOnce(oauth('old')).mockResolvedValueOnce(unauthorized);
    axios.mockResolvedValueOnce({ status: 400, data: { error: 'invalid_grant', error_description: 'private detail' } });
    await expect(api.salesForceAPIWithRefresh({ endpoint: 'https://sf.test/query', type: api.RequestType.GET }))
      .rejects.toMatchObject({ name: 'SalesforceTokenError', message: 'Failed to FETCH Salesforce Token' });
    expect(axios).toHaveBeenCalledTimes(phase === 'cold' ? 1 : 3);
    expect(vi.getTimerCount()).toBe(0);
    axios.mockResolvedValueOnce(oauth('recovered'));
    expect(await token.getSalesforceToken()).toBe('recovered');
  });

  it('does not retry token transport errors or expose credential-bearing causes', async () => {
    const { axios, api } = await load();
    axios.mockRejectedValueOnce({ config: { data: 'private-password' }, code: 'ECONNRESET' });
    const error = await api.salesForceAPIWithRefresh({ endpoint: 'https://sf.test/query', type: api.RequestType.GET }).catch((err: unknown) => err);
    expect(error).toMatchObject({ name: 'SalesforceTokenError' });
    expect(error).not.toHaveProperty('cause');
    expect(axios).toHaveBeenCalledTimes(1);
  });

  it('does not evict a newer token when invalidating an old generation', async () => {
    const { axios, token } = await load();
    axios.mockResolvedValueOnce(oauth('old')).mockResolvedValueOnce(oauth('new'));
    const old = await token.getSalesforceTokenSnapshot();
    const current = await token.getSalesforceTokenSnapshot({ rejectedGeneration: old.generation });
    token.invalidateSalesforceToken(old.generation);
    expect(await token.getSalesforceTokenSnapshot()).toEqual(current);
    expect(axios).toHaveBeenCalledTimes(2);
  });

  it('coalesces cold calls but keeps independent module instances independent', async () => {
    const first = await load();
    first.axios.mockResolvedValueOnce(oauth('worker-a'));
    expect(await Promise.all(Array.from({ length: 5 }, () => first.token.getSalesforceToken())))
      .toEqual(Array(5).fill('worker-a'));
    expect(first.axios).toHaveBeenCalledTimes(1);
    const second = await load();
    second.axios.mockResolvedValueOnce(oauth('worker-b'));
    expect(await second.token.getSalesforceToken()).toBe('worker-b');
    expect(await first.token.getSalesforceToken()).toBe('worker-a');
    expect(second.axios).toHaveBeenCalledTimes(1);
  });
});
