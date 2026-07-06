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

// IP-scoped companion to chatLimiter. The session bucket is keyed by the
// (client-droppable) `vpcs_concierge_sid` cookie, so on its own it resets the
// moment a caller clears the cookie. This second bucket is keyed by caller IP so
// the limit survives cookie cycling. Kept modestly above the per-session limit
// so a single abuser is still bounded while shared/NAT networks (common on
// military bases) keep some headroom — tune if legit base traffic trips it.
export const chatIpLimiter: Limiter = buildLimiter({
  prefix: 'ratelimit:chat:ip',
  limiter: Ratelimit.slidingWindow(20, '60 s'),
});

// Guards the MCP route (/api/mcp). Mirrors chatLimiter's window; keyed by caller IP.
export const mcpLimiter: Limiter = buildLimiter({
  prefix: 'ratelimit:mcp',
  limiter: Ratelimit.slidingWindow(10, '60 s'),
});

// Guards the public BAH lookup (/api/v1/bah), which fans out to the DTMO scraper.
// Keyed by caller IP.
export const bahLimiter: Limiter = buildLimiter({
  prefix: 'ratelimit:bah',
  limiter: Ratelimit.slidingWindow(20, '60 s'),
});

export const formLimiter: Limiter = buildLimiter({
  prefix: 'ratelimit:form',
  limiter: Ratelimit.slidingWindow(5, '600 s'),
});
