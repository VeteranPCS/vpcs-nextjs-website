import { describe, expect, it, vi } from 'vitest';
import { submitCustomerWebsiteLead } from '../customer-action';
import { LeadSubmissionError } from '../submission-outcome';

const payload = { firstName: 'QA', lastName: 'Test', email: 'qa@example.com', currentBase: 'Denver', destinationBase: 'Boulder', state: 'CO' };
describe.each(['contact_agent', 'contact_lender'] as const)('%s action outcome boundary', (formId) => {
  it.each(['not_sent', 'unconfirmed'] as const)('preserves typed %s with its diagnostic reference', async (outcome) => {
    const submit = vi.fn().mockRejectedValue(new LeadSubmissionError(outcome, 'test-reference'));
    expect(await submitCustomerWebsiteLead(formId, payload, '', submit)).toEqual({ success: false, outcome, submissionId: 'test-reference' });
    expect(submit).toHaveBeenCalledTimes(1);
  });
  it('treats unknown failures and missing success responses as uncertain', async () => {
    const submit = vi.fn().mockRejectedValueOnce(new Error('private provider response')).mockResolvedValueOnce({});
    for (let i = 0; i < 2; i++) expect(await submitCustomerWebsiteLead(formId, payload, '', submit)).toMatchObject({ success: false, outcome: 'unconfirmed' });
  });
  it('preserves effective query-state precedence without relaxing direct-entry validation', async () => {
    const submit = vi.fn().mockResolvedValue({ message: 'Accepted', submissionId: 'ref' });
    await submitCustomerWebsiteLead(formId, { ...payload, state: 'TX' }, '?state=colorado', submit);
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ state: 'CO' }), '?state=colorado');
    submit.mockClear();
    expect(await submitCustomerWebsiteLead(formId, { ...payload, state: '' }, '', submit)).toMatchObject({ outcome: 'validation_error', fieldErrors: { state: 'State is required' } });
    expect(submit).not.toHaveBeenCalled();
  });
});
