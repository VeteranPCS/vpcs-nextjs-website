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

type LimiterAlgorithm = ConstructorParameters<typeof Ratelimit>[0]['limiter'];

interface BuildLimiterOpts {
  prefix: string;
  limiter: LimiterAlgorithm;
}

function buildLimiter(opts: BuildLimiterOpts): Limiter {
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
    limiter: opts.limiter,
    analytics: false,
    prefix: opts.prefix,
  });
}

export const chatLimiter: Limiter = buildLimiter({
  prefix: 'ratelimit:chat',
  limiter: Ratelimit.slidingWindow(10, '60 s'),
});

export const formLimiter: Limiter = buildLimiter({
  prefix: 'ratelimit:form',
  limiter: Ratelimit.slidingWindow(5, '600 s'),
});
