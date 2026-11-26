import 'server-only';

import {
    resolveSalesforceEnvironment,
    validateSalesforceRequestUrl,
    validateWebToLeadTarget,
    type SalesforceEnvironment,
} from './environment.mjs';

export {
    getSalesforceProfile,
    isProductionSalesforceRuntime,
    isProtectedSalesforceWebdevPreview,
} from './environment.mjs';

export function getSalesforceConfig(): SalesforceEnvironment {
    return resolveSalesforceEnvironment();
}

export function assertSalesforceRequestUrl(url: string, config = getSalesforceConfig()): URL {
    return validateSalesforceRequestUrl(url, config);
}

export function assertWebToLeadTarget(params: URLSearchParams, config = getSalesforceConfig()): string {
    return validateWebToLeadTarget(params, config);
}

export function getSalesforceCacheKey(): string {
    return getSalesforceConfig().cacheKey;
}
