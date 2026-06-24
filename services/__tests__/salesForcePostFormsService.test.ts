import { beforeEach, describe, expect, it, vi } from 'vitest';
import sendToSlack from '@/actions/sendToSlack';
import { sendOpenPhoneMessage } from '@/actions/sendOpenPhoneMessage';
import { routeSalesforceLeadOwner } from '@/services/salesforceLeadOwnerService';
import {
  contactAgentPostForm,
  contactLenderPostForm,
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
