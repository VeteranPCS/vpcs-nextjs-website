import { salesForceTokenAPI, RequestType } from '@/services/api';
import { SALESFORCE_LOGIN_BASE_URL } from '@/constants/api';
import { SalesforceTokenError } from '@/lib/salesforce/token-error';

export type SalesforceTokenSnapshot = {
    readonly token: string;
    readonly generation: number;
};

type CachedSalesforceToken = SalesforceTokenSnapshot & {
    instanceUrl: string | null;
    expiresAt: number;
};

// Salesforce's password-grant response carries no `expires_in`, so we can't know
// the real session lifetime. Cache under a conservative TTL as a proactive-refresh
// hint; a 401 (handled by salesForceAPIWithRefresh / forceRefresh) is the actual
// correctness backstop if a token dies before the TTL elapses.
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 min, safely under Salesforce's default 2h session

let generation = 0;
let cached: CachedSalesforceToken | null = null;
let inflight: Promise<CachedSalesforceToken> | null = null;

async function requestSalesforceToken(): Promise<CachedSalesforceToken> {
    // Send the OAuth2 password-grant credentials in the request BODY, not the URL
    // query string. Credentials on the query string leak into proxy/access logs,
    // and reserved characters (&, +, %) in the password/security-token corrupt the
    // query. URLSearchParams url-encodes each value and axios serialises it as an
    // application/x-www-form-urlencoded body. (Follow-up: migrate to the JWT-bearer
    // grant so a long-lived password never leaves the box at all.)
    const body = new URLSearchParams({
        grant_type: 'password',
        client_id: process.env.SALESFORCE_CLIENT_ID ?? '',
        client_secret: process.env.SALESFORCE_CLIENT_SECRET ?? '',
        username: process.env.SALESFORCE_USERNAME ?? '',
        password: `${process.env.SALESFORCE_PASSWORD ?? ''}${process.env.SALESFORCE_TOKEN ?? ''}`,
    });

    const response = await salesForceTokenAPI({
        endpoint: `${SALESFORCE_LOGIN_BASE_URL}/services/oauth2/token`,
        data: body,
        type: RequestType.POST,
    });

    if (response?.status === 200 && typeof response.data?.access_token === 'string' && response.data.access_token) {
        return {
            token: response.data.access_token,
            generation: ++generation,
            instanceUrl: response.data.instance_url ?? null,
            expiresAt: Date.now() + TOKEN_TTL_MS,
        };
    }

    throw new Error('Failed to FETCH Salesforce Token');
}

/** Invalidate only the rejected generation: a late 401 must not evict a newer token. */
export function invalidateSalesforceToken(rejectedGeneration: number): void {
    if (cached?.generation === rejectedGeneration) cached = null;
}

export async function getSalesforceTokenSnapshot(options?: {
    forceRefresh?: boolean;
    rejectedGeneration?: number;
}): Promise<SalesforceTokenSnapshot> {
    if (options?.rejectedGeneration !== undefined) {
        invalidateSalesforceToken(options.rejectedGeneration);
    } else if (options?.forceRefresh) {
        cached = null;
    }

    if (cached && cached.expiresAt > Date.now()) return cached;

    // Cold calls and refreshes share one OAuth request within this process.
    if (!inflight) {
        inflight = requestSalesforceToken()
            .then((result) => {
                cached = result;
                return result;
            })
            .catch(() => {
                // Do not retain/log Axios config, response bodies, or credentials.
                throw new SalesforceTokenError();
            })
            .finally(() => {
                inflight = null;
            });
    }
    return inflight;
}

export async function getSalesforceToken(options?: { forceRefresh?: boolean }): Promise<string> {
    return (await getSalesforceTokenSnapshot(options)).token;
}
