import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordContactLenderLead, submitContactLenderLead } from '../actions';
import { contactLenderPostForm } from '@/services/salesForcePostFormsService';
import { logError } from '@/services/loggingService';
import { ContactLenderFormData } from '@/types';

vi.mock('@/services/salesForcePostFormsService', () => ({
  contactLenderPostForm: vi.fn(),
}));

vi.mock('@/services/loggingService', () => ({
  logError: vi.fn(),
}));

const payload: ContactLenderFormData = {
  firstName: 'QA',
  lastName: 'Lender',
  email: 'tech+lender@veteranpcs.com',
  phone: '8302795914',
  currentBase: 'QA Current Base',
  destinationBase: 'QA Destination',
  howDidYouHear: 'Other',
  tellusMore: 'QA test',
};

describe('recordContactLenderLead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the compatibility action as a no-op', async () => {
    await expect(recordContactLenderLead(payload)).resolves.toBeUndefined();
  });

  it('does not require an email because it emits no analytics', async () => {
    await expect(recordContactLenderLead({ ...payload, email: undefined })).resolves.toBeUndefined();
  });
});

describe('submitContactLenderLead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves a Salesforce redirect URL', async () => {
    vi.mocked(contactLenderPostForm).mockResolvedValueOnce({
      redirectUrl: 'https://www.veteranpcs.com/thank-you',
      submissionId: 'submission-test-id',
    });

    await expect(submitContactLenderLead(payload, '?id=001&state=colorado')).resolves.toEqual({
      success: true,
      redirectUrl: 'https://www.veteranpcs.com/thank-you',
    });
    expect(contactLenderPostForm).toHaveBeenCalledWith(payload, '?id=001&state=colorado');
  });

  it('normalizes message-only success to the thank-you route', async () => {
    vi.mocked(contactLenderPostForm).mockResolvedValueOnce({
      message: 'Form submitted successfully!',
      submissionId: 'submission-test-id',
    });

    await expect(submitContactLenderLead(payload, '?id=001&state=colorado')).resolves.toEqual({
      success: true,
      redirectUrl: '/thank-you',
    });
  });

  it('returns failure when the service throws', async () => {
    vi.mocked(contactLenderPostForm).mockRejectedValueOnce(new Error('Salesforce failed'));

    await expect(submitContactLenderLead(payload, '?id=001&state=colorado')).resolves.toEqual({
      success: false,
    });
    expect(logError).toHaveBeenCalledWith(
      'contact-lender action failed',
      undefined,
      expect.any(Error),
    );
  });
});
