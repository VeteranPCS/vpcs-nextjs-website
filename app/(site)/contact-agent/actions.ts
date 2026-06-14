'use server';

import { contactAgentPostForm } from '@/services/salesForcePostFormsService';
import { logError } from '@/services/loggingService';
import { ContactAgentFormData } from '@/types';

export interface ContactAgentSubmitResult {
  success: boolean;
  redirectUrl?: string;
}

export async function submitContactAgentLead(
  formData: ContactAgentFormData,
  queryString: string,
): Promise<ContactAgentSubmitResult> {
  try {
    const serverResponse = await contactAgentPostForm(formData, queryString);

    if (serverResponse?.redirectUrl) {
      return { success: true, redirectUrl: serverResponse.redirectUrl };
    }

    if (serverResponse?.message) {
      return { success: true, redirectUrl: '/thank-you' };
    }

    logError('contact-agent action completed without a success response', {
      hasServerResponse: !!serverResponse,
    });
    return { success: false };
  } catch (error) {
    logError('contact-agent action failed', undefined, error);
    return { success: false };
  }
}
