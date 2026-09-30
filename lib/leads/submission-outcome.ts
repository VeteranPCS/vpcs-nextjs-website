/** Internal failure category, never inferred from provider error messages. */
export class LeadSubmissionError extends Error {
  constructor(public readonly outcome: 'not_sent' | 'unconfirmed', public readonly submissionId: string) {
    super('Failed to submit form');
    this.name = 'LeadSubmissionError';
  }
}

export type CustomerSubmitResult =
  | { success: true; outcome: 'accepted'; redirectUrl: string; submissionId?: string }
  | { success: false; outcome: 'validation_error'; fieldErrors: Record<string, string> }
  | { success: false; outcome: 'not_sent' | 'unconfirmed'; submissionId?: string };

/** Older callbacks remain supported; ambiguous failures are treated conservatively. */
export type CustomerSubmitResponse = CustomerSubmitResult | { success?: boolean; redirectUrl?: string };
