import { EventEmitter } from "node:events";
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import {
    getSalesforceTokenSnapshot,
    invalidateSalesforceToken,
    type SalesforceTokenSnapshot,
} from "@/services/salesForceTokenService";
import { SalesforceConfigurationError, resolveSalesforceIntakeAuth, validateSalesforceRequestUrl } from "@/lib/salesforce/environment.mjs";
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

type BoundedSalesforceRequest = ApiParams & { signal?: AbortSignal };

// A Salesforce query endpoint carries its SOQL in the query string, which can include a
// customer email in a WHERE clause. Because the URL is percent-encoded (`%40`), the log
// sanitizer's email regex never matches it, so log only the path — enough to identify the
// failing call without leaking PII into logs.
const logSafeEndpoint = (url: string | undefined): string | undefined => {
    if (!url) return url;
    const queryStart = url.indexOf('?');
    return queryStart === -1 ? url : url.slice(0, queryStart);
};

function waitForSalesforceRetry(milliseconds: number, signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted();
    return new Promise((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(signal?.reason); };
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', abort);
            resolve();
        }, milliseconds);
        signal?.addEventListener('abort', abort, { once: true });
    });
}

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

function prepareSalesforceRequest(params: ApiParams, purpose?: 'intake') {
    const baseConfig = getSalesforceConfig();
    const url = purpose === 'intake'
        ? validateSalesforceRequestUrl(params.endpoint, baseConfig, purpose)
        : assertSalesforceRequestUrl(params.endpoint, baseConfig);
    const isRead = params.type === RequestType.GET;
    const isMutation = params.type === RequestType.POST || params.type === RequestType.PUT
        || params.type === RequestType.PATCH || params.type === RequestType.DELETE;
    if (!isRead && !isMutation) {
        throw new SalesforceConfigurationError('Unsupported Salesforce REST request method.');
    }
    if (isMutation && baseConfig.profile === 'webdev' && !baseConfig.allowSandboxWrites) {
        throw new SalesforceConfigurationError('Salesforce REST writes are disabled for this deployment.');
    }
    const config = purpose === 'intake' && baseConfig.profile !== 'mock'
        ? resolveSalesforceIntakeAuth(baseConfig).config : baseConfig;
    return { config, url };
}

const RESTRICTED_HEADERS = new Set(['authorization', 'proxy-authorization', 'cookie', 'host']);

async function requestSalesforceAPI(
    params: BoundedSalesforceRequest,
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
            ...(params.signal ? { signal: params.signal } : {}),
            maxRedirects: 0,
            headers: {
                ...customHeaders,
                "Cache-Control": "no-cache",
                Authorization: `Bearer ${session.token}`,
            },
            responseType: image ? 'arraybuffer' : undefined,
        });
    } catch (error: any) {
        params.signal?.throwIfAborted();
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

function waitForSalesforceSession(signal?: AbortSignal, rejectedGeneration?: number, purpose?: 'intake'): Promise<SalesforceTokenSnapshot> {
    signal?.throwIfAborted();
    const options = rejectedGeneration === undefined ? undefined : { rejectedGeneration };
    const session = getSalesforceTokenSnapshot(purpose ? { ...options, purpose } : options);
    if (!signal) return session;

    return new Promise((resolve, reject) => {
        const abort = () => reject(signal.reason);
        signal.addEventListener('abort', abort, { once: true });
        // A request may stop waiting without cancelling authentication shared by other callers.
        void session.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    });
}

async function requestWithoutRetry(params: BoundedSalesforceRequest, image = false, purpose?: 'intake'): Promise<AxiosResponse> {
    params.signal?.throwIfAborted();
    const target = prepareSalesforceRequest(params, purpose);
    params.signal?.throwIfAborted();
    if (target.config.profile === 'mock') return requestMockSalesforce(target.url, params.type, image);

    const session = await waitForSalesforceSession(params.signal, undefined, purpose);
    params.signal?.throwIfAborted();
    const response = await requestSalesforceAPI(params, target, session, image);
    if (response.status === 401) invalidateSalesforceToken(session.generation);
    return response;
}

export const salesForceAPI = (params: BoundedSalesforceRequest): Promise<AxiosResponse> => requestWithoutRetry(params);

export type SalesforceIntakeOperation = 'policy' | 'inspect' | 'claim' | 'reconcile' | 'notification';

export async function salesForceIntakeAPI(
    operation: SalesforceIntakeOperation,
    data: Record<string, unknown>,
    signal?: AbortSignal,
): Promise<AxiosResponse> {
    // Check the operation before interpolation, including for untyped callers.
    if (!['policy', 'inspect', 'claim', 'reconcile', 'notification'].includes(operation)) {
        throw new SalesforceConfigurationError('Unsupported Salesforce intake operation.');
    }
    const { restOrigin } = getSalesforceConfig();
    return requestWithoutRetry({
        endpoint: `${restOrigin}/services/apexrest/vpcs/intake/v1/${operation}`,
        type: RequestType.POST,
        data,
        signal,
    }, false, 'intake');
}

export const salesForceImageAPI = (params: ApiParams): Promise<AxiosResponse> => requestWithoutRetry(params, true);

// A safe GET can refresh a rejected token once and retry bounded transient failures.
// Invalidate a rejected write token for future requests without replaying the mutation.
export const salesForceAPIWithRefresh = async (params: BoundedSalesforceRequest): Promise<AxiosResponse> => {
    const target = prepareSalesforceRequest(params);
    const { signal } = params;
    signal?.throwIfAborted();
    if (target.config.profile === 'mock') return requestMockSalesforce(target.url, params.type, false);

    const isRetryableGet = params.type === RequestType.GET;
    const attempts = isRetryableGet ? SALESFORCE_GET_RETRY_DELAYS_MS.length + 1 : 1;
    let didRefreshAuth = false;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            let session = await waitForSalesforceSession(signal);
            signal?.throwIfAborted();
            let response = await requestSalesforceAPI(params, target, session);

            if (response.status === 401 && isRetryableGet && !didRefreshAuth) {
                didRefreshAuth = true;
                session = await waitForSalesforceSession(signal, session.generation);
                signal?.throwIfAborted();
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
            signal?.throwIfAborted();
            if (error instanceof SalesforceTokenError || error instanceof SalesforceConfigurationError
                || !isRetryableGet || attempt >= attempts) throw error;

            logDebug('Retrying transient Salesforce GET error', {
                endpoint: logSafeEndpoint(params.endpoint),
                attempt,
                maxAttempts: attempts,
            });
        }

        const retryDelay = SALESFORCE_GET_RETRY_DELAYS_MS[attempt - 1];
        if (retryDelay !== undefined) await waitForSalesforceRetry(retryDelay, signal);
    }

    throw new Error('Salesforce GET retry loop exhausted');
};
