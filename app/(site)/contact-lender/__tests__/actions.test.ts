import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordContactLenderLead } from '../actions';
import { captureServerEvent } from '@/lib/posthog-server';
import { ContactLenderFormData } from '@/types';

vi.mock('@/lib/posthog-server', () => ({
  captureServerEvent: vi.fn(),
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

  it('captures the server lead event keyed to the lead email', async () => {
    await recordContactLenderLead(payload);

    expect(captureServerEvent).toHaveBeenCalledWith({
      distinctId: payload.email,
      event: 'contact_lender_lead_created',
      properties: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
      },
    });
  });

  it('skips capture when there is no email to key the person on', async () => {
    await recordContactLenderLead({ ...payload, email: undefined });

    expect(captureServerEvent).not.toHaveBeenCalled();
  });
});
