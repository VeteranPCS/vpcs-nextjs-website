import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getLeadOwnerForState } from '@/services/salesforceLeadOwnerRouting';

describe('salesforceLeadOwnerRouting', () => {
  it.each([
    ['colorado', 'BETH', 'Beth', '0054x000005GsUvAAK', 'Beth Soldner'],
    ['texas', 'TARA', 'Tara', '005Rg00000BAN0DIAX', 'Tara Gould'],
    ['florida', 'JESSICA', 'Jessica', '005Rg000004hWojIAE', 'Jessica Brown'],
    ['indiana', 'STEPHANIE', 'Stephanie', '0054x0000082vHgAAI', 'Stephanie Guree'],
    ['new-york', 'STEPHANIE', 'Stephanie', '0054x0000082vHgAAI', 'Stephanie Guree'],
    ['puerto-rico', 'STEPHANIE', 'Stephanie', '0054x0000082vHgAAI', 'Stephanie Guree'],
    ['PR', 'STEPHANIE', 'Stephanie', '0054x0000082vHgAAI', 'Stephanie Guree'],
  ])('returns hardcoded owner config for %s', (state, adminKey, adminName, ownerId, ownerName) => {
    expect(getLeadOwnerForState(state)).toEqual({
      adminKey,
      adminName,
      ownerId,
      ownerName,
    });
  });

  it('throws for states without admin routing', () => {
    expect(() => getLeadOwnerForState('not-a-state')).toThrow(
      'No admin routing found for Salesforce Lead owner state',
    );
  });
});
