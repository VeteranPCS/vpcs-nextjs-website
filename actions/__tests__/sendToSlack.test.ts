import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import sendToSlack from '../sendToSlack';
import { sendOpenPhoneMessage } from '../sendOpenPhoneMessage';
import fetchWithRetry from '@/utils/fetchWithRetry';
import { buildPartnerSmsContent, buildSlackLeadPayload, displayContactPhone } from '@/lib/leads/notification-payloads';

vi.mock('@/utils/fetchWithRetry', () => ({ default: vi.fn(async () => new Response('ok')) }));
vi.mock('server-only', () => ({}));
const lead = { headerText: '🔔 New Agent Lead', name: 'Synthetic QA', email: 'qa@example.com', message: '' };

describe('real Slack wire contract with isolated transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SLACK_WEBHOOK_URL', 'https://example.test/private-webhook');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'main');
    vi.stubEnv('VPCS_SALESFORCE_PROFILE', 'production');
    vi.stubEnv('VPCS_DELIVERY_MODE', 'live');
  });
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

describe('non-production notification transports', () => {
  const sms = { content: 'Contact me at qa@example.com', from: '+12025550100', to: ['+12025550101'] };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VPCS_SALESFORCE_PROFILE', 'webdev');
    vi.stubEnv('SLACK_WEBHOOK_URL', 'https://example.test/private-webhook');
    vi.stubEnv('OPEN_PHONE_API_KEY', 'test-only-token');
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it.each(['capture', 'allowlisted'])('captures only channel and recipient count in %s mode', async (mode) => {
    vi.stubEnv('VPCS_DELIVERY_MODE', mode);
    const captureLog = vi.spyOn(console, 'info').mockImplementation(() => {});

    await expect(sendToSlack(lead)).resolves.toEqual({ ok: true, captured: true });
    await expect(sendOpenPhoneMessage(sms)).resolves.toEqual({ captured: true });

    expect(fetchWithRetry).not.toHaveBeenCalled();
    expect(captureLog.mock.calls).toEqual([
      ['Lead notification captured', { channel: 'slack', recipientCount: 1 }],
      ['Lead notification captured', { channel: 'openphone', recipientCount: 1 }],
    ]);
  });

  it('fails closed for unrestricted live delivery', async () => {
    vi.stubEnv('VPCS_DELIVERY_MODE', 'live');

    await expect(sendToSlack(lead)).resolves.toEqual({ ok: false, failureStage: 'configuration' });
    await expect(sendOpenPhoneMessage(sms)).rejects.toThrow('OpenPhone delivery is disabled');

    expect(fetchWithRetry).not.toHaveBeenCalled();
  });
});
