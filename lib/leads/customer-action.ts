import { validateCustomerWebsiteForm } from '@/lib/validation/contactForms';
import { isLeadSubmitResult, LeadSubmissionError, type CustomerSubmitResult } from './submission-outcome';

/** Service dependency is injected so both customer actions share the same safe boundary. */
export async function submitCustomerWebsiteLead(
  formId: 'contact_agent' | 'contact_lender',
  raw: unknown,
  queryString: string,
  submit: (data: unknown, query: string) => Promise<CustomerSubmitResult>,
): Promise<CustomerSubmitResult> {
  let invoked = false;
  try {
    const validation = await validateCustomerWebsiteForm(raw, formId, queryString);
    if (!validation.ok) return { success: false, outcome: 'validation_error', fieldErrors: validation.fieldErrors };
    invoked = true;
    const result = await submit(validation.data, queryString);
    if (!isLeadSubmitResult(result)) return { success: false, outcome: 'unconfirmed' };
    return result.outcome === 'accepted' ? { ...result, redirectUrl: result.redirectUrl || '/thank-you' } : result;
  } catch (error) {
    if (error instanceof LeadSubmissionError) {
      return { success: false, outcome: error.outcome, submissionId: error.submissionId };
    }
    return { success: false, outcome: invoked ? 'unconfirmed' : 'not_sent' };
  }
}
