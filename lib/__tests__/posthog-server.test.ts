import { beforeEach, describe, expect, it, vi } from 'vitest';
import { captureServerEvent } from '@/lib/posthog-server';
import { logError } from '@/services/loggingService';

const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
  flush: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('posthog-node', () => ({
  PostHog: vi.fn(function PostHogMock() {
    return {
    capture: mocks.capture,
    flush: mocks.flush,
    };
  }),
}));

vi.mock('@/services/loggingService', () => ({
  logError: mocks.logError,
}));

describe('PostHog server delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs capture failures without leaking event properties', async () => {
    const error = new Error('network down');
    mocks.flush.mockRejectedValueOnce(error);

    await expect(captureServerEvent({
      distinctId: 'vpcs_test',
      event: 'lead_conversion_created',
      properties: {
        form_id: 'contact_agent',
        email: 'alex@example.com',
      },
    })).resolves.toBeUndefined();

    expect(logError).toHaveBeenCalledWith(
      'PostHog server capture failed',
      { distinctId: 'vpcs_test', event: 'lead_conversion_created' },
      error,
    );
    expect(mocks.logError.mock.calls[0][1]).not.toHaveProperty('properties');
  });
});
