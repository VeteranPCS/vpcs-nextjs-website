import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import sendToSlack from '@/actions/sendToSlack';
import { sendOpenPhoneMessage } from '@/actions/sendOpenPhoneMessage';
import { routeSalesforceLeadOwner } from '@/services/salesforceLeadOwnerService';
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
import * as notificationPayloads from '@/lib/leads/notification-payloads';
import { contactAgentClientSchema, contactLenderClientSchema } from '@/lib/validation/contactForms';
import { LeadSubmissionError } from '@/lib/leads/submission-outcome';
import { submitCustomerWebsiteLead } from '@/lib/leads/customer-action';
import { getSalesforceConfig } from '@/lib/salesforce/server-config';
import { getVerifiedSalesforceSession } from '@/services/salesForceTokenService';
import { sendWebdevOpenPhoneMessage } from '@/lib/leads/webdev-openphone';
import mockManifest from '@/config/salesforce/mock.json';
import webdevFixtures from '@/config/salesforce/webdev-fixtures.json';
import { stubProductionEnv } from '@/lib/salesforce/__tests__/configuration-fixtures';

vi.mock('server-only', () => ({}));
vi.mock('@/services/salesForceTokenService', () => ({ getVerifiedSalesforceSession: vi.fn() }));
vi.mock('@/lib/leads/webdev-openphone', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/leads/webdev-openphone')>(),
  sendWebdevOpenPhoneMessage: vi.fn(async () => ({ accepted: true })),
}));

vi.mock('@/actions/sendToSlack', () => ({
  default: vi.fn(async () => ({ ok: true })),
}));

vi.mock('@/actions/sendOpenPhoneMessage', () => ({
  sendOpenPhoneMessage: vi.fn(async () => ({ id: 'openphone-test-message' })),
}));

vi.mock('@/services/salesforceLeadOwnerService', () => ({
  appendLeadOwnerSubmissionMarker: vi.fn((url: string, submissionId: string) => {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}sid=${encodeURIComponent(submissionId)}`;
  }),
  routeSalesforceLeadOwner: vi.fn(async () => ({
    leadId: '00QTEST',
    ownerId: '005TEST',
    ownerName: 'Test Owner',
    adminName: 'Test Admin',
  })),
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
  evaluateLeadSpam: vi.fn(async () => ({ quarantine: false, reasons: [] })),
  tagSpamSuspected: vi.fn((comments?: string) => `[SPAM-SUSPECTED] ${comments ?? ''}`.trim()),
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
  FormSubmissionStatus: {
    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
    UNCONFIRMED: 'UNCONFIRMED',
  },
  trackFormSubmission: vi.fn(async () => 'submission-test-id'),
  updateSubmissionStatus: vi.fn(async () => true),
}));

const queryString = '?form=agent&fn=Jason&id=0014x00000HWTqI&state=colorado';

beforeEach(() => {
  stubProductionEnv();
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

  it('posts the production contact form even when Salesforce OAuth is unavailable', async () => {
    vi.mocked(getVerifiedSalesforceSession).mockRejectedValue(new Error('Salesforce OAuth unavailable'));

    await expect(contactPostForm({ firstName: 'QA', lastName: 'Contact', email: 'qa@example.test' }))
      .resolves.toMatchObject({ success: true, submissionId: 'submission-test-id' });

    expect(getVerifiedSalesforceSession).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      'https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8',
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('oid=00D4x000003yaV2') }),
    );
  });

  describe.each([
    ['contact_agent', contactAgentClientSchema, contactAgentPostForm],
    ['contact_lender', contactLenderClientSchema, contactLenderPostForm],
  ] as const)('%s', (formId, schema, submit) => {
    it.each(['email', 'phone', 'both'])('accepts real client-normalized %s-only/both payloads', async (method) => {
      const data = await schema.validate({ ...qaPayload(), state: 'CO', email: method === 'phone' ? '' : 'qa@example.com', phone: method === 'email' ? '' : '(719) 555-0100' });
      if (method === 'email') expect(data.phone).toBeUndefined();
      const result = await submitCustomerWebsiteLead(formId, data, queryString, submit);
      expect(result).toMatchObject({ success: true, outcome: 'accepted', submissionId: 'submission-test-id' });
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(sendToSlack).toHaveBeenCalledTimes(1);
      expect(sendOpenPhoneMessage).toHaveBeenCalledTimes(1);
      expect(vi.mocked(sendOpenPhoneMessage).mock.calls[0]?.[0].content).not.toContain('undefined');
      expect(captureLeadConversionCreated).toHaveBeenCalledTimes(1);
      expect(updateSubmissionStatus).toHaveBeenCalledTimes(1);
      expect(updateSubmissionStatus).toHaveBeenCalledWith('submission-test-id', 'SUCCESS', expect.any(Response));
    });

    it('rejects invalid website input before every outbound effect', async () => {
      const result = await submitCustomerWebsiteLead(formId, { ...qaPayload(), firstName: '   ' }, queryString, submit);
      expect(result).toMatchObject({ outcome: 'validation_error', fieldErrors: { firstName: 'First name is required' } });
      for (const effect of [fetch, sendToSlack, sendOpenPhoneMessage, routeSalesforceLeadOwner, captureLeadConversionCreated]) expect(effect).not.toHaveBeenCalled();
    });
  });

  it('an SMS construction exception cannot suppress Slack or accepted capture', async () => {
    vi.spyOn(notificationPayloads, 'buildPartnerSmsContent').mockImplementationOnce(() => { throw new Error('private payload'); });
    await expect(contactAgentPostForm(qaPayload(), queryString)).resolves.toHaveProperty('submissionId');
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendOpenPhoneMessage).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).toHaveBeenCalledTimes(1);
    expect(captureServerAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({ properties: expect.objectContaining({ channel: 'OpenPhone', failure_stage: 'construction' }) }));
  });

  it('a Slack argument-construction exception cannot suppress partner SMS', async () => {
    vi.mocked(stateService.fetchAgentById).mockResolvedValueOnce({
      get Name() { throw new Error('private partner data'); }, PersonMobilePhone: '7195550100',
    } as never);
    await expect(contactAgentPostForm(qaPayload(), queryString)).resolves.toHaveProperty('submissionId');
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(sendOpenPhoneMessage).toHaveBeenCalledTimes(1);
    expect(captureLeadConversionCreated).toHaveBeenCalledTimes(1);
  });

  it.each(['status', 'analytics', 'routing'] as const)('%s failure after acceptance cannot reverse success or suppress notifications', async (stage) => {
    if (stage === 'status') vi.mocked(updateSubmissionStatus).mockRejectedValueOnce(new Error('unavailable'));
    if (stage === 'analytics') vi.mocked(captureLeadConversionCreated).mockRejectedValueOnce(new Error('construction or delivery'));
    if (stage === 'routing') vi.mocked(routeSalesforceLeadOwner).mockRejectedValueOnce(new Error('unavailable'));
    await expect(contactAgentPostForm(qaPayload(), queryString)).resolves.toHaveProperty('submissionId');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendOpenPhoneMessage).toHaveBeenCalledTimes(1);
    expect(captureLeadConversionCreated).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateSubmissionStatus).mock.calls.every((call) => call[1] === 'SUCCESS')).toBe(true);
  });

  it('network uncertainty makes one POST, clears its timer, and produces a typed failure', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network lost'));
    await expect(contactAgentPostForm(qaPayload(), queryString)).rejects.toMatchObject({ outcome: 'unconfirmed', submissionId: 'submission-test-id' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(updateSubmissionStatus).toHaveBeenCalledTimes(1);
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
  });

  it('pre-send failures are typed not_sent and never POST', async () => {
    await expect(contactAgentPostForm({ email: 'bad' }, '')).rejects.toBeInstanceOf(LeadSubmissionError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('SMS delivery and failure-telemetry failures cannot undo acceptance or suppress Slack', async () => {
    vi.mocked(sendOpenPhoneMessage).mockRejectedValueOnce(new Error('transport failed'));
    vi.mocked(captureServerAnalyticsEvent).mockRejectedValueOnce(new Error('analytics failed'));
    await expect(contactAgentPostForm(qaPayload(), queryString)).resolves.toHaveProperty('submissionId');
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(captureLeadConversionCreated).toHaveBeenCalledTimes(1);
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
      'submission-test-id',
    );

    expect(params.get('00NRg00000PjSD3MAN')).toBe('vpcs_test_visitor_1234567890');
    expect(params.get('00NRg00000PjSEfMAN')).toBe('submission-test-id');
  });

  it('accepts a Salesforce redirect response and sends notifications once', async () => {
    mockSalesforceResponse(
      "<html><script>window.location('https://www.veteranpcs.com/thank-you')</script></html>",
      { status: 200 },
    );

    const result = await contactAgentPostForm(qaPayload(), queryString);

    expect(result).toEqual({
      redirectUrl: 'https://www.veteranpcs.com/thank-you',
      submissionId: 'submission-test-id',
    });
    expect(salesforceBody().get('00N4x00000LspV2')).toBe('CO');
    expect(salesforceBody().get('00N4x00000QQ1LB')).toContain('sid=submission-test-id');
    expect(salesforceBody().get('00NRg00000PjSD3MAN')).toBe('vpcs_test_visitor_1234567890');
    expect(salesforceBody().get('00NRg00000PjSEfMAN')).toBe('submission-test-id');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(routeSalesforceLeadOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionId: 'submission-test-id',
        submissionStartedAt: expect.any(Date),
        leadSource: 'Contact Agent',
        destinationStateCode: 'CO',
        destinationStateSlug: 'colorado',
        email: 'tech+qa@veteranpcs.com',
        selectedAgentId: '0014x00000HWTqI',
        owner: expect.objectContaining({
          adminName: 'Beth',
          ownerId: '0054x000005GsUvAAK',
        }),
      }),
    );
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledWith(expect.objectContaining({ state: 'Colorado' }));
    expect(sendOpenPhoneMessage).toHaveBeenCalledTimes(1);
    expect(captureLeadConversionCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: 'contact_agent',
        leadSource: 'Contact Agent',
        submissionId: 'submission-test-id',
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

    expect(result).toEqual({
      message: 'Form submitted successfully!',
      submissionId: 'submission-test-id',
    });
    expect(salesforceBody().get('00N4x00000LspV2')).toBe('TX');
    expect(salesforceBody().get('00N4x00000Lpb0T')).toBe('QA Test Current Base');
    expect(salesforceBody().get('00N4x00000LspUs')).toBe('Austin QA Test');
    expect(sendToSlack).toHaveBeenCalledWith(expect.objectContaining({ state: 'Texas' }));
    expect(sendOpenPhoneMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Destination State: Texas'),
      }),
    );
  });

  it('lets a valid URL state win over submitted form state', async () => {
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    await contactAgentPostForm({ ...qaPayload(), state: 'TX' }, queryString);

    expect(salesforceBody().get('00N4x00000LspV2')).toBe('CO');
    expect(routeSalesforceLeadOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationStateCode: 'CO',
        destinationStateSlug: 'colorado',
        owner: expect.objectContaining({ adminName: 'Beth' }),
      }),
    );
    expect(sendToSlack).toHaveBeenCalledWith(expect.objectContaining({ state: 'Colorado' }));
  });

  it('rejects missing effective state before Salesforce and notifications', async () => {
    await expect(
      contactAgentPostForm(qaPayload(), '?form=agent&fn=Jason&id=0014x00000HWTqI'),
    ).rejects.toThrow('Failed to submit form');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(sendOpenPhoneMessage).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(
      'Invalid contactAgent state',
      expect.objectContaining({ submissionId: 'submission-test-id' }),
    );
  });

  it('submits lender state to Salesforce from the derived URL state', async () => {
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    const result = await contactLenderPostForm(
      lenderPayload(),
      '?form=lender&fn=Taylor&id=0014x00000Lender&state=texas',
    );

    expect(result).toEqual({
      message: 'Form submitted successfully!',
      submissionId: 'submission-test-id',
    });
    expect(salesforceBody().get('00N4x00000LspV2')).toBe('TX');
    expect(routeSalesforceLeadOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        leadSource: 'Contact Lender',
        destinationStateCode: 'TX',
        destinationStateSlug: 'texas',
        selectedLenderId: '0014x00000Lender',
        owner: expect.objectContaining({
          adminName: 'Tara',
          ownerId: '005Rg00000BAN0DIAX',
        }),
      }),
    );
    expect(sendToSlack).toHaveBeenCalledWith(expect.objectContaining({ state: 'Texas' }));
    expect(sendOpenPhoneMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Destination State: Texas'),
      }),
    );
  });

  it('accepts a Salesforce 200 without redirect and sends notifications once', async () => {
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    const result = await contactAgentPostForm(qaPayload(), queryString);

    expect(result).toEqual({
      message: 'Form submitted successfully!',
      submissionId: 'submission-test-id',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendOpenPhoneMessage).toHaveBeenCalledTimes(1);
  });

  it('keeps the visitor success path when post-Web-to-Lead owner routing fails', async () => {
    vi.mocked(routeSalesforceLeadOwner).mockRejectedValueOnce(new Error('ambiguous lead'));
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    const result = await contactAgentPostForm(qaPayload(), queryString);

    expect(result).toEqual({
      message: 'Form submitted successfully!',
      submissionId: 'submission-test-id',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendOpenPhoneMessage).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(
      'Salesforce Lead owner routing failed after Web-to-Lead acceptance',
      expect.objectContaining({
        submissionId: 'submission-test-id',
        leadSource: 'Contact Agent',
        destinationStateCode: 'CO',
        destinationStateSlug: 'colorado',
      }),
      expect.any(Error),
    );
    expect(captureServerAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'lead_owner_routing_failed',
        distinctId: 'submission-test-id',
        properties: expect.objectContaining({
          submission_id: 'submission-test-id',
          lead_source: 'Contact Agent',
          state_code: 'CO',
          state_slug: 'colorado',
        }),
      }),
    );
  });

  it('does not retry Salesforce when Slack returns a failed result after Salesforce accepts', async () => {
    vi.mocked(sendToSlack).mockResolvedValueOnce({ ok: false, failureStage: 'configuration' });
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    const result = await contactAgentPostForm(qaPayload(), queryString);

    expect(result).toEqual({
      message: 'Form submitted successfully!',
      submissionId: 'submission-test-id',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendOpenPhoneMessage).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(
      'Slack notification failed',
      expect.objectContaining({ submissionId: 'submission-test-id', stage: 'configuration' }),
      expect.any(Error),
    );
    expect(captureServerAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'lead_notification_failed',
        distinctId: 'submission-test-id',
        properties: expect.objectContaining({
          submission_id: 'submission-test-id',
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

    expect(result).toEqual({
      message: 'Form submitted successfully!',
      submissionId: 'submission-test-id',
    });
    expect(logError).toHaveBeenCalledWith(
      'Slack notification failed',
      expect.objectContaining({ submissionId: 'submission-test-id' }),
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

  it('rejects an explicit Salesforce error response without retrying or notifying', async () => {
    mockSalesforceResponse('<html><body>error occurred: required field missing</body></html>', {
      status: 200,
    });

    await expect(contactAgentPostForm(qaPayload(), queryString)).rejects.toThrow(
      'Failed to submit form',
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(sendOpenPhoneMessage).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
  });

  it('does not emit lead conversion telemetry for spam-quarantined leads', async () => {
    vi.mocked(evaluateLeadSpam).mockResolvedValueOnce({ quarantine: true, reasons: ['honeypot'] });
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    const result = await contactAgentPostForm(qaPayload(), queryString);

    expect(result).toEqual({
      message: 'Form submitted successfully!',
      submissionId: 'submission-test-id',
    });
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
    expect(sendOpenPhoneMessage).not.toHaveBeenCalled();
  });

  it('does not retry or notify on a Salesforce HTTP error', async () => {
    mockSalesforceResponse('server error', {
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(contactAgentPostForm(qaPayload(), queryString)).rejects.toThrow(
      'Failed to submit form',
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(sendOpenPhoneMessage).not.toHaveBeenCalled();
  });

  it('does not retry or notify on a network error', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('network down'));

    await expect(contactAgentPostForm(qaPayload(), queryString)).rejects.toThrow(
      'Failed to submit form',
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(sendOpenPhoneMessage).not.toHaveBeenCalled();
  });
});

/**
 * Characterization tests for the SEVEN Web-to-Lead functions that previously had ZERO
 * posted-body coverage. Each pins the FULL ordered [key, value] list of the URLSearchParams
 * body sent to Salesforce, byte-for-byte, so an upcoming refactor that unifies these
 * functions can be proven byte-identical. Insertion order is load-bearing.
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

  it('GetListedAgentsPostForm posts an exact ordered body with no attribution params', async () => {
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
    ]);

    expect(body.get('oid')).toBe('00D4x000003yaV2');
    expect(body.get('recordType')).toBe('0124x000000Z5yI');
    expect(body.get('lead_source')).toBe('Agent Listing Request');
    expect(body.has('retURL')).toBe(true);
    const keys = [...body.keys()];
    expect(keys.slice(-2)).toEqual(['g-recaptcha-response', 'captcha_settings']);
    expect(keys).not.toContain('00NRg00000PjSD3MAN');
    expect(keys).not.toContain('00NRg00000PjSEfMAN');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('GetListedLendersPostForm posts an exact ordered body with no attribution params', async () => {
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
    ]);

    expect(body.get('oid')).toBe('00D4x000003yaV2');
    expect(body.get('recordType')).toBe('0124x000000ZGGU');
    expect(body.get('lead_source')).toBe('Lender Listing Request');
    expect(body.has('retURL')).toBe(true);
    const keys = [...body.keys()];
    expect(keys.slice(-2)).toEqual(['g-recaptcha-response', 'captcha_settings']);
    expect(keys).not.toContain('00NRg00000PjSD3MAN');
    expect(keys).not.toContain('00NRg00000PjSEfMAN');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('KeepInTouchForm posts an exact ordered body ending with the two attribution field ids', async () => {
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
      ['00NRg00000PjSEfMAN', 'submission-test-id'],
    ]);

    expect(body.get('oid')).toBe('00D4x000003yaV2');
    expect(body.get('recordType')).toBe('0124x000000Z5yD');
    expect(body.get('lead_source')).toBe('Keep in Touch');
    expect(body.has('retURL')).toBe(true);
    const keys = [...body.keys()];
    expect(keys.slice(-4)).toEqual([
      'g-recaptcha-response',
      'captcha_settings',
      '00NRg00000PjSD3MAN',
      '00NRg00000PjSEfMAN',
    ]);
    expect(body.get('00NRg00000PjSD3MAN')).toBe('vpcs_test_visitor_1234567890');
    expect(body.get('00NRg00000PjSEfMAN')).toBe('submission-test-id');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('contactPostForm posts an exact ordered body ending with the two attribution field ids', async () => {
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
      ['00NRg00000PjSEfMAN', 'submission-test-id'],
    ]);

    expect(body.get('oid')).toBe('00D4x000003yaV2');
    expect(body.get('recordType')).toBe('0124x000000Z5yD');
    expect(body.get('lead_source')).toBe('Contact Form');
    expect(body.has('retURL')).toBe(true);
    const keys = [...body.keys()];
    expect(keys.slice(-4)).toEqual([
      'g-recaptcha-response',
      'captcha_settings',
      '00NRg00000PjSD3MAN',
      '00NRg00000PjSEfMAN',
    ]);
    expect(body.get('00NRg00000PjSD3MAN')).toBe('vpcs_test_visitor_1234567890');
    expect(body.get('00NRg00000PjSEfMAN')).toBe('submission-test-id');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('vaLoanGuideForm posts an exact ordered body ending with the two attribution field ids', async () => {
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
      ['00NRg00000PjSEfMAN', 'submission-test-id'],
    ]);

    expect(body.get('oid')).toBe('00D4x000003yaV2');
    expect(body.get('recordType')).toBe('0124x000000Z5yD');
    expect(body.get('lead_source')).toBe('VA Loan Guide');
    expect(body.has('retURL')).toBe(true);
    const keys = [...body.keys()];
    expect(keys.slice(-4)).toEqual([
      'g-recaptcha-response',
      'captcha_settings',
      '00NRg00000PjSD3MAN',
      '00NRg00000PjSEfMAN',
    ]);
    expect(body.get('00NRg00000PjSD3MAN')).toBe('vpcs_test_visitor_1234567890');
    expect(body.get('00NRg00000PjSEfMAN')).toBe('submission-test-id');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('homebuyerGuideForm posts an exact ordered body ending with the two attribution field ids', async () => {
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
      ['00NRg00000PjSEfMAN', 'submission-test-id'],
    ]);

    expect(body.get('oid')).toBe('00D4x000003yaV2');
    expect(body.get('recordType')).toBe('0124x000000Z5yD');
    expect(body.get('lead_source')).toBe('First Time Home Buyer Guide');
    expect(body.has('retURL')).toBe(true);
    const keys = [...body.keys()];
    expect(keys.slice(-4)).toEqual([
      'g-recaptcha-response',
      'captcha_settings',
      '00NRg00000PjSD3MAN',
      '00NRg00000PjSEfMAN',
    ]);
    expect(body.get('00NRg00000PjSD3MAN')).toBe('vpcs_test_visitor_1234567890');
    expect(body.get('00NRg00000PjSEfMAN')).toBe('submission-test-id');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('internshipFormSubmission posts an exact ordered body (recordType before retURL) with no attribution params', async () => {
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
    ]);

    expect(body.get('oid')).toBe('00D4x000003yaV2');
    expect(body.get('recordType')).toBe('0124x000000ZGKv');
    expect(body.get('lead_source')).toBe('Internship Application');
    expect(body.has('retURL')).toBe(true);
    const keys = [...body.keys()];
    expect(keys.slice(-2)).toEqual(['g-recaptcha-response', 'captcha_settings']);
    expect(keys).not.toContain('00NRg00000PjSD3MAN');
    expect(keys).not.toContain('00NRg00000PjSEfMAN');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

/**
 * Observable-contract characterization for the seven simpler forms (everything the
 * committed body-only tests above do NOT pin): return shape to the caller, the exact
 * Slack payload, the success `updateSubmissionStatus` call, whether lead-conversion
 * analytics fire, and that OpenPhone SMS never fires for a non-agent/lender form.
 * Together with the byte-exact body tests above and the contactAgent/contactLender
 * behavioral suite, this freezes contract axes (b)-(f) for all nine forms before the
 * `submitWebToLead` consolidation, so the refactor can be proven behavior-preserving.
 *
 * One axis is deliberately NOT frozen here: the notification-failure *handling* idiom.
 * The consolidation's single sanctioned delta is to fold contactAgent's
 * Promise.allSettled + Slack `ok` inspection into the shared path so a failed Slack
 * post is logged instead of silently discarded. These tests keep Slack on its default
 * ok:true mock, so they pin dispatch + payload (which stay identical) without pinning
 * the pre-refactor `.catch()` mechanism (which is allowed to change).
 */
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

  it('GetListedAgentsPostForm: {message} return, exact Slack payload, no OpenPhone, no capture', async () => {
    accept200();
    const result = await GetListedAgentsPostForm({
      firstName: 'Test', lastName: 'Agent', email: 'agent@example.com', phone: '8035550100',
      // The get-listed Slack message is sourced from `tellusMore` (the form's free-text field),
      // NOT `additionalComments`. Sending a distinct value in each pins that routing.
      tellusMore: 'I have served military families for 10 years.',
      additionalComments: 'internal note that must not reach Slack',
    });

    expect(result).toEqual({ message: 'Form submitted successfully!' });
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledWith({
      headerText: '🔔 New Agent Listing Request',
      name: 'Test Agent',
      email: 'agent@example.com',
      phoneNumber: '8035550100',
      message: 'I have served military families for 10 years.',
    });
    expect(sendOpenPhoneMessage).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
    expect(updateSubmissionStatus).toHaveBeenCalledWith('submission-test-id', 'SUCCESS', expect.anything());
  });

  it('GetListedLendersPostForm: {message} return, exact Slack payload, no OpenPhone, no capture', async () => {
    accept200();
    const result = await GetListedLendersPostForm({
      firstName: 'Test', lastName: 'Lender', email: 'lender@example.com', phone: '8035550100',
      // The get-listed Slack message is sourced from `tellusMore` (the form's free-text field),
      // NOT `additionalComments`. Sending a distinct value in each pins that routing.
      tellusMore: 'VA-focused lender, 500+ closed loans.',
      additionalComments: 'internal note that must not reach Slack',
    });

    expect(result).toEqual({ message: 'Form submitted successfully!' });
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledWith({
      headerText: '🔔 New Lender Listing Request',
      name: 'Test Lender',
      email: 'lender@example.com',
      phoneNumber: '8035550100',
      message: 'VA-focused lender, 500+ closed loans.',
    });
    expect(sendOpenPhoneMessage).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
    expect(updateSubmissionStatus).toHaveBeenCalledWith('submission-test-id', 'SUCCESS', expect.anything());
  });

  it('internshipFormSubmission: {message} return, empty Slack message, no OpenPhone, no capture', async () => {
    accept200();
    const result = await internshipFormSubmission({
      first_name: 'Test', last_name: 'Intern', email: 'intern@example.com', mobile: '8035550100',
    });

    expect(result).toEqual({ message: 'Form submitted successfully!' });
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledWith({
      headerText: '🔔 New Internship Submission',
      name: 'Test Intern',
      email: 'intern@example.com',
      phoneNumber: '8035550100',
      message: '',
    });
    expect(sendOpenPhoneMessage).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
    expect(updateSubmissionStatus).toHaveBeenCalledWith('submission-test-id', 'SUCCESS', expect.anything());
  });

  it('KeepInTouchForm: {success,message,submissionId} return, Slack payload, capture keep_in_touch', async () => {
    accept200();
    const result = await KeepInTouchForm({
      firstName: 'Test', lastName: 'Keep', email: 'keep@example.com', phone: '8035550100',
    });

    expect(result).toEqual({
      success: true, message: 'Form submitted successfully!', submissionId: 'submission-test-id',
    });
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledWith({
      headerText: '🔔 New Keep In Touch Submission',
      name: 'Test Keep',
      email: 'keep@example.com',
      phoneNumber: '8035550100',
      message: '',
    });
    expect(sendOpenPhoneMessage).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: 'keep_in_touch',
        leadSource: 'Keep in Touch',
        submissionId: 'submission-test-id',
      }),
    );
    expect(updateSubmissionStatus).toHaveBeenCalledWith('submission-test-id', 'SUCCESS', expect.anything());
  });

  it('contactPostForm: {success,...} return, Slack message carries the comment, capture contact_form', async () => {
    accept200();
    const result = await contactPostForm({
      firstName: 'Test', lastName: 'Contact', email: 'contact@example.com', phone: '8035550100',
      additionalComments: 'A contact message',
    });

    expect(result).toEqual({
      success: true, message: 'Form submitted successfully!', submissionId: 'submission-test-id',
    });
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledWith({
      headerText: '🔔 New Contact Form Submission',
      name: 'Test Contact',
      email: 'contact@example.com',
      phoneNumber: '8035550100',
      message: 'A contact message',
    });
    expect(sendOpenPhoneMessage).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: 'contact_form',
        leadSource: 'Contact Form',
        submissionId: 'submission-test-id',
      }),
    );
    expect(updateSubmissionStatus).toHaveBeenCalledWith('submission-test-id', 'SUCCESS', expect.anything());
  });

  it('vaLoanGuideForm: {success,...} return, Slack payload, capture with guideId', async () => {
    accept200();
    const result = await vaLoanGuideForm({
      firstName: 'Test', lastName: 'Va', email: 'va@example.com', phone: '8035550100',
    });

    expect(result).toEqual({
      success: true, message: 'Form submitted successfully!', submissionId: 'submission-test-id',
    });
    expect(sendToSlack).toHaveBeenCalledWith({
      headerText: '🔔 New VA Loan Guide Download',
      name: 'Test Va',
      email: 'va@example.com',
      phoneNumber: '8035550100',
      message: '',
    });
    expect(sendOpenPhoneMessage).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: 'va_loan_guide',
        leadSource: 'VA Loan Guide',
        submissionId: 'submission-test-id',
        guideId: 'va_loan_guide',
      }),
    );
    expect(updateSubmissionStatus).toHaveBeenCalledWith('submission-test-id', 'SUCCESS', expect.anything());
  });

  it('homebuyerGuideForm: {success,...} return, Slack payload, capture with guideId', async () => {
    accept200();
    const result = await homebuyerGuideForm({
      firstName: 'Test', lastName: 'Home', email: 'home@example.com', phone: '8035550100',
    });

    expect(result).toEqual({
      success: true, message: 'Form submitted successfully!', submissionId: 'submission-test-id',
    });
    expect(sendToSlack).toHaveBeenCalledWith({
      headerText: '🔔 New First Time Home Buyer Guide Download',
      name: 'Test Home',
      email: 'home@example.com',
      phoneNumber: '8035550100',
      message: '',
    });
    expect(sendOpenPhoneMessage).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: 'first_time_homebuyer_guide',
        leadSource: 'First Time Home Buyer Guide',
        submissionId: 'submission-test-id',
        guideId: 'first_time_homebuyer_guide',
      }),
    );
    expect(updateSubmissionStatus).toHaveBeenCalledWith('submission-test-id', 'SUCCESS', expect.anything());
  });

  it('spam-quarantined contactPostForm: tags the comment, still returns success, suppresses capture', async () => {
    vi.mocked(evaluateLeadSpam).mockResolvedValueOnce({ quarantine: true, reasons: ['honeypot'] });
    accept200();

    const result = await contactPostForm({
      firstName: 'Test', lastName: 'Contact', email: 'contact@example.com', phone: '8035550100',
      additionalComments: 'A contact message',
    });

    expect(result).toEqual({
      success: true, message: 'Form submitted successfully!', submissionId: 'submission-test-id',
    });
    // Free-text field is tagged in the posted body and echoed into the Slack message.
    expect(salesforceBody().get('00N4x00000bfgFA')).toBe('[SPAM-SUSPECTED] A contact message');
    expect(sendToSlack).toHaveBeenCalledWith(
      expect.objectContaining({
        headerText: '⚠️ SPAM-SUSPECTED — 🔔 New Contact Form Submission',
        message: '[SPAM-SUSPECTED] A contact message',
      }),
    );
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
  });

  it('spam-quarantined GetListedAgentsPostForm: tags tellusMore in the body, still submits', async () => {
    vi.mocked(evaluateLeadSpam).mockResolvedValueOnce({ quarantine: true, reasons: ['honeypot'] });
    accept200();

    const result = await GetListedAgentsPostForm({
      firstName: 'Test', lastName: 'Agent', email: 'agent@example.com', phone: '8035550100',
      tellusMore: 'More info here',
    });

    expect(result).toEqual({ message: 'Form submitted successfully!' });
    expect(salesforceBody().get('00N4x00000QPS7V')).toBe('[SPAM-SUSPECTED] More info here');
    expect(sendToSlack).toHaveBeenCalledWith(
      expect.objectContaining({
        headerText: '⚠️ SPAM-SUSPECTED — 🔔 New Agent Listing Request',
      }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('contactPostForm on a Salesforce HTTP error: throws, no Slack, marks UNCONFIRMED', async () => {
    mockSalesforceResponse('server error', { status: 500, statusText: 'Internal Server Error' });

    await expect(
      contactPostForm({
        firstName: 'Test', lastName: 'Contact', email: 'contact@example.com', phone: '8035550100',
        additionalComments: 'A contact message',
      }),
    ).rejects.toThrow('Failed to submit form');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
    expect(
      vi.mocked(updateSubmissionStatus).mock.calls.some((call) => call[1] === 'UNCONFIRMED'),
    ).toBe(true);
  });
});

/**
 * LEAD_DRY_RUN: the lead-submit path is non-idempotent and fires real outbound side
 * effects (Salesforce Web-to-Lead POST, Slack webhook, partner OpenPhone SMS, lead-owner
 * routing, PostHog conversion capture), so it cannot be exercised end to end without
 * creating a real Lead, texting a real person, and recording a false conversion. These
 * tests pin the flag's three contracts: it suppresses every sink and marks the result in
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

  it('suppresses the Salesforce POST, Slack, OpenPhone, owner routing and PostHog, and marks the result', async () => {
    selectLocalDryRun();

    const result = await contactAgentPostForm(qaPayload(), queryString);

    expect(result).toEqual({
      message: 'Form submitted successfully!',
      submissionId: 'submission-test-id',
      dryRun: true,
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(sendOpenPhoneMessage).not.toHaveBeenCalled();
    expect(routeSalesforceLeadOwner).not.toHaveBeenCalled();
    // PostHog is the primary funnel source, so a dry run must not record a false conversion.
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
    expect(captureServerAnalyticsEvent).not.toHaveBeenCalled();
    expect(
      consoleLogSpy.mock.calls.some(
        (call) => call[0] === '[LEAD_DRY_RUN] Skipping lead_conversion_created PostHog capture',
      ),
    ).toBe(true);
    // The submission is still tracked as accepted so the caller exercises the success path.
    expect(updateSubmissionStatus).toHaveBeenCalledWith('submission-test-id', 'SUCCESS', undefined);
  });

  it('logs only Web-to-Lead and notification metadata', async () => {
    selectLocalDryRun();

    await contactAgentPostForm(qaPayload(), queryString);

    const postLog = consoleLogSpy.mock.calls.find(
      (call) => call[0] === '[LEAD_DRY_RUN] Skipping Salesforce Web-to-Lead POST',
    );
    expect(postLog?.[1]).toEqual({ submissionId: 'submission-test-id', fieldCount: expect.any(Number) });

    const notifyLog = consoleLogSpy.mock.calls.find(
      (call) => call[0] === '[LEAD_DRY_RUN] Skipping lead notifications',
    );
    expect(notifyLog?.[1]).toEqual({ submissionId: 'submission-test-id', channelCount: 2 });
  });

  it('marks the dry run on a simpler form without disturbing its success shape', async () => {
    selectLocalDryRun();

    const result = await KeepInTouchForm({
      firstName: 'Test', lastName: 'Touch', email: 'touch@example.com', phone: '8035550100',
    });

    expect(result).toEqual({
      success: true,
      message: 'Form submitted successfully!',
      submissionId: 'submission-test-id',
      dryRun: true,
    });
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

    expect(result).toEqual({
      success: true, message: 'Form submitted successfully!', submissionId: 'submission-test-id',
    });
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

    expect(result).toEqual({
      success: true, message: 'Form submitted successfully!', submissionId: 'submission-test-id',
    });
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
      await expect(submit()).rejects.toMatchObject({ outcome: 'not_sent', submissionId: 'submission-test-id' });
      expect(fetch).not.toHaveBeenCalled();
      expect(evaluateLeadSpam).not.toHaveBeenCalled();
      expect(stateService.fetchAgentById).not.toHaveBeenCalled();
      expect(routeSalesforceLeadOwner).not.toHaveBeenCalled();
      expect(sendToSlack).not.toHaveBeenCalled();
      expect(sendOpenPhoneMessage).not.toHaveBeenCalled();
      expect(captureLeadConversionCreated).not.toHaveBeenCalled();
      expect(captureServerAnalyticsEvent).not.toHaveBeenCalled();
      expect(updateSubmissionStatus).toHaveBeenCalledWith('submission-test-id', 'FAILURE', null, expect.objectContaining({ message: 'Lead submissions are disabled in non-production Vercel environments' }));
    });
  });

  it('retains real production behavior with mocked sinks', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LEAD_DRY_RUN', '1');
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }));
    await expect(contactAgentPostForm(qaPayload(), queryString)).resolves.toMatchObject({ message: 'Form submitted successfully!', submissionId: 'submission-test-id' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(routeSalesforceLeadOwner).toHaveBeenCalledTimes(1);
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
    await expect(submit()).resolves.toMatchObject({ message: 'Form submitted successfully!' });

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
    for (const key of customFieldKeys) expect(Object.values(mockManifest.fieldIds)).toContain(key);
    expect(params.get('description')).toContain('offline-test submission-test-id');
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
    expect(captureServerAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('uses capture on a protected preview only when the branch attestation is present', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'codex/salesforce-workflow-test');
    vi.stubEnv('VERCEL_URL', 'protected-workflow-preview.vercel.app');
    await expect(contactPostForm(fixtureLead)).rejects.toMatchObject({ outcome: 'not_sent' });
    expect(fetch).not.toHaveBeenCalled();

    vi.stubEnv('VPCS_SANDBOX_PREVIEW_PROTECTED', '1');
    await expect(contactPostForm(fixtureLead)).resolves.toMatchObject({ success: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    const params = new URLSearchParams(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(params.get('retURL')).toBe('https://protected-workflow-preview.vercel.app/thank-you');
  });

  it('discards an unexpected sandbox provider redirect instead of redirecting to production', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(`<script>window.location.replace('https://www.veteranpcs.com/thank-you')</script>`));

    await expect(contactAgentPostForm(fixtureLead, '?state=colorado')).resolves.toEqual({
      message: 'Form submitted successfully!', submissionId: 'submission-test-id',
    });
  });

  it('keeps local production builds offline when mock is selected', async () => {
    vi.stubEnv('VPCS_SALESFORCE_PROFILE', 'mock');
    await expect(contactPostForm(fixtureLead)).resolves.toMatchObject({ success: true, dryRun: true });
    for (const effect of [getVerifiedSalesforceSession, fetch, sendToSlack, sendOpenPhoneMessage, routeSalesforceLeadOwner, captureLeadConversionCreated]) {
      expect(effect).not.toHaveBeenCalled();
    }
  });

  it.each([
    ['an unmarked name', { firstName: 'Sample' }],
    ['an unlisted email', { email: 'other@example.test' }],
    ['an unlisted mobile', { phone: '+12025552001' }],
  ])('rejects %s before org verification or posting', async (_label, changedInput) => {
    await expect(contactAgentPostForm({ ...fixtureLead, ...changedInput }, '?state=colorado')).rejects.toMatchObject({ outcome: 'not_sent' });
    expect(getVerifiedSalesforceSession).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(sendToSlack).not.toHaveBeenCalled();
  });

  it.each([
    ['VPCS_WEBDEV_ISOLATION_ATTESTED', '0'],
    ['VPCS_WEBDEV_TEST_RUN_ID', ''],
    ['VPCS_WEBDEV_TEST_EXPIRES_AT', '2026-01-01T00:00:00Z'],
    ['VPCS_DELIVERY_MODE', 'allowlisted'],
  ])('rejects a write for unsafe %s', async (setting, value) => {
    vi.stubEnv(setting, value);
    await expect(contactPostForm(fixtureLead)).rejects.toMatchObject({ outcome: 'not_sent' });
    expect(getVerifiedSalesforceSession).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports verification failure as not sent and never calls the Web-to-Lead action', async () => {
    vi.mocked(getVerifiedSalesforceSession).mockRejectedValueOnce(new Error('Organization mismatch'));
    await expect(contactPostForm(fixtureLead)).rejects.toMatchObject({ outcome: 'not_sent' });
    expect(fetch).not.toHaveBeenCalled();
    expect(updateSubmissionStatus).toHaveBeenCalledWith('submission-test-id', 'FAILURE', null, expect.any(Error));
  });

  it('requires the test window to stay open through org verification', async () => {
    vi.mocked(getVerifiedSalesforceSession).mockImplementationOnce(async () => {
      const config = getSalesforceConfig();
      vi.stubEnv('VPCS_WEBDEV_TEST_EXPIRES_AT', new Date(Date.now() - 60_000).toISOString());
      return { token: 'test-only', generation: 1, instanceUrl: config.restOrigin, cacheKey: config.cacheKey };
    });

    await expect(contactPostForm(fixtureLead)).rejects.toMatchObject({ outcome: 'not_sent' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a partner ID absent from the verified sandbox Account lookup', async () => {
    vi.mocked(stateService.fetchAgentById).mockResolvedValueOnce(null);
    await expect(contactAgentPostForm(fixtureLead, `?state=colorado&id=${agentFixture}`)).rejects.toMatchObject({ outcome: 'not_sent' });
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
    await expect(contactAgentPostForm(fixtureLead, `?state=colorado&id=${partnerId}`)).rejects.toMatchObject({ outcome: 'not_sent' });
    expect(getVerifiedSalesforceSession).not.toHaveBeenCalled();
    expect(stateService.fetchAgentById).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects an agent fixture for the lender form', async () => {
    await expect(contactLenderPostForm(fixtureLead, `?state=colorado&id=${agentFixture}`)).rejects.toMatchObject({ outcome: 'not_sent' });
    expect(stateService.fetchAgentById).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a known partner fixture in a different org', async () => {
    const differentOrgId = '00D000000000019';
    vi.stubEnv('VPCS_SALESFORCE_ORG_ID', differentOrgId);
    vi.stubEnv('VPCS_SALESFORCE_METADATA_JSON', JSON.stringify({ ...mockManifest, orgId: differentOrgId }));
    await expect(contactAgentPostForm(fixtureLead, `?state=colorado&id=${agentFixture}`)).rejects.toMatchObject({ outcome: 'not_sent' });
    expect(stateService.fetchAgentById).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['agent', agentFixture, '00N4x00000Lsn28', contactAgentPostForm],
    ['lender', lenderFixture, '00N4x00000QPJUT', contactLenderPostForm],
  ] as const)('forwards only the verified %s Account selector and state to sandbox', async (role, partnerId, field, submit) => {
    await expect(submit(fixtureLead, `?state=colorado&id=${partnerId}&message=omit-this`))
      .resolves.toMatchObject({ message: 'Form submitted successfully!' });

    expect(stateService.fetchAgentById).toHaveBeenCalledWith(partnerId);
    expect(fetch).toHaveBeenCalledTimes(1);
    const body = new URLSearchParams(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.get(mockManifest.fieldIds[field])).toBe(partnerId);
    const formUrl = body.get(mockManifest.fieldIds['00N4x00000QQ1LB']);
    expect(formUrl).toContain(`http://127.0.0.1:3131/contact-${role}?`);
    expect(formUrl).toContain(`id=${partnerId}`);
    expect(formUrl).not.toContain('omit-this');
  });

  it('uses the dedicated SMS transport only after Salesforce accepts an allowlisted submission', async () => {
    vi.stubEnv('VPCS_DELIVERY_MODE', 'allowlisted');
    vi.stubEnv('VPCS_WEBDEV_OPENPHONE_API_KEY', 'test-only-quo');
    vi.stubEnv('VPCS_WEBDEV_OPENPHONE_FROM_NUMBER', '+12025552001');
    vi.stubEnv('VPCS_WEBDEV_OPENPHONE_TO_NUMBER', '+12025552000');
    vi.stubEnv('VPCS_WEBDEV_OPENPHONE_MAX_SENDS', '1');
    vi.stubEnv('VPCS_WEBDEV_UPSTASH_REDIS_REST_URL', 'https://isolated-budget.upstash.io');
    vi.stubEnv('VPCS_WEBDEV_UPSTASH_REDIS_REST_TOKEN', 'test-only-budget');
    const input = { ...fixtureLead, phone: '+12025552000' };

    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 500 }));
    await expect(contactAgentPostForm(input, '?state=colorado')).rejects.toMatchObject({ outcome: 'unconfirmed' });
    expect(sendWebdevOpenPhoneMessage).not.toHaveBeenCalled();
    await expect(contactAgentPostForm(input, '?state=colorado')).resolves.toMatchObject({ submissionId: 'submission-test-id' });
    expect(sendWebdevOpenPhoneMessage).toHaveBeenCalledWith(expect.objectContaining({ runId: 'offline-test', submissionId: 'submission-test-id' }));
    expect(sendOpenPhoneMessage).not.toHaveBeenCalled();
  });
});
