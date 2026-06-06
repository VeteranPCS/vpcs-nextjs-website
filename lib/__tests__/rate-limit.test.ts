import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('rate-limit fail-open behaviour', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('chatLimiter and formLimiter both fail open when Upstash env vars are missing', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');

    const { chatLimiter, formLimiter } = await import('@/lib/rate-limit');

    const chatResult = await chatLimiter.limit('test-ip-chat');
    expect(chatResult.success).toBe(true);
    expect(chatResult.limit).toBe(Infinity);
    expect(chatResult.remaining).toBe(Infinity);

    const formResult = await formLimiter.limit('test-ip-form');
    expect(formResult.success).toBe(true);
    expect(formResult.limit).toBe(Infinity);
    expect(formResult.remaining).toBe(Infinity);
  });

  it('fail-open mock returns a numeric reset timestamp', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');

    const { chatLimiter } = await import('@/lib/rate-limit');

    const result = await chatLimiter.limit('x');
    expect(typeof result.reset).toBe('number');
    expect(result.reset).toBeGreaterThan(0);
  });
});
