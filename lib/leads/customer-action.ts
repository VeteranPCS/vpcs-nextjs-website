import { isIntakeMaintenanceResult, type IntakeMaintenanceResult } from './intake-maintenance';
import { validateCustomerWebsiteForm } from '@/lib/validation/contactForms';
import { LeadSubmissionError, type CustomerSubmitResult } from './submission-outcome';

/** Service dependency is injected so both customer actions share the same safe boundary. */
export async function submitCustomerWebsiteLead(
  formId: 'contact_agent' | 'contact_lender',
  raw: unknown,
  queryString: string,
  submit: (data: unknown, query: string) => Promise<{ message?: string; redirectUrl?: string; submissionId?: string } | IntakeMaintenanceResult>,
): Promise<CustomerSubmitResult> {
  let invoked = false;
  try {
    const validation = await validateCustomerWebsiteForm(raw, formId, queryString);
    if (!validation.ok) return { success: false, outcome: 'validation_error', fieldErrors: validation.fieldErrors };
    invoked = true;
    const result = await submit(validation.data, queryString);
    if (isIntakeMaintenanceResult(result)) return result;
    if (result?.redirectUrl || result?.message) {
      return { success: true, outcome: 'accepted', redirectUrl: result.redirectUrl || '/thank-you', submissionId: result.submissionId };
    }
    return { success: false, outcome: 'unconfirmed', submissionId: result?.submissionId };
  } catch (error) {
    if (error instanceof LeadSubmissionError) {
      return { success: false, outcome: error.outcome, submissionId: error.submissionId };
    }
    return { success: false, outcome: invoked ? 'unconfirmed' : 'not_sent' };
  }
}
