import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { coloradoRelocationGuideForm } from '@/services/salesForcePostFormsService';
import sendToSlack from '@/actions/sendToSlack';
import stateService from '@/services/stateService';
import { evaluateLeadSpam } from '@/lib/spam-protection';
import { captureLeadConversionCreated, captureServerAnalyticsEvent } from '@/lib/analytics/server';
import { updateSubmissionStatus } from '@/services/formTrackingService';
import { SF_RECORD_TYPE } from '@/lib/salesforce/ids';
import { HP_FIELD, TS_FIELD } from '@/lib/validation/spam-fields';
import { getSalesforceConfig } from '@/lib/salesforce/server-config';
import { stubProductionEnv } from '@/lib/salesforce/__tests__/configuration-fixtures';

vi.mock('server-only', () => ({}));
vi.mock('@/services/salesForceTokenService', () => ({
  getVerifiedSalesforceSession: vi.fn(async () => {
    const config = getSalesforceConfig();
    return { token: 'test-only', generation: 1, instanceUrl: config.restOrigin, cacheKey: config.cacheKey };
  }),
}));
vi.mock('@/actions/sendToSlack', () => ({ default: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/services/stateService', () => ({ default: { fetchAgentById: vi.fn() } }));
vi.mock('@/services/loggingService', () => ({ logDebug: vi.fn(), logError: vi.fn(), logInfo: vi.fn() }));
vi.mock('@/services/formTrackingService', () => ({
  FormSubmissionStatus: { PENDING: 'PENDING', SUCCESS: 'SUCCESS', FAILURE: 'FAILURE', UNCONFIRMED: 'UNCONFIRMED' },
  trackFormSubmission: vi.fn(async () => 'colorado-submission-test-id'),
  updateSubmissionStatus: vi.fn(async () => true),
}));
vi.mock('@/lib/spam-protection', () => ({
  evaluateLeadSpam: vi.fn(async () => ({ quarantine: false, reasons: [] })), tagSpamSuspected: vi.fn(),
}));
vi.mock('@/lib/analytics/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/analytics/server')>();
  return { ...actual, captureLeadConversionCreated: vi.fn(), captureServerAnalyticsEvent: vi.fn() };
});

const valid = { firstName: ' Harper ', lastName: ' Foley ', email: ' guide@example.test ' };

function postedBody() {
  expect(fetch).toHaveBeenCalledTimes(1);
  return new URLSearchParams(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
}

function expectNoPartnerContact() {
  expect(stateService.fetchAgentById).not.toHaveBeenCalled();
}

describe('Colorado relocation guide capture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubProductionEnv();
    vi.stubEnv('LEAD_DRY_RUN', '0');
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('captures normalized contact details with fixed Colorado attribution and no agent contact', async () => {
    const result = await coloradoRelocationGuideForm({
      ...valid, vpcs_visitor_id: 'vpcs_test-visitor', [HP_FIELD]: '', [TS_FIELD]: '1234',
      source_page_path: '/texas', state: 'TX', state_code: 'TX', state_slug: 'texas',
      guide_id: 'forged-guide', lead_source: 'Contact Agent', description: 'Forged description',
      WebFormURL__c: 'https://example.test/forged', '00N4x00000QQ1LB': 'forged-url',
      '00N4x00000Lsn28': 'forged-agent', '00N4x00000Lsr0G': 'true',
      '00NRg00000PjSEfMAN': 'forged-submission-id',
    });
    expect(result).toEqual({ success: true, message: 'Form submitted successfully!', submissionId: 'colorado-submission-test-id' });
    const body = postedBody();
    expect(body.get('recordType')).toBe(SF_RECORD_TYPE.CUSTOMER_LEAD_15);
    expect(body.get('first_name')).toBe('Harper');
    expect(body.get('last_name')).toBe('Foley');
    expect(body.get('email')).toBe('guide@example.test');
    expect(body.get('lead_source')).toBe('Colorado Relocation Guide');
    expect(body.get('00N4x00000QQ1LB')).toBe('https://www.veteranpcs.com/colorado');
    expect(body.get('description')).toBe('Colorado Relocation Guide (V7) by Tyler Parker; Colorado (CO); source: /colorado.');
    expect(body.get('00NRg00000PjSD3MAN')).toBe('vpcs_test-visitor');
    expect(body.get('00NRg00000PjSEfMAN')).toBe('colorado-submission-test-id');
    for (const field of ['00N4x00000Lsn28', '00N4x00000Lsr0G', '00N4x00000LspV2', 'mobile']) expect(body.has(field)).toBe(false);
    expect(body.toString()).not.toMatch(/forged|texas/);
    expect(evaluateLeadSpam).toHaveBeenCalledWith(expect.objectContaining({ email: 'guide@example.test', honeypot: '', renderedAt: '1234' }));
    expect(sendToSlack).toHaveBeenCalledWith(expect.objectContaining({ name: 'Harper Foley', email: 'guide@example.test', phoneNumber: '', message: body.get('description') }));
    expect(captureLeadConversionCreated).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      formId: 'colorado_relocation_guide', guideId: 'colorado_relocation_guide', leadSource: 'Colorado Relocation Guide',
      sourcePagePath: '/colorado', stateCode: 'CO', stateSlug: 'colorado', submissionId: 'colorado-submission-test-id',
    }));
    expectNoPartnerContact();
  });

  it.each([
    { ...valid, firstName: ' ' }, { ...valid, lastName: '' }, { ...valid, email: '' },
    { ...valid, email: 'invalid' }, { ...valid, email: undefined, phone: '7195550100' },
    { ...valid, firstName: 'a'.repeat(41) }, { ...valid, lastName: 'a'.repeat(81) },
    { ...valid, email: `${'a'.repeat(69)}@example.com` },
  ])('rejects incomplete, invalid or oversized contact details before any outbound work: %j', async payload => {
    await expect(coloradoRelocationGuideForm(payload)).rejects.toMatchObject({ outcome: 'not_sent' });
    expect(fetch).not.toHaveBeenCalled();
    expect(evaluateLeadSpam).not.toHaveBeenCalled();
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
    expectNoPartnerContact();
  });

  it('does not retry an ambiguous transport failure or emit a conversion', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection lost after send'));
    await expect(coloradoRelocationGuideForm(valid)).rejects.toMatchObject({ outcome: 'unconfirmed', submissionId: 'colorado-submission-test-id' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
    expect(updateSubmissionStatus).toHaveBeenCalledWith('colorado-submission-test-id', 'UNCONFIRMED', null, expect.any(Error));
  });

  it('handles an explicit Salesforce rejection without download success or retry', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Required fields are missing', { status: 200 }));
    await expect(coloradoRelocationGuideForm(valid)).rejects.toMatchObject({ outcome: 'unconfirmed' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
  });

  it('keeps accepted success when Slack fails, so a visitor is not asked to create a duplicate lead', async () => {
    vi.mocked(sendToSlack).mockRejectedValueOnce(new Error('Slack unavailable'));
    await expect(coloradoRelocationGuideForm(valid)).resolves.toMatchObject({ success: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(captureLeadConversionCreated).toHaveBeenCalledTimes(1);
    expect(captureServerAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'lead_notification_failed' }));
    expectNoPartnerContact();
  });

  it('retains spam quarantine without counting it as an accepted conversion', async () => {
    vi.mocked(evaluateLeadSpam).mockResolvedValueOnce({ quarantine: true, reasons: ['honeypot'] });
    await expect(coloradoRelocationGuideForm(valid)).resolves.toMatchObject({ success: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledWith(expect.objectContaining({ headerText: expect.stringContaining('SPAM-SUSPECTED') }));
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
    expectNoPartnerContact();
  });

  it('uses the full acceptance path in local dry run while suppressing all outbound sinks', async () => {
    vi.stubEnv('VPCS_SALESFORCE_PROFILE', 'mock');
    vi.stubEnv('VERCEL', undefined);
    vi.stubEnv('VERCEL_ENV', undefined);
    vi.stubEnv('VPCS_DELIVERY_MODE', undefined);
    vi.stubEnv('LEAD_DRY_RUN', '1');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(coloradoRelocationGuideForm(valid)).resolves.toMatchObject({ success: true, dryRun: true });
    expect(fetch).not.toHaveBeenCalled();
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
    expect(captureServerAnalyticsEvent).not.toHaveBeenCalled();
    expectNoPartnerContact();
    expect(log).toHaveBeenCalledWith('[LEAD_DRY_RUN] Skipping Salesforce Web-to-Lead POST', { submissionId: 'colorado-submission-test-id', fieldCount: expect.any(Number) });
  });
});
