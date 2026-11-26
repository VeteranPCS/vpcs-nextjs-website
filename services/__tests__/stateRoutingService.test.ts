import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAdminContactForState,
  getAdminRoutingForState,
  getStatesByAdmin,
} from '@/services/stateRoutingService';

describe('stateRoutingService admin routing', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['colorado', 'BETH', 'Beth'],
    ['CO', 'BETH', 'Beth'],
    ['texas', 'BETH', 'Beth'],
    ['TX', 'BETH', 'Beth'],
    ['florida', 'STEPHANIE', 'Stephanie'],
    ['FL', 'STEPHANIE', 'Stephanie'],
    ['indiana', 'STEPHANIE', 'Stephanie'],
    ['new-york', 'STEPHANIE', 'Stephanie'],
    ['puerto-rico', 'STEPHANIE', 'Stephanie'],
    ['PR', 'STEPHANIE', 'Stephanie'],
  ])('routes %s to %s', (state, adminKey, adminName) => {
    expect(getAdminRoutingForState(state)).toEqual(
      expect.objectContaining({
        adminKey,
        name: adminName,
      }),
    );
  });

  it.each([
    ['AL', 'STEPHANIE'], ['FL', 'STEPHANIE'], ['GA', 'STEPHANIE'],
    ['NC', 'STEPHANIE'], ['SC', 'STEPHANIE'],
    ['AR', 'BETH'], ['LA', 'BETH'], ['OK', 'BETH'], ['TX', 'BETH'],
    ['KY', 'STEPHANIE'], ['MS', 'STEPHANIE'], ['TN', 'STEPHANIE'],
    ['MN', 'BETH'],
  ])('assigns the transferred state %s to %s', (code, adminKey) => {
    expect(getAdminRoutingForState(code).adminKey).toBe(adminKey);
  });

  it.each(['not-a-state', undefined, ''])('routes unknown or missing state %s to Stephanie', (state) => {
    expect(getAdminRoutingForState(state)).toEqual(getAdminRoutingForState('PR'));
  });

  it('keeps the routed recipient and raw fallback input out of OpenPhone routing logs', () => {
    const routing = getAdminRoutingForState('CO');
    expect(getAdminContactForState('CO')).toEqual({
      name: routing.name,
      phoneNumber: routing.phoneNumber,
    });
    getAdminContactForState('+12025550101');
    expect(vi.mocked(console.log).mock.calls).toEqual([
      ['OpenPhone state routing resolved'],
      ['OpenPhone state routing resolved'],
    ]);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('covers all 52 territory selections without overlap', () => {
    const beth = getStatesByAdmin('BETH');
    const stephanie = getStatesByAdmin('STEPHANIE');
    expect(beth).toHaveLength(24);
    expect(stephanie).toHaveLength(28);
    expect(new Set([...beth, ...stephanie]).size).toBe(52);
    expect(getStatesByAdmin('JESSICA')).toEqual([]);
    expect(getStatesByAdmin('TARA')).toEqual([]);
  });

  it('includes Puerto Rico in Stephanie states', () => {
    expect(getStatesByAdmin('STEPHANIE')).toContain('puerto-rico');
  });
});
