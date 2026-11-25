import { describe, expect, it, vi } from 'vitest';

import {
    authenticateSalesforce,
    getSalesforceProfile,
    isProductionSalesforceRuntime,
    resolveSalesforceEnvironment,
    validateSalesforceRequestUrl,
    validateWebToLeadTarget,
} from '@/lib/salesforce/environment.mjs';
import { SF_LEAD_OWNER, SF_ORG_ID, SF_RECORD_TYPE, SF_WEB_TO_LEAD_FIELD_IDS } from '@/lib/salesforce/ids';
import {
    productionEnv,
    webdevEnv,
    webdevMetadata,
    WEBDEV_ORG,
    WEBDEV_ORIGIN,
} from './configuration-fixtures';

const writeFlags = {
    VPCS_SANDBOX_LEAD_WRITES: '1',
    VPCS_WEBDEV_ISOLATION_ATTESTED: '1',
};

const protectedPreview = {
    VERCEL: '1',
    VERCEL_ENV: 'preview',
    VERCEL_GIT_COMMIT_REF: 'codex/salesforce-workflow-test',
    VPCS_SANDBOX_PREVIEW_PROTECTED: '1',
};

describe('Salesforce profiles', () => {
    it('keeps local Next production builds on webdev', () => {
        const env = { ...webdevEnv, VPCS_SALESFORCE_PROFILE: undefined, NODE_ENV: 'production' };
        expect(getSalesforceProfile(env)).toBe('webdev');
        expect(resolveSalesforceEnvironment(env)).toMatchObject({ profile: 'webdev', deliveryMode: 'capture' });
        expect(isProductionSalesforceRuntime(env)).toBe(false);
    });

    it.each([
        { VERCEL: undefined },
        { VERCEL_ENV: 'preview' },
        { VERCEL_GIT_COMMIT_REF: 'feature' },
        { VERCEL_GIT_COMMIT_REF: undefined },
        { VPCS_SALESFORCE_PROFILE: undefined },
    ])('rejects the production profile unless the deploy context matches exactly %#', (overrides) => {
        const env = { ...productionEnv, ...overrides };
        expect(() => resolveSalesforceEnvironment(env)).toThrow(/production Salesforce profile/);
        expect(isProductionSalesforceRuntime(env)).toBe(false);
    });

    it('requires an explicit production live delivery setting', () => {
        expect(() => resolveSalesforceEnvironment({ ...productionEnv, VPCS_DELIVERY_MODE: undefined })).toThrow(/VPCS_DELIVERY_MODE/);
        expect(isProductionSalesforceRuntime(productionEnv)).toBe(true);
    });

    it('retains the existing production identities and wire ids', () => {
        const config = resolveSalesforceEnvironment(productionEnv);
        expect(config).toMatchObject({
            profile: 'production',
            orgId: SF_ORG_ID,
            recordTypes: SF_RECORD_TYPE,
            leadOwners: SF_LEAD_OWNER,
            deliveryMode: 'live',
        });
        const aliases = Object.keys(SF_WEB_TO_LEAD_FIELD_IDS);
        expect(aliases).toHaveLength(39);
        expect(Object.entries(config.fieldIds)).toEqual(aliases.map(id => [id, id]));
    });

    it('uses offline mock metadata even when stale deployment credentials and URLs are present', () => {
        const env = {
            ...productionEnv,
            VERCEL: undefined,
            VERCEL_ENV: undefined,
            VPCS_SALESFORCE_PROFILE: 'mock',
            SALESFORCE_CLIENT_ID: 'stale',
            SALESFORCE_CLIENT_SECRET: 'stale',
        };
        expect(resolveSalesforceEnvironment(env)).toMatchObject({
            profile: 'mock',
            restOrigin: 'https://salesforce.mock.invalid',
            deliveryMode: 'capture',
            allowSandboxWrites: false,
        });
    });

    it.each([
        { SALESFORCE_LOGIN_BASE_URL: 'https://login.salesforce.com' },
        { SALESFORCE_LOGIN_BASE_URL: 'https://test.salesforce.com' },
        { SALESFORCE_LOGIN_BASE_URL: `${WEBDEV_ORIGIN}/services/oauth2/token` },
        { SALESFORCE_LOGIN_BASE_URL: 'https://other--webdev.sandbox.my.salesforce.com' },
        { VPCS_SALESFORCE_BASE_URL: 'https://veteranpcs.my.salesforce.com' },
        { VPCS_SALESFORCE_BASE_URL: `${WEBDEV_ORIGIN}.evil.invalid` },
        { VPCS_SALESFORCE_BASE_URL: `${WEBDEV_ORIGIN}:443` },
        { VPCS_SALESFORCE_BASE_URL: 'https://@veteranpcs--webdev.sandbox.my.salesforce.com' },
        { VPCS_SALESFORCE_WEB_TO_LEAD_URL: productionEnv.VPCS_SALESFORCE_WEB_TO_LEAD_URL },
        { VPCS_SALESFORCE_WEB_TO_LEAD_URL: `${webdevEnv.VPCS_SALESFORCE_WEB_TO_LEAD_URL}&orgId=${SF_ORG_ID}` },
        { SALESFORCE_AUTH_GRANT: 'arbitrary' },
        { SALESFORCE_API_VERSION: '62.0' },
        { VPCS_SALESFORCE_METADATA_JSON: 'invalid JSON' },
        { VPCS_SALESFORCE_ORG_ID: '00D000000000020' },
        { VPCS_DELIVERY_MODE: 'live' },
    ])('blocks the webdev profile when a target, grant, manifest, or mode is invalid %#', (overrides) => {
        expect(() => resolveSalesforceEnvironment({ ...webdevEnv, ...overrides }))
            .toThrow(expect.objectContaining({ name: 'SalesforceConfigurationError' }));
    });

    it('rejects webdev password grants even on the correct My Domain', () => {
        expect(() => resolveSalesforceEnvironment({ ...webdevEnv, SALESFORCE_AUTH_GRANT: 'password' }))
            .toThrow('webdev Salesforce profile requires SALESFORCE_AUTH_GRANT=client_credentials');
    });

    it('changes the cache key when verified mappings change in the same org', () => {
        const current = resolveSalesforceEnvironment(webdevEnv, webdevMetadata);
        const updated = resolveSalesforceEnvironment(webdevEnv, {
            ...webdevMetadata,
            recordTypes: { ...webdevMetadata.recordTypes, CUSTOMER_OPPORTUNITY: '012000000000016' },
        });
        expect(updated.orgId).toBe(current.orgId);
        expect(updated.cacheKey).not.toBe(current.cacheKey);
    });

    it('rejects copied production org identity and incomplete or unverified metadata', () => {
        expect(() => resolveSalesforceEnvironment(
            { ...webdevEnv, VPCS_SALESFORCE_ORG_ID: SF_ORG_ID },
            { ...webdevMetadata, orgId: SF_ORG_ID },
        )).toThrow('must have its own org ID');
        expect(() => resolveSalesforceEnvironment(webdevEnv, { ...webdevMetadata, verified: false })).toThrow(/verified/);
        expect(() => resolveSalesforceEnvironment(webdevEnv, { ...webdevMetadata, fieldIds: {} })).toThrow(/fieldIds/);
    });

    it('opens sandbox writes only with explicit attestation and an eligible runtime', () => {
        expect(resolveSalesforceEnvironment(webdevEnv).allowSandboxWrites).toBe(false);
        expect(resolveSalesforceEnvironment({ ...webdevEnv, VPCS_SANDBOX_LEAD_WRITES: '1' }).allowSandboxWrites).toBe(false);
        expect(resolveSalesforceEnvironment({ ...webdevEnv, ...writeFlags }).allowSandboxWrites).toBe(true);
        expect(resolveSalesforceEnvironment({ ...webdevEnv, ...writeFlags, ...protectedPreview }).allowSandboxWrites).toBe(true);
        expect(resolveSalesforceEnvironment({
            ...webdevEnv, ...writeFlags, ...protectedPreview, VPCS_SANDBOX_PREVIEW_PROTECTED: undefined,
        }).allowSandboxWrites).toBe(false);
        expect(resolveSalesforceEnvironment({
            ...webdevEnv, ...writeFlags, ...protectedPreview, VERCEL_GIT_COMMIT_REF: 'ordinary-feature',
        }).allowSandboxWrites).toBe(false);
    });

    it('checks final Web-to-Lead wire values against the active org', () => {
        const config = resolveSalesforceEnvironment({ ...webdevEnv, ...writeFlags });
        const [alias] = Object.keys(SF_WEB_TO_LEAD_FIELD_IDS);
        const field = alias && config.fieldIds[alias];
        if (!alias || !field) throw new Error('Fixture requires one Web-to-Lead field.');
        const params = new URLSearchParams({
            oid: config.orgId,
            recordType: config.recordTypes.CUSTOMER_LEAD_15,
            [field]: 'sample',
        });
        expect(validateWebToLeadTarget(params, config)).toBe(webdevEnv.VPCS_SALESFORCE_WEB_TO_LEAD_URL);
        expect(() => validateWebToLeadTarget(params, resolveSalesforceEnvironment(webdevEnv))).toThrow(/writes are disabled/);
        params.set(alias, 'production-alias-bypass');
        expect(() => validateWebToLeadTarget(params, config)).toThrow(/unexpected org or custom field identifiers/);
        params.append('oid', SF_ORG_ID);
        expect(() => validateWebToLeadTarget(params, config)).toThrow(/active org/);
    });

    it('rejects credentials, fragments, different origins, and paths outside the selected API', () => {
        const config = resolveSalesforceEnvironment(webdevEnv);
        const path = '/services/data/v62.0/query?q=SELECT+Id+FROM+Account';
        expect(validateSalesforceRequestUrl(WEBDEV_ORIGIN + path, config).origin).toBe(WEBDEV_ORIGIN);
        expect(() => validateSalesforceRequestUrl(`${WEBDEV_ORIGIN}${path}#`, config)).toThrow();
        expect(() => validateSalesforceRequestUrl(`${WEBDEV_ORIGIN}/services/data/v63.0/query`, config)).toThrow();
        expect(() => validateSalesforceRequestUrl(`https://password@${new URL(WEBDEV_ORIGIN).hostname}${path}`, config)).toThrow();
        expect(() => validateSalesforceRequestUrl(productionEnv.VPCS_SALESFORCE_BASE_URL + path, config)).toThrow();
        expect(() => validateSalesforceRequestUrl(webdevEnv.VPCS_SALESFORCE_WEB_TO_LEAD_URL, config)).toThrow();
    });
});

describe('standalone OAuth and Organization verification', () => {
    const credentials = { SALESFORCE_CLIENT_ID: 'sample-client-id', SALESFORCE_CLIENT_SECRET: 'sample-secret' };

    it('requires org proof and denies redirects in both requests', async () => {
        const config = resolveSalesforceEnvironment(webdevEnv);
        const fetcher = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(Response.json({ access_token: 'sample-token', instance_url: WEBDEV_ORIGIN }))
            .mockResolvedValueOnce(Response.json({ records: [{ Id: WEBDEV_ORG, IsSandbox: true }] }));
        await expect(authenticateSalesforce(config, credentials, fetcher)).resolves.toEqual({
            token: 'sample-token', instanceUrl: WEBDEV_ORIGIN,
        });

        expect(fetcher).toHaveBeenNthCalledWith(1, `${WEBDEV_ORIGIN}/services/oauth2/token`,
            expect.objectContaining({ redirect: 'error', body: expect.any(URLSearchParams) }));
        expect(fetcher).toHaveBeenNthCalledWith(2, expect.stringContaining('/services/data/v62.0/query'), expect.objectContaining({
            redirect: 'error',
            headers: { Authorization: 'Bearer sample-token' },
        }));
    });

    it('does not use or expose a token if the endpoint returns a mismatched origin', async () => {
        const config = resolveSalesforceEnvironment(webdevEnv);
        const fetcher = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(Response.json({ access_token: 'sample-secret', instance_url: 'https://outside.invalid' }));
        await expect(authenticateSalesforce(config, credentials, fetcher)).rejects.toThrow(/instance_url/);
        expect(fetcher).toHaveBeenCalledTimes(1);
    });
});
