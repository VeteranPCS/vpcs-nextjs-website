'use server';

import { ContactLenderFormData } from '@/types';

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
