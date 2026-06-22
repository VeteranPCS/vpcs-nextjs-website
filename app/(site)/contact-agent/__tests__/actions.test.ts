import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitContactAgentLead } from '../actions';
import { contactAgentPostForm } from '@/services/salesForcePostFormsService';
import { logError } from '@/services/loggingService';
import { captureServerEvent } from '@/lib/posthog-server';
import { ContactAgentFormData } from '@/types';

vi.mock('@/services/salesForcePostFormsService', () => ({
  contactAgentPostForm: vi.fn(),
}));

vi.mock('@/services/loggingService', () => ({
  logError: vi.fn(),
}));

vi.mock('@/lib/posthog-server', () => ({
  captureServerEvent: vi.fn(),
}));

const payload: ContactAgentFormData = {
  firstName: 'QA',
  lastName: 'PR88 Fix',
  email: 'tech+qa@veteranpcs.com',
  phone: '8302795914',
  currentBase: 'QA Test Current Base',
  destinationBase: 'Colorado Springs QA Test',
  howDidYouHear: 'Other',
  tellusMore: 'QA test',
};

describe('submitContactAgentLead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves a Salesforce redirect URL', async () => {
    vi.mocked(contactAgentPostForm).mockResolvedValueOnce({
      redirectUrl: 'https://www.veteranpcs.com/thank-you',
    });

    await expect(submitContactAgentLead(payload, '?id=001&state=colorado')).resolves.toEqual({
      success: true,
      redirectUrl: 'https://www.veteranpcs.com/thank-you',
    });
  });

  it('normalizes message-only success to the thank-you route', async () => {
    vi.mocked(contactAgentPostForm).mockResolvedValueOnce({
      message: 'Form submitted successfully!',
    });

    await expect(submitContactAgentLead(payload, '?id=001&state=colorado')).resolves.toEqual({
      success: true,
      redirectUrl: '/thank-you',
    });
  });

  it('captures the server lead event keyed to the lead email on success', async () => {
    vi.mocked(contactAgentPostForm).mockResolvedValueOnce({
      redirectUrl: 'https://www.veteranpcs.com/thank-you',
    });

    await submitContactAgentLead(payload, '?id=001&state=colorado');

    expect(captureServerEvent).toHaveBeenCalledWith({
      distinctId: payload.email,
      event: 'contact_agent_lead_created',
      properties: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
      },
    });
  });

  it('returns failure when the service throws', async () => {
    vi.mocked(contactAgentPostForm).mockRejectedValueOnce(new Error('Salesforce failed'));

    await expect(submitContactAgentLead(payload, '?id=001&state=colorado')).resolves.toEqual({
      success: false,
    });
    expect(logError).toHaveBeenCalledWith(
      'contact-agent action failed',
      undefined,
      expect.any(Error),
    );
    expect(captureServerEvent).not.toHaveBeenCalled();
  });
});
