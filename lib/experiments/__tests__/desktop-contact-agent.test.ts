// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  __loaded: true,
  flag: undefined as unknown,
  handlers: [] as Array<() => void>,
  getFeatureFlag: vi.fn(),
  onFeatureFlags: vi.fn(),
}));
vi.mock('posthog-js', () => ({ default: sdk }));

import {
  CONTACT_AGENT_PREPAINT_SCRIPT,
  parseContactAgentVariant,
  readCachedContactAgentVariant,
  readSelectedAgent,
  recordContactAgentExposure,
  rememberSelectedAgent,
  resolveContactAgentVariant,
  syncContactAgentVariantCache,
} from '@/lib/experiments/desktop-contact-agent';

const FLAG = 'desktop-contact-agent-v2';
const CACHE = 'vpcs_exp_desktop_contact_agent_v2';
let desktop = true;
const exposures = () => sdk.getFeatureFlag.mock.calls.filter((call) => call.length === 1);

beforeEach(() => {
  desktop = true; sdk.__loaded = true; sdk.flag = undefined; sdk.handlers = [];
  sdk.getFeatureFlag.mockReset().mockImplementation(() => sdk.flag);
  sdk.onFeatureFlags.mockReset().mockImplementation((handler: () => void) => { sdk.handlers.push(handler); return () => { sdk.handlers = sdk.handlers.filter((h) => h !== handler); }; });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: desktop })));
});
afterEach(() => { vi.unstubAllGlobals(); window.localStorage.clear(); window.sessionStorage.clear(); document.body.innerHTML = ''; });

function container(attribute?: string) {
  const element = document.createElement('div');
  if (attribute !== undefined) element.setAttribute('data-contact-agent-variant', attribute);
  return element;
}

describe('variant values', () => {
  it.each([['test', 'test'], ['control', 'control'], [true, null], ['Test', null], [undefined, null], ['v2', null]])('parses %o as %o', (value, expected) => {
    expect(parseContactAgentVariant(value)).toBe(expected);
  });
});

describe('resolving the variant before paint', () => {
  it.each(['test', 'control', 'unknown'] as const)('keeps what the pre-paint script painted (%s), whatever the SDK says now', (painted) => {
    sdk.flag = painted === 'test' ? 'control' : 'test';
    expect(resolveContactAgentVariant(container(painted))).toBe(painted);
  });

  it('reads the flag the SDK already holds on an in-site navigation, without an exposure', () => {
    sdk.flag = 'test';
    expect(resolveContactAgentVariant(container())).toBe('test');
    expect(sdk.getFeatureFlag).toHaveBeenCalledWith(FLAG, { send_event: false });
    expect(exposures()).toHaveLength(0);
  });

  it.each([
    ['the flag does not exist', () => { sdk.flag = undefined; }],
    ['the flag is a plain boolean', () => { sdk.flag = true; }],
    ['the SDK never started', () => { sdk.__loaded = false; sdk.flag = 'test'; }],
    ['the SDK throws', () => { sdk.getFeatureFlag.mockImplementation(() => { throw new Error('blocked'); }); }],
  ])('falls back to unknown (control, unexposed) when %s', (_name, arrange) => {
    arrange();
    expect(resolveContactAgentVariant(container())).toBe('unknown');
  });
});

describe('pre-paint script', () => {
  function run(readyState: DocumentReadyState, cached?: string) {
    if (cached) window.localStorage.setItem(CACHE, cached);
    const host = container();
    const script = document.createElement('script');
    host.appendChild(script); document.body.appendChild(host);
    const state = vi.spyOn(document, 'readyState', 'get').mockReturnValue(readyState);
    const current = vi.spyOn(document, 'currentScript', 'get').mockReturnValue(script);
    try { new Function(CONTACT_AGENT_PREPAINT_SCRIPT)(); } finally { state.mockRestore(); current.mockRestore(); }
    return host.getAttribute('data-contact-agent-variant');
  }

  it.each([['test', 'test'], ['control', 'control'], [undefined, 'unknown'], ['<img onerror=1>', 'unknown']])('marks the container from the cached value %o as %s while the page is loading', (cached, expected) => {
    expect(run('loading', cached)).toBe(expected);
  });

  it('does nothing on in-site navigations, where the page is already loaded', () => {
    expect(run('complete', 'test')).toBeNull();
    expect(run('interactive', 'test')).toBeNull();
  });
});

describe('experiment exposure', () => {
  it('is sent once, only after PostHog confirms the variant the visitor is looking at', () => {
    sdk.flag = 'test';
    const stop = recordContactAgentExposure('test');
    expect(exposures()).toHaveLength(0);
    sdk.handlers.forEach((handler) => handler());
    sdk.handlers.forEach((handler) => handler());
    expect(exposures()).toEqual([[FLAG]]);
    stop();
    expect(sdk.handlers).toHaveLength(0);
  });

  it('is not sent when a stale cached variant disagrees with the current assignment', () => {
    sdk.flag = 'control';
    recordContactAgentExposure('test');
    sdk.handlers.forEach((handler) => handler());
    expect(exposures()).toHaveLength(0);
  });

  it('is never sent for an unknown variant, on a phone or tablet, or without the SDK', () => {
    sdk.flag = 'test';
    recordContactAgentExposure('unknown');
    desktop = false; recordContactAgentExposure('test'); desktop = true;
    sdk.__loaded = false; recordContactAgentExposure('test');
    expect(sdk.onFeatureFlags).not.toHaveBeenCalled();
    expect(exposures()).toHaveLength(0);
  });
});

describe('cached variant for hard loads', () => {
  it('follows the flag as PostHog reports it and clears when the flag goes away', () => {
    syncContactAgentVariantCache(sdk);
    sdk.flag = 'test'; sdk.handlers.forEach((handler) => handler());
    expect(readCachedContactAgentVariant()).toBe('test');
    sdk.flag = 'control'; sdk.handlers.forEach((handler) => handler());
    expect(readCachedContactAgentVariant()).toBe('control');
    sdk.flag = undefined; sdk.handlers.forEach((handler) => handler());
    expect(window.localStorage.getItem(CACHE)).toBeNull();
    expect(exposures()).toHaveLength(0);
  });

  it('tolerates SDK clients without flag support', () => {
    expect(() => syncContactAgentVariantCache({})).not.toThrow();
    expect(() => syncContactAgentVariantCache(null)).not.toThrow();
  });
});

describe('selected agent hand-off', () => {
  const agent = { id: '0014x00000HWTqI', name: 'Fixture Agent', photo: '/images/agents/0014x00000HWTqI.webp', service: 'Army Veteran', brokerage: 'Fixture Realty' };

  it('returns the remembered agent only for the id in the contact URL', () => {
    rememberSelectedAgent(agent);
    expect(readSelectedAgent(agent.id)).toEqual(agent);
    expect(readSelectedAgent('0014x00000OTHER')).toBeNull();
    expect(readSelectedAgent(null)).toBeNull();
  });

  it.each(['https://evil.example/x.webp', '//evil.example/x.webp', '/images/agents/../../secret.webp', '/images/lenders/0014x00000HWTqI.webp', 'javascript:alert(1)'])('drops a photo path that is not a local agent headshot (%s)', (photo) => {
    window.sessionStorage.setItem('vpcs_selected_agent', JSON.stringify({ ...agent, photo }));
    expect(readSelectedAgent(agent.id)).toEqual({ ...agent, photo: null });
  });

  it('ignores malformed or oversized stored data', () => {
    window.sessionStorage.setItem('vpcs_selected_agent', '{not json');
    expect(readSelectedAgent(agent.id)).toBeNull();
    window.sessionStorage.setItem('vpcs_selected_agent', JSON.stringify({ ...agent, name: 'x'.repeat(200) }));
    expect(readSelectedAgent(agent.id)).toBeNull();
    rememberSelectedAgent({ id: agent.id, name: null });
    expect(window.sessionStorage.getItem('vpcs_selected_agent')).toContain('x'.repeat(200));
  });
});
