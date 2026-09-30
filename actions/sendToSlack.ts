'use server';
import { buildSlackLeadPayload, type SlackLeadInput } from '@/lib/leads/notification-payloads';
import fetchWithRetry from '@/utils/fetchWithRetry';

export default async function sendToSlack(input: SlackLeadInput) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return { ok: false, failureStage: 'configuration' as const };

    let payload: ReturnType<typeof buildSlackLeadPayload>;
    try {
        payload = buildSlackLeadPayload(input);
    } catch {
        return { ok: false, failureStage: 'construction' as const };
    }
    try {
        const response = await fetchWithRetry(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return response.ok ? { ok: true } : { ok: false, failureStage: 'delivery' as const };
    } catch {
        // Never expose webhook URLs or provider bodies to analytics/callers.
        return { ok: false, failureStage: 'delivery' as const };
    }
}
