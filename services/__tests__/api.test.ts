import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { api, salesForceAPI, RequestType } from '@/services/api';
import { logError } from '@/services/loggingService';

// axios is called as a function (default export) inside the api helpers.
vi.mock('axios', () => ({ default: vi.fn() }));
vi.mock('@/services/salesForceTokenService', () => ({
  getSalesforceToken: vi.fn(async () => 'test-token'),
}));
vi.mock('@/services/loggingService', () => ({
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
});
