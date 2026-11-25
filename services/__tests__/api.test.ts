import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { api, salesForceAPI, salesForceAPIWithRefresh, salesForceImageAPI, RequestType } from '@/services/api';
import { getSalesforceTokenSnapshot, invalidateSalesforceToken } from '@/services/salesForceTokenService';
import { getSalesforceConfig } from '@/lib/salesforce/server-config';
import { stubWebdevEnv, WEBDEV_ORIGIN, WEBDEV_QUERY } from '@/lib/salesforce/__tests__/configuration-fixtures';
import { logDebug, logError } from '@/services/loggingService';

vi.mock('server-only', () => ({}));

// axios is called as a function (default export) inside the api helpers.
vi.mock('axios', () => ({ default: vi.fn() }));
vi.mock('@/services/salesForceTokenService', () => ({
  getSalesforceTokenSnapshot: vi.fn(async () => {
    const config = getSalesforceConfig();
    return { token: 'test-token', generation: 1, cacheKey: config.cacheKey, instanceUrl: config.restOrigin };
  }),
  invalidateSalesforceToken: vi.fn(),
}));
vi.mock('@/services/loggingService', () => ({
  logDebug: vi.fn(),
  logError: vi.fn(),
}));

const mockedAxios = vi.mocked(axios);
const leadEndpoint = `${WEBDEV_ORIGIN}/services/data/v62.0/sobjects/Lead/00Q000000000001`;

beforeEach(() => stubWebdevEnv({
  VPCS_SANDBOX_LEAD_WRITES: '1',
  VPCS_WEBDEV_ISOLATION_ATTESTED: '1',
}));
afterEach(() => vi.unstubAllEnvs());

// Helper: await a promise expected to reject and return the thrown value.
async function captureRejection<T>(promise: Promise<T>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error('expected the call to reject, but it resolved');
    },
    (err) => err,
  );
}

describe('api error handling: HTTP response vs network error', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('resolves to the axios response on success', async () => {
    const okResponse = { status: 200, data: 'ok' };
    mockedAxios.mockResolvedValueOnce(okResponse as never);

    const result = await api({ endpoint: 'foo', type: RequestType.GET });

    expect(result).toBe(okResponse);
    expect(logError).not.toHaveBeenCalled();
  });

  it('returns the HTTP error response so callers can still inspect .status', async () => {
    // An axios error for an HTTP 4xx/5xx carries a `.response` (the server replied).
    const httpErrorResponse = { status: 500, data: 'server error' };
    mockedAxios.mockRejectedValueOnce({ response: httpErrorResponse });

    const result = await api({ endpoint: 'foo', type: RequestType.GET });

    expect(result).toBe(httpErrorResponse);
    expect(logError).not.toHaveBeenCalled();
  });

  it('rethrows a network error (no .response) with the original cause preserved', async () => {
    // A network error (DNS/timeout/reset) has no `.response`; the cause must survive.
    const networkError = Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' });
    mockedAxios.mockRejectedValueOnce(networkError);

    const thrown = await captureRejection(api({ endpoint: 'foo', type: RequestType.GET }));

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe('api request failed');
    expect((thrown as Error).cause).toBe(networkError);
    expect(logError).toHaveBeenCalledWith(
      'api network error',
      expect.objectContaining({ method: RequestType.GET }),
      networkError,
    );
  });

  it('salesForceAPI returns the HTTP error response (e.g. a 401 for the refresh path)', async () => {
    const httpErrorResponse = { status: 401, data: 'INVALID_SESSION_ID' };
    mockedAxios.mockRejectedValueOnce({ response: httpErrorResponse });

    const result = await salesForceAPI({ endpoint: WEBDEV_QUERY, type: RequestType.GET });

    expect(result).toBe(httpErrorResponse);
    expect(logError).not.toHaveBeenCalled();
  });

  it('salesForceAPI keeps the transport code and discards credential-bearing errors', async () => {
    const networkError = Object.assign(new Error('private query string'), {
      code: 'ETIMEDOUT',
      config: { headers: { Authorization: 'Bearer private-token' } },
    });
    mockedAxios.mockRejectedValueOnce(networkError);

    const thrown = await captureRejection(
      salesForceAPI({ endpoint: WEBDEV_QUERY, type: RequestType.GET }),
    );

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe('salesForceAPI request failed');
    expect((thrown as Error).cause).toMatchObject({ code: 'ETIMEDOUT', message: 'Salesforce transport failed' });
    expect((thrown as Error).cause).not.toHaveProperty('config');
    expect(logError).toHaveBeenCalledWith(
      'salesForceAPI network error',
      expect.any(Object),
      (thrown as Error).cause,
    );
  });

  it('sets a bounded timeout on Salesforce requests', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 200 } as never);

    await salesForceAPI({ endpoint: WEBDEV_QUERY, type: RequestType.GET });

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 15_000, maxRedirects: 0 }),
    );
  });
});

describe('salesForceAPIWithRefresh retry policy', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('retries transient GET responses and returns the eventual success', async () => {
    vi.useFakeTimers();
    const unavailable = { status: 503, data: 'unavailable' };
    const success = { status: 200, data: 'ok' };
    mockedAxios
      .mockResolvedValueOnce(unavailable as never)
      .mockResolvedValueOnce(unavailable as never)
      .mockResolvedValueOnce(success as never);

    const request = salesForceAPIWithRefresh({
      endpoint: `${WEBDEV_QUERY}?q=sensitive`,
      type: RequestType.GET,
    });
    await vi.runAllTimersAsync();

    await expect(request).resolves.toBe(success);
    expect(mockedAxios).toHaveBeenCalledTimes(3);
    expect(logDebug).toHaveBeenCalledWith(
      'Retrying transient Salesforce GET response',
      expect.objectContaining({ endpoint: WEBDEV_QUERY, status: 503 }),
    );
  });

  it('returns the final transient response after the bounded GET attempts are exhausted', async () => {
    vi.useFakeTimers();
    const unavailable = { status: 503, data: 'unavailable' };
    mockedAxios.mockResolvedValue(unavailable as never);

    const request = salesForceAPIWithRefresh({
      endpoint: WEBDEV_QUERY,
      type: RequestType.GET,
    });
    await vi.runAllTimersAsync();

    await expect(request).resolves.toBe(unavailable);
    expect(mockedAxios).toHaveBeenCalledTimes(3);
  });

  it('retries transient GET network errors and preserves success after recovery', async () => {
    vi.useFakeTimers();
    const networkError = Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' });
    const success = { status: 200, data: 'ok' };
    mockedAxios
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(success as never);

    const request = salesForceAPIWithRefresh({
      endpoint: WEBDEV_QUERY,
      type: RequestType.GET,
    });
    await vi.runAllTimersAsync();

    await expect(request).resolves.toBe(success);
    expect(mockedAxios).toHaveBeenCalledTimes(3);
  });

  it('rejects the final GET network error after the bounded attempts are exhausted', async () => {
    vi.useFakeTimers();
    const networkError = Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' });
    mockedAxios.mockRejectedValue(networkError);

    const request = salesForceAPIWithRefresh({
      endpoint: WEBDEV_QUERY,
      type: RequestType.GET,
    });
    request.catch(() => undefined);
    await vi.runAllTimersAsync();

    await expect(request).rejects.toMatchObject({
      message: 'salesForceAPI request failed',
      cause: { code: 'ETIMEDOUT', message: 'Salesforce transport failed' },
    });
    expect(mockedAxios).toHaveBeenCalledTimes(3);
  });

  it('does not retry a non-transient GET response', async () => {
    const badRequest = { status: 400, data: 'bad request' };
    mockedAxios.mockResolvedValueOnce(badRequest as never);

    const response = await salesForceAPIWithRefresh({
      endpoint: WEBDEV_QUERY,
      type: RequestType.GET,
    });

    expect(response).toBe(badRequest);
    expect(mockedAxios).toHaveBeenCalledTimes(1);
  });

  it('never transiently retries a mutating request', async () => {
    const unavailable = { status: 503, data: 'unavailable' };
    mockedAxios.mockResolvedValueOnce(unavailable as never);

    const response = await salesForceAPIWithRefresh({
      endpoint: leadEndpoint,
      type: RequestType.PATCH,
      data: { OwnerId: '005TEST' },
    });

    expect(response).toBe(unavailable);
    expect(mockedAxios).toHaveBeenCalledTimes(1);
  });

  it('keeps the one-time 401 token refresh behavior', async () => {
    const unauthorized = { status: 401, data: 'INVALID_SESSION_ID' };
    const success = { status: 200, data: 'ok' };
    mockedAxios
      .mockResolvedValueOnce(unauthorized as never)
      .mockResolvedValueOnce(success as never);

    const response = await salesForceAPIWithRefresh({
      endpoint: WEBDEV_QUERY,
      type: RequestType.GET,
    });

    expect(response).toBe(success);
    expect(getSalesforceTokenSnapshot).toHaveBeenCalledWith({ rejectedGeneration: 1 });
    expect(mockedAxios).toHaveBeenCalledTimes(2);
  });

  it('never refreshes the token more than once across transient GET retries', async () => {
    vi.useFakeTimers();
    const unauthorized = { status: 401, data: 'INVALID_SESSION_ID' };
    const unavailable = { status: 503, data: 'unavailable' };
    mockedAxios
      .mockResolvedValueOnce(unauthorized as never)
      .mockResolvedValueOnce(unavailable as never)
      .mockResolvedValueOnce(unauthorized as never);

    const responsePromise = salesForceAPIWithRefresh({
      endpoint: WEBDEV_QUERY,
      type: RequestType.GET,
    });

    await vi.runAllTimersAsync();
    const response = await responsePromise;

    expect(response).toBe(unauthorized);
    expect(getSalesforceTokenSnapshot).toHaveBeenCalledWith({ rejectedGeneration: 1 });
    expect(getSalesforceTokenSnapshot).toHaveBeenCalledTimes(3);
    expect(mockedAxios).toHaveBeenCalledTimes(3);
  });
});

describe('Salesforce transport isolation', () => {
  beforeEach(() => vi.resetAllMocks());

  it.each([
    'https://veteranpcs.my.salesforce.com/services/data/v62.0/query',
    'https://veteranpcs--webdev.sandbox.my.salesforce.com.evil.invalid/services/data/v62.0/query',
    `${WEBDEV_ORIGIN}/services/oauth2/token`,
  ])('rejects an invalid request URL before loading a token (%s)', async (endpoint) => {
    await expect(salesForceAPIWithRefresh({ endpoint, type: RequestType.GET }))
      .rejects.toMatchObject({ name: 'SalesforceConfigurationError' });

    expect(getSalesforceTokenSnapshot).not.toHaveBeenCalled();
    expect(mockedAxios).not.toHaveBeenCalled();
  });

  it('makes ordinary previews read-only before requesting a token', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'ordinary-feature');

    await expect(salesForceAPIWithRefresh({ endpoint: leadEndpoint, type: RequestType.PATCH }))
      .rejects.toThrow('Salesforce REST writes are disabled');
    expect(getSalesforceTokenSnapshot).not.toHaveBeenCalled();
    expect(mockedAxios).not.toHaveBeenCalled();
  });

  it('invalidates a 401 write generation without replaying the mutation', async () => {
    const unauthorized = { status: 401, data: {} };
    mockedAxios.mockResolvedValueOnce(unauthorized);

    await expect(salesForceAPIWithRefresh({ endpoint: leadEndpoint, type: RequestType.PATCH })).resolves.toBe(unauthorized);
    expect(mockedAxios).toHaveBeenCalledTimes(1);
    expect(invalidateSalesforceToken).toHaveBeenCalledWith(1);
  });

  it('uses only the verified bearer and does not forward routing headers supplied by callers', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 302 });

    await expect(salesForceAPI({
      endpoint: WEBDEV_QUERY,
      type: RequestType.GET,
      customHeader: { authorization: 'Bearer forged', Host: 'outside.invalid', 'Sforce-Auto-Assign': 'FALSE' },
    })).resolves.toMatchObject({ status: 302 });
    expect(mockedAxios).toHaveBeenCalledTimes(1);
    expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
      maxRedirects: 0,
      headers: {
        'Cache-Control': 'no-cache',
        'Sforce-Auto-Assign': 'FALSE',
        Authorization: 'Bearer test-token',
      },
    }));
  });

  it('serves mock records, writes and images without touching Axios or OAuth', async () => {
    vi.stubEnv('VPCS_SALESFORCE_PROFILE', 'mock');
    const { restOrigin, apiVersion } = getSalesforceConfig();
    const endpoint = `${restOrigin}/services/data/${apiVersion}`;
    const query = encodeURIComponent("SELECT Id FROM Account WHERE isAgent__pc = true AND State_s_Licensed_in__pc LIKE '%CO%'");

    await expect(salesForceAPIWithRefresh({ endpoint: `${endpoint}/query?q=${query}`, type: RequestType.GET }))
      .resolves.toMatchObject({ status: 200, data: { records: [{ Name: 'Sample Agent', PersonEmail: 'agent@example.invalid' }] } });
    await expect(salesForceAPI({ endpoint: `${endpoint}/sobjects/Lead`, type: RequestType.POST }))
      .resolves.toMatchObject({ status: 201, data: { success: true } });
    await expect(salesForceImageAPI({ endpoint: `${restOrigin}/servlet/servlet.FileDownload?file=fixture`, type: RequestType.GET }))
      .resolves.toMatchObject({ status: 200, data: expect.any(ArrayBuffer) });

    expect(getSalesforceTokenSnapshot).not.toHaveBeenCalled();
    expect(mockedAxios).not.toHaveBeenCalled();
  });
});
