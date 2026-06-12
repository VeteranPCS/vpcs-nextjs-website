import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tokensOverCap } from '@/lib/ai/guardrails/budget';
import { DAILY_TOKEN_CAP } from '@/lib/ai/guardrails/config';

// Single mock Redis client reused across the env-present tests. The fail-open
// suite stubs empty env, so budget.ts returns null before ever constructing it.
const redisMock = vi.hoisted(() => ({ incrby: vi.fn(), expire: vi.fn(), get: vi.fn() }));
vi.mock('@upstash/redis', () => ({
  // `new Redis(...)` must construct — a constructor returning an object yields that
  // object, so every `new Redis()` resolves to the shared spy client.
  Redis: vi.fn(function RedisMock() { return redisMock; }),
}));

describe('tokensOverCap', () => {
  it('is true at/over the cap and false under it', () => {
    expect(tokensOverCap(0)).toBe(false);
    expect(tokensOverCap(DAILY_TOKEN_CAP - 1)).toBe(false);
    expect(tokensOverCap(DAILY_TOKEN_CAP)).toBe(true);
    expect(tokensOverCap(DAILY_TOKEN_CAP + 1)).toBe(true);
  });
});

describe('budget fail-open (no Upstash env)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  });

  it('reads 0 tokens and is never over budget', async () => {
    const { getSessionTokens, isOverBudget } = await import('@/lib/ai/guardrails/budget');
    expect(await getSessionTokens('sid')).toBe(0);
    expect(await isOverBudget('sid')).toBe(false);
  });

  it('addSessionTokens is a no-op that does not throw', async () => {
    const { addSessionTokens } = await import('@/lib/ai/guardrails/budget');
    await expect(addSessionTokens('sid', 5000)).resolves.toBeUndefined();
  });
});

describe('addSessionTokens TTL — NX heal', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token');
    redisMock.incrby.mockReset();
    redisMock.expire.mockReset();
  });

  it('always sets the rolling-day TTL with NX, even when the key already existed', async () => {
    // incrby returning more than the amount we just added means the key pre-existed
    // (a prior write in this window). The TTL must STILL be asserted so an orphaned
    // key whose earlier expire() failed self-heals instead of blocking forever.
    redisMock.incrby.mockResolvedValue(150_000);
    const { addSessionTokens } = await import('@/lib/ai/guardrails/budget');

    await addSessionTokens('sid', 100);

    expect(redisMock.incrby).toHaveBeenCalledWith('concierge:tokens:sid', 100);
    expect(redisMock.expire).toHaveBeenCalledWith('concierge:tokens:sid', 86_400, 'NX');
  });
});
