import { beforeEach, describe, expect, it, vi } from 'vitest';
import sendToSlack from '@/actions/sendToSlack';
import { sendOpenPhoneMessage } from '@/actions/sendOpenPhoneMessage';
import { contactAgentPostForm } from '@/services/salesForcePostFormsService';
import { logError } from '@/services/loggingService';

vi.mock('@/actions/sendToSlack', () => ({
  default: vi.fn(async () => ({ ok: true })),
}));

vi.mock('@/actions/sendOpenPhoneMessage', () => ({
  sendOpenPhoneMessage: vi.fn(async () => ({ id: 'openphone-test-message' })),
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
  };
}

function mockSalesforceResponse(body: string, init?: ResponseInit) {
  vi.mocked(global.fetch).mockResolvedValueOnce(new Response(body, init));
}

describe('contactAgentPostForm Salesforce Web-to-Lead behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://www.veteranpcs.com';
    process.env.OPEN_PHONE_FROM_NUMBER = '+17194153014';
  });

  it('accepts a Salesforce redirect response and sends notifications once', async () => {
    mockSalesforceResponse(
      "<html><script>window.location('https://www.veteranpcs.com/thank-you')</script></html>",
      { status: 200 },
    );

    const result = await contactAgentPostForm(qaPayload(), queryString);

    expect(result).toEqual({ redirectUrl: 'https://www.veteranpcs.com/thank-you' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendOpenPhoneMessage).toHaveBeenCalledTimes(1);
  });

  it('accepts a Salesforce 200 without redirect and sends notifications once', async () => {
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    const result = await contactAgentPostForm(qaPayload(), queryString);

    expect(result).toEqual({ message: 'Form submitted successfully!' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(sendOpenPhoneMessage).toHaveBeenCalledTimes(1);
  });

  it('does not retry Salesforce when Slack returns a failed result after Salesforce accepts', async () => {
    vi.mocked(sendToSlack).mockResolvedValueOnce({ ok: false, error: 'invalid_webhook' });
    mockSalesforceResponse('<html><body>Thank you for your submission.</body></html>', {
      status: 200,
    });

    const result = await contactAgentPostForm(qaPayload(), queryString);

    expect(result).toEqual({ message: 'Form submitted successfully!' });
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
