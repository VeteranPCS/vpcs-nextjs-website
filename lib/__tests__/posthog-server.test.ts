import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'main');
    vi.stubEnv('VPCS_SALESFORCE_PROFILE', 'production');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('discards server events outside production even with an inherited project token', async () => {
    vi.stubEnv('VPCS_SALESFORCE_PROFILE', 'webdev');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'test-project-token');

    await captureServerEvent({ distinctId: 'vpcs_test', event: 'lead_conversion_created' });

    expect(mocks.capture).not.toHaveBeenCalled();
    expect(mocks.flush).not.toHaveBeenCalled();
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
    expect(mocks.logError.mock.calls[0]![1]).not.toHaveProperty('properties');
  });
});
