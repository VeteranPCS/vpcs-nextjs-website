import 'server-only';
import { getNotificationDeliveryMode } from '@/lib/leads/notification-delivery';
import { buildSlackLeadPayload, type SlackLeadInput } from '@/lib/leads/notification-payloads';

export default async function sendToSlack(input: SlackLeadInput) {
    const mode = getNotificationDeliveryMode();
    if (mode === 'capture') {
        console.info('Lead notification captured', { channel: 'slack', recipientCount: 1 });
        return { ok: true, captured: true as const };
    }
    if (mode === 'blocked') return { ok: false, failureStage: 'configuration' as const };

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return { ok: false, failureStage: 'configuration' as const };

    let payload: ReturnType<typeof buildSlackLeadPayload>;
    try {
        payload = buildSlackLeadPayload(input);
    } catch {
        return { ok: false, failureStage: 'construction' as const };
    }
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            redirect: 'error',
            signal: AbortSignal.timeout(3_000),
        });
        return response.ok ? { ok: true } : { ok: false, failureStage: 'delivery' as const };
    } catch {
        // Never expose webhook URLs or provider bodies to analytics/callers.
        return { ok: false, failureStage: 'delivery' as const };
    }
}
