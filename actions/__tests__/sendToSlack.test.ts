import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import sendToSlack from '../sendToSlack';
import { buildSlackLeadPayload, displayContactPhone } from '@/lib/leads/notification-payloads';

const fetchSlack = vi.fn<typeof fetch>();
beforeEach(() => vi.stubGlobal('fetch', fetchSlack.mockReset().mockResolvedValue(new Response('ok'))));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
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
    expect(fetchSlack).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSlack.mock.calls[0]!; // Call count asserted above.
    expect(url).toBe('https://example.test/private-webhook');
    if (!init) throw new Error('Missing Slack POST options');
    expect(init).toMatchObject({
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      redirect: 'error', signal: expect.any(AbortSignal),
    });
    const body = JSON.parse(init.body as string);
    expect(Object.keys(body)).toEqual(['blocks']);
    expect(init.body).toContain('Not provided');
    expect(init.body).not.toContain('<tel:|');
    expect(init.body).not.toContain('undefined');
  });
  it('preserves domestic formatting and all international digits', () => {
    expect(displayContactPhone('+17195550100')).toBe('(719) 555-0100');
    expect(displayContactPhone('+442079460958')).toBe('+442079460958');
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
    expect(fetchSlack).not.toHaveBeenCalled();
    vi.stubEnv('SLACK_WEBHOOK_URL', 'https://example.test/private-webhook');
    vi.mocked(fetchSlack).mockRejectedValueOnce(new Error('secret URL and customer data'));
    await expect(sendToSlack(lead)).resolves.toEqual({ ok: false, failureStage: 'delivery' });
    expect(fetchSlack).toHaveBeenCalledTimes(1);
  });
  it('aborts at the configured deadline and issues one POST', async () => {
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    fetchSlack.mockImplementationOnce(async (_url, input) => new Promise((_resolve, reject) => {
      input?.signal?.addEventListener('abort', () => reject(input.signal?.reason), { once: true });
    }));
    const result = sendToSlack(lead);
    controller.abort();
    await expect(result).resolves.toEqual({ ok: false, failureStage: 'delivery' });
    expect(timeout).toHaveBeenCalledWith(3_000);
    expect(fetchSlack).toHaveBeenCalledTimes(1);
  });
  it('does not replay a POST after a retryable HTTP status', async () => {
    fetchSlack.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));
    await expect(sendToSlack(lead)).resolves.toEqual({ ok: false, failureStage: 'delivery' });
    expect(fetchSlack).toHaveBeenCalledTimes(1);
  });
});

describe('non-production notification transports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VPCS_SALESFORCE_PROFILE', 'webdev');
    vi.stubEnv('SLACK_WEBHOOK_URL', 'https://example.test/private-webhook');
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it.each(['capture', 'allowlisted'])('captures only channel and recipient count in %s mode', async (mode) => {
    vi.stubEnv('VPCS_DELIVERY_MODE', mode);
    const captureLog = vi.spyOn(console, 'info').mockImplementation(() => {});

    await expect(sendToSlack(lead)).resolves.toEqual({ ok: true, captured: true });

    expect(fetchSlack).not.toHaveBeenCalled();
    expect(captureLog.mock.calls).toEqual([
      ['Lead notification captured', { channel: 'slack', recipientCount: 1 }],
    ]);
  });

  it('fails closed for unrestricted live delivery', async () => {
    vi.stubEnv('VPCS_DELIVERY_MODE', 'live');

    await expect(sendToSlack(lead)).resolves.toEqual({ ok: false, failureStage: 'configuration' });

    expect(fetchSlack).not.toHaveBeenCalled();
  });
});
