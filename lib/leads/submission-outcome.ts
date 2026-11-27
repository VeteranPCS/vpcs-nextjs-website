/** Internal failure category, never inferred from provider error messages. */
export class LeadSubmissionError extends Error {
  constructor(public readonly outcome: 'not_sent' | 'unconfirmed', public readonly submissionId: string) {
    super('Failed to submit form');
    this.name = 'LeadSubmissionError';
  }
}

export type LeadSubmitResult =
  | { outcome: 'accepted'; success: true; submissionId?: string; redirectUrl?: string }
  | { outcome: 'validation_error'; success: false; submissionId?: string; fieldErrors: Record<string, string> }
  | { outcome: 'retry_later'; success: false; submissionId?: string; retryAt?: number }
  | { outcome: 'rejected' | 'review_required' | 'not_sent' | 'unconfirmed'; success: false; submissionId?: string };

export type CustomerSubmitResult = LeadSubmitResult;
export type CustomerSubmitResponse = LeadSubmitResult;

/** Responses without an explicit outcome are uncertain, including responses from stale builds. */
export function isLeadSubmitResult(result: LeadSubmitResult | void): result is LeadSubmitResult {
  switch (result?.outcome) {
    case 'accepted':
      return result.success === true;
    case 'validation_error':
      return result.success === false && !!result.fieldErrors;
    case 'retry_later':
    case 'rejected':
    case 'review_required':
    case 'not_sent':
    case 'unconfirmed':
      return result.success === false;
    default:
      return false;
  }
}
