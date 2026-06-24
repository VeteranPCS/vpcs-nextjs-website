import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordContactLenderLead } from '../actions';
import { ContactLenderFormData } from '@/types';

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
