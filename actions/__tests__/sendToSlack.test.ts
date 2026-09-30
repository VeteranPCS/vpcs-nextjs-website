import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import sendToSlack from '../sendToSlack';
import fetchWithRetry from '@/utils/fetchWithRetry';
import { buildPartnerSmsContent, buildSlackLeadPayload, displayContactPhone } from '@/lib/leads/notification-payloads';

vi.mock('@/utils/fetchWithRetry', () => ({ default: vi.fn(async () => new Response('ok')) }));
const lead = { headerText: '🔔 New Agent Lead', name: 'Synthetic QA', email: 'qa@example.com', message: '' };

describe('real Slack wire contract with isolated transport', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('SLACK_WEBHOOK_URL', 'https://example.test/private-webhook'); });
  afterEach(() => vi.unstubAllEnvs());
  it.each([undefined, '', '   '])('supports absent phone %s without an empty telephone link', async (phoneNumber) => {
    await expect(sendToSlack({ ...lead, phoneNumber })).resolves.toEqual({ ok: true });
    expect(fetchWithRetry).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetchWithRetry).mock.calls[0]!; // Call count asserted above.
    expect(url).toBe('https://example.test/private-webhook');
    expect(init).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const body = JSON.parse(init.body as string);
    expect(Object.keys(body)).toEqual(['blocks']);
    expect(init.body).toContain('Not provided');
    expect(init.body).not.toContain('<tel:|');
    expect(init.body).not.toContain('undefined');
  });
  it('preserves domestic formatting and all international digits', () => {
    expect(displayContactPhone('+17195550100')).toBe('(719) 555-0100');
    expect(displayContactPhone('+442079460958')).toBe('+442079460958');
    expect(buildPartnerSmsContent({ firstName: 'QA', phone: '+442079460958' }, 'Colorado')).toContain('Email: Not provided');
  });
  it('bounds escaped notes and partner fields without changing the input', () => {
    const message = '<&>'.repeat(1666);
    const payload = buildSlackLeadPayload({ ...lead, message, agentInfo: { name: 'x'.repeat(3000) } });
    expect(message.length).toBe(4998);
    expect(JSON.stringify(payload)).toContain('See Salesforce for full details.');
    for (const block of payload.blocks) {
      if (block.type !== 'section') continue;
      const text = block.text as { text: string } | undefined;
      if (text) expect(text.text.length).toBeLessThanOrEqual(3000);
      for (const field of (block.fields ?? []) as Array<{ text: string }>) expect(field.text.length).toBeLessThanOrEqual(2000);
    }
  });
  it('returns safe configuration and transport failures', async () => {
    vi.stubEnv('SLACK_WEBHOOK_URL', '');
    await expect(sendToSlack(lead)).resolves.toEqual({ ok: false, failureStage: 'configuration' });
    expect(fetchWithRetry).not.toHaveBeenCalled();
    vi.stubEnv('SLACK_WEBHOOK_URL', 'https://example.test/private-webhook');
    vi.mocked(fetchWithRetry).mockRejectedValueOnce(new Error('secret URL and customer data'));
    await expect(sendToSlack(lead)).resolves.toEqual({ ok: false, failureStage: 'delivery' });
  });
});
