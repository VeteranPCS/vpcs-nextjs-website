import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { logInfo } from '@/services/loggingService';

interface LimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

interface Limiter {
  limit(identifier: string): Promise<LimitResult>;
}

function buildLimiter(): Limiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    logInfo('Rate limit disabled — Upstash env vars missing');
    const now = Date.now();
    return {
      limit: async () => ({
        success: true,
        limit: Infinity,
        remaining: Infinity,
        reset: now,
      }),
    };
  }

  const redis = new Redis({ url, token });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '60 s'),
    analytics: false,
    prefix: 'ratelimit:chat',
  });
}

export const chatLimiter: Limiter = buildLimiter();
