import { Redis } from '@upstash/redis';
import { logError } from '@/services/loggingService';
import { DAILY_TOKEN_CAP } from '@/lib/ai/guardrails/config';
import { resolveUpstashRedisEnv } from '@/lib/upstash-env';

const DAY_SECONDS = 60 * 60 * 24;

// Built once at module load (mirrors lib/rate-limit.ts). Null when env is absent,
// which makes every budget operation fail open.
const redis: Redis | null = (() => {
  const env = resolveUpstashRedisEnv();
  if (!env) {
    return null;
  }
  return new Redis({ url: env.url, token: env.token });
})();

function keyFor(sessionId: string): string {
  return `concierge:tokens:${sessionId}`;
}

/** Pure cap predicate — unit-testable without Redis. */
export function tokensOverCap(count: number): boolean {
  return count >= DAILY_TOKEN_CAP;
}

/** Current cumulative tokens for a session. Fails open (0) on any error. */
export async function getSessionTokens(sessionId: string): Promise<number> {
  if (!redis) return 0;
  try {
    const value = await redis.get<number>(keyFor(sessionId));
    if (typeof value === 'number') return value;
    return Number(value ?? 0) || 0;
  } catch (error) {
    logError('Guardrail budget: read failed — failing open', { sessionId }, error);
    return 0;
  }
}

export async function isOverBudget(sessionId: string): Promise<boolean> {
  return tokensOverCap(await getSessionTokens(sessionId));
}

/** Increment a session's token tally; sets a daily TTL on first write. No-op on error. */
export async function addSessionTokens(sessionId: string, tokens: number): Promise<void> {
  if (tokens <= 0 || !redis) return;
  try {
    const key = keyFor(sessionId);
    const amount = Math.ceil(tokens);
    await redis.incrby(key, amount);
    // Set the rolling-day TTL only when the key has none (NX): a no-op once an
    // expiry exists, but it also heals an orphaned key whose earlier expire()
    // failed — so a counter can never persist forever and lock a session out.
    await redis.expire(key, DAY_SECONDS, 'NX');
  } catch (error) {
    logError('Guardrail budget: increment failed — failing open', { sessionId }, error);
  }
}
