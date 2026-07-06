import { EventEmitter } from "node:events";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { getSalesforceToken } from "@/services/salesForceTokenService";
import { logError } from "@/services/loggingService";

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
            logError('api network error', { endpoint: config.url, method: type }, err);
            throw new Error('api request failed', { cause: err });
        }
    }

    return res;  // Return the response or error
};
// ***** end - Api function for calling any type of APIs *****

export const salesForceAPI = async ({
    endpoint,
    data,
    type,
    customHeader
}: ApiParams): Promise<AxiosResponse | undefined> => {
    let res: AxiosResponse | undefined;

    const token = await getSalesforceToken();

    const config: AxiosRequestConfig = {
        url: endpoint,
        method: type as any,
        data,
        headers: {
            "Cache-Control": "no-cache",
            Authorization: `Bearer ${token}`,
            ...customHeader,
        },
    };

    try {
        res = await axios(config);
    } catch (err: any) {
        if (err?.response) {
            // HTTP error response (4xx/5xx): return it so callers can inspect .status
            // (salesForceAPIWithRefresh reads .status === 401 to trigger a single retry).
            res = err.response;
        } else {
            // Network error (no HTTP response): log the real cause and rethrow it wrapped.
            logError('salesForceAPI network error', { endpoint: config.url, method: type }, err);
            throw new Error('salesForceAPI request failed', { cause: err });
        }
    }

    return res;  // Return the response or error
};

// Runs salesForceAPI and, on a 401, forces a single token refresh and retries once.
// Bounded at one retry — replaces the previous unbounded 401-recursion at call sites.
export const salesForceAPIWithRefresh = async (
    params: ApiParams,
): Promise<AxiosResponse | undefined> => {
    let response = await salesForceAPI(params);

    if (response?.status === 401) {
        await getSalesforceToken({ forceRefresh: true });
        response = await salesForceAPI(params);
    }

    return response;
};

export const salesForceImageAPI = async ({
    endpoint,
    data,
    type
}: ApiParams): Promise<AxiosResponse | undefined> => {
    let res: AxiosResponse | undefined;

    const token = await getSalesforceToken();

    const config: AxiosRequestConfig = {
        url: endpoint,
        method: type as any,
        data,
        headers: {
            "Cache-Control": "no-cache",
            Authorization: `Bearer ${token}`,
        },
        responseType: 'arraybuffer'
    };

    try {
        res = await axios(config);
    } catch (err: any) {
        if (err?.response) {
            // HTTP error response (4xx/5xx): return it so callers can inspect .status.
            res = err.response;
        } else {
            // Network error (no HTTP response): log the real cause and rethrow it wrapped.
            logError('salesForceImageAPI network error', { endpoint: config.url, method: type }, err);
            throw new Error('salesForceImageAPI request failed', { cause: err });
        }
    }

    return res;  // Return the response or error
};

export const salesForceTokenAPI = async ({
    endpoint,
    data,
    type
}: ApiParams): Promise<AxiosResponse | undefined> => {
    let res: AxiosResponse | undefined;

    // Token endpoint only: the OAuth2 grant params travel as a
    // application/x-www-form-urlencoded body (see salesForceTokenService), never
    // on the URL query string, so credentials don't leak into logs.
    const config: AxiosRequestConfig = {
        url: endpoint,
        method: type as any,
        data,
        headers: {
            "Cache-Control": "no-cache",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    };

    try {
        res = await axios(config);
    } catch (err: any) {
        if (err?.response) {
            // HTTP error response (4xx/5xx): return it so callers can inspect .status.
            res = err.response;
        } else {
            // Network error (no HTTP response): log the real cause and rethrow it wrapped.
            // logError only extracts message/name/code/stack — the credentialed request body
            // (err.config.data) is never logged, so this does not leak the OAuth grant.
            logError('salesForceTokenAPI network error', { endpoint: config.url, method: type }, err);
            throw new Error('salesForceTokenAPI request failed', { cause: err });
        }
    }

    return res;  // Return the response or error
};
