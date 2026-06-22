'use server';

import { ContactLenderFormData } from '@/types';
import { captureServerEvent } from '@/lib/posthog-server';

/**
 * Record the server-side `contact_lender_lead_created` event, mirroring the
 * agent flow's `contact_agent_lead_created` so both lead paths have a
 * server-confirmed, ad-blocker-resilient conversion event in PostHog.
 *
 * Deliberately analytics-only: the lender Salesforce POST stays client-side in
 * `contactLenderPostForm` (page.tsx). Moving it here would change where the
 * Salesforce call originates, which is out of scope for an analytics fix.
 */
export async function recordContactLenderLead(
  formData: ContactLenderFormData,
): Promise<void> {
  if (!formData.email) return;
  await captureServerEvent({
    distinctId: formData.email,
    event: 'contact_lender_lead_created',
    properties: {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
    },
  });
}
