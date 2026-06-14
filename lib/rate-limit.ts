import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { resolveUpstashRedisEnv } from '@/lib/upstash-env';

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
  const env = resolveUpstashRedisEnv();

  if (!env) {
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

  const redis = new Redis({ url: env.url, token: env.token });
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
