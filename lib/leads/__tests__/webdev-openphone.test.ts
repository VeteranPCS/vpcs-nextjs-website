import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSalesforceConfig } from '@/lib/salesforce/server-config';
import { stubWebdevEnv } from '@/lib/salesforce/__tests__/configuration-fixtures';
import { markWebdevSubmission } from '@/lib/salesforce/webdev-intake';
import { getVerifiedSalesforceSession } from '@/services/salesForceTokenService';
import { sendWebdevOpenPhoneMessage } from '../webdev-openphone';

const mocks = vi.hoisted(() => ({ eval: vi.fn(), hset: vi.fn(), redis: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/services/salesForceTokenService', () => ({ getVerifiedSalesforceSession: vi.fn() }));
vi.mock('@upstash/redis', () => ({
    Redis: function Redis(options: unknown) {
        mocks.redis(options);
        return { eval: mocks.eval, hset: mocks.hset };
    },
}));

const from = '+12025552001';
const to = '+12025552002';
const quotaUrl = 'https://webdev-delivery-quota.upstash.io';
const endpoint = 'https://api.quo.com/v1/messages';

function testSubmission(id = 'test-submission') {
    const params = new URLSearchParams({
        first_name: '[VPCS WEBDEV TEST] A person', email: 'qa@example.test', mobile: to,
        description: 'Untrusted form text must stay inside Salesforce.',
    });
    return markWebdevSubmission(params, getSalesforceConfig(), id);
}

beforeEach(() => {
    mocks.redis.mockClear();
    mocks.eval.mockReset().mockResolvedValue(1);
    mocks.hset.mockReset().mockResolvedValue(1);
    vi.mocked(getVerifiedSalesforceSession).mockReset().mockImplementation(async () => {
        const profile = getSalesforceConfig();
        return { token: 'test-only', generation: 1, cacheKey: profile.cacheKey, instanceUrl: profile.restOrigin };
    });
    stubWebdevEnv({
        VPCS_DELIVERY_MODE: 'allowlisted',
        VPCS_SANDBOX_LEAD_WRITES: '1',
        VPCS_WEBDEV_ISOLATION_ATTESTED: '1',
        VPCS_WEBDEV_TEST_RUN_ID: 'controlled-test',
        VPCS_WEBDEV_TEST_EXPIRES_AT: new Date(Date.now() + 60_000).toISOString(),
        VPCS_WEBDEV_TEST_EMAILS: 'qa@example.test',
        VPCS_WEBDEV_TEST_PHONES: to,
        VPCS_WEBDEV_OPENPHONE_API_KEY: 'dedicated-quo-token',
        VPCS_WEBDEV_OPENPHONE_FROM_NUMBER: from,
        VPCS_WEBDEV_OPENPHONE_TO_NUMBER: to,
        VPCS_WEBDEV_OPENPHONE_MAX_SENDS: '1',
        VPCS_WEBDEV_UPSTASH_REDIS_REST_URL: quotaUrl,
        VPCS_WEBDEV_UPSTASH_REDIS_REST_TOKEN: 'dedicated-quota-token',
        OPEN_PHONE_API_KEY: 'production-quo-token',
        UPSTASH_REDIS_REST_URL: 'https://production.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'production-quota-token',
    });
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ data: { id: 'ACtest001', from, to: [to] } }, { status: 202 })));
    vi.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('allowlisted WebDev Quo delivery', () => {
    it('reserves against a dedicated Redis store and sends a fixed message to one approved recipient', async () => {
        await expect(sendWebdevOpenPhoneMessage(testSubmission())).resolves.toEqual({ accepted: true, messageId: 'ACtest001' });

        expect(mocks.redis).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
            url: quotaUrl, token: 'dedicated-quota-token', retry: { retries: 0 },
        }));
        expect(mocks.eval).toHaveBeenCalledExactlyOnceWith(
            expect.stringContaining("redis.call('HSET'"), [expect.stringMatching(/^vpcs:webdev:openphone:00D\w+:controlled-test$/)],
            [expect.any(Number), 1, expect.stringMatching(/^[a-f0-9]{64}$/), 'test-submission'],
        );
        expect(mocks.eval).toHaveBeenCalledBefore(vi.mocked(fetch));
        expect(getVerifiedSalesforceSession).toHaveBeenCalledBefore(mocks.eval);
        expect(fetch).toHaveBeenCalledExactlyOnceWith(endpoint, {
            method: 'POST', headers: { Authorization: 'dedicated-quo-token', 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to: [to], content: 'VeteranPCS WebDev notification test controlled-test.' }),
            redirect: 'error', signal: expect.any(AbortSignal),
        });
        expect(mocks.hset).toHaveBeenCalledWith(expect.stringContaining(':controlled-test'), { 'receipt:test-submission': 'ACtest001' });
        expect(console.info).toHaveBeenCalledExactlyOnceWith('OpenPhone WebDev test message accepted', {
            runId: 'controlled-test', submissionId: 'test-submission', messageId: 'ACtest001', receiptStored: true,
        });
    });

    it('requires a validated submission from the active run', async () => {
        const forged = { ...testSubmission() };
        await expect(sendWebdevOpenPhoneMessage(forged)).rejects.toThrow('validated WebDev test submission');
        expect(mocks.redis).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });

    it.each([
        ['VPCS_WEBDEV_OPENPHONE_API_KEY', ''],
        ['VPCS_WEBDEV_OPENPHONE_API_KEY', 'production-quo-token'],
        ['VPCS_WEBDEV_OPENPHONE_FROM_NUMBER', '202-555-2001'],
        ['VPCS_WEBDEV_OPENPHONE_FROM_NUMBER', to],
        ['OPEN_PHONE_FROM_NUMBER', '(202) 555-2001'],
        ['VPCS_WEBDEV_OPENPHONE_TO_NUMBER', '+12025552099'],
        ['VPCS_WEBDEV_OPENPHONE_MAX_SENDS', '0'],
        ['VPCS_WEBDEV_UPSTASH_REDIS_REST_URL', 'https://production.upstash.io/'],
        ['VPCS_WEBDEV_UPSTASH_REDIS_REST_TOKEN', 'production-quota-token'],
    ])('fails before Redis or Quo when %s is unsafe', async (name, value) => {
        const submission = testSubmission();
        vi.stubEnv(name, value);

        await expect(sendWebdevOpenPhoneMessage(submission)).rejects.toThrow('settings are incomplete or invalid');
        expect(mocks.redis).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('fails closed without matching Salesforce organization verification', async () => {
        vi.mocked(getVerifiedSalesforceSession).mockResolvedValueOnce({
            token: 'test-only', generation: 1, instanceUrl: 'https://example.test', cacheKey: 'other-environment',
        });
        await expect(sendWebdevOpenPhoneMessage(testSubmission())).rejects.toThrow('verified WebDev session');
        expect(mocks.redis).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('limits concurrent attempts to the result of the atomic Redis reservation', async () => {
        mocks.eval.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

        const results = await Promise.allSettled([
            sendWebdevOpenPhoneMessage(testSubmission('test-submission-one')),
            sendWebdevOpenPhoneMessage(testSubmission('test-submission-two')),
        ]);

        expect(results.map(result => result.status)).toEqual(['fulfilled', 'rejected']);
        expect(mocks.eval).toHaveBeenCalledTimes(2);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('fails closed when Redis cannot confirm an attempt', async () => {
        mocks.eval.mockRejectedValueOnce(new Error('secret quota credentials'));
        await expect(sendWebdevOpenPhoneMessage(testSubmission())).rejects.toThrow('budget is unavailable');
        expect(mocks.eval).toHaveBeenCalledTimes(1);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('never retries a provider failure or exposes the provider response', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(new Response('secret provider payload', { status: 503 }));
        await expect(sendWebdevOpenPhoneMessage(testSubmission())).rejects.toThrow('OpenPhone could not confirm test delivery');
        expect(mocks.eval).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('preserves a redacted provider receipt when its Redis receipt write fails', async () => {
        mocks.hset.mockRejectedValueOnce(new Error('error with test credentials'));
        await expect(sendWebdevOpenPhoneMessage(testSubmission())).resolves.toEqual({ accepted: true, messageId: 'ACtest001' });
        expect(console.info).toHaveBeenCalledExactlyOnceWith('OpenPhone WebDev test message accepted', {
            runId: 'controlled-test', submissionId: 'test-submission', messageId: 'ACtest001', receiptStored: false,
        });
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
