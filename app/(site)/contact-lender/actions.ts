'use server';

import { contactLenderPostForm } from '@/services/salesForcePostFormsService';
import { logError } from '@/services/loggingService';
import { ContactLenderFormData } from '@/types';

export interface ContactLenderSubmitResult {
  success: boolean;
  redirectUrl?: string;
}

export async function submitContactLenderLead(
  formData: ContactLenderFormData,
  queryString: string,
): Promise<ContactLenderSubmitResult> {
  try {
    const serverResponse = await contactLenderPostForm(formData, queryString);
    const redirectUrl = serverResponse?.redirectUrl
      ? serverResponse.redirectUrl
      : serverResponse?.message
        ? '/thank-you'
        : null;

    if (redirectUrl) {
      return { success: true, redirectUrl };
    }

    logError('contact-lender action completed without a success response', {
      hasServerResponse: !!serverResponse,
    });
    return { success: false };
  } catch (error) {
    logError('contact-lender action failed', undefined, error);
    return { success: false };
  }
}

/**
 * Compatibility no-op.
 *
 * Confirmed lead telemetry is emitted inside
 * `services/salesForcePostFormsService.tsx` after Salesforce accepts the
 * Web-to-Lead submission. This action used to key PostHog events by email and
 * must not emit analytics.
 */
export async function recordContactLenderLead(
  _formData: ContactLenderFormData,
): Promise<void> {
  return;
}
