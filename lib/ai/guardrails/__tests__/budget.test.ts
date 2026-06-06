import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tokensOverCap } from '@/lib/ai/guardrails/budget';
import { DAILY_TOKEN_CAP } from '@/lib/ai/guardrails/config';

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
