'use server';

import { contactAgentPostForm } from '@/services/salesForcePostFormsService';
import { logError } from '@/services/loggingService';
import { ContactAgentFormData } from '@/types';
import { captureServerEvent } from '@/lib/posthog-server';

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

    // Salesforce signals success either with an explicit redirect or a bare
    // success message; normalise both to a redirect target.
    const redirectUrl = serverResponse?.redirectUrl
      ? serverResponse.redirectUrl
      : serverResponse?.message
        ? '/thank-you'
        : null;

    if (redirectUrl) {
      await captureServerEvent({
        distinctId: formData.email,
        event: 'contact_agent_lead_created',
        properties: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
        },
      });
      return { success: true, redirectUrl };
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
