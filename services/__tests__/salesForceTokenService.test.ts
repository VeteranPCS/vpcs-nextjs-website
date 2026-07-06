import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The token service and services/api form an intentional circular import; mocking
// services/api here breaks the cycle and lets us drive the OAuth call directly.
vi.mock('@/services/api', () => ({
  RequestType: { POST: 'post' },
  salesForceTokenAPI: vi.fn(),
}));

vi.mock('@/constants/api', () => ({
  SALESFORCE_LOGIN_BASE_URL: 'https://login.salesforce.test',
}));

type Mocked = ReturnType<typeof vi.fn>;

function tokenResponse(token: string) {
  return {
    status: 200,
    data: { access_token: token, instance_url: 'https://instance.salesforce.test' },
  };
}

// The cache lives at module scope, so each test resets the module registry and
// re-imports to start from a cold cache. We also grab a fresh handle to the
// mocked salesForceTokenAPI created by the (re-run) mock factory.
async function loadFresh() {
  // Reset the service's module-level cache AND the shared salesForceTokenAPI mock
  // (one persistent vi.fn across the file) so each test starts from a cold slate.
  vi.resetModules();
  vi.resetAllMocks();
  const api = await import('@/services/api');
  const service = await import('@/services/salesForceTokenService');
  return {
    getSalesforceToken: service.getSalesforceToken,
    salesForceTokenAPI: vi.mocked(api.salesForceTokenAPI) as unknown as Mocked,
  };
}

describe('getSalesforceToken', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-05T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('sends the OAuth credentials in the POST body with an empty URL query string', async () => {
    const { getSalesforceToken, salesForceTokenAPI } = await loadFresh();
    salesForceTokenAPI.mockResolvedValue(tokenResponse('token-1'));

    vi.stubEnv('SALESFORCE_CLIENT_ID', 'cid');
    vi.stubEnv('SALESFORCE_CLIENT_SECRET', 'secret&with+reserved%chars');
    vi.stubEnv('SALESFORCE_USERNAME', 'user@test');
    vi.stubEnv('SALESFORCE_PASSWORD', 'pw');
    vi.stubEnv('SALESFORCE_TOKEN', 'tok');

    await getSalesforceToken();

    const arg = salesForceTokenAPI.mock.calls[0]![0];

    // Credentials must NOT ride on the URL query string (proxy/log leak).
    expect(arg.endpoint).toBe('https://login.salesforce.test/services/oauth2/token');
    expect(new URL(arg.endpoint).search).toBe('');
    expect(arg.endpoint).not.toContain('secret');
    expect(arg.endpoint).not.toContain('client_id');

    // Credentials travel in an x-www-form-urlencoded body instead.
    expect(arg.data).toBeInstanceOf(URLSearchParams);
    const body = arg.data as URLSearchParams;
    expect(body.get('grant_type')).toBe('password');
    expect(body.get('client_id')).toBe('cid');
    expect(body.get('client_secret')).toBe('secret&with+reserved%chars');
    expect(body.get('username')).toBe('user@test');
    // Salesforce appends the security token to the password.
    expect(body.get('password')).toBe('pwtok');
  });

  it('caches the token so a second call does not re-hit the OAuth endpoint', async () => {
    const { getSalesforceToken, salesForceTokenAPI } = await loadFresh();
    salesForceTokenAPI.mockResolvedValue(tokenResponse('token-1'));

    const first = await getSalesforceToken();
    const second = await getSalesforceToken();

    expect(first).toBe('token-1');
    expect(second).toBe('token-1');
    expect(salesForceTokenAPI).toHaveBeenCalledTimes(1);
  });

  it('forces a fresh OAuth request when forceRefresh is set', async () => {
    const { getSalesforceToken, salesForceTokenAPI } = await loadFresh();
    salesForceTokenAPI
      .mockResolvedValueOnce(tokenResponse('token-1'))
      .mockResolvedValueOnce(tokenResponse('token-2'));

    const first = await getSalesforceToken();
    const refreshed = await getSalesforceToken({ forceRefresh: true });

    expect(first).toBe('token-1');
    expect(refreshed).toBe('token-2');
    expect(salesForceTokenAPI).toHaveBeenCalledTimes(2);
  });

  it('refetches once the cached token passes its TTL', async () => {
    const { getSalesforceToken, salesForceTokenAPI } = await loadFresh();
    salesForceTokenAPI
      .mockResolvedValueOnce(tokenResponse('token-1'))
      .mockResolvedValueOnce(tokenResponse('token-2'));

    const first = await getSalesforceToken();
    expect(first).toBe('token-1');

    // Advance past the 55-minute TTL so the cached token is considered stale.
    vi.advanceTimersByTime(56 * 60 * 1000);

    const afterExpiry = await getSalesforceToken();
    expect(afterExpiry).toBe('token-2');
    expect(salesForceTokenAPI).toHaveBeenCalledTimes(2);
  });

  it('collapses concurrent cold-cache calls into a single OAuth request', async () => {
    const { getSalesforceToken, salesForceTokenAPI } = await loadFresh();
    salesForceTokenAPI.mockResolvedValue(tokenResponse('token-1'));

    const results = await Promise.all([
      getSalesforceToken(),
      getSalesforceToken(),
      getSalesforceToken(),
      getSalesforceToken(),
      getSalesforceToken(),
    ]);

    expect(results).toEqual(['token-1', 'token-1', 'token-1', 'token-1', 'token-1']);
    expect(salesForceTokenAPI).toHaveBeenCalledTimes(1);
  });

  it('rejects on a non-200 response and clears in-flight so the next call retries', async () => {
    const { getSalesforceToken, salesForceTokenAPI } = await loadFresh();
    salesForceTokenAPI
      .mockResolvedValueOnce({ status: 500, data: {} })
      .mockResolvedValueOnce(tokenResponse('token-recovered'));

    await expect(getSalesforceToken()).rejects.toThrow('Failed to FETCH Salesforce Token');

    // The failed fetch must clear the in-flight promise so a later call can recover.
    const recovered = await getSalesforceToken();
    expect(recovered).toBe('token-recovered');
    expect(salesForceTokenAPI).toHaveBeenCalledTimes(2);
  });
});
