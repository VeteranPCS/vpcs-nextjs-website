'use server';

import { contactLenderPostForm } from '@/services/salesForcePostFormsService';
import { ContactLenderFormData } from '@/types';
import { submitCustomerWebsiteLead } from '@/lib/leads/customer-action';
import type { CustomerSubmitResult } from '@/lib/leads/submission-outcome';

export type ContactLenderSubmitResult = CustomerSubmitResult;

export async function submitContactLenderLead(
  formData: ContactLenderFormData,
  queryString: string,
): Promise<ContactLenderSubmitResult> {
  return submitCustomerWebsiteLead('contact_lender', formData, queryString, contactLenderPostForm);
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
