import { beforeEach, describe, expect, it, vi } from 'vitest';
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
} from '@/services/salesForcePostFormsService';
import {
  buildAgentLeadParams,
  buildLenderLeadParams,
} from '@/services/salesforceLeadParams';
import { logError } from '@/services/loggingService';
import { captureLeadConversionCreated } from '@/lib/analytics/server';
import { evaluateLeadSpam } from '@/lib/spam-protection';

vi.mock('server-only', () => ({}));

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
  },
  trackFormSubmission: vi.fn(async () => 'submission-test-id'),
  updateSubmissionStatus: vi.fn(async () => true),
}));

const queryString = '?form=agent&fn=Jason&id=0014x00000HWTqI&state=colorado';

function qaPayload() {
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
  };
}

function lenderPayload() {
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
  };
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
  });

  it('does not retry Salesforce when Slack returns a failed result after Salesforce accepts', async () => {
    vi.mocked(sendToSlack).mockResolvedValueOnce({ ok: false, error: 'invalid_webhook' });
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
      expect.objectContaining({ submissionId: 'submission-test-id', error: 'invalid_webhook' }),
      expect.any(Error),
    );
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
