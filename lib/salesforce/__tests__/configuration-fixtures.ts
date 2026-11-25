import { vi } from 'vitest';

import mockMetadata from '@/config/salesforce/mock.json';
import productionMetadata from '@/config/salesforce/production.json';

export const WEBDEV_ORIGIN = 'https://veteranpcs--webdev.sandbox.my.salesforce.com';
export const WEBDEV_ORG = '00D000000000019';
export const WEBDEV_QUERY = `${WEBDEV_ORIGIN}/services/data/v62.0/query`;
export const WEBDEV_OAUTH = `${WEBDEV_ORIGIN}/services/oauth2/token`;

export const webdevMetadata = { ...mockMetadata, orgId: WEBDEV_ORG };
export const webdevEnv = {
    VPCS_SALESFORCE_PROFILE: 'webdev',
    VPCS_SALESFORCE_ORG_ID: WEBDEV_ORG,
    VPCS_SALESFORCE_WEB_TO_LEAD_URL: `${WEBDEV_ORIGIN}/servlet/servlet.WebToLead?encoding=UTF-8`,
    VPCS_SALESFORCE_BASE_URL: WEBDEV_ORIGIN,
    VPCS_SALESFORCE_METADATA_JSON: JSON.stringify(webdevMetadata),
    SALESFORCE_LOGIN_BASE_URL: WEBDEV_ORIGIN,
    SALESFORCE_API_VERSION: 'v62.0',
    SALESFORCE_AUTH_GRANT: 'client_credentials',
};

export const productionEnv = {
    VPCS_SALESFORCE_PROFILE: 'production',
    VPCS_SALESFORCE_ORG_ID: productionMetadata.orgId,
    VPCS_SALESFORCE_WEB_TO_LEAD_URL: 'https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8',
    VPCS_SALESFORCE_BASE_URL: 'https://veteranpcs.my.salesforce.com',
    SALESFORCE_LOGIN_BASE_URL: 'https://login.salesforce.com',
    SALESFORCE_API_VERSION: 'v62.0',
    SALESFORCE_AUTH_GRANT: 'password',
    VPCS_DELIVERY_MODE: 'live',
    VERCEL: '1',
    VERCEL_ENV: 'production',
    VERCEL_GIT_COMMIT_REF: 'main',
};

export function stubWebdevEnv(overrides: Record<string, string | undefined> = {}) {
    const env = {
        ...webdevEnv,
        VERCEL: undefined,
        VERCEL_ENV: undefined,
        VERCEL_GIT_COMMIT_REF: undefined,
        VPCS_DELIVERY_MODE: undefined,
        VPCS_SANDBOX_LEAD_WRITES: undefined,
        VPCS_SANDBOX_PREVIEW_PROTECTED: undefined,
        VPCS_WEBDEV_ISOLATION_ATTESTED: undefined,
        SALESFORCE_CLIENT_ID: 'test-client-id',
        SALESFORCE_CLIENT_SECRET: 'test-client-secret',
        SALESFORCE_USERNAME: 'test@example.invalid',
        SALESFORCE_PASSWORD: 'test-password',
        SALESFORCE_TOKEN: undefined,
        ...overrides,
    };
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
}

export function stubProductionEnv() {
    stubWebdevEnv(productionEnv);
}
