import 'server-only';

import { createHash } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { getSalesforceConfig } from '@/lib/salesforce/server-config';
import {
    assertMarkedWebdevSubmission,
    isAllowedWebdevTestPhone,
    requireWebdevTestRun,
    type MarkedWebdevSubmission,
} from '@/lib/salesforce/webdev-intake';
import { resolveWebdevNotificationRedisEnv } from '@/lib/upstash-env';
import { getVerifiedSalesforceSession } from '@/services/salesForceTokenService';
import { formatPhoneNumberE164 } from '@/utils/formatPhoneNumber';

const QUO_MESSAGE_URL = 'https://api.quo.com/v1/messages';
const E164 = /^\+[1-9]\d{7,14}$/;
const QUO_MESSAGE_ID = /^[A-Za-z][A-Za-z0-9_-]{2,127}$/;
const RESERVE_OPENPHONE_ATTEMPT = `
local timestamp = redis.call('TIME')
local now = tonumber(timestamp[1]) * 1000 + math.floor(tonumber(timestamp[2]) / 1000)
if now >= tonumber(ARGV[1]) then return 0 end
local policy = redis.call('HGET', KEYS[1], 'policy')
if policy and policy ~= ARGV[3] then return 0 end
local event = 'submission:' .. ARGV[4]
if redis.call('HEXISTS', KEYS[1], event) == 1 then return 0 end
local count = tonumber(redis.call('HGET', KEYS[1], 'attempts') or '0')
if count >= tonumber(ARGV[2]) then return 0 end
redis.call('HSET', KEYS[1], 'policy', ARGV[3], 'attempts', count + 1, event, '1')
return 1
`;

function requireWebdevOpenPhoneConfig(salesforce: ReturnType<typeof getSalesforceConfig>) {
    const run = requireWebdevTestRun(salesforce);
    if (salesforce.deliveryMode !== 'allowlisted') throw new Error('OpenPhone test delivery is disabled');

    const apiKey = process.env.VPCS_WEBDEV_OPENPHONE_API_KEY?.trim() ?? '';
    const from = process.env.VPCS_WEBDEV_OPENPHONE_FROM_NUMBER ?? '';
    const to = process.env.VPCS_WEBDEV_OPENPHONE_TO_NUMBER ?? '';
    const maxSendsValue = process.env.VPCS_WEBDEV_OPENPHONE_MAX_SENDS ?? '';
    const maxSends = Number(maxSendsValue);
    const redis = resolveWebdevNotificationRedisEnv();
    const productionSender = formatPhoneNumberE164(process.env.OPEN_PHONE_FROM_NUMBER ?? '');
    if (!/^\S+$/.test(apiKey) || apiKey === process.env.OPEN_PHONE_API_KEY?.trim() || !E164.test(from) ||
        from === to || from === productionSender || !isAllowedWebdevTestPhone(to) ||
        !/^[1-9]\d*$/.test(maxSendsValue) || !Number.isSafeInteger(maxSends) || !redis) {
        throw new Error('OpenPhone test delivery settings are incomplete or invalid');
    }

    return { ...run, apiKey, from, to, maxSends, redis };
}

/** Fail before the Salesforce POST when allowlisted mode is configured incompletely. */
export function assertWebdevOpenPhoneConfigured(salesforce: ReturnType<typeof getSalesforceConfig>): void {
    requireWebdevOpenPhoneConfig(salesforce);
}

export async function sendWebdevOpenPhoneMessage(submission: MarkedWebdevSubmission): Promise<{ accepted: true; messageId: string }> {
    const salesforce = getSalesforceConfig();
    const settings = requireWebdevOpenPhoneConfig(salesforce);
    assertMarkedWebdevSubmission(submission, settings);
    const session = await getVerifiedSalesforceSession();
    if (session.cacheKey !== salesforce.cacheKey) throw new Error('OpenPhone test delivery requires a verified WebDev session');

    const policyHash = createHash('sha256')
        .update(JSON.stringify([settings.from, settings.to, settings.expiresAt, settings.maxSends]))
        .digest('hex');
    const redis = new Redis({
        ...settings.redis,
        retry: { retries: 0 },
        cache: 'no-store',
        signal: () => AbortSignal.timeout(1_000),
        enableTelemetry: false,
        enableAutoPipelining: false,
    });
    // Preserve each run's budget to prevent changing its window or cap from resetting it.
    const budgetKey = `vpcs:webdev:openphone:${salesforce.orgId.slice(0, 15)}:${settings.runId}`;
    let reserved: unknown;
    try {
        reserved = await redis.eval(RESERVE_OPENPHONE_ATTEMPT, [budgetKey], [
            settings.expiresAt, settings.maxSends, policyHash, submission.submissionId,
        ]);
    } catch {
        throw new Error('OpenPhone test delivery budget is unavailable');
    }
    if (reserved !== 1) throw new Error('OpenPhone test delivery budget denied the attempt');

    const remaining = settings.expiresAt - Date.now();
    if (remaining <= 0) throw new Error('The OpenPhone test delivery window has expired');
    let messageId: string;
    try {
        const response = await fetch(QUO_MESSAGE_URL, {
            method: 'POST',
            headers: { Authorization: settings.apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: settings.from,
                to: [settings.to],
                content: `VeteranPCS WebDev notification test ${settings.runId}.`,
            }),
            redirect: 'error',
            signal: AbortSignal.timeout(Math.min(10_000, remaining)),
        });
        if (response.status !== 202) throw new Error('Quo did not accept the request');
        const receipt: { data?: { id?: unknown } } = await response.json();
        const id = receipt.data?.id;
        if (typeof id !== 'string' || !QUO_MESSAGE_ID.test(id)) throw new Error('Quo did not return a message ID');
        messageId = id;
    } catch {
        // An ambiguous HTTP outcome still uses its budget. Never retry or expose provider data.
        throw new Error('OpenPhone could not confirm test delivery');
    }
    let receiptStored = false;
    try {
        await redis.hset(budgetKey, { [`receipt:${submission.submissionId}`]: messageId });
        receiptStored = true;
    } catch {
        // Preserve the safe receipt in logs if the dedicated ledger is temporarily unavailable.
    }
    console.info('OpenPhone WebDev test message accepted', {
        runId: settings.runId, submissionId: submission.submissionId, messageId, receiptStored,
    });
    return { accepted: true, messageId };
}
