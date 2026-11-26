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
    ['texas', 'TARA', 'Tara'],
    ['TX', 'TARA', 'Tara'],
    ['florida', 'JESSICA', 'Jessica'],
    ['FL', 'JESSICA', 'Jessica'],
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

  it('keeps OpenPhone fallback behavior for unmapped states', () => {
    expect(getAdminRoutingForState('not-a-state')).toBeNull();
    expect(getAdminContactForState('not-a-state')).toEqual({
      name: 'Default',
      phoneNumber: process.env.OPEN_PHONE_FROM_NUMBER || '719-249-5359',
    });
  });

  it('keeps the routed recipient and raw fallback input out of OpenPhone routing logs', () => {
    const routing = getAdminRoutingForState('CO');
    expect(routing).not.toBeNull();
    expect(getAdminContactForState('CO')).toEqual({
      name: routing?.name,
      phoneNumber: routing?.phoneNumber,
    });
    getAdminContactForState('+12025550101');

    expect(console.log).toHaveBeenCalledExactlyOnceWith('OpenPhone state routing resolved');
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      'No admin mapping found for OpenPhone routing, using fallback number',
    );
  });

  it('includes Puerto Rico in Stephanie states', () => {
    expect(getStatesByAdmin('STEPHANIE')).toContain('puerto-rico');
  });
});
