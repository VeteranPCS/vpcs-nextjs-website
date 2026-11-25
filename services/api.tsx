import { EventEmitter } from "node:events";
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import {
    getSalesforceTokenSnapshot,
    invalidateSalesforceToken,
    type SalesforceTokenSnapshot,
} from "@/services/salesForceTokenService";
import { SalesforceConfigurationError } from "@/lib/salesforce/environment.mjs";
import { requestMockSalesforce } from "@/lib/salesforce/mock-transport";
import { assertSalesforceRequestUrl, getSalesforceConfig } from "@/lib/salesforce/server-config";
import { SalesforceTokenError } from "@/lib/salesforce/token-error";
import { logDebug, logError } from "@/services/loggingService";

// Next spawns fresh worker processes for static generation — globals set in
// next.config.mjs don't reach them. Raise the listener ceiling here so the
// 57 state pages' concurrent Salesforce fan-out doesn't trip Node's default
// 10-listener cap on pooled TLS sockets.
if (EventEmitter.defaultMaxListeners < 20) {
    EventEmitter.defaultMaxListeners = 20;
}

// ***** start - import from files *****
import { BASE_API_URL } from "@/constants/api";
// ***** end - import from files *****

// ***** start - static variables *****
const mainUrl = BASE_API_URL;
const SALESFORCE_REQUEST_TIMEOUT_MS = 15_000;
const SALESFORCE_GET_RETRY_DELAYS_MS = [250, 750] as const;
const RETRYABLE_SALESFORCE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
// ***** end - static variables *****

// Enum for API Request Types
export enum RequestType {
    POST = "post",
    GET = "get",
    PUT = "put",
    PATCH = "patch",
    DELETE = "delete",
    POST_WITHOUT_TOKEN = "postWithoutToken",
    POST_FORM_DATA = "postFormData",
    PATCH_FORM_DATA = "patchFormData",
}

// Interface for headers
interface CustomHeaders {
    [key: string]: string | undefined;
}

// Interface for the API function parameters
interface ApiParams {
    endpoint: string;
    data?: any;
    type: RequestType;
    logOutToken?: string;
    isNonAuthenticated?: boolean;
    customHeader?: CustomHeaders;
}

// A Salesforce query endpoint carries its SOQL in the query string, which can include a
// customer email in a WHERE clause. Because the URL is percent-encoded (`%40`), the log
// sanitizer's email regex never matches it, so log only the path — enough to identify the
// failing call without leaking PII into logs.
const logSafeEndpoint = (url: string | undefined): string | undefined => {
    if (!url) return url;
    const queryStart = url.indexOf('?');
    return queryStart === -1 ? url : url.slice(0, queryStart);
};

const wait = (milliseconds: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

// ***** start - Api function for calling any type of APIs *****
export const api = async ({
    endpoint,
    data,
    type
}: ApiParams): Promise<AxiosResponse | undefined> => {
    let res: AxiosResponse | undefined;

    const config: AxiosRequestConfig = {
        url: `${mainUrl}/${endpoint}`,
        method: type as any,
        data,
        headers: {
            "Cache-Control": "no-cache",
        },
    };

    try {
        res = await axios(config);
    } catch (err: any) {
        if (err?.response) {
            // HTTP error response (4xx/5xx): return it so callers can inspect .status.
            res = err.response;
        } else {
            // Network error (no HTTP response): log the real cause and rethrow it wrapped so
            // callers' existing catch/fallback paths still fire, but the cause is preserved.
            logError('api network error', { endpoint: logSafeEndpoint(config.url), method: type }, err);
            throw new Error('api request failed', { cause: err });
        }
    }

    return res;  // Return the response or error
};
// ***** end - Api function for calling any type of APIs *****

function prepareSalesforceRequest(params: ApiParams) {
    const config = getSalesforceConfig();
    const url = assertSalesforceRequestUrl(params.endpoint, config);
    const isRead = params.type === RequestType.GET;
    const isMutation = params.type === RequestType.POST || params.type === RequestType.PUT
        || params.type === RequestType.PATCH || params.type === RequestType.DELETE;
    if (!isRead && !isMutation) {
        throw new SalesforceConfigurationError('Unsupported Salesforce REST request method.');
    }
    if (isMutation && config.profile === 'webdev' && !config.allowSandboxWrites) {
        throw new SalesforceConfigurationError('Salesforce REST writes are disabled for this deployment.');
    }
    return { config, url };
}

const RESTRICTED_HEADERS = new Set(['authorization', 'proxy-authorization', 'cookie', 'host']);

async function requestSalesforceAPI(
    params: ApiParams,
    target: ReturnType<typeof prepareSalesforceRequest>,
    session: SalesforceTokenSnapshot,
    image = false,
): Promise<AxiosResponse> {
    const { url, config } = target;
    if (session.cacheKey !== config.cacheKey || session.instanceUrl !== url.origin) {
        throw new SalesforceConfigurationError('The verified Salesforce session does not match the request target.');
    }

    const customHeaders = Object.fromEntries(
        Object.entries(params.customHeader ?? {}).filter(([key]) => !RESTRICTED_HEADERS.has(key.toLowerCase())),
    );
    const service = image ? 'salesForceImageAPI' : 'salesForceAPI';
    try {
        return await axios({
            url: url.toString(),
            method: params.type,
            data: params.data,
            timeout: SALESFORCE_REQUEST_TIMEOUT_MS,
            maxRedirects: 0,
            headers: {
                ...customHeaders,
                "Cache-Control": "no-cache",
                Authorization: `Bearer ${session.token}`,
            },
            responseType: image ? 'arraybuffer' : undefined,
        });
    } catch (error: any) {
        if (error?.response) return error.response;

        // Raw Axios errors retain request headers and can include SOQL in the message.
        const code = typeof error?.code === 'string' && /^[A-Z0-9_]{1,40}$/.test(error.code)
            ? error.code
            : undefined;
        const detail = Object.assign(new Error('Salesforce transport failed'), { code });
        logError(`${service} network error`, { endpoint: logSafeEndpoint(url.toString()), method: params.type }, detail);
        throw new Error(`${service} request failed`, { cause: detail });
    }
}

async function requestWithoutRetry(params: ApiParams, image = false): Promise<AxiosResponse> {
    const target = prepareSalesforceRequest(params);
    if (target.config.profile === 'mock') return requestMockSalesforce(target.url, params.type, image);

    const session = await getSalesforceTokenSnapshot();
    const response = await requestSalesforceAPI(params, target, session, image);
    if (response.status === 401) invalidateSalesforceToken(session.generation);
    return response;
}

export const salesForceAPI = (params: ApiParams): Promise<AxiosResponse> => requestWithoutRetry(params);

export const salesForceImageAPI = (params: ApiParams): Promise<AxiosResponse> => requestWithoutRetry(params, true);

// A safe GET can refresh a rejected token once and retry bounded transient failures.
// Invalidate a rejected write token for future requests without replaying the mutation.
export const salesForceAPIWithRefresh = async (params: ApiParams): Promise<AxiosResponse> => {
    const target = prepareSalesforceRequest(params);
    if (target.config.profile === 'mock') return requestMockSalesforce(target.url, params.type, false);

    const isRetryableGet = params.type === RequestType.GET;
    const attempts = isRetryableGet ? SALESFORCE_GET_RETRY_DELAYS_MS.length + 1 : 1;
    let didRefreshAuth = false;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            let session = await getSalesforceTokenSnapshot();
            let response = await requestSalesforceAPI(params, target, session);

            if (response.status === 401 && isRetryableGet && !didRefreshAuth) {
                didRefreshAuth = true;
                session = await getSalesforceTokenSnapshot({ rejectedGeneration: session.generation });
                response = await requestSalesforceAPI(params, target, session);
            }

            if (response.status === 401) {
                invalidateSalesforceToken(session.generation);
                return response;
            }

            if (!RETRYABLE_SALESFORCE_STATUSES.has(response.status) || attempt >= attempts) return response;

            logDebug('Retrying transient Salesforce GET response', {
                endpoint: logSafeEndpoint(params.endpoint),
                status: response.status,
                attempt,
                maxAttempts: attempts,
            });
        } catch (error) {
            if (error instanceof SalesforceTokenError || error instanceof SalesforceConfigurationError
                || !isRetryableGet || attempt >= attempts) throw error;

            logDebug('Retrying transient Salesforce GET error', {
                endpoint: logSafeEndpoint(params.endpoint),
                attempt,
                maxAttempts: attempts,
            });
        }

        const retryDelay = SALESFORCE_GET_RETRY_DELAYS_MS[attempt - 1];
        if (retryDelay !== undefined) await wait(retryDelay);
    }

    throw new Error('Salesforce GET retry loop exhausted');
};
