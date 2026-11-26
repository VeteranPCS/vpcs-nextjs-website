import axios from 'axios';
import {
    assertSalesforceInstanceUrl,
    assertSalesforceOrganization,
    getSalesforceOAuthRequest,
    getSalesforceOrganizationQueryUrl,
    type SalesforceEnvironment,
} from '@/lib/salesforce/environment.mjs';
import { getSalesforceConfig } from '@/lib/salesforce/server-config';
import { SalesforceTokenError } from '@/lib/salesforce/token-error';

export type SalesforceTokenSnapshot = {
    readonly token: string;
    readonly generation: number;
    readonly instanceUrl: string;
    readonly cacheKey: string;
};

type CachedSalesforceToken = SalesforceTokenSnapshot & { readonly expiresAt: number };

// A 401 remains the correctness backstop when Salesforce revokes a session
// before this conservative refresh interval.
const TOKEN_TTL_MS = 55 * 60 * 1000;
const AUTH_REQUEST_TIMEOUT_MS = 15_000;

let generation = 0;
const cached = new Map<string, CachedSalesforceToken>();
const inflight = new Map<string, Promise<CachedSalesforceToken>>();

async function requestSalesforceToken(config: SalesforceEnvironment): Promise<CachedSalesforceToken> {
    const { url, body } = getSalesforceOAuthRequest(config);
    const response = await axios({
        url,
        method: 'post',
        data: body,
        timeout: AUTH_REQUEST_TIMEOUT_MS,
        maxRedirects: 0,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const token: unknown = response.data?.access_token;
    if (response.status !== 200 || typeof token !== 'string' || !token) throw new SalesforceTokenError();

    const instanceUrl = assertSalesforceInstanceUrl(response.data?.instance_url, config);
    const organization = await axios({
        url: getSalesforceOrganizationQueryUrl(config),
        method: 'get',
        timeout: AUTH_REQUEST_TIMEOUT_MS,
        maxRedirects: 0,
        headers: { Authorization: `Bearer ${token}` },
    });
    if (organization.status !== 200) throw new SalesforceTokenError();
    assertSalesforceOrganization(organization.data, config);

    return {
        token,
        generation: ++generation,
        instanceUrl,
        cacheKey: config.cacheKey,
        expiresAt: Date.now() + TOKEN_TTL_MS,
    };
}

/** Invalidate only the rejected generation so late 401s preserve a refreshed session. */
export function invalidateSalesforceToken(rejectedGeneration: number): void {
    for (const [key, session] of cached) {
        if (session.generation === rejectedGeneration) {
            cached.delete(key);
            return;
        }
    }
}

export async function getSalesforceTokenSnapshot(options?: {
    forceRefresh?: boolean;
    rejectedGeneration?: number;
}): Promise<SalesforceTokenSnapshot> {
    const config = getSalesforceConfig();
    const { cacheKey } = config;
    if (config.profile === 'mock') {
        return { token: 'offline-mock-salesforce-token', generation: 0, instanceUrl: config.restOrigin, cacheKey };
    }

    if (options?.rejectedGeneration !== undefined) {
        invalidateSalesforceToken(options.rejectedGeneration);
    } else if (options?.forceRefresh) {
        cached.delete(cacheKey);
    }

    const current = cached.get(cacheKey);
    if (current && current.expiresAt > Date.now()) return current;

    const pending = inflight.get(cacheKey);
    if (pending) return pending;

    const request = requestSalesforceToken(config)
        .then((result) => {
            cached.set(cacheKey, result);
            return result;
        })
        .catch(() => {
            // Discard credential-bearing Axios config and untrusted response bodies.
            throw new SalesforceTokenError();
        })
        .finally(() => {
            inflight.delete(cacheKey);
        });
    inflight.set(cacheKey, request);
    return request;
}

export const getVerifiedSalesforceSession = getSalesforceTokenSnapshot;

export async function getSalesforceToken(options?: { forceRefresh?: boolean }): Promise<string> {
    return (await getSalesforceTokenSnapshot(options)).token;
}
