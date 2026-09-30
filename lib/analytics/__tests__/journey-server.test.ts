import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/posthog-server', () => ({ captureServerEvent: vi.fn() }));
vi.mock('@/services/loggingService', () => ({ logError: vi.fn() }));
import { featureFlags } from '@/lib/feature-flags';
import { buildLeadConversionProperties, captureLeadConversionCreated } from '../server';
import { captureServerEvent } from '@/lib/posthog-server';
const id = '01994000-0000-7000-8000-123456789012';
const input = { formId: 'contact_agent', leadSource: 'Customer', submissionId: 'submission-test',
  formData: { vpcs_visitor_id: 'vpcs_test_visitor', posthog_session_id: id, session_entry_path: '/california', journey_attribution_version: 1 } };
afterEach(() => { featureFlags.customerJourneyAttributionEnabled = false; vi.clearAllMocks(); });
describe('accepted customer session linkage', () => {
  it('maps a validated id to the SDK session property on exactly one existing acceptance event', async () => {
    featureFlags.customerJourneyAttributionEnabled = true;
    await captureLeadConversionCreated(input);
    expect(captureServerEvent).toHaveBeenCalledTimes(1);
    expect(captureServerEvent).toHaveBeenCalledWith(expect.objectContaining({ distinctId: 'vpcs_test_visitor',
      event: 'lead_conversion_created', properties: expect.objectContaining({ $session_id: id,
        posthog_session_id: id, session_entry_path: '/california', submission_id: 'submission-test' }) }));
  });
  it('omits attribution when disabled, malformed, old, or a non-customer form', () => {
    expect(buildLeadConversionProperties(input)).not.toHaveProperty('$session_id');
    featureFlags.customerJourneyAttributionEnabled = true;
    expect(buildLeadConversionProperties({ ...input, formId: 'contact' })).not.toHaveProperty('$session_id');
    expect(buildLeadConversionProperties({ ...input, formData: {} })).not.toHaveProperty('$session_id');
    expect(buildLeadConversionProperties({ ...input, formData: { ...input.formData, posthog_session_id: 'bad' } })).not.toHaveProperty('$session_id');
  });
});
