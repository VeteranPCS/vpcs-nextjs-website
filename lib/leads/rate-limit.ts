import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { resolveUpstashRedisEnv } from '@/lib/upstash-env';

export function resolveLeadRedisEnv(): { url: string; token: string } {
    const production = resolveUpstashRedisEnv();
    if (production) return production;
    if (process.env.VPCS_SALESFORCE_PROFILE !== 'webdev' || process.env.VERCEL_ENV === 'production') {
        throw new Error('Lead rate backend unavailable');
    }

    const manual = {
        url: process.env.VPCS_WEBDEV_LEAD_REDIS_URL?.trim() ?? '',
        token: process.env.VPCS_WEBDEV_LEAD_REDIS_TOKEN?.trim() ?? '',
    };
    const integration = {
        url: process.env.VPCS_WEBDEV_LEAD_REDIS_KV_REST_API_URL?.trim() ?? '',
        token: process.env.VPCS_WEBDEV_LEAD_REDIS_KV_REST_API_TOKEN?.trim() ?? '',
    };
    const preview = process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'preview';
    if (Boolean(manual.url) !== Boolean(manual.token) ||
        Boolean(integration.url) !== Boolean(integration.token) ||
        (integration.url && !preview) ||
        (manual.url && integration.url && (manual.url !== integration.url || manual.token !== integration.token))) {
        throw new Error('Lead rate backend configuration is incomplete or conflicting');
    }

    const { url, token } = integration.url ? integration : manual;
    const local = process.env.VERCEL !== '1' && process.env.VERCEL_ENV === undefined;
    const approvedUrl = /^https:\/\/[a-z0-9-]+\.upstash\.io$/.test(url)
        || (local && /^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(url));
    if (!approvedUrl || !token || /\s/.test(token)) throw new Error('Lead rate backend unavailable');
    for (const name of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_KV_REST_API_URL', 'VPCS_WEBDEV_UPSTASH_REDIS_REST_URL']) {
        if (process.env[name]?.trim().toLowerCase().replace(/\/$/, '') === url) throw new Error('Shared lead rate destination rejected');
    }
    for (const name of ['UPSTASH_REDIS_REST_TOKEN', 'UPSTASH_REDIS_REST_KV_REST_API_TOKEN', 'VPCS_WEBDEV_UPSTASH_REDIS_REST_TOKEN']) {
        if (process.env[name]?.trim() === token) throw new Error('Shared lead rate credential rejected');
    }
    return { url, token };
}

export function createLeadLimiter(env: { url: string; token: string }) {
    return new Ratelimit({
        redis: new Redis({ ...env, retry: { retries: 0 }, signal: () => AbortSignal.timeout(2500) }),
        limiter: Ratelimit.slidingWindow(5, '600 s'),
        prefix: 'ratelimit:lead-admission:r1',
        analytics: false,
        timeout: 0,
        ephemeralCache: false,
    });
}

export async function leadRateLimit(keys: string[]): Promise<{ allowed: boolean; retryAt: number }> {
    if (!keys.length || keys.length > 2) throw new Error('Invalid lead rate identity');
    const limiter = createLeadLimiter(resolveLeadRedisEnv());
    const results = await Promise.all(keys.map(key => limiter.limit(key)));
    return { allowed: results.every(result => result.success), retryAt: Math.max(...results.map(result => result.reset)) };
}
