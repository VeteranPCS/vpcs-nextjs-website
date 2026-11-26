import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import sendToSlack from '@/actions/sendToSlack';
import {
  contactAgentPostForm,
  contactLenderPostForm,
  GetListedAgentsPostForm,
  GetListedLendersPostForm,
  KeepInTouchForm,
  contactPostForm,
  vaLoanGuideForm,
  homebuyerGuideForm,
  internshipFormSubmission,
  coloradoRelocationGuideForm,
} from '@/services/salesForcePostFormsService';
import {
  buildAgentLeadParams,
  buildLenderLeadParams,
} from '@/services/salesforceLeadParams';
import { logError } from '@/services/loggingService';
import { captureLeadConversionCreated, captureServerAnalyticsEvent } from '@/lib/analytics/server';
import { evaluateLeadSpam } from '@/lib/spam-protection';
import { updateSubmissionStatus } from '@/services/formTrackingService';
import stateService from '@/services/stateService';
import { contactAgentClientSchema, contactLenderClientSchema } from '@/lib/validation/contactForms';
import { submitCustomerWebsiteLead } from '@/lib/leads/customer-action';
import { getSalesforceConfig } from '@/lib/salesforce/server-config';
import { getVerifiedSalesforceSession } from '@/services/salesForceTokenService';
import { inspectLeadAttempt, reconcileLeadAttempt } from '@/services/salesforceIntake';
import mockManifest from '@/config/salesforce/mock.json';
import webdevFixtures from '@/config/salesforce/webdev-fixtures.json';
import { stubProductionEnv } from '@/lib/salesforce/__tests__/configuration-fixtures';

const submissionId = vi.hoisted(() => '025284ba-b587-4777-b974-e5ebbf0ef6c7');

vi.mock('server-only', () => ({}));
vi.mock('node:crypto', async importOriginal => ({
  ...await importOriginal<typeof import('node:crypto')>(),
  randomUUID: () => submissionId,
}));
vi.mock('@/lib/salesforce/intake-fields', () => ({
  getIntakeFields: () => ({ honeypot: '00N000000000901', submissionHash: '00N000000000902' }),
}));
vi.mock('@/services/salesforceIntake', async importOriginal => ({
  ...await importOriginal<typeof import('@/services/salesforceIntake')>(),
  inspectLeadAttempt: vi.fn(),
  claimLeadAttempt: vi.fn(async (_id, _hash, _emailHash, denyDispatch) => ({ claimed: !denyDispatch, blocked: Boolean(denyDispatch) })),
  reconcileLeadAttempt: vi.fn(),
  claimWebsiteNotifications: vi.fn(async () => true),
}));
vi.mock('@/services/salesForceTokenService', () => ({ getVerifiedSalesforceSession: vi.fn() }));

vi.mock('@/actions/sendToSlack', () => ({
  default: vi.fn(async () => ({ ok: true })),
}));

vi.mock('@/services/loggingService', () => ({
  logDebug: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

vi.mock('@/services/stateService', () => ({
  default: {
    fetchAgentById: vi.fn(async () => ({
      Name: 'Jason Anderson',
      PersonEmail: 'jason@example.test',
      PersonMobilePhone: '7195550100',
      Brokerage_Name__pc: 'QA Realty',
    })),
  },
}));

vi.mock('@/lib/spam-protection', () => ({
  evaluateLeadRateLimit: vi.fn(async () => ({ decision: 'allow', quarantine: false, reasons: [] })),
  evaluateLeadSpam: vi.fn(async () => ({ decision: 'allow', quarantine: false, reasons: [] })),
}));

vi.mock('@/lib/analytics/server', () => ({
  VPCS_VISITOR_ID_W2L_FIELD_ID: '00NRg00000PjSD3MAN',
  VPCS_SUBMISSION_ID_W2L_FIELD_ID: '00NRg00000PjSEfMAN',
  appendSalesforceAttributionParams: vi.fn((
    params: URLSearchParams,
    formData: Record<string, unknown>,
    submissionId: string,
  ) => {
    const visitorId = typeof formData.vpcs_visitor_id === 'string'
      && formData.vpcs_visitor_id.startsWith('vpcs_')
      ? formData.vpcs_visitor_id
      : '';
    params.set('00NRg00000PjSD3MAN', visitorId);
    params.set('00NRg00000PjSEfMAN', submissionId);
    return params;
  }),
  captureLeadConversionCreated: vi.fn(async () => undefined),
  captureServerAnalyticsEvent: vi.fn(async () => undefined),
}));

vi.mock('@/services/formTrackingService', () => ({
  FormSubmissionStatus: { SUCCESS: 'SUCCESS' },
  updateSubmissionStatus: vi.fn(async () => true),
}));

const acceptedResult = {
  outcome: 'accepted', success: true, submissionId, redirectUrl: '/thank-you',
} as const;

const queryString = '?form=agent&fn=Jason&id=0014x00000HWTqI&state=colorado';

beforeEach(() => {
  stubProductionEnv();
  vi.stubEnv('VPCS_LEAD_BINDING_KEY', 'f'.repeat(64));
  vi.mocked(inspectLeadAttempt).mockReset().mockImplementation(async () => {
    await getVerifiedSalesforceSession();
    return { exists: false, confirmed: false, declined: false };
  });
  vi.mocked(reconcileLeadAttempt).mockReset().mockResolvedValue(true);
  vi.mocked(getVerifiedSalesforceSession).mockReset().mockImplementation(async () => {
    const config = getSalesforceConfig();
    return { token: 'test-only', generation: 1, instanceUrl: config.restOrigin, cacheKey: config.cacheKey };
  });
});
afterEach(() => vi.unstubAllEnvs());

describe('accepted customer lead regression boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));
  });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('returns a recoverable outcome before POST when Salesforce OAuth is unavailable', async () => {
    vi.mocked(getVerifiedSalesforceSession).mockRejectedValue(new Error('Salesforce OAuth unavailable'));

    await expect(contactPostForm({ firstName: 'QA', lastName: 'Contact', email: 'qa@example.test' }))
      .resolves.toMatchObject({ success: false, outcome: 'retry_later' });

    expect(getVerifiedSalesforceSession).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
  });

  describe.each([
    ['contact_agent', contactAgentClientSchema, contactAgentPostForm],
    ['contact_lender', contactLenderClientSchema, contactLenderPostForm],
  ] as const)('%s', (formId, schema, submit) => {
    it.each(['email', 'phone', 'both'])('accepts real client-normalized %s-only/both payloads', async (method) => {
      const data = await schema.validate({ ...qaPayload(), state: 'CO', email: method === 'phone' ? '' : 'qa@example.com', phone: method === 'email' ? '' : '(719) 555-0100' });
      if (method === 'email') expect(data.phone).toBeUndefined();
      const result = await submitCustomerWebsiteLead(formId, data, queryString, submit);
      expect(result).toMatchObject({ success: true, outcome: 'accepted', submissionId });
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(sendToSlack).toHaveBeenCalledTimes(1);
      expect(captureLeadConversionCreated).toHaveBeenCalledTimes(1);
      expect(updateSubmissionStatus).toHaveBeenCalledTimes(1);
      expect(updateSubmissionStatus).toHaveBeenCalledWith(submissionId, 'SUCCESS', expect.any(Response));
    });

    it('rejects invalid website input before every outbound effect', async () => {
      const result = await submitCustomerWebsiteLead(formId, { ...qaPayload(), firstName: '   ' }, queryString, submit);
      expect(result).toMatchObject({ outcome: 'validation_error', fieldErrors: { firstName: 'First name is required' } });
      for (const effect of [fetch, sendToSlack, captureLeadConversionCreated]) expect(effect).not.toHaveBeenCalled();
    });
  });

  it('a Slack argument-construction exception preserves acceptance and conversion capture', async () => {
    vi.mocked(stateService.fetchAgentById).mockResolvedValueOnce({
      get Name() { throw new Error('private partner data'); }, PersonMobilePhone: '7195550100',
    } as never);
    await expect(contactAgentPostForm(qaPayload(), queryString)).resolves.toHaveProperty('submissionId');
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).toHaveBeenCalledTimes(1);
    expect(captureServerAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({ properties: expect.objectContaining({ channel: 'Slack', failure_stage: 'construction' }) }));
  });

  it.each(['status', 'analytics'] as const)('%s failure after acceptance cannot reverse success or suppress notifications', async (stage) => {
    if (stage === 'status') vi.mocked(updateSubmissionStatus).mockRejectedValueOnce(new Error('unavailable'));
    if (stage === 'analytics') vi.mocked(captureLeadConversionCreated).mockRejectedValueOnce(new Error('construction or delivery'));
    await expect(contactAgentPostForm(qaPayload(), queryString)).resolves.toHaveProperty('submissionId');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(captureLeadConversionCreated).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateSubmissionStatus).mock.calls.every((call) => call[1] === 'SUCCESS')).toBe(true);
  });

  it('network uncertainty makes one POST, clears its timer, and produces a typed failure', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network lost'));
    vi.mocked(reconcileLeadAttempt).mockResolvedValueOnce(false);
    await expect(contactAgentPostForm(qaPayload(), queryString)).resolves.toMatchObject({ outcome: 'unconfirmed', submissionId });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(updateSubmissionStatus).not.toHaveBeenCalled();
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
  });

  it('invalid contact values are rejected before POST', async () => {
    await expect(contactAgentPostForm({ email: 'bad' }, '')).resolves.toMatchObject({ outcome: 'validation_error' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('Slack delivery and failure-telemetry failures preserve acceptance and conversion capture', async () => {
    vi.mocked(sendToSlack).mockRejectedValueOnce(new Error('transport failed'));
    vi.mocked(captureServerAnalyticsEvent).mockRejectedValueOnce(new Error('analytics failed'));
    await expect(contactAgentPostForm(qaPayload(), queryString)).resolves.toHaveProperty('submissionId');
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(captureLeadConversionCreated).toHaveBeenCalledTimes(1);
  });

  it('preserves the selected partner ID and Slack delivery when the production lookup finds no Account', async () => {
    vi.mocked(stateService.fetchAgentById).mockResolvedValueOnce(null);
    await expect(contactAgentPostForm(qaPayload(), queryString)).resolves.toHaveProperty('submissionId');
    expect(salesforceBody().get('00N4x00000Lsn28')).toBe('0014x00000HWTqI');
    expect(sendToSlack).toHaveBeenCalledTimes(1);
  });

  it('retains partial-context service callers such as Concierge', async () => {
    await expect(contactLenderPostForm({ firstName: 'QA', email: 'qa@example.com', state: 'CO' }, '')).resolves.toHaveProperty('submissionId');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
  });

  it('retains full valid notes in Salesforce', async () => {
    const notes = 'x'.repeat(5000);
    await contactAgentPostForm({ ...qaPayload(), additionalComments: notes }, queryString);
    expect([...salesforceBody().values()]).toContain(notes);
  });
});

// The lead-param builders type `formData` as a flat `Record<string, string | undefined>`.
// These fixtures also carry the analytics passthrough fields (`form_rendered_at`, the
// `*_count_before_conversion` counters) as real numbers, matching what the client sends on the
// wire. Assert the builder-facing shape via one type-only cast so the static type matches the
// builder param while the runtime values stay numeric — the number→string coercion path in the
// builders/attribution helper is still exercised exactly as in production.
function qaPayload(): Record<string, string | undefined> {
  return {
    firstName: 'QA',
    lastName: 'Concierge Test',
    email: 'tech+qa@veteranpcs.com',
    phone: '8302795914',
    currentBase: 'QA Test Current Base',
    destinationBase: 'Colorado Springs QA Test',
    howDidYouHear: 'Other',
    tellusMore: 'PR #88 QA test submission',
    additionalComments:
      'QA TEST - PR #88 concierge/lead smoke test for Jason Anderson. Do not treat as a real lead.',
    company_website: '',
    form_rendered_at: Date.now() - 5_000,
    vpcs_visitor_id: 'vpcs_test_visitor_1234567890',
    pageview_count_before_conversion: 3,
    cta_click_count_before_conversion: 1,
    form_attempt_count_before_conversion: 1,
  } as unknown as Record<string, string | undefined>;
}

function lenderPayload(): Record<string, string | undefined> {
  return {
    firstName: 'QA',
    lastName: 'Lender Test',
    email: 'tech+lender-qa@veteranpcs.com',
    phone: '8302795914',
    currentBase: 'QA Test Current Base',
    destinationBase: 'Austin QA Test',
    howDidYouHear: 'Google',
    additionalComments: 'QA TEST - lender state routing smoke test.',
    company_website: '',
    form_rendered_at: Date.now() - 5_000,
    vpcs_visitor_id: 'vpcs_test_lender_1234567890',
  } as unknown as Record<string, string | undefined>;
}

function mockSalesforceResponse(body: string, init?: ResponseInit) {
  vi.mocked(global.fetch).mockResolvedValueOnce(new Response(body, init));
}

function salesforceBody() {
  const requestInit = vi.mocked(global.fetch).mock.calls[0]?.[1] as RequestInit | undefined;
  return new URLSearchParams(String(requestInit?.body ?? ''));
}

describe('contactAgentPostForm Salesforce Web-to-Lead behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://www.veteranpcs.com';
    process.env.OPEN_PHONE_FROM_NUMBER = '+17194153014';
  });

  it('builds the protected contact-agent Salesforce payload keys without dropping empty strings', () => {
    const params = buildAgentLeadParams(
      { ...qaPayload(), email: '', phone: '', state: 'DC', howDidYouHear: '' },
      { id: '001AGENT' },
      'https://www.veteranpcs.com/contact-agent?sid=test',
      'https://www.veteranpcs.com',
    );

    expect([...params.keys()]).toEqual([
      'oid',
      'retURL',
      '00N4x00000Lsn28',
      'recordType',
      'lead_source',
      '00N4x00000Lsr0G',
      'country_code',
      '00N4x00000QQ1LB',
      'first_name',
      'last_name',
      'email',
      'mobile',
      '00N4x00000Lpb0T',
      '00N4x00000LspUs',
      '00N4x00000QPksj',
      '00N4x00000QPS7V',
      '00N4x00000bfgFA',
      '00N4x00000LsnP2',
      '00N4x00000LsnOx',
      '00N4x00000QQ0Vz',
      '00N4x00000LspV2',
      '00N4x00000LspUi',
      '00N4x00000LsaDm',
      '00N4x00000cKsNF',
      '00N4x00000LssBZ',
      '00N4x00000Lpb2K',
      '00N4x00000Lpb2Z',
      '00N4x00000LsaCy',
      '00N4x00000Lpbfw',
      'g-recaptcha-response',
      'captcha_settings',
    ]);
    expect(params.get('email')).toBe('');
    expect(params.get('mobile')).toBe('');
    expect(params.get('00N4x00000QPksj')).toBe('');
    expect(params.get('00N4x00000LspV2')).toBe('DC');
    expect(params.get('00N4x00000QQ1LB')).toBe('https://www.veteranpcs.com/contact-agent?sid=test');
  });

  it('builds the protected contact-lender Salesforce payload keys without dropping empty strings', () => {
    const params = buildLenderLeadParams(
      { ...lenderPayload(), phone: '', state: 'TX', howDidYouHear: '' },
      { id: '001LENDER' },
      'https://www.veteranpcs.com/contact-lender?sid=test',
      'https://www.veteranpcs.com',
    );

    expect([...params.keys()]).toEqual([
      'oid',
      'retURL',
      '00N4x00000QPJUT',
      'recordType',
      'lead_source',
      '00N4x00000Lsr0G',
      'country_code',
      '00N4x00000QQ1LB',
      'first_name',
      'last_name',
      'email',
      'mobile',
      '00N4x00000LspV2',
      '00N4x00000Lpb0T',
      '00N4x00000LspUs',
      '00N4x00000QPksj',
      '00N4x00000QPS7V',
      '00N4x00000bfgFA',
      'g-recaptcha-response',
      'captcha_settings',
    ]);
    expect(params.get('mobile')).toBe('');
    expect(params.get('00N4x00000QPksj')).toBe('');
    expect(params.get('00N4x00000LspV2')).toBe('TX');
    expect(params.get('00N4x00000QQ1LB')).toBe('https://www.veteranpcs.com/contact-lender?sid=test');
  });

  it('appends the fixed Web-to-Lead attribution fields when a submission id is present', () => {
    const params = buildAgentLeadParams(
      qaPayload(),
      { id: '001AGENT' },
      'https://www.veteranpcs.com/contact-agent?sid=test',
      'https://www.veteranpcs.com',
      submissionId,
    );

    expect(params.get('00NRg00000PjSD3MAN')).toBe('vpcs_test_visitor_1234567890');
    expect(params.get('00NRg00000PjSEfMAN')).toBe(submissionId);
  });

  it('accepts a Salesforce redirect response and sends notifications once', async () => {
    mockSalesforceResponse(
      "<html><script>window.location('https://www.veteranpcs.com/thank-you')</script></html>",
      { status: 200 },
    );

    const result = await contactAgentPostForm(qaPayload(), queryString);

    expect(result).toEqual(acceptedResult);
    expect(salesforceBody().get('00N4x00000LspV2')).toBe('CO');
    expect(salesforceBody().get('00N4x00000QQ1LB')).toContain(`sid=${submissionId}`);
    expect(salesforceBody().get('00NRg00000PjSD3MAN')).toBe('vpcs_test_visitor_1234567890');
    expect(salesforceBody().get('00NRg00000PjSEfMAN')).toBe(submissionId);
    expect(global.fetch).toHaveBeenCalledExactlyOnceWith(
      'https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(getVerifiedSalesforceSession).toHaveBeenCalledBefore(vi.mocked(fetch));
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledWith(expect.objectContaining({ state: 'Colorado' }));
    expect(captureLeadConversionCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: 'contact_agent',
        leadSource: 'Contact Agent',
        submissionId,
        stateCode: 'CO',
        stateSlug: 'colorado',
        partnerType: 'agent',
        partnerSalesforceId: '0014x00000HWTqI',
        formData: expect.objectContaining({
          vpcs_visitor_id: 'vpcs_test_visitor_1234567890',
          state: 'CO',
        }),
      }),
    );
  });

  it('uses submitted form state when URL state is not derivable', async () => {
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    const result = await contactAgentPostForm(
      { ...qaPayload(), state: 'TX', destinationBase: 'Austin QA Test' },
      '?form=agent&fn=Jason&id=0014x00000HWTqI',
    );

    expect(result).toEqual(acceptedResult);
    expect(salesforceBody().get('00N4x00000LspV2')).toBe('TX');
    expect(salesforceBody().get('00N4x00000Lpb0T')).toBe('QA Test Current Base');
    expect(salesforceBody().get('00N4x00000LspUs')).toBe('Austin QA Test');
    expect(sendToSlack).toHaveBeenCalledWith(expect.objectContaining({ state: 'Texas' }));
  });

  it('lets a valid URL state win over submitted form state', async () => {
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    await contactAgentPostForm({ ...qaPayload(), state: 'TX' }, queryString);

    expect(salesforceBody().get('00N4x00000LspV2')).toBe('CO');
    expect(sendToSlack).toHaveBeenCalledWith(expect.objectContaining({ state: 'Colorado' }));
  });

  it.each(['', '&state=unrecognized'])('rejects missing or malformed effective state (%s) before Salesforce and notifications', async (stateParam) => {
    await expect(
      contactAgentPostForm(qaPayload(), `?form=agent&fn=Jason&id=0014x00000HWTqI${stateParam}`),
    ).resolves.toMatchObject({ outcome: 'validation_error', fieldErrors: { state: expect.any(String) } });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(sendToSlack).not.toHaveBeenCalled();
  });

  it('submits lender state to Salesforce from the derived URL state', async () => {
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    const result = await contactLenderPostForm(
      lenderPayload(),
      '?form=lender&fn=Taylor&id=0014x00000Lender&state=florida',
    );

    expect(result).toEqual(acceptedResult);
    expect(salesforceBody().get('00N4x00000LspV2')).toBe('FL');
    expect(global.fetch).toHaveBeenCalledExactlyOnceWith(
      'https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(getVerifiedSalesforceSession).toHaveBeenCalledBefore(vi.mocked(fetch));
    expect(sendToSlack).toHaveBeenCalledWith(expect.objectContaining({ state: 'Florida' }));
  });

  it('accepts a Salesforce 200 without redirect and sends notifications once', async () => {
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    const result = await contactAgentPostForm(qaPayload(), queryString);

    expect(result).toEqual(acceptedResult);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
  });

  it('does not retry Salesforce when Slack returns a failed result after Salesforce accepts', async () => {
    vi.mocked(sendToSlack).mockResolvedValueOnce({ ok: false, failureStage: 'configuration' });
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    const result = await contactAgentPostForm(qaPayload(), queryString);

    expect(result).toEqual(acceptedResult);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(
      'Slack notification failed',
      expect.objectContaining({ submissionId, stage: 'configuration' }),
      expect.any(Error),
    );
    expect(captureServerAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'lead_notification_failed',
        distinctId: submissionId,
        properties: expect.objectContaining({
          submission_id: submissionId,
          channel: 'Slack',
          failure_detail: 'ok=false',
        }),
      }),
    );
  });

  it('surfaces a rejected Slack notification to PostHog without failing the submission', async () => {
    vi.mocked(sendToSlack).mockRejectedValueOnce(new Error('network down'));
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    const result = await contactAgentPostForm(qaPayload(), queryString);

    expect(result).toEqual(acceptedResult);
    expect(logError).toHaveBeenCalledWith(
      'Slack notification failed',
      expect.objectContaining({ submissionId }),
      expect.any(Error),
    );
    expect(captureServerAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'lead_notification_failed',
        properties: expect.objectContaining({ channel: 'Slack', failure_detail: 'rejected' }),
      }),
    );
  });

  it('does not emit a failure event to PostHog when notifications all succeed', async () => {
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    await contactAgentPostForm(qaPayload(), queryString);

    expect(captureServerAnalyticsEvent).not.toHaveBeenCalled();
  });

  it.each([
    ['a Salesforce 2xx error body', '<html><body>error occurred: required field missing</body></html>', 200],
    ['a Salesforce HTTP error', 'server error', 500],
    ['a Salesforce 2xx redirect', '<script>window.location("/thank-you")</script>', 200],
  ])('treats %s without readback as uncertain and sends no notification', async (_name, body, status) => {
    mockSalesforceResponse(body, { status });
    vi.mocked(reconcileLeadAttempt).mockResolvedValueOnce(false);
    await expect(contactAgentPostForm(qaPayload(), queryString)).resolves.toMatchObject({ outcome: 'unconfirmed' });
    expect(fetch).toHaveBeenCalledOnce();
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
  });

  it('rejects suspected spam before POST or enrichment, with no conversion', async () => {
    vi.mocked(evaluateLeadSpam).mockResolvedValueOnce({ decision: 'reject', quarantine: true, reasons: ['honeypot'] });
    await expect(contactAgentPostForm(qaPayload(), queryString)).resolves.toMatchObject({ outcome: 'rejected' });
    expect(stateService.fetchAgentById).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
  });
});

/**
 * Characterization tests for the SEVEN Web-to-Lead functions that previously had ZERO
 * posted-body coverage. Each pins the FULL ordered [key, value] list of the URLSearchParams
 * body sent to Salesforce. The original business values and order remain pinned.
 * Admission appends the mapped honeypot and submission fingerprint to every form.
 *
 * Note on `retURL` / `00N4x00000QQ1LB`: `BASE_URL` is captured at module load from
 * `process.env.NEXT_PUBLIC_API_BASE_URL`, which is unset in the Vitest env, so the template
 * literals render the literal string "undefined" (e.g. "undefined/thank-you"). That is the
 * current, real posted value in this environment and is what we pin here.
 */
describe('characterization: uncovered Web-to-Lead posted bodies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://www.veteranpcs.com';
    process.env.OPEN_PHONE_FROM_NUMBER = '+17194153014';
  });

  it('GetListedAgentsPostForm posts an exact ordered body with attribution and admission fields', async () => {
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    await GetListedAgentsPostForm({
      firstName: 'Test',
      lastName: 'Agent',
      email: 'agent@example.com',
      phone: '8035550100',
      status_select: 'Veteran',
      branch_select: 'Army',
      discharge_status: 'Honorable',
      state: 'CO',
      city: 'Colorado Springs',
      primaryState: 'CO',
      otherStates: ['TX', 'FL'],
      licenseNumber: 'LIC123',
      brokerageName: 'Test Brokerage',
      managingBrokerName: 'Broker Boss',
      managingBrokerPhone: '8035550111',
      managingBrokerEmail: 'broker@example.com',
      citiesServiced: 'Denver, Aurora',
      basesServiced: 'Fort Carson',
      personallyPCS: 'Yes',
      leadAcceptance: 'Agree',
      howDidYouHear: 'Google',
      tellusMore: 'More info here',
    });

    const body = salesforceBody();
    expect([...body.entries()]).toEqual([
      ['oid', '00D4x000003yaV2'],
      ['retURL', 'undefined/thank-you'],
      ['recordType', '0124x000000Z5yI'],
      ['lead_source', 'Agent Listing Request'],
      ['00N4x00000Lsr0G', 'true'],
      ['country_code', 'US'],
      ['00N4x00000QQ1LB', 'undefined/get-listed-agents'],
      ['first_name', 'Test'],
      ['last_name', 'Agent'],
      ['email', 'agent@example.com'],
      ['mobile', '8035550100'],
      ['00N4x00000LsnP2', 'Veteran'],
      ['00N4x00000LsnOx', 'Army'],
      ['00N4x00000QQ0Vz', 'Honorable'],
      ['state_code', 'CO'],
      ['city', 'Colorado Springs'],
      ['00N4x00000LpcBo', 'CO'],
      ['00N4x00000QPIOt', 'TX;FL'],
      ['00N4x00000LpcCm', 'LIC123'],
      ['00N4x00000LpcCr', 'Test Brokerage'],
      ['00N4x00000c4kPN', 'Broker Boss'],
      ['00N4x00000c4kPS', '8035550111'],
      ['00N4x00000c4kPX', 'broker@example.com'],
      ['00N4x00000LsqCV', 'Denver, Aurora'],
      ['00N4x00000LsqCa', 'Fort Carson'],
      ['00N4x00000LpcDQ', 'Yes'],
      ['00N4x00000LpcDV', 'Agree'],
      ['00N4x00000QPksj', 'Google'],
      ['00N4x00000QPS7V', 'More info here'],
      ['g-recaptcha-response', ''],
      ['captcha_settings', ''],
      ['00NRg00000PjSD3MAN', ''],
      ['00NRg00000PjSEfMAN', submissionId],
      ['00N000000000901', ''],
      ['00N000000000902', expect.stringMatching(/^[0-9a-f]{64}$/)],
    ]);

    expect(body.get('oid')).toBe('00D4x000003yaV2');
    expect(body.get('recordType')).toBe('0124x000000Z5yI');
    expect(body.get('lead_source')).toBe('Agent Listing Request');
    expect(body.has('retURL')).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('GetListedLendersPostForm posts an exact ordered body with attribution and admission fields', async () => {
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    await GetListedLendersPostForm({
      firstName: 'Test',
      lastName: 'Lender',
      email: 'lender@example.com',
      phone: '8035550100',
      status_select: 'Veteran',
      branch_select: 'Navy',
      discharge_status: 'Honorable',
      primaryState: 'TX',
      otherStates: ['CA', 'NV'],
      localCities: 'Austin, Dallas',
      nmlsId: 'NMLS999',
      name: 'Test Lender Co',
      street: '123 Main St',
      state: 'TX',
      city: 'Austin',
      zip: '78701',
      companyNMLSId: 'CNMLS888',
      howDidYouHear: 'Referral',
      tellusMore: 'Lender details',
    });

    const body = salesforceBody();
    expect([...body.entries()]).toEqual([
      ['oid', '00D4x000003yaV2'],
      ['retURL', 'undefined/thank-you'],
      ['recordType', '0124x000000ZGGU'],
      ['lead_source', 'Lender Listing Request'],
      ['00N4x00000Lsr0G', 'true'],
      ['country_code', 'US'],
      ['00N4x00000QQ1LB', 'undefined/get-listed-lenders'],
      ['first_name', 'Test'],
      ['last_name', 'Lender'],
      ['email', 'lender@example.com'],
      ['mobile', '8035550100'],
      ['00N4x00000LsnP2', 'Veteran'],
      ['00N4x00000LsnOx', 'Navy'],
      ['00N4x00000QQ0Vz', 'Honorable'],
      ['00N4x00000LpcBo', 'TX'],
      ['00N4x00000QPIOt', 'CA;NV'],
      ['00N4x00000LsqCV', 'Austin, Dallas'],
      ['00N4x00000QPIOZ', 'NMLS999'],
      ['00N4x00000LpcCr', 'Test Lender Co'],
      ['street', '123 Main St'],
      ['state_code', 'TX'],
      ['city', 'Austin'],
      ['zip', '78701'],
      ['00N4x00000QPIOe', 'CNMLS888'],
      ['00N4x00000QPksj', 'Referral'],
      ['00N4x00000QPS7V', 'Lender details'],
      ['g-recaptcha-response', ''],
      ['captcha_settings', ''],
      ['00NRg00000PjSD3MAN', ''],
      ['00NRg00000PjSEfMAN', submissionId],
      ['00N000000000901', ''],
      ['00N000000000902', expect.stringMatching(/^[0-9a-f]{64}$/)],
    ]);

    expect(body.get('oid')).toBe('00D4x000003yaV2');
    expect(body.get('recordType')).toBe('0124x000000ZGGU');
    expect(body.get('lead_source')).toBe('Lender Listing Request');
    expect(body.has('retURL')).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('KeepInTouchForm posts an exact ordered body with attribution and admission fields', async () => {
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    await KeepInTouchForm({
      firstName: 'Test',
      lastName: 'Keep',
      email: 'keep@example.com',
      phone: '8035550100',
      vpcs_visitor_id: 'vpcs_test_visitor_1234567890',
    });

    const body = salesforceBody();
    expect([...body.entries()]).toEqual([
      ['oid', '00D4x000003yaV2'],
      ['retURL', 'undefined/thank-you'],
      ['recordType', '0124x000000Z5yD'],
      ['lead_source', 'Keep in Touch'],
      ['first_name', 'Test'],
      ['last_name', 'Keep'],
      ['email', 'keep@example.com'],
      ['g-recaptcha-response', ''],
      ['captcha_settings', ''],
      ['00NRg00000PjSD3MAN', 'vpcs_test_visitor_1234567890'],
      ['00NRg00000PjSEfMAN', submissionId],
      ['00N000000000901', ''],
      ['00N000000000902', expect.stringMatching(/^[0-9a-f]{64}$/)],
    ]);

    expect(body.get('oid')).toBe('00D4x000003yaV2');
    expect(body.get('recordType')).toBe('0124x000000Z5yD');
    expect(body.get('lead_source')).toBe('Keep in Touch');
    expect(body.has('retURL')).toBe(true);
    expect(body.get('00NRg00000PjSD3MAN')).toBe('vpcs_test_visitor_1234567890');
    expect(body.get('00NRg00000PjSEfMAN')).toBe(submissionId);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('contactPostForm posts an exact ordered body with attribution and admission fields', async () => {
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    await contactPostForm({
      firstName: 'Test',
      lastName: 'Contact',
      email: 'contact@example.com',
      phone: '8035550100',
      additionalComments: 'A contact message',
      vpcs_visitor_id: 'vpcs_test_visitor_1234567890',
    });

    const body = salesforceBody();
    expect([...body.entries()]).toEqual([
      ['oid', '00D4x000003yaV2'],
      ['retURL', 'undefined/thank-you'],
      ['recordType', '0124x000000Z5yD'],
      ['lead_source', 'Contact Form'],
      ['first_name', 'Test'],
      ['last_name', 'Contact'],
      ['email', 'contact@example.com'],
      ['00N4x00000bfgFA', 'A contact message'],
      ['g-recaptcha-response', ''],
      ['captcha_settings', ''],
      ['00NRg00000PjSD3MAN', 'vpcs_test_visitor_1234567890'],
      ['00NRg00000PjSEfMAN', submissionId],
      ['00N000000000901', ''],
      ['00N000000000902', expect.stringMatching(/^[0-9a-f]{64}$/)],
    ]);

    expect(body.get('oid')).toBe('00D4x000003yaV2');
    expect(body.get('recordType')).toBe('0124x000000Z5yD');
    expect(body.get('lead_source')).toBe('Contact Form');
    expect(body.has('retURL')).toBe(true);
    expect(body.get('00NRg00000PjSD3MAN')).toBe('vpcs_test_visitor_1234567890');
    expect(body.get('00NRg00000PjSEfMAN')).toBe(submissionId);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('vaLoanGuideForm posts an exact ordered body with attribution and admission fields', async () => {
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    await vaLoanGuideForm({
      firstName: 'Test',
      lastName: 'Va',
      email: 'va@example.com',
      phone: '8035550100',
      vpcs_visitor_id: 'vpcs_test_visitor_1234567890',
    });

    const body = salesforceBody();
    expect([...body.entries()]).toEqual([
      ['oid', '00D4x000003yaV2'],
      ['retURL', 'undefined/thank-you'],
      ['recordType', '0124x000000Z5yD'],
      ['lead_source', 'VA Loan Guide'],
      ['first_name', 'Test'],
      ['last_name', 'Va'],
      ['email', 'va@example.com'],
      ['g-recaptcha-response', ''],
      ['captcha_settings', ''],
      ['00NRg00000PjSD3MAN', 'vpcs_test_visitor_1234567890'],
      ['00NRg00000PjSEfMAN', submissionId],
      ['00N000000000901', ''],
      ['00N000000000902', expect.stringMatching(/^[0-9a-f]{64}$/)],
    ]);

    expect(body.get('oid')).toBe('00D4x000003yaV2');
    expect(body.get('recordType')).toBe('0124x000000Z5yD');
    expect(body.get('lead_source')).toBe('VA Loan Guide');
    expect(body.has('retURL')).toBe(true);
    expect(body.get('00NRg00000PjSD3MAN')).toBe('vpcs_test_visitor_1234567890');
    expect(body.get('00NRg00000PjSEfMAN')).toBe(submissionId);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('homebuyerGuideForm posts an exact ordered body with attribution and admission fields', async () => {
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    await homebuyerGuideForm({
      firstName: 'Test',
      lastName: 'Home',
      email: 'home@example.com',
      phone: '8035550100',
      vpcs_visitor_id: 'vpcs_test_visitor_1234567890',
    });

    const body = salesforceBody();
    expect([...body.entries()]).toEqual([
      ['oid', '00D4x000003yaV2'],
      ['retURL', 'undefined/thank-you'],
      ['recordType', '0124x000000Z5yD'],
      ['lead_source', 'First Time Home Buyer Guide'],
      ['first_name', 'Test'],
      ['last_name', 'Home'],
      ['email', 'home@example.com'],
      ['g-recaptcha-response', ''],
      ['captcha_settings', ''],
      ['00NRg00000PjSD3MAN', 'vpcs_test_visitor_1234567890'],
      ['00NRg00000PjSEfMAN', submissionId],
      ['00N000000000901', ''],
      ['00N000000000902', expect.stringMatching(/^[0-9a-f]{64}$/)],
    ]);

    expect(body.get('oid')).toBe('00D4x000003yaV2');
    expect(body.get('recordType')).toBe('0124x000000Z5yD');
    expect(body.get('lead_source')).toBe('First Time Home Buyer Guide');
    expect(body.has('retURL')).toBe(true);
    expect(body.get('00NRg00000PjSD3MAN')).toBe('vpcs_test_visitor_1234567890');
    expect(body.get('00NRg00000PjSEfMAN')).toBe(submissionId);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('internshipFormSubmission posts an exact ordered body (recordType before retURL) with attribution and admission fields', async () => {
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    await internshipFormSubmission({
      first_name: 'Test',
      last_name: 'Intern',
      email: 'intern@example.com',
      mobile: '8035550100',
      '00N4x00000LsnP2': 'Veteran',
      '00N4x00000LsnOx': 'Army',
      '00N4x00000QQ0Vz': ['Honorable'],
      state_code: 'CO',
      city: 'Colorado Springs',
      base: 'Fort Carson',
      '00N4x00000QPK7L': 'School',
      '00N4x00000LspV2': 'Field One',
      '00N4x00000LspUi': 'Field Two',
      '00N4x00000QPLQY': 'Long answer Y',
      '00N4x00000QPLQd': 'Long answer d',
      '00N4x00000QPksj': 'Google',
      '00N4x00000QPS7V': 'Why I want this internship',
    });

    const body = salesforceBody();
    // NOTE: this form uniquely emits `recordType` BEFORE `retURL` (all other forms put
    // `retURL` second). It also maps the `00N4x00000QQ0Vz` array input to its first element.
    expect([...body.entries()]).toEqual([
      ['oid', '00D4x000003yaV2'],
      ['recordType', '0124x000000ZGKv'],
      ['retURL', 'undefined/thank-you'],
      ['lead_source', 'Internship Application'],
      ['00N4x00000Lsr0G', 'true'],
      ['country_code', 'US'],
      ['first_name', 'Test'],
      ['last_name', 'Intern'],
      ['email', 'intern@example.com'],
      ['mobile', '8035550100'],
      ['00N4x00000LsnP2', 'Veteran'],
      ['00N4x00000LsnOx', 'Army'],
      ['00N4x00000QQ0Vz', 'Honorable'],
      ['state_code', 'CO'],
      ['city', 'Colorado Springs'],
      ['base', 'Fort Carson'],
      ['00N4x00000QPK7L', 'School'],
      ['00N4x00000LspV2', 'Field One'],
      ['00N4x00000LspUi', 'Field Two'],
      ['00N4x00000QPLQY', 'Long answer Y'],
      ['00N4x00000QPLQd', 'Long answer d'],
      ['00N4x00000QPksj', 'Google'],
      ['00N4x00000QPS7V', 'Why I want this internship'],
      ['g-recaptcha-response', ''],
      ['captcha_settings', ''],
      ['00NRg00000PjSD3MAN', ''],
      ['00NRg00000PjSEfMAN', submissionId],
      ['00N000000000901', ''],
      ['00N000000000902', expect.stringMatching(/^[0-9a-f]{64}$/)],
    ]);

    expect(body.get('oid')).toBe('00D4x000003yaV2');
    expect(body.get('recordType')).toBe('0124x000000ZGKv');
    expect(body.get('lead_source')).toBe('Internship Application');
    expect(body.has('retURL')).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

// Accepted controls preserve Slack payloads and conversion classification. Rejected and
// uncertain outcomes have no website notification or accepted-conversion side effects.
describe('characterization: observable contract for the seven simpler forms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://www.veteranpcs.com';
    process.env.OPEN_PHONE_FROM_NUMBER = '+17194153014';
  });

  function accept200() {
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });
  }

  it('GetListedAgentsPostForm: accepted result, exact Slack payload, no conversion capture', async () => {
    accept200();
    const result = await GetListedAgentsPostForm({
      firstName: 'Test', lastName: 'Agent', email: 'agent@example.com', phone: '8035550100',
      // The get-listed Slack message is sourced from `tellusMore` (the form's free-text field),
      // NOT `additionalComments`. Sending a distinct value in each pins that routing.
      tellusMore: 'I have served military families for 10 years.',
      additionalComments: 'internal note that must not reach Slack',
    });

    expect(result).toEqual(acceptedResult);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledWith({
      headerText: '🔔 New Agent Listing Request',
      name: 'Test Agent',
      email: 'agent@example.com',
      phoneNumber: '8035550100',
      message: 'I have served military families for 10 years.',
    });
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
    expect(updateSubmissionStatus).toHaveBeenCalledWith(submissionId, 'SUCCESS', expect.anything());
  });

  it('GetListedLendersPostForm: accepted result, exact Slack payload, no conversion capture', async () => {
    accept200();
    const result = await GetListedLendersPostForm({
      firstName: 'Test', lastName: 'Lender', email: 'lender@example.com', phone: '8035550100',
      // The get-listed Slack message is sourced from `tellusMore` (the form's free-text field),
      // NOT `additionalComments`. Sending a distinct value in each pins that routing.
      tellusMore: 'VA-focused lender, 500+ closed loans.',
      additionalComments: 'internal note that must not reach Slack',
    });

    expect(result).toEqual(acceptedResult);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledWith({
      headerText: '🔔 New Lender Listing Request',
      name: 'Test Lender',
      email: 'lender@example.com',
      phoneNumber: '8035550100',
      message: 'VA-focused lender, 500+ closed loans.',
    });
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
    expect(updateSubmissionStatus).toHaveBeenCalledWith(submissionId, 'SUCCESS', expect.anything());
  });

  it('internshipFormSubmission: accepted result, empty Slack message, no conversion capture', async () => {
    accept200();
    const result = await internshipFormSubmission({
      first_name: 'Test', last_name: 'Intern', email: 'intern@example.com', mobile: '8035550100',
    });

    expect(result).toEqual(acceptedResult);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledWith({
      headerText: '🔔 New Internship Submission',
      name: 'Test Intern',
      email: 'intern@example.com',
      phoneNumber: '8035550100',
      message: '',
    });
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
    expect(updateSubmissionStatus).toHaveBeenCalledWith(submissionId, 'SUCCESS', expect.anything());
  });

  it('KeepInTouchForm: accepted result, Slack payload, capture keep_in_touch', async () => {
    accept200();
    const result = await KeepInTouchForm({
      firstName: 'Test', lastName: 'Keep', email: 'keep@example.com', phone: '8035550100',
    });

    expect(result).toEqual(acceptedResult);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledWith({
      headerText: '🔔 New Keep In Touch Submission',
      name: 'Test Keep',
      email: 'keep@example.com',
      phoneNumber: '8035550100',
      message: '',
    });
    expect(captureLeadConversionCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: 'keep_in_touch',
        leadSource: 'Keep in Touch',
        submissionId,
      }),
    );
    expect(updateSubmissionStatus).toHaveBeenCalledWith(submissionId, 'SUCCESS', expect.anything());
  });

  it('contactPostForm: accepted result, Slack message carries the comment, capture contact_form', async () => {
    accept200();
    const result = await contactPostForm({
      firstName: 'Test', lastName: 'Contact', email: 'contact@example.com', phone: '8035550100',
      additionalComments: 'A contact message',
    });

    expect(result).toEqual(acceptedResult);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledWith({
      headerText: '🔔 New Contact Form Submission',
      name: 'Test Contact',
      email: 'contact@example.com',
      phoneNumber: '8035550100',
      message: 'A contact message',
    });
    expect(captureLeadConversionCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: 'contact_form',
        leadSource: 'Contact Form',
        submissionId,
      }),
    );
    expect(updateSubmissionStatus).toHaveBeenCalledWith(submissionId, 'SUCCESS', expect.anything());
  });

  it('vaLoanGuideForm: accepted result, Slack payload, capture with guideId', async () => {
    accept200();
    const result = await vaLoanGuideForm({
      firstName: 'Test', lastName: 'Va', email: 'va@example.com', phone: '8035550100',
    });

    expect(result).toEqual(acceptedResult);
    expect(sendToSlack).toHaveBeenCalledWith({
      headerText: '🔔 New VA Loan Guide Download',
      name: 'Test Va',
      email: 'va@example.com',
      phoneNumber: '8035550100',
      message: '',
    });
    expect(captureLeadConversionCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: 'va_loan_guide',
        leadSource: 'VA Loan Guide',
        submissionId,
        guideId: 'va_loan_guide',
      }),
    );
    expect(updateSubmissionStatus).toHaveBeenCalledWith(submissionId, 'SUCCESS', expect.anything());
  });

  it('homebuyerGuideForm: accepted result, Slack payload, capture with guideId', async () => {
    accept200();
    const result = await homebuyerGuideForm({
      firstName: 'Test', lastName: 'Home', email: 'home@example.com', phone: '8035550100',
    });

    expect(result).toEqual(acceptedResult);
    expect(sendToSlack).toHaveBeenCalledWith({
      headerText: '🔔 New First Time Home Buyer Guide Download',
      name: 'Test Home',
      email: 'home@example.com',
      phoneNumber: '8035550100',
      message: '',
    });
    expect(captureLeadConversionCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: 'first_time_homebuyer_guide',
        leadSource: 'First Time Home Buyer Guide',
        submissionId,
        guideId: 'first_time_homebuyer_guide',
      }),
    );
    expect(updateSubmissionStatus).toHaveBeenCalledWith(submissionId, 'SUCCESS', expect.anything());
  });

  it.each([
    ['contact', contactPostForm, { additionalComments: 'A contact message' }],
    ['agent listing', GetListedAgentsPostForm, { tellusMore: 'More info here' }],
  ] as const)('rejects the %s honeypot without POST, notice or conversion', async (_name, submit, details) => {
    vi.mocked(evaluateLeadSpam).mockResolvedValueOnce({ decision: 'reject', quarantine: true, reasons: ['honeypot'] });
    await expect(submit({ firstName: 'Test', lastName: 'QA', email: 'contact@example.com', ...details }))
      .resolves.toMatchObject({ outcome: 'rejected' });
    expect(fetch).not.toHaveBeenCalled();
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
    expect(updateSubmissionStatus).not.toHaveBeenCalled();
  });

  it('does not send Slack or count a conversion after an unconfirmed POST', async () => {
    mockSalesforceResponse('server error', { status: 500 });
    vi.mocked(reconcileLeadAttempt).mockResolvedValueOnce(false);
    await expect(contactPostForm({ firstName: 'Test', lastName: 'Contact', email: 'contact@example.com' }))
      .resolves.toMatchObject({ outcome: 'unconfirmed' });
    expect(fetch).toHaveBeenCalledOnce();
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
    expect(updateSubmissionStatus).not.toHaveBeenCalled();
  });
});

/**
 * LEAD_DRY_RUN: the lead-submit path is non-idempotent and fires real outbound side
 * effects (Salesforce Web-to-Lead POST, Slack webhook, and PostHog conversion capture). These
 * tests pin the flag's three contracts: it suppresses every sink and returns the mock acceptance in
 * a non-production environment, it is inert in production, and it changes nothing when
 * unset.
 */
describe('LEAD_DRY_RUN lead-submit dry run', () => {
  let consoleLogSpy: MockInstance<typeof console.log>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://www.veteranpcs.com';
    process.env.OPEN_PHONE_FROM_NUMBER = '+17194153014';
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    consoleLogSpy.mockRestore();
  });

  function accept200() {
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });
  }

  function selectLocalDryRun() {
    vi.stubEnv('VPCS_SALESFORCE_PROFILE', 'mock');
    vi.stubEnv('VERCEL', undefined);
    vi.stubEnv('VERCEL_ENV', undefined);
    vi.stubEnv('VPCS_DELIVERY_MODE', undefined);
    vi.stubEnv('LEAD_DRY_RUN', '1');
  }

  it('suppresses the Salesforce POST, Slack and PostHog, and returns the mock acceptance', async () => {
    selectLocalDryRun();

    const result = await contactAgentPostForm(qaPayload(), queryString);

    expect(result).toEqual(acceptedResult);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(sendToSlack).not.toHaveBeenCalled();
    // PostHog is the primary funnel source, so a dry run must not record a false conversion.
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
    expect(captureServerAnalyticsEvent).not.toHaveBeenCalled();
    expect(
      consoleLogSpy.mock.calls.some(
        (call) => call[0] === '[LEAD_DRY_RUN] Skipping lead_conversion_created PostHog capture',
      ),
    ).toBe(true);
    // The submission is still tracked as accepted so the caller exercises the success path.
    expect(updateSubmissionStatus).toHaveBeenCalledWith(submissionId, 'SUCCESS', undefined);
  });

  it('logs only Web-to-Lead and notification metadata', async () => {
    selectLocalDryRun();

    await contactAgentPostForm(qaPayload(), queryString);

    const postLog = consoleLogSpy.mock.calls.find(
      (call) => call[0] === '[LEAD_DRY_RUN] Skipping Salesforce Web-to-Lead POST',
    );
    expect(postLog?.[1]).toEqual({ submissionId, fieldCount: expect.any(Number) });

    const notifyLog = consoleLogSpy.mock.calls.find(
      (call) => call[0] === '[LEAD_DRY_RUN] Skipping lead notifications',
    );
    expect(notifyLog?.[1]).toEqual({ submissionId, channelCount: 1 });
  });

  it('returns mock acceptance for a simpler form without outbound effects', async () => {
    selectLocalDryRun();

    const result = await KeepInTouchForm({
      firstName: 'Test', lastName: 'Touch', email: 'touch@example.com', phone: '8035550100',
    });

    expect(result).toEqual(acceptedResult);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
  });

  it('is inert in production: the real path runs even with the flag set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LEAD_DRY_RUN', '1');
    accept200();

    const result = await contactPostForm({
      firstName: 'Test', lastName: 'Contact', email: 'contact@example.com', phone: '8035550100',
      additionalComments: 'A contact message',
    });

    expect(result).toEqual(acceptedResult);
    expect(result).not.toHaveProperty('dryRun');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(captureLeadConversionCreated).toHaveBeenCalledTimes(1);
  });

  it('changes nothing when the flag is unset', async () => {
    accept200();

    const result = await contactPostForm({
      firstName: 'Test', lastName: 'Contact', email: 'contact@example.com', phone: '8035550100',
      additionalComments: 'A contact message',
    });

    expect(result).toEqual(acceptedResult);
    expect(result).not.toHaveProperty('dryRun');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(captureLeadConversionCreated).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy.mock.calls.some((call) => String(call[0]).startsWith('[LEAD_DRY_RUN]'))).toBe(false);
  });
});


describe('non-production Vercel submission guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected network access'); }));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  const submissions = [
    ['contact agent', () => contactAgentPostForm(qaPayload(), queryString)],
    ['contact lender', () => contactLenderPostForm(lenderPayload(), queryString)],
    ['listed agent', () => GetListedAgentsPostForm({})],
    ['listed lender', () => GetListedLendersPostForm({})],
    ['keep in touch', () => KeepInTouchForm({})],
    ['contact', () => contactPostForm({})],
    ['VA guide', () => vaLoanGuideForm({})],
    ['homebuyer guide', () => homebuyerGuideForm({})],
    ['Colorado relocation guide', () => coloradoRelocationGuideForm({})],
    ['internship', () => internshipFormSubmission({})],
  ] as const;

  describe.each(['preview', 'development'])('%s', (environment) => {
    it.each(submissions)('blocks %s before remote processing even with dry-run enabled', async (_name, submit) => {
      vi.stubEnv('VERCEL_ENV', environment);
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('LEAD_DRY_RUN', '1');
      await expect(submit()).resolves.toMatchObject({ outcome: 'not_sent', submissionId });
      expect(fetch).not.toHaveBeenCalled();
      expect(evaluateLeadSpam).not.toHaveBeenCalled();
      expect(stateService.fetchAgentById).not.toHaveBeenCalled();
      expect(sendToSlack).not.toHaveBeenCalled();
      expect(captureLeadConversionCreated).not.toHaveBeenCalled();
      expect(captureServerAnalyticsEvent).not.toHaveBeenCalled();
      expect(updateSubmissionStatus).not.toHaveBeenCalled();
    });
  });

  it('retains real production behavior with mocked sinks', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LEAD_DRY_RUN', '1');
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }));
    await expect(contactAgentPostForm(qaPayload(), queryString)).resolves.toEqual(acceptedResult);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
  });
});

describe('Salesforce WebDev form transport', () => {
  const fixtureOrgId = webdevFixtures.orgId;
  const agentFixture = webdevFixtures.accountIds.agents[0]!.slice(0, 15);
  const lenderFixture = webdevFixtures.accountIds.lenders[0]!;
  const action = 'https://test.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8';
  const sandboxOrigin = 'https://veteranpcs--webdev.sandbox.my.salesforce.com';
  const fixtureLead = {
    firstName: '[VPCS WEBDEV TEST] Sample', first_name: '[VPCS WEBDEV TEST] Sample',
    lastName: 'Fixture', last_name: 'Fixture', email: 'qa@example.test',
    phone: '(202) 555-0101', mobile: '202-555-0101', state: 'CO',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', undefined);
    vi.stubEnv('VERCEL_ENV', undefined);
    vi.stubEnv('VPCS_SALESFORCE_PROFILE', 'webdev');
    vi.stubEnv('VPCS_SALESFORCE_ORG_ID', fixtureOrgId);
    vi.stubEnv('VPCS_SALESFORCE_METADATA_JSON', JSON.stringify({ ...mockManifest, orgId: fixtureOrgId }));
    vi.stubEnv('SALESFORCE_LOGIN_BASE_URL', sandboxOrigin);
    vi.stubEnv('SALESFORCE_AUTH_GRANT', 'client_credentials');
    vi.stubEnv('VPCS_SALESFORCE_BASE_URL', sandboxOrigin);
    vi.stubEnv('VPCS_SALESFORCE_WEB_TO_LEAD_URL', action);
    vi.stubEnv('VPCS_DELIVERY_MODE', 'capture');
    vi.stubEnv('VPCS_SANDBOX_LEAD_WRITES', '1');
    vi.stubEnv('VPCS_WEBDEV_ISOLATION_ATTESTED', '1');
    vi.stubEnv('VPCS_WEBDEV_TEST_EMAILS', 'qa@example.test');
    vi.stubEnv('VPCS_WEBDEV_TEST_PHONES', '+12025552000');
    vi.stubEnv('VPCS_WEBDEV_TEST_RUN_ID', 'offline-test');
    vi.stubEnv('VPCS_WEBDEV_TEST_EXPIRES_AT', new Date(Date.now() + 60_000).toISOString());
    vi.stubEnv('VPCS_WEBDEV_SITE_ORIGIN', 'http://127.0.0.1:3131');
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  const submissions = [
    ['contact agent', () => contactAgentPostForm(fixtureLead, '?state=colorado')],
    ['contact lender', () => contactLenderPostForm(fixtureLead, '?state=colorado')],
    ['listed agent', () => GetListedAgentsPostForm(fixtureLead)],
    ['listed lender', () => GetListedLendersPostForm(fixtureLead)],
    ['keep in touch', () => KeepInTouchForm(fixtureLead)],
    ['contact', () => contactPostForm(fixtureLead)],
    ['VA guide', () => vaLoanGuideForm(fixtureLead)],
    ['homebuyer guide', () => homebuyerGuideForm(fixtureLead)],
    ['Colorado relocation guide', () => coloradoRelocationGuideForm(fixtureLead)],
    ['internship', () => internshipFormSubmission(fixtureLead)],
  ] as const;

  it.each(submissions)('posts %s exactly once through the verified sandbox mapping', async (_name, submit) => {
    await expect(submit()).resolves.toEqual(acceptedResult);

    expect(getVerifiedSalesforceSession).toHaveBeenCalledBefore(vi.mocked(fetch));
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = vi.mocked(fetch).mock.calls[0]!; // The call count is asserted above.
    expect(url).toBe(action);
    expect(options?.redirect).toBe('error');
    const params = new URLSearchParams(String(options?.body));
    expect(params.get('oid')).toBe(fixtureOrgId);
    expect(params.get('retURL')).toBe('http://127.0.0.1:3131/thank-you');
    expect(Object.values(mockManifest.recordTypes)).toContain(params.get('recordType'));
    const customFieldKeys = [...params.keys()].filter(key => key.startsWith('00N'));
    expect(customFieldKeys.length).toBeGreaterThan(0);
    const permittedFields = [...Object.values(mockManifest.fieldIds), '00N000000000901', '00N000000000902'];
    for (const key of customFieldKeys) expect(permittedFields).toContain(key);
    expect(params.get('description')).toContain(`offline-test ${submissionId}`);
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
    expect(captureServerAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('uses capture on a protected preview only when the branch attestation is present', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'codex/salesforce-workflow-test');
    vi.stubEnv('VERCEL_URL', 'protected-workflow-preview.vercel.app');
    await expect(contactPostForm(fixtureLead)).resolves.toMatchObject({ outcome: 'not_sent' });
    expect(fetch).not.toHaveBeenCalled();

    vi.stubEnv('VPCS_SANDBOX_PREVIEW_PROTECTED', '1');
    await expect(contactPostForm(fixtureLead)).resolves.toMatchObject({ success: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    const params = new URLSearchParams(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(params.get('retURL')).toBe('https://protected-workflow-preview.vercel.app/thank-you');
  });

  it('discards an unexpected sandbox provider redirect instead of redirecting to production', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(`<script>window.location.replace('https://www.veteranpcs.com/thank-you')</script>`));

    await expect(contactAgentPostForm(fixtureLead, '?state=colorado')).resolves.toEqual(acceptedResult);
  });

  it('keeps local production builds offline when mock is selected', async () => {
    vi.stubEnv('VPCS_SALESFORCE_PROFILE', 'mock');
    await expect(contactPostForm(fixtureLead)).resolves.toEqual(acceptedResult);
    for (const effect of [getVerifiedSalesforceSession, fetch, sendToSlack, captureLeadConversionCreated]) {
      expect(effect).not.toHaveBeenCalled();
    }
  });

  it.each([
    ['an unmarked name', { firstName: 'Sample' }],
    ['an unlisted email', { email: 'other@example.test' }],
    ['an unlisted mobile', { phone: '+12025552001' }],
  ])('rejects %s before org verification or posting', async (_label, changedInput) => {
    await expect(contactAgentPostForm({ ...fixtureLead, ...changedInput }, '?state=colorado')).resolves.toMatchObject({ outcome: 'retry_later' });
    expect(getVerifiedSalesforceSession).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(sendToSlack).not.toHaveBeenCalled();
  });

  it.each([
    ['VPCS_WEBDEV_ISOLATION_ATTESTED', '0'],
    ['VPCS_WEBDEV_TEST_RUN_ID', ''],
    ['VPCS_WEBDEV_TEST_EXPIRES_AT', '2026-01-01T00:00:00Z'],
    ['VPCS_DELIVERY_MODE', 'live'],
  ])('rejects a write for unsafe %s', async (setting, value) => {
    vi.stubEnv(setting, value);
    const outcome = setting === 'VPCS_WEBDEV_ISOLATION_ATTESTED' ? 'not_sent' : 'retry_later';
    await expect(contactPostForm(fixtureLead)).resolves.toMatchObject({ outcome });
    expect(getVerifiedSalesforceSession).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports org verification failure as recoverable and never calls the Web-to-Lead action', async () => {
    vi.mocked(getVerifiedSalesforceSession).mockRejectedValueOnce(new Error('Organization mismatch'));
    await expect(contactPostForm(fixtureLead)).resolves.toMatchObject({ outcome: 'retry_later' });
    expect(fetch).not.toHaveBeenCalled();
    expect(updateSubmissionStatus).not.toHaveBeenCalled();
  });

  it('requires the test window to stay open through org verification', async () => {
    vi.mocked(getVerifiedSalesforceSession).mockImplementationOnce(async () => {
      const config = getSalesforceConfig();
      vi.stubEnv('VPCS_WEBDEV_TEST_EXPIRES_AT', new Date(Date.now() - 60_000).toISOString());
      return { token: 'test-only', generation: 1, instanceUrl: config.restOrigin, cacheKey: config.cacheKey };
    });

    await expect(contactPostForm(fixtureLead)).resolves.toMatchObject({ outcome: 'retry_later' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a partner ID absent from the verified sandbox Account lookup', async () => {
    vi.mocked(stateService.fetchAgentById).mockResolvedValueOnce(null);
    await expect(contactAgentPostForm(fixtureLead, `?state=colorado&id=${agentFixture}`)).resolves.toMatchObject({ outcome: 'retry_later' });
    expect(getVerifiedSalesforceSession).toHaveBeenCalledBefore(vi.mocked(stateService.fetchAgentById));
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['a production ID copied into the sandbox', '001Rg00000pmUUk'],
    ['an unknown sandbox Account ID', '001jg000000V70W'],
    ['the lender fixture in an agent form', lenderFixture],
    ['a malformed ID', agentFixture + 'X'],
    ['an unrecognized 18-character ID with the fixture prefix', agentFixture + 'AAX'],
  ])('rejects %s before any partner lookup or Web-to-Lead request', async (_label, partnerId) => {
    // The Account stub would return a record even for a copied production ID.
    await expect(contactAgentPostForm(fixtureLead, `?state=colorado&id=${partnerId}`)).resolves.toMatchObject({ outcome: 'not_sent' });
    expect(getVerifiedSalesforceSession).not.toHaveBeenCalled();
    expect(stateService.fetchAgentById).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects an agent fixture for the lender form', async () => {
    await expect(contactLenderPostForm(fixtureLead, `?state=colorado&id=${agentFixture}`)).resolves.toMatchObject({ outcome: 'not_sent' });
    expect(stateService.fetchAgentById).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a known partner fixture in a different org', async () => {
    const differentOrgId = '00D000000000019';
    vi.stubEnv('VPCS_SALESFORCE_ORG_ID', differentOrgId);
    vi.stubEnv('VPCS_SALESFORCE_METADATA_JSON', JSON.stringify({ ...mockManifest, orgId: differentOrgId }));
    await expect(contactAgentPostForm(fixtureLead, `?state=colorado&id=${agentFixture}`)).resolves.toMatchObject({ outcome: 'not_sent' });
    expect(stateService.fetchAgentById).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['agent', agentFixture, '00N4x00000Lsn28', contactAgentPostForm],
    ['lender', lenderFixture, '00N4x00000QPJUT', contactLenderPostForm],
  ] as const)('forwards only the verified %s Account selector and state to sandbox', async (role, partnerId, field, submit) => {
    await expect(submit(fixtureLead, `?state=colorado&id=${partnerId}&message=omit-this`))
      .resolves.toEqual(acceptedResult);

    expect(stateService.fetchAgentById).toHaveBeenCalledWith(partnerId, expect.any(AbortSignal));
    expect(fetch).toHaveBeenCalledTimes(1);
    const body = new URLSearchParams(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.get(mockManifest.fieldIds[field])).toBe(partnerId);
    const formUrl = body.get(mockManifest.fieldIds['00N4x00000QQ1LB']);
    expect(formUrl).toContain(`http://127.0.0.1:3131/contact-${role}?`);
    expect(formUrl).toContain(`id=${partnerId}`);
    expect(formUrl).not.toContain('omit-this');
  });

  it('reconciles an allowlisted sandbox attempt without repeating the POST or using website SMS', async () => {
    vi.stubEnv('VPCS_DELIVERY_MODE', 'allowlisted');
    const input = { ...fixtureLead, phone: '+12025552000', submission_attempt_id: acceptedResult.submissionId };

    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 500 }));
    vi.mocked(reconcileLeadAttempt).mockResolvedValueOnce(false);
    await expect(contactAgentPostForm(input, '?state=colorado')).resolves.toMatchObject({ outcome: 'unconfirmed' });
    expect(sendToSlack).not.toHaveBeenCalled();

    vi.mocked(inspectLeadAttempt).mockResolvedValueOnce({ exists: true, confirmed: false, declined: false });
    await expect(contactAgentPostForm(input, '?state=colorado')).resolves.toEqual(acceptedResult);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(action, expect.objectContaining({ method: 'POST' }));
    expect(sendToSlack).toHaveBeenCalledTimes(1);
  });
});
