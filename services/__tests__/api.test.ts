import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { api, salesForceAPI, salesForceAPIWithRefresh, RequestType } from '@/services/api';
import { getSalesforceToken } from '@/services/salesForceTokenService';
import { logDebug, logError } from '@/services/loggingService';

// axios is called as a function (default export) inside the api helpers.
vi.mock('axios', () => ({ default: vi.fn() }));
vi.mock('@/services/salesForceTokenService', () => ({
  getSalesforceToken: vi.fn(async () => 'test-token'),
}));
vi.mock('@/services/loggingService', () => ({
  logDebug: vi.fn(),
  logError: vi.fn(),
}));

const mockedAxios = vi.mocked(axios);

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

    const result = await salesForceAPI({ endpoint: 'https://sf/query', type: RequestType.GET });

    expect(result).toBe(httpErrorResponse);
    expect(logError).not.toHaveBeenCalled();
  });

  it('salesForceAPI rethrows a network error with the original cause preserved', async () => {
    const networkError = Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' });
    mockedAxios.mockRejectedValueOnce(networkError);

    const thrown = await captureRejection(
      salesForceAPI({ endpoint: 'https://sf/query', type: RequestType.GET }),
    );

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe('salesForceAPI request failed');
    expect((thrown as Error).cause).toBe(networkError);
    expect(logError).toHaveBeenCalledWith(
      'salesForceAPI network error',
      expect.any(Object),
      networkError,
    );
  });

  it('sets a bounded timeout on Salesforce requests', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 200 } as never);

    await salesForceAPI({ endpoint: 'https://sf/query', type: RequestType.GET });

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 15_000 }),
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
      endpoint: 'https://sf/query?q=sensitive',
      type: RequestType.GET,
    });
    await vi.runAllTimersAsync();

    await expect(request).resolves.toBe(success);
    expect(mockedAxios).toHaveBeenCalledTimes(3);
    expect(logDebug).toHaveBeenCalledWith(
      'Retrying transient Salesforce GET response',
      expect.objectContaining({ endpoint: 'https://sf/query', status: 503 }),
    );
  });

  it('returns the final transient response after the bounded GET attempts are exhausted', async () => {
    vi.useFakeTimers();
    const unavailable = { status: 503, data: 'unavailable' };
    mockedAxios.mockResolvedValue(unavailable as never);

    const request = salesForceAPIWithRefresh({
      endpoint: 'https://sf/query',
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
      endpoint: 'https://sf/query',
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
      endpoint: 'https://sf/query',
      type: RequestType.GET,
    });
    request.catch(() => undefined);
    await vi.runAllTimersAsync();

    await expect(request).rejects.toMatchObject({
      message: 'salesForceAPI request failed',
      cause: networkError,
    });
    expect(mockedAxios).toHaveBeenCalledTimes(3);
  });

  it('does not retry a non-transient GET response', async () => {
    const badRequest = { status: 400, data: 'bad request' };
    mockedAxios.mockResolvedValueOnce(badRequest as never);

    const response = await salesForceAPIWithRefresh({
      endpoint: 'https://sf/query',
      type: RequestType.GET,
    });

    expect(response).toBe(badRequest);
    expect(mockedAxios).toHaveBeenCalledTimes(1);
  });

  it('never transiently retries a mutating request', async () => {
    const unavailable = { status: 503, data: 'unavailable' };
    mockedAxios.mockResolvedValueOnce(unavailable as never);

    const response = await salesForceAPIWithRefresh({
      endpoint: 'https://sf/lead/001',
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
      endpoint: 'https://sf/query',
      type: RequestType.GET,
    });

    expect(response).toBe(success);
    expect(getSalesforceToken).toHaveBeenCalledWith({ forceRefresh: true });
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
      endpoint: 'https://sf/query',
      type: RequestType.GET,
    });

    await vi.runAllTimersAsync();
    const response = await responsePromise;

    expect(response).toBe(unauthorized);
    expect(getSalesforceToken).toHaveBeenCalledWith({ forceRefresh: true });
    expect(getSalesforceToken).toHaveBeenCalledTimes(4);
    expect(mockedAxios).toHaveBeenCalledTimes(3);
  });
});
