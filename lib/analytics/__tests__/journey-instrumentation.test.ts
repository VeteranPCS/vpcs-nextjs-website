import type { CaptureResult, PostHogConfig } from 'posthog-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ init: vi.fn(), visitor: vi.fn(() => 'vpcs_test_visitor') }));
vi.mock('posthog-js', () => ({ default: { init: mocks.init } }));
vi.mock('@/lib/analytics/client', () => ({ initializeClientAnalytics: mocks.visitor }));
const id = '01994000-0000-7000-8000-123456789012';
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_CUSTOMER_JOURNEY_ATTRIBUTION_ENABLED', '1');
  vi.stubGlobal('window', { location: { hostname: 'www.veteranpcs.com' },
    localStorage: { getItem: vi.fn() }, sessionStorage: { getItem: vi.fn() } });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('production SDK wiring with mocked delivery', () => {
  it('observes SDK entry properties before redaction and supplies the same session to customer forms', async () => {
    await import('../../../instrumentation-client');
    const options = mocks.init.mock.calls[0]![1] as PostHogConfig;
    const sdk = { onSessionId: (fn: (id: string) => void) => { fn(id); return vi.fn(); },
      get_session_id: () => id, has_opted_out_capturing: () => false, register: vi.fn() };
    // Mock only documented public APIs; no network capture or SDK internals.
    options.loaded(sdk as unknown as Parameters<PostHogConfig['loaded']>[0]);
    const beforeSend = options.before_send as (event: CaptureResult) => CaptureResult;
    const clean = beforeSend({ uuid: id, event: '$pageview', properties: {
      $session_id: id, $session_entry_url: 'https://www.veteranpcs.com/california?email=qa@example.com',
      $session_entry_referrer: 'https://example.com/private', $current_url: 'https://www.veteranpcs.com/contact-agent',
    } });
    expect(clean.properties).not.toHaveProperty('$session_entry_url');
    expect(clean.properties).not.toHaveProperty('$session_entry_referrer');
    expect(clean.properties.$session_id).toBe(id);
    const { customerJourney } = await import('../journey-client');
    expect(customerJourney.payload('contact_agent')).toEqual({ posthog_session_id: id, session_entry_path: '/california', journey_attribution_version: 1 });
    expect(customerJourney.payload('get_listed_agents')).toEqual({});
  });
  it('does not throw or initialize the SDK when existing visitor storage fails', async () => {
    mocks.visitor.mockImplementationOnce(() => { throw Error('storage blocked'); });
    await expect(import('../../../instrumentation-client')).resolves.toBeDefined();
    expect(mocks.init).not.toHaveBeenCalled();
  });
});
