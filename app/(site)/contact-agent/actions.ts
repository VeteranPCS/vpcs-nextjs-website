'use server';

import { contactAgentPostForm } from '@/services/salesForcePostFormsService';
import { ContactAgentFormData } from '@/types';
import { submitCustomerWebsiteLead } from '@/lib/leads/customer-action';
import type { CustomerSubmitResult } from '@/lib/leads/submission-outcome';

export type ContactAgentSubmitResult = CustomerSubmitResult;

export async function submitContactAgentLead(
  formData: ContactAgentFormData,
  queryString: string,
): Promise<ContactAgentSubmitResult> {
  return submitCustomerWebsiteLead('contact_agent', formData, queryString, contactAgentPostForm);
}
