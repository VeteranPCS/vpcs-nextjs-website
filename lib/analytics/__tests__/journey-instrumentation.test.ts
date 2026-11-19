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
  it('captures a pageview on client-side navigations, not only on full page loads', async () => {
    await import('../../../instrumentation-client');
    const options = mocks.init.mock.calls[0]![1] as PostHogConfig;
    // `true` silently drops every App Router navigation; see docs/analytics/telemetry-taxonomy.md.
    expect(options.capture_pageview).toBe('history_change');
    expect(options.capture_pageleave).toBe(true);
  });
  it('mirrors the contact-agent experiment flag into first-party storage when flags arrive', async () => {
    await import('../../../instrumentation-client');
    const options = mocks.init.mock.calls[0]![1] as PostHogConfig;
    let flagsArrived = () => {};
    const sdk = { onSessionId: () => vi.fn(), get_session_id: () => id, has_opted_out_capturing: () => false, register: vi.fn(),
      onFeatureFlags: (fn: () => void) => { flagsArrived = fn; return vi.fn(); },
      getFeatureFlag: vi.fn(() => 'test') };
    options.loaded(sdk as unknown as Parameters<PostHogConfig['loaded']>[0]);
    const store = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: { setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) } });
    flagsArrived();
    expect(store.get('vpcs_exp_desktop_contact_agent_v2')).toBe('test');
    // Reading the flag for the cache must never count as an experiment exposure.
    expect(sdk.getFeatureFlag).toHaveBeenCalledWith('desktop-contact-agent-v2', { send_event: false });
  });
  it('does not throw or initialize the SDK when existing visitor storage fails', async () => {
    mocks.visitor.mockImplementationOnce(() => { throw Error('storage blocked'); });
    await expect(import('../../../instrumentation-client')).resolves.toBeDefined();
    expect(mocks.init).not.toHaveBeenCalled();
  });
});
