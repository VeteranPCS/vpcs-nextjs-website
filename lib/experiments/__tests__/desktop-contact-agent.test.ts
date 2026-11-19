// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  __loaded: true,
  getFeatureFlag: vi.fn(),
  get_property: vi.fn(),
  capture: vi.fn(),
}));
vi.mock('posthog-js', () => ({ default: sdk }));

import {
  readSelectedAgent,
  recordContactAgentExposure,
  rememberSelectedAgent,
  resolveContactAgentExperiment,
} from '@/lib/experiments/desktop-contact-agent';

const FLAG = 'desktop-contact-agent-v2';
let desktop = true;
beforeEach(() => {
  desktop = true;
  sdk.__loaded = true;
  vi.resetAllMocks();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: desktop })));
});
afterEach(() => { vi.unstubAllGlobals(); window.sessionStorage.clear(); });

describe('desktop contact experiment', () => {
  it.each(['test', 'control'])('resolves confirmed %s without sending an exposure', (variant) => {
    sdk.getFeatureFlag.mockReturnValue(variant);
    const experiment = resolveContactAgentExperiment();
    expect(experiment).toEqual({ variant, viewId: expect.any(String) });
    expect(sdk.getFeatureFlag).toHaveBeenCalledWith(FLAG, { fresh: true, send_event: false });
    expect(sdk.capture).not.toHaveBeenCalled();
  });

  it.each([true, false, undefined, 'unrecognized'])('falls back to control without enrolling for %o', (variant) => {
    sdk.getFeatureFlag.mockReturnValue(variant);
    expect(resolveContactAgentExperiment()).toBeNull();
  });

  it.each(['connection_error', 'errors_while_computing_flags', 'quota_limited'])('rejects a retained flag after %s', (error) => {
    sdk.get_property.mockReturnValue([error]);
    sdk.getFeatureFlag.mockReturnValue('test');
    expect(resolveContactAgentExperiment()).toBeNull();
    expect(sdk.getFeatureFlag).not.toHaveBeenCalled();
  });

  it('does not require the SDK or enroll a phone', () => {
    sdk.__loaded = false;
    expect(resolveContactAgentExperiment()).toBeNull();
    sdk.__loaded = true;
    desktop = false;
    expect(resolveContactAgentExperiment()).toBeNull();
    expect(sdk.getFeatureFlag).not.toHaveBeenCalled();
  });

  it('sends the rendered assignment with the experiment view identifier', () => {
    const viewId = '01994000-0000-7000-8000-123456789012';
    recordContactAgentExposure({ variant: 'test', viewId });
    expect(sdk.capture).toHaveBeenCalledWith('$feature_flag_called', {
      $feature_flag: FLAG,
      $feature_flag_response: 'test',
      contact_agent_experiment_view_id: viewId,
    }, { send_instantly: true });
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
